'use strict';

/**
 * Combined Billing Controller
 * 
 * Handles combined transactions that can include:
 * - Membership purchases
 * - Restaurant/POS products
 * - Future: Class bookings
 * 
 * Uses global voucher system and tenant.settings for tax/printer config
 * 
 * @module modules/restaurant/controllers/combinedBillingController
 */

const { 
  Transaction, 
  TransactionItem, 
  TransactionPayment,
  Product, 
  Member,
  ServicePlan,
  ActiveService,
  Voucher,
  VoucherUsage,
  StockMovement,
  Location,
  RestaurantTable,
  Tenant
} = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const ConcurrencyUtils = require('../../../utils/concurrency');
const transactionSettingsService = require('../../../services/transactionSettingsService');
const { normalizePaymentMethod } = require('../../../utils/paymentMethodNormalizer');

/**
 * Helper function to generate transaction number with date prefix
 */
const generateTransactionNumber = async (tenantId, prefix, transaction) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const fullPrefix = `${prefix}-${year}${month}${day}-`;
  
  return await ConcurrencyUtils.generateUniqueSequence(
    require('../../../models').Transaction,
    {
      tenantId,
      transactionNumber: {
        [Op.like]: `${fullPrefix}%`
      }
    },
    fullPrefix,
    'transactionNumber',
    transaction
  );
};

/**
 * Create combined billing transaction
 * Supports: membership + products in one bill
 */
const createCombinedTransaction = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId } = req.user;
    const {
      customerId,
      customerType: rawCustomerType = 'non-member',
      customerName,
      customerPhone,
      tableId,
      locationId,
      orderType: rawOrderType,
      items,
      payments,
      voucherCode,
      notes
    } = req.body;

    // Normalize customerType: convert 'walk-in' to 'non-member'
    const customerType = rawCustomerType === 'walk-in' ? 'non-member' : rawCustomerType;

    // Normalize orderType: convert underscore to dash (dine_in -> dine-in)
    const orderType = rawOrderType ? rawOrderType.replace(/_/g, '-') : null;

    // Validate items
    if (!items || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one item is required');
    }

    // Get tenant settings for tax calculation and prefix
    const tenant = await Tenant.findByPk(tenantId, { transaction: t });
    const transactionSettings = tenant.settings?.transaction || tenant.settings?.transactions || {};
    const taxEnabled = transactionSettings.taxEnable || false;
    const taxPercentage = parseFloat(transactionSettings.taxPercentage) || 0;
    const taxType = transactionSettings.taxType === 'fixed' ? 'fixed' : 'percentage';
    // Combined billing uses transactionPrefix since it combines multiple types
    const combinedPrefix = transactionSettings.invoice?.transactionPrefix || 'TRX';

    // Validate member if customer type is member
    let member = null;
    if (customerType === 'member') {
      if (!customerId) {
        throw createError('VALIDATION_ERROR', 'Customer ID required for member transactions');
      }
      member = await Member.findOne({
        where: { id: customerId, tenantId },
        transaction: t
      });
      if (!member) {
        throw createError('NOT_FOUND', 'Member not found');
      }
    }

    // Process items
    const processedItems = [];
    let subtotal = 0;
    let restaurantSubtotal = 0; // For service charge calculation
    let gymSubtotal = 0;

    for (const item of items) {
      let processedItem;

      // Dynamic routing based on item structure, not hardcoded types
      if (item.type === 'product' || item.productId) {
        processedItem = await processProductItem(item, tenantId, false, 0, t); // Don't calculate tax per item
        restaurantSubtotal += parseFloat(processedItem.totalPrice);
      } else if (item.servicePlanId || item.membershipTypeId || 
                 ['membership', 'service_plan', 'class_package', 'pt_package', 'spa_package'].includes(item.type)) {
        // Any item with servicePlanId or membershipTypeId is treated as service/membership
        processedItem = await processMembershipItem(item, tenantId, customerId, false, 0, t); // Don't calculate tax per item
        gymSubtotal += parseFloat(processedItem.totalPrice);
      } else {
        throw createError('VALIDATION_ERROR', `Invalid item: must have productId, servicePlanId, or membershipTypeId`);
      }

      processedItems.push(processedItem);
      subtotal += parseFloat(processedItem.totalPrice);
    }

    // Apply voucher if provided
    let voucherDiscount = 0;
    let voucher = null;

    if (voucherCode) {
      voucher = await Voucher.findOne({
        where: {
          code: voucherCode,
          [Op.or]: [
            { tenantId }, // Tenant-specific voucher
            { tenantId: null, scope: 'subscription' } // Global voucher (if applicable)
          ],
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() }
        },
        transaction: t
      });

      if (!voucher) {
        throw createError('VOUCHER_INVALID', 'Voucher code is invalid or expired');
      }

      if (!voucher.isValid()) {
        throw createError('VOUCHER_INVALID', 'Voucher is no longer valid');
      }

      // Check usage limit
      if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
        throw createError('VOUCHER_LIMIT_REACHED', 'Voucher usage limit reached');
      }

      // Check user usage limit
      if (customerId && voucher.userUsageLimit) {
        const userUsageCount = await VoucherUsage.count({
          where: { voucherId: voucher.id, userId: customerId },
          transaction: t
        });
        if (userUsageCount >= voucher.userUsageLimit) {
          throw createError('VOUCHER_USER_LIMIT', 'You have reached the usage limit for this voucher');
        }
      }

      // Check min purchase
      if (voucher.minPurchaseAmount && subtotal < parseFloat(voucher.minPurchaseAmount)) {
        throw createError('VOUCHER_MIN_PURCHASE', `Minimum purchase amount is ${voucher.minPurchaseAmount}`);
      }

      // Calculate discount
      voucherDiscount = voucher.calculateDiscount(subtotal);
    }

    // Calculate subtotal after discount
    const subtotalAfterDiscount = subtotal - voucherDiscount;
    
    // Proportionally split voucher discount between restaurant and gym items
    const restaurantDiscountProportion = subtotal > 0 ? (restaurantSubtotal / subtotal) : 0;
    const restaurantSubtotalAfterDiscount = restaurantSubtotal * (1 - (voucherDiscount / subtotal));

    // Get service charge configuration (only for restaurant items)
    const serviceChargeConfig = await transactionSettingsService.getServiceChargeConfiguration(tenantId);
    let serviceChargeAmount = 0;
    
    // Service charge ONLY for restaurant items — dihitung dari restaurantSubtotalAfterDiscount (SETELAH diskon)
    if (restaurantSubtotalAfterDiscount > 0 && serviceChargeConfig.serviceChargeEnable && serviceChargeConfig.serviceChargePercentage > 0) {
      if (serviceChargeConfig.serviceChargeType === 'percentage') {
        serviceChargeAmount = (restaurantSubtotalAfterDiscount * serviceChargeConfig.serviceChargePercentage) / 100;
      } else {
        // Fixed service charge (only if there are restaurant items)
        serviceChargeAmount = serviceChargeConfig.serviceChargePercentage;
      }
      serviceChargeAmount = Math.round(serviceChargeAmount);
    }
    
    // Calculate tax from subtotalAfterDiscount (NOT including service charge)
    let finalTax = 0;
    if (taxEnabled && taxPercentage > 0) {
      if (taxType === 'fixed') {
        finalTax = Math.round(taxPercentage);
      } else {
        finalTax = Math.round((subtotalAfterDiscount * taxPercentage) / 100);
      }
    }
    
    const totalAmount = subtotalAfterDiscount + serviceChargeAmount + finalTax;

    // Validate payments
    if (!payments || payments.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one payment method is required');
    }

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const changeAmount = totalPaid > totalAmount ? totalPaid - totalAmount : 0;

    if (totalPaid < totalAmount) {
      throw createError('INSUFFICIENT_PAYMENT', `Payment insufficient. Total: ${totalAmount}, Paid: ${totalPaid}`);
    }

    // Generate transaction number with tenant prefix
    const transactionNumber = await generateTransactionNumber(tenantId, combinedPrefix, t);

    // Determine transaction type based on items
    const hasMembership = processedItems.some(i => i.type === 'membership');
    const hasProduct = processedItems.some(i => i.type === 'product');
    let transactionType = 'pos';
    if (hasMembership && hasProduct) {
      transactionType = 'pos'; // Combined is treated as POS with membership item
    } else if (hasMembership) {
      transactionType = 'gym';
    } else if (tableId || orderType) {
      transactionType = 'restaurant';
    }

    // Create transaction
    const transaction = await Transaction.create({
      tenantId,
      transactionNumber,
      transactionType,
      orderType: tableId ? (orderType || 'dine-in') : null,
      tableId,
      locationId,
      customerId: customerType === 'member' ? customerId : null,
      customerType,
      customerName: customerName || member?.name,
      customerPhone: customerPhone || member?.phone,
      subtotal,
      serviceCharge: serviceChargeAmount,
      tax: finalTax,
      voucherId: voucher?.id,
      voucherDiscount,
      totalAmount,
      paidAmount: totalPaid,
      changeAmount,
      status: 'completed',
      completedAt: new Date(),
      notes,
      createdBy: req.user.id
    }, { transaction: t });

    // Create transaction items
    for (const item of processedItems) {
      await TransactionItem.create({
        transactionId: transaction.id,
        tenantId,
        itemType: item.type,
        itemId: item.itemId,
        itemName: item.itemName || item.metadata?.name || 'Unknown Item',
        productId: item.type === 'product' ? item.itemId : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.totalPrice, // Subtotal = unitPrice * quantity (before tax)
        total: item.totalPrice + (item.taxAmount || 0), // Total = subtotal + tax
        totalPrice: item.totalPrice,
        notes: item.notes,
        metadata: item.metadata,
        itemDetails: item.metadata
      }, { transaction: t });

      // Deduct stock for products
      if (item.type === 'product' && item.trackInventory) {
        await StockMovement.recordStockOut({
          tenantId,
          productId: item.itemId,
          locationId,
          quantity: item.quantity,
          referenceType: 'combined_sale',
          referenceId: transaction.id,
          notes: `Combined sale: ${transactionNumber}`,
          performedBy: req.user.id,
          transaction: t
        });
      }

      // Activate membership/service if applicable
      if (item.activeServiceId) {
        // Activate any ActiveService (works for all service types)
        await ActiveService.update({
          status: 'active',
          purchaseTransactionId: transaction.id
        }, {
          where: { id: item.activeServiceId },
          transaction: t
        });
      } else {
        // Legacy membership fallback — replaced by ActiveService system
        throw createError('NOT_FOUND', 'Service plan not found for membership item');
      }
    }

    // Create transaction payments
    for (const payment of payments) {
      await TransactionPayment.create({
        transactionId: transaction.id,
        tenantId,
        amount: payment.amount,
        paymentMethod: normalizePaymentMethod(payment.method),
        paymentDate: new Date(),
        status: 'completed',
        paymentDetails: payment.paymentDetails || {},
        paymentGatewayRef: payment.gatewayRef,
        notes: payment.notes,
        createdBy: req.user.id,
      }, { transaction: t });
    }

    // Update voucher usage
    if (voucher) {
      await voucher.update({
        usageCount: voucher.usageCount + 1
      }, { transaction: t });

      await VoucherUsage.create({
        voucherId: voucher.id,
        transactionId: transaction.id,
        memberId: customerType === 'member' ? customerId : null,
        userId: customerType !== 'member' ? customerId : null,
        discountAmount: voucherDiscount,
        originalAmount: subtotal,
        finalAmount: subtotalAfterDiscount
      }, { transaction: t });
    }

    // Update table status if applicable
    if (tableId) {
      await RestaurantTable.update({
        status: 'available',
        currentOrderId: null
      }, {
        where: { id: tableId },
        transaction: t
      });
    }

    await t.commit();

    // Reload with associations
    const createdTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        { 
          model: TransactionItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: TransactionPayment, as: 'payments' },
        { model: Voucher, as: 'voucher' },
        { model: Member, as: 'member' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Combined transaction created successfully',
      data: createdTransaction
    });

  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Process product item
 */
async function processProductItem(item, tenantId, taxEnabled, taxPercentage, transaction) {
  const product = await Product.findOne({
    where: { id: item.productId, tenantId, isActive: true },
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  if (!product) {
    throw createError('NOT_FOUND', `Product not found: ${item.productId}`);
  }

  const quantity = item.quantity || 1;

  // Check stock
  if (product.trackInventory && product.stockQuantity < quantity) {
    throw createError('INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`);
  }

  const unitPrice = parseFloat(product.price);
  const totalPrice = unitPrice * quantity;
  const taxAmount = taxEnabled ? totalPrice * (taxPercentage / 100) : 0;

  return {
    type: 'product',
    itemId: product.id,
    itemName: product.name,
    quantity,
    unitPrice,
    totalPrice,
    taxAmount,
    trackInventory: product.trackInventory,
    notes: item.notes,
    metadata: {
      productName: product.name,
      sku: product.sku
    }
  };
}

/**
 * Process membership item (supports both legacy MembershipType and new ServicePlan)
 */
async function processMembershipItem(item, tenantId, memberId, taxEnabled, taxPercentage, transaction) {
  if (!memberId) {
    throw createError('VALIDATION_ERROR', 'Member ID required for membership purchase');
  }

  // Support both legacy membershipTypeId and new servicePlanId
  const itemId = item.servicePlanId || item.membershipTypeId;
  if (!itemId) {
    throw createError('VALIDATION_ERROR', 'servicePlanId or membershipTypeId required');
  }

  // Try ServicePlan first (new system)
  let servicePlan = await ServicePlan.findOne({
    where: { id: itemId, tenantId, isActive: true },
    transaction
  });

  if (servicePlan) {
    // Use new ActiveService system
    const startDate = item.startDate ? new Date(item.startDate) : new Date();
    const duration = servicePlan.duration || servicePlan.validityDays || 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    // Create ActiveService (status suspended until payment confirmed)
    const activeService = await ActiveService.create({
      tenantId,
      memberId,
      servicePlanId: servicePlan.id,
      serviceType: servicePlan.serviceType,
      startDate,
      endDate,
      totalSessions: servicePlan.sessions,
      remainingSessions: servicePlan.sessions,
      status: 'suspended',
      pricePaid: parseFloat(servicePlan.price),
      currency: servicePlan.currency || 'IDR',
      notes: item.notes,
      purchaseDate: new Date()
    }, { transaction });

    const unitPrice = parseFloat(servicePlan.price);
    const totalPrice = unitPrice;
    const taxAmount = taxEnabled ? totalPrice * (taxPercentage / 100) : 0;

    return {
      type: item.type || 'service_plan',
      itemId: servicePlan.id,
      itemName: servicePlan.name,
      activeServiceId: activeService.id,
      quantity: 1,
      unitPrice,
      totalPrice,
      taxAmount,
      notes: item.notes,
      metadata: {
        name: servicePlan.name,
        serviceType: servicePlan.serviceType,
        duration: duration,
        sessions: servicePlan.sessions
      }
    };
  }

  // No matching service plan found
  throw createError('NOT_FOUND', 'Service plan not found');
}

/**
 * Get transaction with receipt data
 * Includes tenant settings for printing
 */
const getTransactionReceipt = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const transaction = await Transaction.findOne({
      where,
      include: [
        { 
          model: TransactionItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: TransactionPayment, as: 'payments' },
        { model: Voucher, as: 'voucher' },
        { model: Member, as: 'member' },
        { model: RestaurantTable, as: 'table' },
        { model: Location, as: 'location' },
        { 
          model: Tenant, 
          as: 'tenant',
          attributes: ['id', 'name', 'address', 'phone', 'email', 'logo', 'settings']
        }
      ]
    });

    if (!transaction) {
      throw createError('NOT_FOUND', 'Transaction not found');
    }

    // Get printer settings from tenant
    const printerSettings = transaction.tenant.settings?.printers || [];
    const transactionSettings = transaction.tenant.settings?.transaction || {};

    res.json({
      success: true,
      data: {
        transaction,
        receiptConfig: {
          printers: printerSettings,
          headerText: transactionSettings.invoice?.headerText,
          footerText: transactionSettings.invoice?.footerText,
          showLogo: transactionSettings.invoice?.showLogo ?? true,
          paperWidth: transactionSettings.invoice?.paperWidth || 80
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Validate voucher for combined billing
 */
const validateVoucher = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { code, subtotal, customerId } = req.body;

    const voucher = await Voucher.findOne({
      where: {
        code,
        [Op.or]: [
          { tenantId },
          { tenantId: null, scope: 'subscription' }
        ],
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() }
      }
    });

    if (!voucher) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: 'Voucher code is invalid or expired'
        }
      });
    }

    if (!voucher.isValid()) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: 'Voucher is no longer valid'
        }
      });
    }

    // Check min purchase
    if (voucher.minPurchaseAmount && subtotal < parseFloat(voucher.minPurchaseAmount)) {
      return res.json({
        success: true,
        data: {
          valid: false,
          message: `Minimum purchase amount is ${voucher.minPurchaseAmount}`
        }
      });
    }

    // Calculate discount
    const discount = voucher.calculateDiscount(subtotal || 0);

    res.json({
      success: true,
      data: {
        valid: true,
        voucher: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          type: voucher.type,
          value: voucher.value,
          applicableTo: voucher.applicableTo
        },
        discount,
        message: 'Voucher is valid'
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCombinedTransaction,
  getTransactionReceipt,
  validateVoucher
};
