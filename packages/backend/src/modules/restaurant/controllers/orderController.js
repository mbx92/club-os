'use strict';

/**
 * Order Controller - Restaurant Module
 * 
 * Handles restaurant order CRUD operations including table orders,
 * takeaway, delivery, order status management, checkout with split payment,
 * voucher support, split bill functionality, and auto-print receipts.
 * 
 * @module modules/restaurant/controllers/orderController
 */

const {
  Transaction,
  TransactionItem,
  TransactionPayment,
  Product,
  ProductExtra,
  RestaurantTable,
  Location,
  User,
  StockMovement,
  Voucher,
  VoucherUsage,
  Tenant
} = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const ConcurrencyUtils = require('../../../utils/concurrency');
const receiptPrinterService = require('../../../services/receiptPrinterService');
const { normalizePaymentMethod } = require('../../../utils/paymentMethodNormalizer');
const transactionSettingsService = require('../../../services/transactionSettingsService');
const logger = require('../../../utils/logger');

const getProductVariants = (product) => {
  const rawVariants = Array.isArray(product?.productDetails?.variants)
    ? product.productDetails.variants
    : [];

  return rawVariants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') {
        return null;
      }

      const name = typeof variant.name === 'string' ? variant.name.trim() : '';
      const sku = typeof variant.sku === 'string' ? variant.sku.trim() : '';
      const price = Number.parseFloat(variant.price);
      if (!name && !sku) {
        return null;
      }

      return {
        ...variant,
        name,
        sku,
        price: Number.isFinite(price) ? price : null
      };
    })
    .filter(Boolean);
};

const collectVariantLookupValues = (item) => {
  const lookupValues = [];

  const pushValue = (value) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        lookupValues.push(trimmedValue);
      }
      return;
    }

    if (typeof value === 'object') {
      pushValue(value.name);
      pushValue(value.sku);
      pushValue(value.variantName);
      pushValue(value.variantSku);
    }
  };

  pushValue(item?.selectedVariant);
  pushValue(item?.variant);
  pushValue(item?.variantName);
  pushValue(item?.variantSku);
  pushValue(item?.itemDetails?.selectedVariant);
  pushValue(item?.itemDetails?.variant);
  pushValue(item?.itemDetails?.variantName);
  pushValue(item?.itemDetails?.variantSku);

  return [...new Set(lookupValues.map(value => value.toLowerCase()))];
};

const resolveProductVariant = (product, item) => {
  const variants = getProductVariants(product);
  if (variants.length === 0) {
    return {
      selectedVariant: null,
      explicitSelectionProvided: false,
      requestedValues: []
    };
  }

  const requestedValues = collectVariantLookupValues(item);
  const explicitSelectionProvided = requestedValues.length > 0;
  const selectedVariant = requestedValues.length > 0
    ? variants.find(variant => {
      const variantName = variant.name.toLowerCase();
      const variantSku = variant.sku ? variant.sku.toLowerCase() : null;
      return requestedValues.some(value => value === variantName || (variantSku && value === variantSku));
    })
    : (variants.find(variant => variant.name.toLowerCase() === 'regular') || variants[0]);

  return {
    selectedVariant: selectedVariant || null,
    explicitSelectionProvided,
    requestedValues
  };
};

const buildOrderItemPricing = (product, item) => {
  const { selectedVariant, explicitSelectionProvided, requestedValues } = resolveProductVariant(product, item);

  if (explicitSelectionProvided && !selectedVariant) {
    throw createError(
      'VALIDATION_ERROR',
      `Variant untuk produk ${product.name} tidak ditemukan. Requested: ${requestedValues.join(', ')}`
    );
  }

  const baseUnitPrice = Number.isFinite(selectedVariant?.price)
    ? selectedVariant.price
    : (parseFloat(product.price) || 0);
  const shouldAppendVariantToName = selectedVariant && (
    explicitSelectionProvided || selectedVariant.name.toLowerCase() !== 'regular'
  );

  return {
    baseUnitPrice,
    selectedVariant,
    itemName: shouldAppendVariantToName ? `${product.name} (${selectedVariant.name})` : product.name
  };
};

/**
 * Helper function to generate order number with date prefix
 * @param {string} tenantId - Tenant ID
 * @param {Object} options - Options for number generation
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<string>} - Generated order number
 */
const generateOrderNumber = async (tenantId, options, transaction) => {
  const {
    prefix = 'ORD',
    dateFormat = 'YYYYMMDD',
    separator = '-'
  } = options;

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  let dateStr = '';
  if (dateFormat === 'YYYYMMDD') {
    dateStr = `${year}${month}${day}`;
  } else if (dateFormat === 'YYYYMM') {
    dateStr = `${year}${month}`;
  } else {
    dateStr = `${year}${month}${day}`;
  }

  const fullPrefix = `${prefix}${separator}${dateStr}${separator}`;

  return await ConcurrencyUtils.generateUniqueSequence(
    Transaction,
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
 * Helper function to generate queue number for prepaid orders
 * Format: A-001, A-002, ... A-999, B-001, ...
 * Resets daily
 * @param {string} tenantId - Tenant ID
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<string>} - Generated queue number
 */
const generateQueueNumber = async (tenantId, transaction) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  // Count today's orders with queue numbers for this tenant
  const count = await Transaction.count({
    where: {
      tenantId,
      queueNumber: { [Op.ne]: null },
      createdAt: {
        [Op.gte]: startOfDay,
        [Op.lte]: endOfDay
      }
    },
    transaction
  });

  // Calculate letter (A-Z) and number (001-999)
  const totalNumber = count + 1;
  const letterIndex = Math.floor((totalNumber - 1) / 999);
  const number = ((totalNumber - 1) % 999) + 1;

  const letter = String.fromCharCode(65 + (letterIndex % 26)); // A-Z
  const paddedNumber = String(number).padStart(3, '0');

  return `${letter}-${paddedNumber}`;
};

/**
 * Format a Date to a human-readable Indonesian string.
 * e.g. "23 Feb 2026 pukul 21:26 WIB"
 * @param {Date} [date]
 * @returns {string}
 */
const formatDateTime = (date = new Date()) => {
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = new Date(date);
  const day   = d.getDate();
  const month = months[d.getMonth()];
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2, '0');
  const mm    = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} pukul ${hh}:${mm} WIB`;
};

/**
 * Build a display label for a RestaurantTable model instance.
 * e.g. "Meja T3" or "Meja T3 – VIP Corner"
 * @param {object|null} table - RestaurantTable instance (may be null)
 * @returns {string}
 */
const tableLabel = (table) => {
  if (!table) return 'meja tidak diketahui';
  const base = `Meja ${table.tableNumber || table.id}`;
  return table.tableName ? `${base} - ${table.tableName}` : base;
};

/**
 * Helper function to calculate restaurant order totals with tax and service charge
 * Formula:
 * 1. subtotal = sum of all item totals
 * 2. subtotalAfterDiscount = subtotal - voucherDiscount
 * 3. serviceChargeAmount = subtotalAfterDiscount * serviceChargeRate / 100 (if enabled) — dihitung SETELAH diskon
 * 4. taxAmount = subtotalAfterDiscount * taxRate / 100 (if enabled)
 * 5. totalAmount = subtotalAfterDiscount + serviceChargeAmount + taxAmount
 * 
 * NOTE: Service charge dan tax keduanya dihitung dari subtotalAfterDiscount (setelah diskon).
 * 
 * @param {number} subtotal - Subtotal before discount
 * @param {number} voucherDiscount - Voucher discount amount
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<object>} - { subtotalAfterDiscount, serviceChargeAmount, taxAmount, totalAmount }
 */
const calculateRestaurantTotals = async (subtotal, voucherDiscount, tenantId) => {
  // Get tax and service charge configuration
  const taxConfig = await transactionSettingsService.getTaxConfiguration(tenantId);
  const serviceChargeConfig = await transactionSettingsService.getServiceChargeConfiguration(tenantId);

  const subtotalAfterDiscount = subtotal - voucherDiscount;

  // Calculate service charge from subtotalAfterDiscount (SETELAH diskon)
  let serviceChargeAmount = 0;
  if (serviceChargeConfig.serviceChargeEnable && serviceChargeConfig.serviceChargePercentage > 0) {
    if (serviceChargeConfig.serviceChargeType === 'percentage') {
      serviceChargeAmount = (subtotalAfterDiscount * serviceChargeConfig.serviceChargePercentage) / 100;
    } else {
      // Fixed service charge
      serviceChargeAmount = serviceChargeConfig.serviceChargePercentage;
    }
  }

  // Calculate tax from subtotalAfterDiscount (NOT including service charge)
  let taxAmount = 0;
  if (taxConfig.taxEnable && taxConfig.taxPercentage > 0) {
    if (taxConfig.taxType === 'percentage') {
      taxAmount = (subtotalAfterDiscount * taxConfig.taxPercentage) / 100;
    } else {
      // Fixed tax
      taxAmount = taxConfig.taxPercentage;
    }
  }

  // Round tax and service charge
  serviceChargeAmount = Math.round(serviceChargeAmount);
  taxAmount = Math.round(taxAmount);
  const totalBeforeRounding = Math.round(subtotalAfterDiscount + serviceChargeAmount + taxAmount);

  // Apply business rounding (e.g. round to nearest 100/500/1000)
  const roundingConfig = await transactionSettingsService.getRoundingConfiguration(tenantId);
  const totalAmount = transactionSettingsService.applyRounding(totalBeforeRounding, roundingConfig);
  const roundingAmount = totalAmount - totalBeforeRounding;

  return {
    subtotalAfterDiscount,
    serviceChargeAmount,
    taxAmount,
    totalAmount,
    roundingAmount,
    taxConfig,
    serviceChargeConfig
  };
};


/**
 * Get all restaurant orders with filters
 */
const getAllOrders = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page,
      limit,
      status,
      tableId,
      locationId,
      orderType,
      startDate,
      endDate,
      search
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset   = (pageNum - 1) * limitNum;
    const where = {
      transactionType: 'restaurant'
    };

    // Tenant filtering
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Status filter
    if (status) {
      const statuses = status.includes(',') ? status.split(',').map(s => s.trim()) : [status];
      where.status = statuses.length === 1 ? statuses[0] : { [Op.in]: statuses };
    } else {
      // By default, exclude split/merged parent orders (their children are the active ones)
      where.status = { [Op.notIn]: ['split', 'merged'] };
    }

    // Table filter
    if (tableId) {
      where.tableId = tableId;
    }

    // Location filter
    if (locationId) {
      where.locationId = locationId;
    }

    // Order type filter (dine-in, takeaway, delivery)
    if (orderType) {
      where.orderType = orderType;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Search by order number or customer name
    if (search) {
      where[Op.or] = [
        { transactionNumber: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: orders } = await Transaction.findAndCountAll({
      where,
      distinct: true,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }
          ]
        },
        {
          model: RestaurantTable,
          as: 'table',
          attributes: ['id', 'tableNumber', 'capacity']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = {
      id,
      transactionType: 'restaurant'
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({
      where,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [
            { model: Product, as: 'product' }
          ]
        },
        {
          model: TransactionPayment,
          as: 'payments'
        },
        {
          model: RestaurantTable,
          as: 'table'
        },
        {
          model: Location,
          as: 'location'
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!order) {
      throw createError('NOT_FOUND', 'Order not found');
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new restaurant order
 */
const createOrder = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();
  let committed = false;

  try {
    const { tenantId } = req.user;
    const {
      tableId,
      locationId,
      orderType = 'dine-in',
      customerName,
      customerPhone,
      notes,
      items,
      payments = [],
      voucherCode
    } = req.body;

    if (!items || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one item is required');
    }

    // Validate payments for takeaway/delivery (must pay first)
    if ((orderType === 'takeaway' || orderType === 'delivery') && payments.length === 0) {
      throw createError('VALIDATION_ERROR', 'Payment is required for takeaway/delivery orders');
    }

    // Validate table if dine-in
    let table = null;
    if (orderType === 'dine-in' && tableId) {
      table = await RestaurantTable.findOne({
        where: { id: tableId, tenantId, isActive: true },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!table) {
        throw createError('NOT_FOUND', 'Table not found');
      }

      if (table.status === 'occupied') {
        throw createError('VALIDATION_ERROR', 'Table is already occupied');
      }
    }

    // Get tenant for prefix and numbering settings
    const tenant = await Tenant.findByPk(tenantId, { transaction: t });
    const invoiceSettings = tenant?.settings?.transaction?.invoice || {};
    const orderPrefix = invoiceSettings.orderPrefix || 'ORD';
    const dateFormat = invoiceSettings.dateFormat || 'YYYYMMDD';
    const prefixSeparator = invoiceSettings.prefixSeparator || '-';

    // Generate order number with tenant prefix
    const transactionNumber = await generateOrderNumber(tenantId, {
      prefix: orderPrefix,
      dateFormat,
      separator: prefixSeparator
    }, t);

    // Calculate totals
    let orderSubtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, tenantId, isActive: true },
        transaction: t
      });

      if (!product) {
        throw createError('NOT_FOUND', `Product ${item.productId} not found`);
      }

      const quantity = parseInt(item.quantity) || 1;
  const { baseUnitPrice, selectedVariant, itemName } = buildOrderItemPricing(product, item);
  let unitPrice = baseUnitPrice;

      // Process extras if product is customized and extras are provided
      let extrasTotal = 0;
      const selectedExtras = [];

      if (product.isCustomized && item.extras && Array.isArray(item.extras)) {
        // Validate and calculate extras
        for (const extraSelection of item.extras) {
          const extra = await ProductExtra.findOne({
            where: {
              id: extraSelection.id || extraSelection.extraId,
              productId: product.id,
              tenantId,
              isActive: true
            },
            transaction: t
          });

          if (extra) {
            const extraQuantity = parseInt(extraSelection.quantity) || 1;
            const extraPrice = parseFloat(extra.price);
            extrasTotal += extraPrice * extraQuantity;

            selectedExtras.push({
              id: extra.id,
              name: extra.name,
              price: extraPrice,
              quantity: extraQuantity,
              groupName: extra.groupName
            });
          }
        }
      }

      // Add extras to unit price
      const finalUnitPrice = unitPrice + extrasTotal;
      const itemSubtotal = finalUnitPrice * quantity;
      const discountAmount = parseFloat(item.discount) || 0;
      const itemTotal = itemSubtotal - discountAmount;

      orderSubtotal += itemTotal;

      orderItems.push({
        itemType: 'product',
        itemId: product.id,
        itemName,
        itemSku: product.sku || null,
        quantity,
        unitPrice: finalUnitPrice,
        subtotal: itemSubtotal,
        discountAmount,
        total: itemTotal,
        notes: item.notes || null,
        itemDetails: {
          modifiers: item.modifiers || [],
          productCategory: product.categoryId || null,
          basePrice: baseUnitPrice,
          variantName: selectedVariant?.name || null,
          variantSku: selectedVariant?.sku || null,
          selectedVariant: selectedVariant ? {
            name: selectedVariant.name,
            sku: selectedVariant.sku || null,
            price: baseUnitPrice
          } : undefined,
          extras: selectedExtras.length > 0 ? selectedExtras : undefined,
          extrasTotal: selectedExtras.length > 0 ? extrasTotal : undefined
        }
      });
    }

    // Apply voucher if provided
    let voucherDiscount = 0;
    let voucherId = null;

    if (voucherCode) {
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          [Op.or]: [
            { tenantId },
            { scope: 'subscription' }
          ]
        },
        transaction: t,
        lock: true
      });

      if (!voucher) {
        throw createError('VOUCHER_NOT_FOUND', 'Voucher tidak ditemukan atau sudah tidak berlaku');
      }

      // Validate voucher
      if (!voucher.type || voucher.value === null || voucher.value === undefined) {
        throw createError('VOUCHER_INVALID', 'Voucher tidak memiliki konfigurasi diskon yang valid');
      }

      // Check usage limit
      if (voucher.usageLimit) {
        const usageCount = await VoucherUsage.count({
          where: { voucherId: voucher.id },
          transaction: t
        });
        if (usageCount >= voucher.usageLimit) {
          throw createError('VOUCHER_LIMIT_REACHED', 'Batas penggunaan voucher sudah tercapai');
        }
      }

      // Check minimum purchase
      if (voucher.minPurchaseAmount && orderSubtotal < parseFloat(voucher.minPurchaseAmount)) {
        throw createError('VOUCHER_MINIMUM_NOT_MET', `Minimal pembelian untuk voucher ini adalah ${voucher.minPurchaseAmount}`);
      }

      // Calculate discount
      if (voucher.type === 'percentage') {
        voucherDiscount = (orderSubtotal * parseFloat(voucher.value || 0)) / 100;
        if (voucher.maxDiscountAmount && voucherDiscount > parseFloat(voucher.maxDiscountAmount)) {
          voucherDiscount = parseFloat(voucher.maxDiscountAmount);
        }
      } else {
        voucherDiscount = parseFloat(voucher.value || 0);
      }

      voucherDiscount = Math.round(voucherDiscount);
      voucherId = voucher.id;
    }

    // Calculate totals with tax and service charge
    const totals = await calculateRestaurantTotals(orderSubtotal, voucherDiscount, tenantId);
    const { subtotalAfterDiscount, serviceChargeAmount, taxAmount, totalAmount, roundingAmount } = totals;

    // Calculate total paid and change for takeaway/delivery
    let totalPaid = 0;
    let changeAmount = 0;

    if (payments.length > 0) {
      totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      changeAmount = Math.max(0, totalPaid - totalAmount);
    }

    // Determine status: 
    // - Takeaway/delivery with payment = completed (voucher will adjust total)
    // - Dine-in = preparing (will complete later with payment)
    const isTakeawayOrDelivery = orderType === 'takeaway' || orderType === 'delivery';
    const hasPayment = payments.length > 0 && totalPaid > 0;
    const orderStatus = isTakeawayOrDelivery && hasPayment ? 'completed' : 'preparing';

    logger.logInfo('Order status calculation', {
      action: 'ORDER_STATUS_CALC',
      orderType,
      orderSubtotal,
      totalPaid,
      paymentsCount: payments.length,
      isTakeawayOrDelivery,
      hasPayment,
      calculatedStatus: orderStatus,
      note: 'Takeaway/delivery with payment = completed (voucher handled separately)',
      tenantId
    });

    // Create transaction
    const order = await Transaction.create({
      tenantId,
      transactionNumber,
      transactionType: 'restaurant',
      orderType,
      tableId: table?.id || null,
      locationId: locationId || null,
      customerName,
      customerPhone,
      subtotal: orderSubtotal,
      voucherDiscount,
      voucherId,
      serviceCharge: serviceChargeAmount,
      tax: taxAmount,
      roundingAmount: roundingAmount || 0,
      totalAmount: totalAmount,
      paidAmount: totalPaid,
      changeAmount: changeAmount,
      status: orderStatus,
      completedAt: orderStatus === 'completed' ? new Date() : null,
      notes,
      createdBy: req.user.id
    }, { transaction: t });

    // Create transaction items
    for (const item of orderItems) {
      await TransactionItem.create({
        transactionId: order.id,
        tenantId,
        ...item
      }, { transaction: t });
    }

    // Create payment records if payments provided
    if (payments.length > 0) {
      const paymentStatus = orderStatus === 'completed' ? 'completed' : 'pending';
      for (const payment of payments) {
        await TransactionPayment.create({
          transactionId: order.id,
          tenantId,
          paymentMethod: normalizePaymentMethod(payment.method || 'cash'),
          amount: parseFloat(payment.amount || 0),
          paymentDate: new Date(),
          status: paymentStatus,
          paymentDetails: payment.paymentDetails || {},
          reference: payment.reference || null,
          notes: payment.notes || null,
          createdBy: req.user.id,
        }, { transaction: t });
      }
    }

    // Record voucher usage if voucher was applied
    if (voucherId) {
      await VoucherUsage.create({
        voucherId,
        userId: req.user.id,
        transactionId: order.id,
        discountAmount: voucherDiscount,
        originalAmount: orderSubtotal,
        finalAmount: totalAmount
      }, { transaction: t });
    }

    // Update table status if dine-in
    if (table) {
      await table.update({
        status: 'occupied',
        currentOrderId: order.id
      }, { transaction: t });
    }

    await t.commit();
    committed = true;

    // Reload with associations
    const createdOrder = await Transaction.findByPk(order.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: Voucher, as: 'voucher' },
        { model: RestaurantTable, as: 'table' },
        { model: Location, as: 'location' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    // Auto-print kitchen ticket if enabled
    const autoPrintKitchen = tenant?.settings?.transaction?.autoPrintKitchenTicket !== false;
    let kitchenPrintResult = null;
    let receiptPrintResult = null;

    if (autoPrintKitchen && createdOrder.items?.length > 0) {
      try {
        // Use split printing to route items to kitchen/bar printers based on productType
        kitchenPrintResult = await receiptPrinterService.printKitchenTicketsSplit(
          createdOrder,
          createdOrder.items,
          tenant
        );

        logger.logInfo('Kitchen tickets printed (split)', {
          action: 'PRINT_KITCHEN_SPLIT_SUCCESS',
          orderId: createdOrder.id,
          results: {
            food: kitchenPrintResult.food?.success || false,
            beverage: kitchenPrintResult.beverage?.success || false,
            overall: kitchenPrintResult.success
          },
          tenantId
        });
      } catch (printErr) {
        logger.logSecurity('Kitchen split print failed', {
          action: 'PRINT_KITCHEN_SPLIT_ERROR',
          error: printErr.message,
          orderId: createdOrder.id,
          tenantId
        });
      }
    }

    // Auto-print receipt if order is already completed (takeaway/delivery with payment)
    const autoPrintReceipt = tenant?.settings?.transaction?.autoPrintReceipt !== false;

    logger.logInfo('Checking receipt print conditions', {
      action: 'CREATE_ORDER_PRINT_CHECK',
      orderId: createdOrder.id,
      orderStatus: createdOrder.status,
      orderType: createdOrder.orderType,
      autoPrintReceipt,
      shouldPrint: autoPrintReceipt && createdOrder.status === 'completed',
      kitchenPrinted: kitchenPrintResult?.success,
      tenantId
    });

    if (autoPrintReceipt && createdOrder.status === 'completed') {
      try {
        // Add delay if kitchen ticket was printed (same printer needs time to process)
        if (kitchenPrintResult?.success) {
          logger.logInfo('Adding delay before receipt print', {
            action: 'PRINT_DELAY',
            orderId: createdOrder.id,
            delayMs: 1000,
            tenantId
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.logInfo('Starting receipt print', {
          action: 'RECEIPT_PRINT_START',
          orderId: createdOrder.id,
          tenantId
        });

        receiptPrintResult = await receiptPrinterService.printOrderReceipt(
          createdOrder,
          tenant
        );

        logger.logInfo('Receipt print result', {
          action: 'RECEIPT_PRINT_RESULT',
          orderId: createdOrder.id,
          success: receiptPrintResult?.success,
          message: receiptPrintResult?.message,
          skipped: receiptPrintResult?.skipped,
          error: receiptPrintResult?.error,
          printJobId: receiptPrintResult?.printJobId,
          tenantId
        });

        // Open cash drawer if payment includes cash
        if (receiptPrintResult?.success) {
          const hasCashPayment = payments.some(p => p.method === 'cash');
          if (hasCashPayment) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await receiptPrinterService.openCashDrawer(tenant);
          }
        }
      } catch (printErr) {
        logger.logSecurity('Receipt print failed', {
          action: 'PRINT_RECEIPT_ERROR',
          error: printErr.message,
          stack: printErr.stack,
          orderId: createdOrder.id,
          tenantId
        });
      }
    }

    // Broadcast queue update to SSE clients
    setImmediate(() => {
      broadcastQueueUpdate(tenantId, locationId);
      broadcastKitchenUpdate(tenantId, locationId);
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: createdOrder,
      print: {
        kitchenTicket: kitchenPrintResult,
        receipt: receiptPrintResult
      }
    });
  } catch (error) {
    try {
      if (!committed) await t.rollback();
    } catch (rollbackErr) {
      logger.error('Rollback failed in createOrder:', rollbackErr && rollbackErr.message ? rollbackErr.message : rollbackErr);
    }
    next(error);
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw createError('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const where = {
      id,
      transactionType: 'restaurant'
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({
      where,
      include: [
        { model: TransactionItem, as: 'items' },
        { model: RestaurantTable, as: 'table' }
      ],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!order) {
      throw createError('NOT_FOUND', 'Order not found');
    }

    // Handle status transitions
    const previousStatus = order.status;

    // If completing order, deduct stock
    if (status === 'completed' && previousStatus !== 'completed') {
      for (const item of order.items) {
        const product = await Product.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE });
        if (product && product.trackInventory) {
          await StockMovement.recordStockOut({
            tenantId: order.tenantId,
            productId: product.id,
            locationId: order.locationId,
            quantity: item.quantity,
            referenceType: 'restaurant_sale',
            referenceId: order.id,
            notes: `Sale from order ${order.transactionNumber}`,
            performedBy: req.user.id,
            transaction: t
          });
        }
      }
    }

    // Free up table if completing or cancelling
    if ((status === 'completed' || status === 'cancelled') && order.table) {
      await order.table.update({
        status: 'available',
        currentOrderId: null
      }, { transaction: t });
    }

    await order.update({
      status,
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
      ...(status === 'cancelled' ? { cancelledAt: new Date(), cancelledBy: req.user.id } : {})
    }, { transaction: t });

    await t.commit();

    // Broadcast queue update to SSE clients
    setImmediate(() => {
      broadcastQueueUpdate(order.tenantId, order.locationId);
      broadcastKitchenUpdate(order.tenantId, order.locationId);
    });

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        id: order.id,
        transactionNumber: order.transactionNumber,
        previousStatus,
        status
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Add items to existing order
 */
const addOrderItems = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    let { items } = req.body;

    // Normalize: accept single item object or items array
    if (!items && req.body.productId) {
      // Single item sent directly in body
      items = [{
        productId: req.body.productId,
        quantity: req.body.quantity,
        notes: req.body.notes,
        variantName: req.body.variantName,
        variantSku: req.body.variantSku,
        selectedVariant: req.body.selectedVariant,
        modifiers: req.body.modifiers,
        discount: req.body.discount
      }];
    } else if (items && !Array.isArray(items)) {
      // Single item sent as { items: { productId, ... } }
      items = [items];
    }

    if (!items || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'At least one item is required');
    }

    const where = {
      id,
      transactionType: 'restaurant'
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({
      where,
      include: [{ model: TransactionItem, as: 'items' }],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!order) {
      throw createError('NOT_FOUND', 'Order not found');
    }

    if (['completed', 'cancelled'].includes(order.status)) {
      throw createError('VALIDATION_ERROR', 'Cannot modify completed or cancelled orders');
    }

    let additionalTotal = 0;
    const newItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, tenantId: order.tenantId, isActive: true },
        transaction: t
      });

      if (!product) {
        throw createError('NOT_FOUND', `Product ${item.productId} not found`);
      }

      const quantity = parseInt(item.quantity) || 1;
  const { baseUnitPrice, selectedVariant, itemName } = buildOrderItemPricing(product, item);
  const unitPrice = baseUnitPrice;
      const itemSubtotal = unitPrice * quantity;
      const discountAmount = parseFloat(item.discount) || 0;
      const itemTotal = itemSubtotal - discountAmount;

      additionalTotal += itemTotal;

      const transactionItem = await TransactionItem.create({
        transactionId: order.id,
        tenantId: order.tenantId,
        itemType: 'product',
        itemId: product.id,
        itemName,
        itemSku: product.sku || null,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
        discountAmount,
        total: itemTotal,
        notes: item.notes || null,
        itemDetails: {
          modifiers: item.modifiers || [],
          productCategory: product.categoryId || null,
          basePrice: baseUnitPrice,
          variantName: selectedVariant?.name || null,
          variantSku: selectedVariant?.sku || null,
          selectedVariant: selectedVariant ? {
            name: selectedVariant.name,
            sku: selectedVariant.sku || null,
            price: baseUnitPrice
          } : undefined
        }
      }, { transaction: t });

      newItems.push(transactionItem);
    }

    // Recalculate ALL order totals from scratch (includes service charge, tax, rounding)
    const freshItems = await TransactionItem.findAll({
      where: { transactionId: order.id },
      transaction: t
    });
    const freshSubtotal = freshItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    const newTotals = await calculateRestaurantTotals(
      freshSubtotal,
      parseFloat(order.voucherDiscount) || 0,
      order.tenantId
    );

    await order.update({
      subtotal: freshSubtotal,
      serviceCharge: newTotals.serviceChargeAmount,
      tax: newTotals.taxAmount,
      roundingAmount: newTotals.roundingAmount || 0,
      totalAmount: newTotals.totalAmount
    }, { transaction: t });

    await t.commit();

    // Reload order with full associations
    const updatedOrder = await Transaction.findByPk(order.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: RestaurantTable, as: 'table' },
        { model: Location, as: 'location' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    // Print new items to kitchen/bar if requested
    const { printToKitchen } = req.body;
    let kitchenPrintResult = null;

    if (printToKitchen) {
      try {
        // Get tenant for printer settings
        const tenant = await Tenant.findByPk(order.tenantId);

        // Only print the newly added items (reload them with product association)
        const newItemIds = newItems.map(ni => ni.id);
        const newItemsWithProduct = updatedOrder.items.filter(i => newItemIds.includes(i.id));

        if (newItemsWithProduct.length > 0) {
          kitchenPrintResult = await receiptPrinterService.printKitchenTicketsSplit(
            updatedOrder,
            newItemsWithProduct,
            tenant
          );

          logger.logInfo('Kitchen tickets printed for added items', {
            action: 'PRINT_KITCHEN_ADD_ITEMS_SUCCESS',
            orderId: updatedOrder.id,
            newItemCount: newItemsWithProduct.length,
            results: {
              food: kitchenPrintResult.food?.success || false,
              beverage: kitchenPrintResult.beverage?.success || false,
              overall: kitchenPrintResult.success
            },
            tenantId: order.tenantId
          });
        }
      } catch (printErr) {
        logger.logSecurity('Kitchen print failed for added items', {
          action: 'PRINT_KITCHEN_ADD_ITEMS_ERROR',
          error: printErr.message,
          orderId: updatedOrder.id,
          tenantId: order.tenantId
        });
        kitchenPrintResult = { success: false, message: printErr.message };
      }
    }

    // Broadcast updates
    setImmediate(() => {
      broadcastQueueUpdate(order.tenantId, order.locationId);
      broadcastKitchenUpdate(order.tenantId, order.locationId);
    });

    res.json({
      success: true,
      message: 'Items added to order successfully',
      data: updatedOrder,
      print: {
        kitchenTicket: kitchenPrintResult
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Get orders by table
 */
const getOrdersByTable = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { tableId } = req.params;
    const { includeCompleted = false } = req.query;

    const where = {
      tableId,
      transactionType: 'restaurant'
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (includeCompleted !== 'true') {
      where.status = { [Op.notIn]: ['completed', 'cancelled', 'split', 'merged'] };
    }

    const orders = await Transaction.findAll({
      where,
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// In-memory SSE clients for kitchen display per tenant
// Map tenantId => Set of client objects { id, res, locationId }
const kitchenStreamClients = new Map();

/**
 * Fetch kitchen orders data for SSE clients.
 * Returns minimal fields suitable for kitchen display.
 */
const fetchKitchenData = async (tenantId, locationId, statuses) => {
  const where = {
    transactionType: 'restaurant',
    status: { [Op.in]: Array.isArray(statuses) && statuses.length ? statuses : ['pending', 'confirmed', 'preparing', 'ready', 'served'] }
  };

  if (tenantId) where.tenantId = tenantId;
  if (locationId) where.locationId = locationId;

  const orders = await Transaction.findAll({
    where,
    include: [
      { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] },
      { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber'] }
    ],
    order: [['createdAt', 'ASC']],
    attributes: ['id', 'transactionNumber', 'status', 'tableId', 'orderType', 'createdAt']
  });

  return orders.map(o => ({
    id: o.id,
    transactionNumber: o.transactionNumber,
    status: o.status,
    table: o.table ? { id: o.table.id, tableNumber: o.table.tableNumber } : null,
    items: (o.items || []).map(i => ({ id: i.id, name: i.itemName || (i.product && i.product.name) || 'Unknown', quantity: i.quantity })),
    orderType: o.orderType,
    createdAt: o.createdAt
  }));
};

/**
 * SSE stream for kitchen display (staff clients)
 * Uses `authenticateSSE` middleware so `req.user` may be present.
 */
const streamKitchenOrders = async (req, res, next) => {
  try {
    // Authenticated staff may connect (authenticateSSE middleware applied in route)
    const tenantId = req.user ? req.user.tenantId : null;
    const { locationId } = req.query;
    const statuses = req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : ['pending', 'confirmed', 'preparing', 'ready', 'served'];

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const client = { id: clientId, res, locationId: locationId || null };

    // Register client
    const set = kitchenStreamClients.get(tenantId) || new Set();
    set.add(client);
    kitchenStreamClients.set(tenantId, set);

    // Send initial payload
    const data = await fetchKitchenData(tenantId, locationId, statuses);
    res.write(`event: kitchen\n`);
    res.write(`data: ${JSON.stringify({ success: true, data })}\n\n`);

    // Heartbeat
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch (e) { /* ignore */ }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      const clients = kitchenStreamClients.get(tenantId);
      if (clients) {
        for (const c of clients) {
          if (c.id === clientId) clients.delete(c);
        }
        if (clients.size === 0) kitchenStreamClients.delete(tenantId);
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Broadcast kitchen updates to connected SSE clients for a tenant/location
 */
const broadcastKitchenUpdate = async (tenantId, locationId, statuses = ['pending', 'confirmed', 'preparing', 'ready', 'served']) => {
  try {
    const clients = kitchenStreamClients.get(tenantId);
    if (!clients || clients.size === 0) return;

    // Fetch latest kitchen data once
    const latest = await fetchKitchenData(tenantId, locationId, statuses);

    for (const client of Array.from(clients)) {
      try {
        // If client filtered by location, skip non-matching
        if (client.locationId && locationId && String(client.locationId) !== String(locationId)) continue;
        client.res.write(`event: kitchen\n`);
        client.res.write(`data: ${JSON.stringify({ success: true, data: latest })}\n\n`);
      } catch (err) {
        // remove broken client
        clients.delete(client);
      }
    }

    if (clients.size === 0) kitchenStreamClients.delete(tenantId);
  } catch (err) {
    logger.error('broadcastKitchenUpdate error:', err && err.message ? err.message : err);
  }
};

/**
 * Get kitchen display orders (preparing status)
 */
const getKitchenOrders = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    const where = {
      transactionType: 'restaurant',
      // Include pending, confirmed, preparing, and ready so kitchen receives
      // orders that are newly pending as well as those ready to be served.
      status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'served', 'ready'] }
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await Transaction.findAll({
      where,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }]
        },
        { model: RestaurantTable, as: 'table', attributes: ['id', 'tableNumber'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate voucher for restaurant order
 */
const validateVoucher = async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { code, amount } = req.body;

    if (!code) {
      throw createError('VOUCHER_CODE_REQUIRED');
    }

    // Find voucher
    const voucher = await Voucher.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        startDate: { [Op.lte]: new Date() },
        endDate: { [Op.gte]: new Date() },
        [Op.or]: [
          { tenantId },
          { scope: 'subscription' } // Global subscription vouchers
        ]
      }
    });

    if (!voucher) {
      throw createError('VOUCHER_NOT_FOUND', 'Voucher tidak ditemukan atau sudah tidak berlaku');
    }

    // Validate voucher has discount configured
    if (!voucher.type || voucher.value === null || voucher.value === undefined) {
      throw createError('VOUCHER_INVALID', 'Voucher tidak memiliki konfigurasi diskon yang valid');
    }

    // Check usage limit
    if (voucher.usageLimit) {
      const usageCount = await VoucherUsage.count({
        where: { voucherId: voucher.id }
      });
      if (usageCount >= voucher.usageLimit) {
        throw createError('VOUCHER_LIMIT_REACHED', 'Batas penggunaan voucher sudah tercapai');
      }
    }

    // Check minimum purchase
    if (voucher.minPurchaseAmount && amount < parseFloat(voucher.minPurchaseAmount)) {
      throw createError('VOUCHER_MINIMUM_NOT_MET', `Minimal pembelian untuk voucher ini adalah ${voucher.minPurchaseAmount}`);
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.type === 'percentage') {
      discountAmount = (amount * parseFloat(voucher.value)) / 100;
      if (voucher.maxDiscountAmount && discountAmount > parseFloat(voucher.maxDiscountAmount)) {
        discountAmount = parseFloat(voucher.maxDiscountAmount);
      }
    } else {
      discountAmount = parseFloat(voucher.value);
    }

    res.json({
      success: true,
      data: {
        voucher: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          type: voucher.type,
          value: voucher.value,
          maxDiscountAmount: voucher.maxDiscountAmount,
          minPurchaseAmount: voucher.minPurchaseAmount
        },
        discountAmount,
        finalAmount: Math.max(0, amount - discountAmount)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete order with payments (checkout)
 * Supports multiple payment methods and voucher
 */
const completeOrder = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { payments: paymentsBody, voucherCode, customerName, customerPhone, notes } = req.body;

    // Normalize legacy single-payment fields into the expected `payments` array
    let payments = paymentsBody;
    if ((!payments || !Array.isArray(payments) || payments.length === 0) && (req.body.paymentMethod || req.body.paymentAmount)) {
      payments = [{
        method: req.body.paymentMethod || 'cash',
        amount: parseFloat(req.body.paymentAmount || 0),
        reference: req.body.paymentReference || null,
        paymentDetails: req.body.paymentDetails || null
      }];
    }

    // Find order
    const order = await Transaction.findOne({
      where: {
        id,
        transactionType: 'restaurant',
        ...(!isSuperAdmin && { tenantId })
      },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: RestaurantTable, as: 'table' }
      ],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!order) {
      throw createError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    }

    if (order.status === 'completed' || order.status === 'paid') {
      throw createError('ORDER_ALREADY_COMPLETED', 'Order sudah dibayar');
    }

    if (order.status === 'cancelled') {
      throw createError('ORDER_CANCELLED', 'Order sudah dibatalkan');
    }

    // Get tenant settings for tax
    const tenant = await Tenant.findByPk(order.tenantId, { transaction: t });

    // Calculate subtotal from items or use existing
    let subtotal = order.items.reduce((sum, item) => sum + parseFloat(item.total || item.totalPrice || 0), 0);
    if (subtotal === 0) {
      subtotal = parseFloat(order.totalAmount) || 0;
    }

    // Round subtotal to smallest currency unit (Rupiah: integer)
    subtotal = Math.round(subtotal);

    // Apply voucher if provided (BEFORE tax calculation)
    let discountAmount = 0;
    let voucherId = null;

    if (voucherCode) {
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          [Op.or]: [
            { tenantId: order.tenantId },
            { scope: 'subscription' }
          ]
        },
        transaction: t,
        lock: true
      });

      if (!voucher) {
        throw createError('VOUCHER_NOT_FOUND', 'Voucher tidak ditemukan atau sudah tidak berlaku');
      }

      // Validate voucher has discount configured
      if (!voucher.type || voucher.value === null || voucher.value === undefined) {
        throw createError('VOUCHER_INVALID', 'Voucher tidak memiliki konfigurasi diskon yang valid');
      }

      // Check usage limit
      if (voucher.usageLimit) {
        const usageCount = await VoucherUsage.count({
          where: { voucherId: voucher.id },
          transaction: t
        });
        if (usageCount >= voucher.usageLimit) {
          throw createError('VOUCHER_LIMIT_REACHED', 'Batas penggunaan voucher sudah tercapai');
        }
      }

      // Check minimum purchase
      if (voucher.minPurchaseAmount && subtotal < parseFloat(voucher.minPurchaseAmount)) {
        throw createError('VOUCHER_MINIMUM_NOT_MET', `Minimal pembelian untuk voucher ini adalah ${voucher.minPurchaseAmount}`);
      }

      // Calculate discount
      if (voucher.type === 'percentage') {
        discountAmount = (subtotal * parseFloat(voucher.value || 0)) / 100;
        if (voucher.maxDiscountAmount && discountAmount > parseFloat(voucher.maxDiscountAmount)) {
          discountAmount = parseFloat(voucher.maxDiscountAmount);
        }
      } else {
        discountAmount = parseFloat(voucher.value || 0);
      }

      // Round discount immediately after calculation
      discountAmount = Math.round(discountAmount);

      voucherId = voucher.id;

      // Remove any previous voucher usage for this order before re-recording
      // (handles reopen + re-complete scenario)
      await VoucherUsage.destroy({
        where: { transactionId: order.id },
        transaction: t
      });

      // Record voucher usage (VoucherUsage hook auto-increments usageCount)
      await VoucherUsage.create({
        voucherId: voucher.id,
        userId,
        transactionId: order.id,
        discountAmount: discountAmount,
        originalAmount: subtotal,
        finalAmount: subtotal - discountAmount
      }, { transaction: t });
    }

    // Calculate totals with tax and service charge
    const totals = await calculateRestaurantTotals(subtotal, discountAmount, order.tenantId);
    const { subtotalAfterDiscount, serviceChargeAmount, taxAmount, totalAmount, roundingAmount } = totals;

    // Validate payments (skip for takeaway/delivery as they're already paid)
    const isPaidOrder = order.orderType === 'takeaway' || order.orderType === 'delivery';

    if (!isPaidOrder) {
      // Dine-in orders require payment at completion
      if (!payments || !Array.isArray(payments) || payments.length === 0) {
        throw createError('PAYMENT_REQUIRED', 'Minimal satu metode pembayaran diperlukan');
      }

      // Sum payments and round each payment amount
      const totalPayment = payments.reduce((sum, p) => sum + Math.round(parseFloat(p.amount || 0)), 0);
      // Allow payment of pre-rounding amount when business rounding rounds UP.
      // Non-cash methods (card, transfer) charge exact amounts so the rounding
      // adjustment is absorbed by the business, not passed to the customer.
      const totalBeforeRounding = totalAmount - Math.max(0, roundingAmount || 0);
      if (totalPayment < totalBeforeRounding) {
        // Provide detailed breakdown for debugging
        const breakdown = {
          subtotal: subtotal,
          discount: discountAmount,
          subtotalAfterDiscount: subtotalAfterDiscount,
          serviceCharge: serviceChargeAmount,
          tax: taxAmount,
          totalRequired: totalBeforeRounding,
          totalPaid: totalPayment,
          shortfall: totalBeforeRounding - totalPayment
        };

        logger.logSecurity('Insufficient payment attempt', {
          action: 'INSUFFICIENT_PAYMENT',
          orderId: order.id,
          orderNumber: order.transactionNumber,
          tenantId: order.tenantId,
          userId,
          breakdown
        });

        throw createError(
          'INSUFFICIENT_PAYMENT',
          `Total pembayaran kurang. Diperlukan: Rp ${totalBeforeRounding.toLocaleString('id-ID')}, Dibayar: Rp ${totalPayment.toLocaleString('id-ID')} (Kurang: Rp ${(totalBeforeRounding - totalPayment).toLocaleString('id-ID')})`,
          { breakdown }
        );
      }
    }

    // Remove any previous payment records for this order before creating new ones
    // (handles reopen + re-complete scenario to avoid double payments)
    // Use force: true (hard delete) to avoid unique constraint collisions on receiptNumber
    // since TransactionPayment uses paranoid soft-deletes and the unique index applies to all rows.
    await TransactionPayment.destroy({
      where: { transactionId: order.id },
      transaction: t,
      force: true
    });

    // Create payment records if payments provided
    if (payments && Array.isArray(payments) && payments.length > 0) {
      let totalPaid = 0;

      for (const payment of payments) {
        const paymentAmount = parseFloat(payment.amount);
        totalPaid += paymentAmount;

        await TransactionPayment.create({
          transactionId: order.id,
          paymentMethod: normalizePaymentMethod(payment.method),
          amount: paymentAmount,
          status: 'completed',
          notes: payment.reference || null,
          paymentDetails: payment.paymentDetails || {},
          createdBy: userId
        }, { transaction: t });
      }

      // Calculate change amount
      const changeAmount = Math.max(0, totalPaid - totalAmount);

      // Update order with payment info
      await order.update({
        paidAmount: totalPaid,
        changeAmount: changeAmount
      }, { transaction: t });
    }

    // Update order
    await order.update({
      status: 'completed',
      subtotal,
      serviceCharge: serviceChargeAmount,
      tax: taxAmount,
      voucherDiscount: discountAmount,
      voucherId,
      totalAmount,
      roundingAmount: roundingAmount || 0,
      customerName: customerName || order.customerName,
      customerPhone: customerPhone || order.customerPhone,
      notes: notes ? `${order.notes || ''}\n${notes}`.trim() : order.notes,
      completedAt: new Date()
    }, { transaction: t });

    // Deduct stock for all items
    // Check if stock was already deducted for this order (reopen + re-complete scenario)
    const existingStockMovements = await StockMovement.findAll({
      where: { referenceType: 'restaurant_sale', referenceId: order.id, movementType: 'out', tenantId: order.tenantId },
      transaction: t
    });
    const alreadyDeductedProductIds = new Set(existingStockMovements.map(m => m.productId));

    for (const item of order.items) {
      if (item.product && item.product.trackStock) {
        if (alreadyDeductedProductIds.has(item.productId)) {
          // Stock already deducted from previous completion, skip
          continue;
        }
        // Update product stock
        await Product.decrement('currentStock', {
          by: item.quantity,
          where: { id: item.productId },
          transaction: t
        });

        // Record stock movement
        await StockMovement.create({
          productId: item.productId,
          locationId: order.locationId,
          movementType: 'out',
          quantity: item.quantity,
          referenceType: 'restaurant_sale',
          referenceId: order.id,
          notes: `Penjualan order #${order.transactionNumber}`,
          performedBy: userId,
          tenantId: order.tenantId
        }, { transaction: t });
      }
    }

    // Release table if dine-in — but for split orders, only release when ALL siblings are done
    if (order.tableId) {
      let shouldReleaseTable = true;

      if (order.splitFromId) {
        // This is a split child order. Check if other siblings still pending
        const pendingSiblings = await Transaction.count({
          where: {
            splitFromId: order.splitFromId,
            id: { [Op.ne]: order.id },
            status: { [Op.notIn]: ['completed', 'paid', 'cancelled', 'split'] },
          },
          transaction: t,
        });
        shouldReleaseTable = pendingSiblings === 0;
      }

      if (shouldReleaseTable) {
        await RestaurantTable.update(
          { status: 'available', currentOrderId: null },
          { where: { id: order.tableId }, transaction: t }
        );
      }
    }

    await t.commit();

    // Reload order with payments
    const completedOrder = await Transaction.findByPk(order.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: RestaurantTable, as: 'table' },
        { model: Voucher, as: 'voucher' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    // Auto-print receipt if enabled — always print 2 copies
    const autoPrintReceipt = tenant?.settings?.transaction?.autoPrintReceipt !== false;
    const receiptCopies = tenant?.settings?.transaction?.receiptCopies ?? 2;
    let receiptPrintResult = null;

    if (autoPrintReceipt) {
      receiptPrintResult = await receiptPrinterService.printOrderReceipt(
        completedOrder,
        tenant,
        { copies: receiptCopies }
      );

      // Open cash drawer if payment includes cash
      const hasCashPayment = payments.some(p => p.method === 'cash');
      if (hasCashPayment && receiptPrintResult?.success) {
        await receiptPrinterService.openCashDrawer(tenant);
      }
    }

    res.json({
      success: true,
      message: 'Order berhasil diselesaikan',
      data: completedOrder,
      print: {
        receipt: receiptPrintResult
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Split bill - divide one order into multiple bills
 * Supports split by items or equal split
 *
 * Key behaviors:
 * - Original order → status='split', completedAt=now (effectively closed, excluded from active lists)
 * - Split child orders → splitFromId=originalOrder.id, status='pending'
 * - Table stays occupied until ALL split children are completed/cancelled
 * - Reports exclude original (status='split') to avoid double-counting
 */
const splitBill = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { splits, splitType = 'by_items' } = req.body;

    // Find original order
    const originalOrder = await Transaction.findOne({
      where: {
        id,
        transactionType: 'restaurant',
        ...(!isSuperAdmin && { tenantId })
      },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: RestaurantTable, as: 'table' }
      ],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!originalOrder) {
      throw createError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    }

    if (originalOrder.status === 'completed' || originalOrder.status === 'paid') {
      throw createError('ORDER_ALREADY_COMPLETED', 'Order sudah dibayar, tidak bisa di-split');
    }

    if (originalOrder.status === 'cancelled') {
      throw createError('ORDER_CANCELLED', 'Order sudah dibatalkan');
    }

    if (originalOrder.status === 'split') {
      throw createError('ORDER_ALREADY_SPLIT', 'Order sudah pernah di-split');
    }

    // Get tenant settings for invoice numbering
    const tenant = await Tenant.findByPk(originalOrder.tenantId, { transaction: t });
    const invoiceSettings = tenant?.settings?.transaction?.invoice || {};
    const orderPrefix = invoiceSettings.orderPrefix || 'ORD';
    const dateFormat = invoiceSettings.dateFormat || 'YYYYMM';
    const numberPadLength = invoiceSettings.numberPadLength || 4;
    const prefixSeparator = invoiceSettings.prefixSeparator || '-';

    const splitOrders = [];

    if (splitType === 'equal') {
      // Equal split - divide items as evenly as possible across N bills
      const numberOfSplits = parseInt(splits) || 2;

      if (numberOfSplits < 2 || numberOfSplits > 20) {
        throw createError('INVALID_SPLIT_COUNT', 'Jumlah split harus antara 2-20');
      }

      // Distribute items round-robin across splits
      const itemBuckets = Array.from({ length: numberOfSplits }, () => []);
      originalOrder.items.forEach((item, idx) => {
        itemBuckets[idx % numberOfSplits].push(item);
      });

      for (let i = 0; i < numberOfSplits; i++) {
        const bucketItems = itemBuckets[i];
        const splitSubtotal = bucketItems.reduce((sum, item) => sum + parseFloat(item.total || item.totalPrice || 0), 0);
        const splitTotals = await calculateRestaurantTotals(splitSubtotal, 0, originalOrder.tenantId);
        const { serviceChargeAmount: splitServiceCharge, taxAmount: splitTax, totalAmount: splitTotal, roundingAmount: splitRounding } = splitTotals;

        // Generate new transaction number
        const transactionNumber = await generateOrderNumber(originalOrder.tenantId, {
          prefix: orderPrefix,
          dateFormat,
          separator: prefixSeparator
        }, t);

        // Create split order linked to original
        const splitOrder = await Transaction.create({
          tenantId: originalOrder.tenantId,
          transactionNumber,
          transactionType: 'restaurant',
          orderType: originalOrder.orderType,
          tableId: originalOrder.tableId,
          locationId: originalOrder.locationId,
          splitFromId: originalOrder.id,
          status: 'pending',
          subtotal: splitSubtotal,
          serviceCharge: splitServiceCharge,
          tax: splitTax,
          roundingAmount: splitRounding || 0,
          totalAmount: splitTotal,
          customerName: originalOrder.customerName,
          customerPhone: originalOrder.customerPhone,
          notes: `Split ${i + 1}/${numberOfSplits} dari order #${originalOrder.transactionNumber}`,
          createdBy: userId
        }, { transaction: t });

        // Copy items to the split order
        for (const item of bucketItems) {
          await TransactionItem.create({
            transactionId: splitOrder.id,
            tenantId: originalOrder.tenantId,
            itemType: item.itemType || 'product',
            itemId: item.itemId || item.productId,
            itemName: item.itemName || item.product?.name || 'Unknown',
            itemSku: item.itemSku || item.product?.sku || null,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            subtotal: parseFloat(item.subtotal || item.totalPrice || (item.unitPrice * item.quantity)),
            discountAmount: parseFloat(item.discountAmount) || 0,
            total: parseFloat(item.total || item.totalPrice || (item.unitPrice * item.quantity)),
            notes: item.notes || null,
            itemDetails: item.itemDetails || {}
          }, { transaction: t });
        }

        splitOrders.push(splitOrder);
      }
    } else {
      // Split by items - each split specifies which items to include
      if (!splits || !Array.isArray(splits) || splits.length < 2) {
        throw createError('INVALID_SPLITS', 'Minimal 2 split dengan item yang ditentukan');
      }

      // Validate all items are accounted for
      const allItemIds = originalOrder.items.map(item => item.id);
      const assignedItemIds = new Set();

      for (const split of splits) {
        if (!split.itemIds || !Array.isArray(split.itemIds)) {
          throw createError('INVALID_SPLIT_ITEMS', 'Setiap split harus memiliki itemIds');
        }
        split.itemIds.forEach(id => {
          if (!allItemIds.includes(id)) {
            throw createError('INVALID_ITEM_ID', `Item ID ${id} tidak ada dalam order`);
          }
          if (assignedItemIds.has(id)) {
            throw createError('DUPLICATE_ITEM', `Item ID ${id} sudah diassign ke split lain`);
          }
          assignedItemIds.add(id);
        });
      }

      // Check all items are assigned
      if (assignedItemIds.size !== allItemIds.length) {
        throw createError('INCOMPLETE_SPLIT', 'Semua item harus diassign ke salah satu split');
      }

      // Create split orders
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const splitItems = originalOrder.items.filter(item => split.itemIds.includes(item.id));
        
        // Calculate split totals
        const splitSubtotal = splitItems.reduce((sum, item) => sum + parseFloat(item.total || item.totalPrice || 0), 0);
        const splitTotals = await calculateRestaurantTotals(splitSubtotal, 0, originalOrder.tenantId);
        const { serviceChargeAmount: splitServiceCharge, taxAmount: splitTax, totalAmount: splitTotal, roundingAmount: splitRounding } = splitTotals;

        // Generate new transaction number
        const transactionNumber = await generateOrderNumber(originalOrder.tenantId, {
          prefix: orderPrefix,
          dateFormat,
          separator: prefixSeparator
        }, t);

        // Create split order linked to original
        const splitOrder = await Transaction.create({
          tenantId: originalOrder.tenantId,
          transactionNumber,
          transactionType: 'restaurant',
          orderType: originalOrder.orderType,
          tableId: originalOrder.tableId,
          locationId: originalOrder.locationId,
          splitFromId: originalOrder.id,
          status: 'pending',
          subtotal: splitSubtotal,
          serviceCharge: splitServiceCharge,
          tax: splitTax,
          roundingAmount: splitRounding || 0,
          totalAmount: splitTotal,
          customerName: split.customerName || originalOrder.customerName,
          customerPhone: split.customerPhone || originalOrder.customerPhone,
          notes: `Split ${i + 1}/${splits.length} dari order #${originalOrder.transactionNumber}`,
          createdBy: userId
        }, { transaction: t });

        // Copy items to the split order
        for (const item of splitItems) {
          await TransactionItem.create({
            transactionId: splitOrder.id,
            tenantId: originalOrder.tenantId,
            itemType: item.itemType || 'product',
            itemId: item.itemId || item.productId,
            itemName: item.itemName || item.product?.name || 'Unknown',
            itemSku: item.itemSku || item.product?.sku || null,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unitPrice),
            subtotal: parseFloat(item.subtotal || item.totalPrice || (item.unitPrice * item.quantity)),
            discountAmount: parseFloat(item.discountAmount) || 0,
            total: parseFloat(item.total || item.totalPrice || (item.unitPrice * item.quantity)),
            notes: item.notes || null,
            itemDetails: item.itemDetails || {}
          }, { transaction: t });
        }

        splitOrders.push(splitOrder);
      }
    }

    // Mark original order as split (effectively closed - items are now on split orders)
    await originalOrder.update({
      status: 'split',
      completedAt: new Date(),
      notes: `${originalOrder.notes || ''}\nOrder di-split menjadi ${splitOrders.length} bill pada ${formatDateTime()}`.trim()
    }, { transaction: t });

    await t.commit();

    // Reload split orders with items
    const completedSplitOrders = await Transaction.findAll({
      where: { id: { [Op.in]: splitOrders.map(o => o.id) } },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: RestaurantTable, as: 'table' }
      ]
    });

    res.json({
      success: true,
      message: `Order berhasil di-split menjadi ${splitOrders.length} bill`,
      data: {
        originalOrder: {
          id: originalOrder.id,
          transactionNumber: originalOrder.transactionNumber,
          status: 'split'
        },
        splitOrders: completedSplitOrders
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Merge bills - combine multiple split orders back into one
 */
const mergeBills = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
      throw createError('INVALID_ORDER_IDS', 'Minimal 2 order untuk digabung');
    }

    // Find all orders
    const orders = await Transaction.findAll({
      where: {
        id: { [Op.in]: orderIds },
        transactionType: 'restaurant',
        ...(!isSuperAdmin && { tenantId })
      },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (orders.length !== orderIds.length) {
      throw createError('ORDERS_NOT_FOUND', 'Beberapa order tidak ditemukan');
    }

    // Validate all orders can be merged (same table, not completed)
    const tableIds = new Set(orders.map(o => o.tableId).filter(Boolean));
    if (tableIds.size > 1) {
      throw createError('DIFFERENT_TABLES', 'Order dari meja berbeda tidak bisa digabung');
    }

    for (const order of orders) {
      if (order.status === 'completed' || order.status === 'paid') {
        throw createError('ORDER_ALREADY_COMPLETED', `Order ${order.transactionNumber} sudah dibayar`);
      }
      if (order.status === 'cancelled') {
        throw createError('ORDER_CANCELLED', `Order ${order.transactionNumber} sudah dibatalkan`);
      }
    }

    // Get tenant settings for invoice numbering
    const tenant = await Tenant.findByPk(orders[0].tenantId, { transaction: t });
    const invoiceSettings = tenant?.settings?.transaction?.invoice || {};
    const orderPrefix = invoiceSettings.orderPrefix || 'ORD';
    const dateFormat = invoiceSettings.dateFormat || 'YYYYMM';
    const numberPadLength = invoiceSettings.numberPadLength || 4;
    const prefixSeparator = invoiceSettings.prefixSeparator || '-';

    // Generate new transaction number with tenant prefix
    const transactionNumber = await generateOrderNumber(orders[0].tenantId, {
      prefix: orderPrefix,
      dateFormat,
      separator: prefixSeparator
    }, t);

    // Calculate totals
    let allItems = [];
    orders.forEach(order => {
      allItems = allItems.concat(order.items);
    });

    const subtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total || item.totalPrice || 0), 0);
    const mergeTotals = await calculateRestaurantTotals(subtotal, 0, orders[0].tenantId);
    const { taxAmount, serviceChargeAmount: mergeServiceCharge, totalAmount: mergedTotalAmount, roundingAmount: mergeRounding } = mergeTotals;

    // Create merged order
    const mergedOrder = await Transaction.create({
      tenantId: orders[0].tenantId,
      transactionNumber,
      transactionType: 'restaurant',
      orderType: orders[0].orderType,
      tableId: orders[0].tableId,
      locationId: orders[0].locationId,
      status: 'confirmed',
      subtotal,
      tax: taxAmount,
      serviceCharge: mergeServiceCharge || 0,
      roundingAmount: mergeRounding || 0,
      totalAmount: mergedTotalAmount,
      customerName: orders[0].customerName,
      customerPhone: orders[0].customerPhone,
      notes: `Gabungan dari order: ${orders.map(o => o.transactionNumber).join(', ')}`,
      createdBy: userId
    }, { transaction: t });

    // Move all items to merged order
    for (const item of allItems) {
      await TransactionItem.create({
        transactionId: mergedOrder.id,
        tenantId: orders[0].tenantId,
        itemType: item.itemType || 'product',
        itemId: item.itemId || item.productId,
        itemName: item.itemName || item.product?.name || 'Unknown',
        itemSku: item.itemSku || item.product?.sku || null,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        subtotal: parseFloat(item.subtotal || item.totalPrice || (item.unitPrice * item.quantity)),
        discountAmount: parseFloat(item.discountAmount) || 0,
        total: parseFloat(item.total || item.totalPrice || (item.unitPrice * item.quantity)),
        notes: item.notes || null,
        itemDetails: item.itemDetails || {}
      }, { transaction: t });
    }

    // Mark original orders as merged
    for (const order of orders) {
      await order.update({
        status: 'merged',
        notes: `${order.notes || ''}\nDigabung ke order #${transactionNumber} pada ${formatDateTime()}`.trim()
      }, { transaction: t });
    }

    await t.commit();

    // Reload merged order
    const completedMergedOrder = await Transaction.findByPk(mergedOrder.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: RestaurantTable, as: 'table' }
      ]
    });

    res.json({
      success: true,
      message: 'Order berhasil digabung',
      data: completedMergedOrder
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Create direct order with immediate payment (quick sale)
 * Supports multiple payment methods and voucher
 */
const createDirectOrder = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, id: userId } = req.user;
    const {
      items,
      payments,
      voucherCode,
      orderType = 'takeaway',
      tableId,
      locationId,
      customerName,
      customerPhone,
      deliveryAddress,
      notes
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError('ITEMS_REQUIRED', 'Minimal satu item diperlukan');
    }

    // Validate payments
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      throw createError('PAYMENT_REQUIRED', 'Minimal satu metode pembayaran diperlukan');
    }

    // Get tenant settings for prefix
    const tenant = await Tenant.findByPk(tenantId, { transaction: t });
    const orderPrefix = tenant?.settings?.transaction?.invoice?.orderPrefix || 'ORD';

    // Validate and get products
    const productIds = items.map(item => item.productId);
    const products = await Product.findAll({
      where: {
        id: { [Op.in]: productIds },
        tenantId,
        isActive: true
      },
      transaction: t
    });

    if (products.length !== productIds.length) {
      throw createError('PRODUCT_NOT_FOUND', 'Beberapa produk tidak ditemukan atau tidak aktif');
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId);
      const quantity = parseInt(item.quantity) || 1;
      const { baseUnitPrice, selectedVariant, itemName } = buildOrderItemPricing(product, item);
      const unitPrice = baseUnitPrice;
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        quantity,
        unitPrice,
        totalPrice,
        notes: item.notes,
        variantName: selectedVariant?.name || null,
        variantSku: selectedVariant?.sku || null,
        itemName,
        product
      };
    });

    // Apply voucher if provided
    let discountAmount = 0;
    let voucherId = null;

    if (voucherCode) {
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          [Op.or]: [
            { tenantId },
            { scope: 'subscription' }
          ]
        },
        transaction: t,
        lock: true
      });

      if (!voucher) {
        throw createError('VOUCHER_NOT_FOUND', 'Voucher tidak ditemukan atau sudah tidak berlaku');
      }

      // Validate voucher has discount configured
      if (!voucher.type || voucher.value === null || voucher.value === undefined) {
        throw createError('VOUCHER_INVALID', 'Voucher tidak memiliki konfigurasi diskon yang valid');
      }

      // Check usage limit
      if (voucher.usageLimit) {
        const usageCount = await VoucherUsage.count({
          where: { voucherId: voucher.id },
          transaction: t
        });
        if (usageCount >= voucher.usageLimit) {
          throw createError('VOUCHER_LIMIT_REACHED', 'Batas penggunaan voucher sudah tercapai');
        }
      }

      // Check minimum purchase
      if (voucher.minPurchaseAmount && subtotal < parseFloat(voucher.minPurchaseAmount)) {
        throw createError('VOUCHER_MINIMUM_NOT_MET', `Minimal pembelian untuk voucher ini adalah ${voucher.minPurchaseAmount}`);
      }

      // Calculate discount
      if (voucher.type === 'percentage') {
        discountAmount = (subtotal * parseFloat(voucher.value)) / 100;
        if (voucher.maxDiscountAmount && discountAmount > parseFloat(voucher.maxDiscountAmount)) {
          discountAmount = parseFloat(voucher.maxDiscountAmount);
        }
      } else {
        discountAmount = parseFloat(voucher.value);
      }

      voucherId = voucher.id;
    }

    // Calculate totals with tax and service charge
    const totals = await calculateRestaurantTotals(subtotal, discountAmount, tenantId);
    const { subtotalAfterDiscount, serviceChargeAmount, taxAmount, totalAmount, roundingAmount } = totals;

    // Validate payment amount
    const totalPayment = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalBeforeRounding = totalAmount - Math.max(0, roundingAmount || 0);
    if (totalPayment < totalBeforeRounding) {
      throw createError('INSUFFICIENT_PAYMENT', `Total pembayaran kurang. Diperlukan: ${totalBeforeRounding}, Dibayar: ${totalPayment}`);
    }

    // Validate table if dine-in
    if (orderType === 'dine-in') {
      if (!tableId) {
        throw createError('TABLE_REQUIRED', 'Table ID diperlukan untuk dine-in');
      }

      const table = await RestaurantTable.findOne({
        where: { id: tableId, tenantId },
        transaction: t,
        lock: true
      });

      if (!table) {
        throw createError('TABLE_NOT_FOUND', 'Meja tidak ditemukan');
      }

      if (table.status !== 'available') {
        throw createError('TABLE_NOT_AVAILABLE', 'Meja tidak tersedia');
      }
    }

    // Generate transaction number with tenant prefix
    const transactionNumber = await generateOrderNumber(tenantId, {
      prefix: orderPrefix,
      dateFormat: 'YYYYMMDD',
      separator: '-'
    }, t);

    // Generate queue number for prepaid takeaway/dine-in orders
    const queueNumber = await generateQueueNumber(tenantId, t);

    // Create transaction - status 'paid' for prepaid orders (not 'completed' yet)
    const order = await Transaction.create({
      tenantId,
      transactionNumber,
      transactionType: 'restaurant',
      orderType,
      tableId: orderType === 'dine-in' ? tableId : null,
      locationId,
      status: 'paid', // Prepaid: paid -> preparing -> ready -> completed
      paymentTiming: 'prepaid',
      queueNumber,
      subtotal,
      serviceCharge: serviceChargeAmount,
      tax: taxAmount,
      voucherDiscount: discountAmount,
      voucherId,
      totalAmount,
      roundingAmount: roundingAmount || 0,
      paidAmount: totalPayment,
      changeAmount: totalPayment - totalAmount,
      customerName,
      customerPhone,
      notes,
      createdBy: userId
    }, { transaction: t });

    // Create order items
    for (const item of orderItems) {
      await TransactionItem.create({
        transactionId: order.id,
        tenantId,
        itemType: 'product',
        itemId: item.productId,
        itemName: item.product.name,
        itemSku: item.product.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.totalPrice,
        discountAmount: 0,
        total: item.totalPrice,
        notes: item.notes || null,
        itemDetails: {}
      }, { transaction: t });

      // Deduct stock
      if (item.product.trackStock) {
        await Product.decrement('currentStock', {
          by: item.quantity,
          where: { id: item.productId },
          transaction: t
        });

        await StockMovement.create({
          productId: item.productId,
          locationId,
          type: 'out',
          quantity: item.quantity,
          reference: `ORDER-${transactionNumber}`,
          notes: `Direct order #${transactionNumber}`,
          createdBy: userId,
          tenantId
        }, { transaction: t });
      }
    }

    // Create payment records
    for (const payment of payments) {
      await TransactionPayment.create({
        transactionId: order.id,
        paymentMethod: normalizePaymentMethod(payment.method),
        amount: parseFloat(payment.amount),
        status: 'completed',
        paymentDetails: payment.paymentDetails || {},
        notes: payment.reference || null,
        createdBy: userId
      }, { transaction: t });
    }

    // Record voucher usage (VoucherUsage hook auto-increments usageCount)
    if (voucherId) {
      await VoucherUsage.create({
        voucherId,
        userId,
        transactionId: order.id,
        discountAmount,
        originalAmount: subtotal,
        finalAmount: subtotal - discountAmount
      }, { transaction: t });
    }

    await t.commit();

    // Reload order
    const completedOrder = await Transaction.findByPk(order.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: Voucher, as: 'voucher' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    // Auto-print receipt
    const autoPrintReceipt = tenant?.settings?.transaction?.autoPrintReceipt !== false;
    let receiptPrintResult = null;

    if (autoPrintReceipt) {
      receiptPrintResult = await receiptPrinterService.printOrderReceipt(
        completedOrder,
        tenant
      );

      // Open cash drawer for cash payment
      const hasCashPayment = payments.some(p => p.method === 'cash');
      if (hasCashPayment && receiptPrintResult?.success) {
        await receiptPrinterService.openCashDrawer(tenant);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Direct order berhasil dibuat',
      data: completedOrder,
      print: {
        receipt: receiptPrintResult
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Print receipt for existing order
 */
const printReceipt = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { type = 'receipt' } = req.query; // 'receipt' or 'kitchen'

    // Find order with all details
    const order = await Transaction.findOne({
      where: {
        id,
        transactionType: 'restaurant',
        ...(!isSuperAdmin && { tenantId })
      },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: RestaurantTable, as: 'table' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!order) {
      throw createError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    }

    // Get tenant for printer settings
    const tenant = await Tenant.findByPk(order.tenantId);

    if (!tenant) {
      throw createError('TENANT_NOT_FOUND', 'Tenant tidak ditemukan');
    }

    let printResult;

    if (type === 'kitchen') {
      // Use split printing for kitchen tickets
      printResult = await receiptPrinterService.printKitchenTicketsSplit(
        order,
        order.items,
        tenant
      );

      // Log split print results
      logger.logInfo('Manual kitchen reprint (split)', {
        action: 'REPRINT_KITCHEN_SPLIT',
        orderId: order.id,
        results: {
          food: printResult.food?.success || false,
          beverage: printResult.beverage?.success || false,
          overall: printResult.success
        },
        userId,
        tenantId
      });
    } else {
      printResult = await receiptPrinterService.printOrderReceipt(
        order,
        tenant
      );
    }

    if (printResult.skipped) {
      return res.json({
        success: false,
        message: printResult.message,
        data: { skipped: true }
      });
    }

    if (printResult.error) {
      return res.status(500).json({
        success: false,
        message: `Gagal mencetak: ${printResult.message}`,
        data: { error: true }
      });
    }

    res.json({
      success: true,
      message: `${type === 'kitchen' ? 'Kitchen ticket' : 'Receipt'} berhasil dicetak`,
      data: printResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Open cash drawer
 */
const openDrawer = async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      throw createError('TENANT_NOT_FOUND', 'Tenant tidak ditemukan');
    }

    const result = await receiptPrinterService.openCashDrawer(tenant);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Cash drawer opened'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active queue list (for kitchen/counter display)
 * Shows takeaway orders that are paid but not yet completed
 */
const getQueueList = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId, status } = req.query;

    const where = {
      transactionType: 'restaurant',
      orderType: 'takeaway', // Only show takeaway orders in queue
      status: { [Op.in]: status ? [status] : ['pending', 'confirmed', 'paid', 'preparing', 'ready'] }
    };

    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    // Only show today's queue
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    where.createdAt = { [Op.gte]: startOfDay };

    const orders = await Transaction.findAll({
      where,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }]
        },
        { model: Location, as: 'location', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'ASC']],
      attributes: [
        'id', 'transactionNumber', 'queueNumber', 'status', 'orderType',
        'customerName', 'totalAmount', 'createdAt', 'queueCalledAt'
      ]
    });

    // Group by status for display
    const grouped = {
      new: orders.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status)),
      preparing: orders.filter(o => o.status === 'preparing'),
      ready: orders.filter(o => o.status === 'ready')
    };

    res.json({
      success: true,
      data: {
        orders,
        grouped,
        summary: {
          total: orders.length,
          new: grouped.new.length,
          preparing: grouped.preparing.length,
          ready: grouped.ready.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get queue display data (for customer-facing monitor)
 * Public endpoint showing queue status
 */
const getQueueDisplay = async (req, res, next) => {
  try {
    const { tenantId } = req.query; // Can be accessed without auth for display
    const { locationId } = req.query;

    if (!tenantId) {
      throw createError('VALIDATION_ERROR', 'tenantId is required');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const where = {
      tenantId,
      transactionType: 'restaurant',
      paymentTiming: 'prepaid',
      queueNumber: { [Op.ne]: null },
      status: { [Op.in]: ['preparing', 'ready'] },
      createdAt: { [Op.gte]: startOfDay }
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await Transaction.findAll({
      where,
      order: [['queueCalledAt', 'DESC'], ['createdAt', 'ASC']],
      attributes: ['id', 'queueNumber', 'status', 'queueCalledAt', 'createdAt']
    });

    const preparing = orders
      .filter(o => o.status === 'preparing')
      .map(o => o.queueNumber);

    const ready = orders
      .filter(o => o.status === 'ready')
      .map(o => o.queueNumber);

    // Get most recently called (now serving)
    const nowServing = orders
      .filter(o => o.status === 'ready' && o.queueCalledAt)
      .sort((a, b) => new Date(b.queueCalledAt) - new Date(a.queueCalledAt))
      .slice(0, 1)
      .map(o => o.queueNumber);

    res.json({
      success: true,
      data: {
        nowServing: nowServing[0] || null,
        ready,
        preparing,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update queue status (for kitchen staff)
 * Transitions: paid -> preparing -> ready -> completed
 */
const updateQueueStatus = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['preparing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      throw createError('VALIDATION_ERROR', `Status harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    const where = { id, transactionType: 'restaurant' };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({
      where,
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!order) {
      throw createError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    }

    if (!order.queueNumber) {
      throw createError('INVALID_OPERATION', 'Order ini bukan order antrian');
    }

    const previousStatus = order.status;

    // Validate status transition
    const validTransitions = {
      'paid': ['preparing'],
      'preparing': ['ready'],
      'ready': ['completed']
    };

    if (!validTransitions[previousStatus]?.includes(status)) {
      throw createError('INVALID_OPERATION', `Tidak bisa mengubah status dari ${previousStatus} ke ${status}`);
    }

    const updateData = { status };

    // If marking as ready, record the call time
    if (status === 'ready') {
      updateData.queueCalledAt = new Date();
    }

    // If completing, record completion time and deduct stock
    if (status === 'completed') {
      updateData.completedAt = new Date();

      // Deduct stock
      const items = await TransactionItem.findAll({
        where: { transactionId: order.id },
        include: [{ model: Product, as: 'product' }],
        transaction: t
      });

      for (const item of items) {
        if (item.product?.trackStock) {
          await Product.decrement('currentStock', {
            by: item.quantity,
            where: { id: item.itemId },
            transaction: t
          });

          await StockMovement.create({
            productId: item.itemId,
            locationId: order.locationId,
            type: 'out',
            quantity: item.quantity,
            reference: `ORDER-${order.transactionNumber}`,
            notes: `Queue order #${order.queueNumber}`,
            createdBy: userId,
            tenantId: order.tenantId
          }, { transaction: t });
        }
      }
    }

    await order.update(updateData, { transaction: t });
    await t.commit();

    // Broadcast queue update to SSE clients
    setImmediate(() => broadcastQueueUpdate(order.tenantId, order.locationId));

    res.json({
      success: true,
      message: `Queue ${order.queueNumber} status updated to ${status}`,
      data: {
        id: order.id,
        queueNumber: order.queueNumber,
        previousStatus,
        status,
        queueCalledAt: order.queueCalledAt
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * Call queue number (announce for pickup)
 * Sets queueCalledAt and can trigger display update
 */
const callQueueNumber = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id, transactionType: 'restaurant' };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({ where });

    if (!order) {
      throw createError('ORDER_NOT_FOUND', 'Order tidak ditemukan');
    }

    if (order.status !== 'ready') {
      throw createError('INVALID_OPERATION', 'Hanya order dengan status ready yang bisa dipanggil');
    }

    await order.update({ queueCalledAt: new Date() });

    // Broadcast queue update to SSE clients
    setImmediate(() => broadcastQueueUpdate(order.tenantId, order.locationId));

    res.json({
      success: true,
      message: `Nomor antrian ${order.queueNumber} dipanggil`,
      data: {
        queueNumber: order.queueNumber,
        calledAt: order.queueCalledAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// ===== SSE Queue Stream Management =====

/**
 * Store for SSE clients per tenant
 * Structure: { tenantId: Set<{ res, locationId }> }
 */
const queueStreamClients = new Map();

/**
 * Helper function to fetch queue data (takeaway orders only)
 */
const fetchQueueData = async (tenantId, locationId = null) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const where = {
    tenantId,
    transactionType: 'restaurant',
    orderType: 'takeaway', // Only show takeaway orders in queue
    status: { [Op.in]: ['pending', 'confirmed', 'paid', 'preparing', 'ready'] },
    createdAt: { [Op.gte]: startOfDay }
  };

  if (locationId) {
    where.locationId = locationId;
  }

  const orders = await Transaction.findAll({
    where,
    include: [
      {
        model: TransactionItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }]
      },
      { model: Location, as: 'location', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC']],
    attributes: [
      'id', 'transactionNumber', 'queueNumber', 'status', 'orderType',
      'customerName', 'totalAmount', 'createdAt', 'queueCalledAt'
    ]
  });

  const grouped = {
    new: orders.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status)),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready')
  };

  return {
    orders,
    grouped,
    summary: {
      total: orders.length,
      new: grouped.new.length,
      preparing: grouped.preparing.length,
      ready: grouped.ready.length
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * SSE endpoint for real-time queue updates
 * Client connects once and receives updates when queue changes
 */
const streamQueueList = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { locationId } = req.query;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial data
    const initialData = await fetchQueueData(tenantId, locationId);
    res.write(`event: queue\ndata: ${JSON.stringify(initialData)}\n\n`);

    // Register this client
    const clientId = `${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client = {
      id: clientId,
      res,
      locationId,
      tenantId,
      isSuperAdmin
    };

    if (!queueStreamClients.has(tenantId)) {
      queueStreamClients.set(tenantId, new Set());
    }
    queueStreamClients.get(tenantId).add(client);

    logger.info('SSE client connected for queue stream', {
      clientId,
      tenantId,
      locationId,
      totalClients: queueStreamClients.get(tenantId).size
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      const clients = queueStreamClients.get(tenantId);
      if (clients) {
        clients.delete(client);
        if (clients.size === 0) {
          queueStreamClients.delete(tenantId);
        }
      }
      logger.info('SSE client disconnected from queue stream', {
        clientId,
        tenantId,
        remainingClients: queueStreamClients.get(tenantId)?.size || 0
      });
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Broadcast queue update to all connected SSE clients for a tenant
 * Call this function after any queue-related changes (create, update status, etc.)
 */
const broadcastQueueUpdate = async (tenantId, locationId = null) => {
  const clients = queueStreamClients.get(tenantId);
  if (!clients || clients.size === 0) {
    return; // No connected clients
  }

  try {
    // Fetch queue data for authenticated clients
    const queueData = await fetchQueueData(tenantId, locationId);
    const queueMessage = `event: queue\ndata: ${JSON.stringify(queueData)}\n\n`;

    for (const client of clients) {
      try {
        // If locationId specified, only send to clients watching that location or all locations
        if (!locationId || !client.locationId || client.locationId === locationId) {
          if (client.isDisplayClient) {
            // Display clients get limited data via their own fetch function
            const displayData = await client.fetchData();
            client.res.write(`event: display\ndata: ${JSON.stringify(displayData)}\n\n`);
          } else {
            // Authenticated clients get full queue data
            client.res.write(queueMessage);
          }
        }
      } catch (err) {
        // Client disconnected, will be cleaned up
        logger.warn('Failed to send SSE message to client', { clientId: client.id, error: err.message });
      }
    }
  } catch (error) {
    logger.error('Error broadcasting queue update', { tenantId, error: error.message });
  }
};

/**
 * Get count of connected SSE clients (for monitoring)
 */
const getQueueStreamStats = (req, res) => {
  const stats = {};
  for (const [tenantId, clients] of queueStreamClients) {
    stats[tenantId] = clients.size;
  }
  res.json({
    success: true,
    data: {
      totalTenants: queueStreamClients.size,
      clientsByTenant: stats,
      totalClients: Object.values(stats).reduce((a, b) => a + b, 0)
    }
  });
};

/**
 * Public SSE endpoint for customer-facing queue display
 * No authentication required - uses tenantId from query param
 * Only shows limited data (queue numbers and status)
 */
const streamQueueDisplay = async (req, res, next) => {
  try {
    const { tenantId, locationId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required'
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for public display
    res.flushHeaders();

    // Helper to fetch display data (limited info for public)
    const fetchDisplayData = async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const where = {
        tenantId,
        transactionType: 'restaurant',
        orderType: 'takeaway', // Only show takeaway orders in queue display
        status: { [Op.in]: ['pending', 'confirmed', 'paid', 'preparing', 'ready'] },
        createdAt: { [Op.gte]: startOfDay }
      };

      if (locationId) {
        where.locationId = locationId;
      }

      const orders = await Transaction.findAll({
        where,
        order: [['queueCalledAt', 'DESC'], ['createdAt', 'ASC']],
        attributes: ['id', 'queueNumber', 'transactionNumber', 'status', 'orderType', 'queueCalledAt', 'createdAt']
      });

      const newOrders = orders.filter(o => ['pending', 'confirmed', 'paid'].includes(o.status));
      const preparing = orders.filter(o => o.status === 'preparing');
      const ready = orders.filter(o => o.status === 'ready');

      // Get most recently called (now serving)
      const nowServing = ready
        .filter(o => o.queueCalledAt)
        .sort((a, b) => new Date(b.queueCalledAt) - new Date(a.queueCalledAt))
        .slice(0, 1);

      return {
        nowServing: nowServing[0]?.queueNumber || nowServing[0]?.transactionNumber || null,
        new: newOrders.map(o => o.queueNumber || o.transactionNumber),
        preparing: preparing.map(o => o.queueNumber || o.transactionNumber),
        ready: ready.map(o => o.queueNumber || o.transactionNumber),
        summary: {
          total: orders.length,
          new: newOrders.length,
          preparing: preparing.length,
          ready: ready.length
        },
        timestamp: new Date().toISOString()
      };
    };

    // Send initial data
    const initialData = await fetchDisplayData();
    res.write(`event: display\ndata: ${JSON.stringify(initialData)}\n\n`);

    // Register this client
    const clientId = `display-${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client = {
      id: clientId,
      res,
      locationId,
      tenantId,
      isDisplayClient: true,
      fetchData: fetchDisplayData
    };

    if (!queueStreamClients.has(tenantId)) {
      queueStreamClients.set(tenantId, new Set());
    }
    queueStreamClients.get(tenantId).add(client);

    logger.info('SSE display client connected', {
      clientId,
      tenantId,
      locationId,
      totalClients: queueStreamClients.get(tenantId).size
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      const clients = queueStreamClients.get(tenantId);
      if (clients) {
        clients.delete(client);
        if (clients.size === 0) {
          queueStreamClients.delete(tenantId);
        }
      }
      logger.info('SSE display client disconnected', {
        clientId,
        tenantId,
        remainingClients: queueStreamClients.get(tenantId)?.size || 0
      });
    });

  } catch (error) {
    logger.error('Error in streamQueueDisplay', { error: error.message });
    next(error);
  }
};

/**
 * Update individual item status (for kitchen tracking)
 * PUT /api/v1/restaurant/orders/:orderId/items/:itemId/status
 */
const updateItemStatus = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find order
    const order = await Transaction.findOne({
      where: {
        id: orderId,
        tenantId,
        transactionType: 'restaurant'
      },
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [
            { model: Product, as: 'product' }
          ]
        },
        {
          model: RestaurantTable,
          as: 'table'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Find item
    const item = order.items.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in this order'
      });
    }

    // Update item status
    await item.update({ status });

    // Check if all items have the same status and update order status accordingly
    const allItemsStatus = order.items.map(i => i.id === itemId ? status : i.status);
    const allItemsReady = allItemsStatus.every(s => s === 'ready');
    const allItemsServed = allItemsStatus.every(s => s === 'served');
    const anyItemPreparing = allItemsStatus.some(s => s === 'preparing');

    let newOrderStatus = order.status;
    if (allItemsServed && order.status === 'completed') {
      newOrderStatus = 'completed'; // Keep completed if already paid
    } else if (allItemsReady) {
      newOrderStatus = 'ready';
    } else if (anyItemPreparing) {
      newOrderStatus = 'preparing';
    }

    if (newOrderStatus !== order.status) {
      await order.update({ status: newOrderStatus });
    }

    logger.info('Item status updated', {
      itemId,
      orderId,
      itemName: item.itemName,
      oldStatus: item.status,
      newStatus: status,
      orderStatus: newOrderStatus,
      tenantId,
      userId
    });

    // Broadcast kitchen update
    setImmediate(() => {
      broadcastKitchenUpdate(tenantId, order.locationId);
      broadcastQueueUpdate(tenantId, order.locationId);
    });

    res.json({
      success: true,
      message: 'Item status updated successfully',
      data: {
        itemId: item.id,
        itemName: item.itemName,
        status: status,
        orderStatus: newOrderStatus,
        order: {
          id: order.id,
          transactionNumber: order.transactionNumber,
          tableNumber: order.table?.tableNumber,
          orderType: order.orderType
        }
      }
    });
  } catch (err) {
    logger.error('Error updating item status', {
      error: err.message,
      stack: err.stack,
      orderId: req.params.orderId,
      itemId: req.params.itemId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Get items grouped by status (for kitchen view)
 * GET /api/v1/restaurant/orders/:orderId/items/grouped
 */
const getItemsGroupedByStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const tenantId = req.user.tenantId;

    const order = await Transaction.findOne({
      where: {
        id: orderId,
        tenantId,
        transactionType: 'restaurant'
      },
      include: [
        {
          model: TransactionItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        { model: RestaurantTable, as: 'table' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Group items by status
    const grouped = {
      pending: [],
      preparing: [],
      ready: [],
      served: [],
      cancelled: []
    };

    order.items.forEach(item => {
      const status = item.status || 'pending';
      grouped[status].push({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
        extras: item.itemDetails?.extras || [],
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku
        } : null
      });
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        transactionNumber: order.transactionNumber,
        tableNumber: order.table?.tableNumber,
        orderType: order.orderType,
        itemsByStatus: grouped
      }
    });
  } catch (err) {
    logger.error('Error getting items grouped by status', {
      error: err.message,
      stack: err.stack,
      orderId: req.params.orderId,
      tenantId: req.user.tenantId
    });
    next(err);
  }
};

/**
 * Transfer specific items (partial or full) from one order to another table.
 * If the target table has an active order, items are added to it.
 * If the target table is empty, a new order is created.
 *
 * POST /restaurant/orders/:id/transfer-items
 * Body: { items: [{ orderItemId, quantity }], targetTableId }
 */
const transferItems = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();
  let committed = false;

  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id: sourceOrderId } = req.params;
    const { items, targetTableId } = req.body;

    // ─── Input validation ──────────────────────────────────────────────
    if (!targetTableId) {
      throw createError('VALIDATION_ERROR', 'targetTableId is required');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError('VALIDATION_ERROR', 'items array is required and must not be empty');
    }
    for (const item of items) {
      if (!item.orderItemId) {
        throw createError('VALIDATION_ERROR', 'Each item must have orderItemId');
      }
      if (!item.quantity || parseInt(item.quantity) < 1) {
        throw createError('VALIDATION_ERROR', 'Each item must have a valid quantity >= 1');
      }
    }

    // ─── Lock & find source order ──────────────────────────────────────
    const sourceWhere = {
      id: sourceOrderId,
      transactionType: 'restaurant'
    };
    if (!isSuperAdmin) sourceWhere.tenantId = tenantId;

    const sourceOrder = await Transaction.findOne({
      where: sourceWhere,
      include: [{ model: TransactionItem, as: 'items' }],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    if (!sourceOrder) {
      throw createError('NOT_FOUND', 'Source order not found');
    }
    if (['completed', 'cancelled', 'paid'].includes(sourceOrder.status)) {
      throw createError('VALIDATION_ERROR', 'Cannot transfer items from a completed, paid, or cancelled order');
    }

    const effectiveTenantId = sourceOrder.tenantId;

    // ─── Lock & find target table ──────────────────────────────────────
    const targetTable = await RestaurantTable.findOne({
      where: { id: targetTableId, tenantId: effectiveTenantId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!targetTable) {
      throw createError('NOT_FOUND', 'Target table not found');
    }

    if (targetTableId === sourceOrder.tableId) {
      throw createError('VALIDATION_ERROR', 'Source and target table cannot be the same');
    }

    // ─── Load source table for human-readable notes ────────────────────
    const sourceTableForNotes = sourceOrder.tableId
      ? await RestaurantTable.findByPk(sourceOrder.tableId, { attributes: ['id', 'tableNumber', 'tableName'], transaction: t })
      : null;

    // ─── Find or create target order ───────────────────────────────────
    let targetOrder = await Transaction.findOne({
      where: {
        tableId: targetTableId,
        tenantId: effectiveTenantId,
        transactionType: 'restaurant',
        status: { [Op.notIn]: ['completed', 'cancelled', 'paid', 'split', 'merged'] }
      },
      include: [{ model: TransactionItem, as: 'items' }],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Transaction }
    });

    let newOrderCreated = false;

    if (!targetOrder) {
      // Get tenant settings for order number generation
      const tenant = await Tenant.findByPk(effectiveTenantId, { transaction: t });
      const invoiceSettings = tenant?.settings?.transaction?.invoice || {};
      const orderPrefix = invoiceSettings.orderPrefix || 'ORD';
      const dateFormat = invoiceSettings.dateFormat || 'YYYYMMDD';
      const prefixSeparator = invoiceSettings.prefixSeparator || '-';

      const transactionNumber = await generateOrderNumber(effectiveTenantId, {
        prefix: orderPrefix,
        dateFormat,
        separator: prefixSeparator
      }, t);

      targetOrder = await Transaction.create({
        tenantId: effectiveTenantId,
        transactionNumber,
        transactionType: 'restaurant',
        orderType: 'dine-in',
        tableId: targetTableId,
        locationId: sourceOrder.locationId,
        status: 'confirmed',
        subtotal: 0,
        tax: 0,
        totalAmount: 0,
        customerName: null,
        notes: `Pindahan dari ${tableLabel(sourceTableForNotes)}`,
        createdBy: userId
      }, { transaction: t });

      // Mark target table as occupied
      await targetTable.update({
        status: 'occupied',
        currentOrderId: targetOrder.id,
        occupiedAt: new Date(),
        occupiedBy: null
      }, { transaction: t });

      newOrderCreated = true;
    }

    // ─── Process each item to transfer ─────────────────────────────────
    let transferredTotal = 0;

    for (const transferSpec of items) {
      const { orderItemId, quantity: rawQuantity } = transferSpec;
      const transferQty = parseInt(rawQuantity);

      // Find the source item (must belong to source order)
      const sourceItem = sourceOrder.items.find(i => i.id === orderItemId);
      if (!sourceItem) {
        throw createError('NOT_FOUND', `Order item ${orderItemId} not found in source order`);
      }

      const sourceQty = parseInt(sourceItem.quantity);
      if (transferQty > sourceQty) {
        throw createError('VALIDATION_ERROR', `Cannot transfer ${transferQty} units of "${sourceItem.itemName}" - only ${sourceQty} available`);
      }

      // Calculate per-unit price and the transferred sub-total
      const unitPrice = parseFloat(sourceItem.unitPrice);
      const perUnitTotal = parseFloat(sourceItem.total) / sourceQty;
      const perUnitSubtotal = parseFloat(sourceItem.subtotal) / sourceQty;
      const transferredItemTotal = perUnitTotal * transferQty;
      const transferredItemSubtotal = perUnitSubtotal * transferQty;
      const transferredItemDiscount = (parseFloat(sourceItem.discountAmount) / sourceQty) * transferQty;

      transferredTotal += transferredItemTotal;

      if (transferQty === sourceQty) {
        // Move the entire item — destroy from source
        await TransactionItem.destroy({
          where: { id: sourceItem.id },
          transaction: t
        });
      } else {
        // Partial move — reduce quantity on source item
        const remainingQty = sourceQty - transferQty;
        const remainingSubtotal = parseFloat(sourceItem.subtotal) - transferredItemSubtotal;
        const remainingDiscount = parseFloat(sourceItem.discountAmount) - transferredItemDiscount;
        const remainingTotal = parseFloat(sourceItem.total) - transferredItemTotal;

        await TransactionItem.update({
          quantity: remainingQty,
          subtotal: remainingSubtotal,
          discountAmount: remainingDiscount,
          total: remainingTotal
        }, {
          where: { id: sourceItem.id },
          transaction: t
        });
      }

      // Add item to target order
      await TransactionItem.create({
        transactionId: targetOrder.id,
        tenantId: effectiveTenantId,
        itemType: sourceItem.itemType || 'product',
        itemId: sourceItem.itemId,
        itemName: sourceItem.itemName,
        itemSku: sourceItem.itemSku || null,
        quantity: transferQty,
        unitPrice,
        subtotal: transferredItemSubtotal,
        discountAmount: transferredItemDiscount,
        total: transferredItemTotal,
        notes: sourceItem.notes || null,
        itemDetails: sourceItem.itemDetails || {},
        status: sourceItem.status || 'pending'
      }, { transaction: t });
    }

    // ─── Recalculate source order totals ───────────────────────────────
    // Check remaining items after all transfers
    const remainingItemCount = await TransactionItem.count({
      where: { transactionId: sourceOrder.id },
      transaction: t
    });

    let sourceTableFreed = false;

    if (remainingItemCount === 0) {
      // All items moved — cancel the source order and release the source table
      await sourceOrder.update({
        subtotal: 0,
        totalAmount: 0,
        status: 'cancelled',
        notes: `${sourceOrder.notes ? sourceOrder.notes + '\n' : ''}Semua item dipindahkan ke ${tableLabel(targetTable)} pada ${formatDateTime()}`.trim()
      }, { transaction: t });

      if (sourceOrder.tableId) {
        const sourceTable = await RestaurantTable.findByPk(sourceOrder.tableId, {
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (sourceTable) {
          await sourceTable.update({
            status: 'available',
            currentOrderId: null,
            occupiedAt: null,
            occupiedBy: null
          }, { transaction: t });
          sourceTableFreed = true;
        }
      }
    } else {
      // Items remain on source — recalculate fully from DB
      const remainingItems = await TransactionItem.findAll({
        where: { transactionId: sourceOrder.id },
        transaction: t
      });
      const remainingSubtotal = remainingItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
      const sourceTotals = await calculateRestaurantTotals(
        remainingSubtotal,
        parseFloat(sourceOrder.voucherDiscount) || 0,
        effectiveTenantId
      );
      await sourceOrder.update({
        subtotal: remainingSubtotal,
        serviceCharge: sourceTotals.serviceChargeAmount,
        tax: sourceTotals.taxAmount,
        roundingAmount: sourceTotals.roundingAmount || 0,
        totalAmount: sourceTotals.totalAmount
      }, { transaction: t });
    }

    // ─── Recalculate target order totals (fully, from DB items) ────────
    const targetItems = await TransactionItem.findAll({
      where: { transactionId: targetOrder.id },
      transaction: t
    });
    const targetSubtotal = targetItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    const targetTotals = await calculateRestaurantTotals(
      targetSubtotal,
      parseFloat(targetOrder.voucherDiscount) || 0,
      effectiveTenantId
    );
    await targetOrder.update({
      subtotal: targetSubtotal,
      serviceCharge: targetTotals.serviceChargeAmount,
      tax: targetTotals.taxAmount,
      roundingAmount: targetTotals.roundingAmount || 0,
      totalAmount: targetTotals.totalAmount
    }, { transaction: t });

    await t.commit();
    committed = true;

    // ─── Reload both orders with full details ──────────────────────────
    const includeConfig = [
      { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
      { model: TransactionPayment, as: 'payments' },
      { model: RestaurantTable, as: 'table' },
      { model: Location, as: 'location' },
      { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ];

    const [updatedSource, updatedTarget] = await Promise.all([
      Transaction.findByPk(sourceOrder.id, { include: includeConfig }),
      Transaction.findByPk(targetOrder.id, { include: includeConfig })
    ]);

    logger.logInfo('Items transferred between tables', {
      action: 'TRANSFER_ITEMS',
      sourceOrderId: sourceOrder.id,
      targetOrderId: targetOrder.id,
      targetTableId,
      newOrderCreated,
      sourceTableFreed,
      itemsTransferred: items.length,
      transferredTotal,
      tenantId: effectiveTenantId,
      userId
    });

    res.json({
      success: true,
      message: `${items.length} item berhasil dipindahkan ke meja tujuan`,
      data: {
        sourceOrder: updatedSource,
        targetOrder: updatedTarget,
        newOrderCreated,
        sourceTableFreed
      }
    });
  } catch (error) {
    try {
      if (!committed) await t.rollback();
    } catch (rollbackErr) {
      logger.error('Rollback failed in transferItems:', rollbackErr && rollbackErr.message ? rollbackErr.message : rollbackErr);
    }
    next(error);
  }
};

/**
 * Move order to a different table
 * Releases the old table and occupies the new one atomically
 */
const moveTable = async (req, res, next) => {
  const t = await Transaction.sequelize.transaction();
  let committed = false;

  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;
    const { newTableId } = req.body;

    if (!newTableId) {
      throw createError('VALIDATION_ERROR', 'newTableId is required');
    }

    // Find the order
    const where = {
      id,
      transactionType: 'restaurant'
    };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const order = await Transaction.findOne({
      where,
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      throw createError('NOT_FOUND', 'Order not found');
    }

    // Validate order type and status
    if (order.orderType !== 'dine-in') {
      throw createError('VALIDATION_ERROR', 'Only dine-in orders can be moved to another table');
    }

    if (['completed', 'cancelled'].includes(order.status)) {
      throw createError('VALIDATION_ERROR', 'Cannot move a completed or cancelled order');
    }

    if (!order.tableId) {
      throw createError('VALIDATION_ERROR', 'Order does not have a table assigned');
    }

    if (order.tableId === newTableId) {
      throw createError('VALIDATION_ERROR', 'Order is already at this table');
    }

    // Find and validate the new table
    const newTable = await RestaurantTable.findOne({
      where: { id: newTableId, tenantId, isActive: true },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!newTable) {
      throw createError('NOT_FOUND', 'Target table not found');
    }

    if (newTable.status === 'occupied') {
      throw createError('VALIDATION_ERROR', 'Target table is already occupied');
    }

    // 1. Release old table
    const oldTable = await RestaurantTable.findByPk(order.tableId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (oldTable) {
      await oldTable.update({
        status: 'available',
        currentOrderId: null,
        occupiedAt: null,
        occupiedBy: null
      }, { transaction: t });
    }

    // 2. Update order tableId
    await order.update({ tableId: newTableId }, { transaction: t });

    // 3. Occupy new table
    await newTable.update({
      status: 'occupied',
      currentOrderId: order.id,
      occupiedAt: new Date(),
      occupiedBy: order.customerName || null
    }, { transaction: t });

    await t.commit();
    committed = true;

    // Reload with associations
    const updatedOrder = await Transaction.findByPk(order.id, {
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: RestaurantTable, as: 'table' },
        { model: Location, as: 'location' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    logger.logInfo('Order moved to new table', {
      action: 'MOVE_TABLE',
      orderId: order.id,
      oldTableId: oldTable?.id,
      newTableId: newTable.id,
      tenantId
    });

    res.json({
      success: true,
      message: 'Order moved to new table successfully',
      data: updatedOrder
    });
  } catch (error) {
    try {
      if (!committed) await t.rollback();
    } catch (rollbackErr) {
      logger.error('Rollback failed in moveTable:', rollbackErr && rollbackErr.message ? rollbackErr.message : rollbackErr);
    }
    next(error);
  }
};

/**
 * Get split child orders of a parent order
 */
const getSplitOrders = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Find the parent order
    const parentOrder = await Transaction.findOne({
      where,
      attributes: ['id', 'transactionNumber', 'status', 'totalAmount', 'splitFromId']
    });

    if (!parentOrder) {
      throw createError('NOT_FOUND', 'Order not found');
    }

    // Determine the actual parent ID
    // If this order itself has a splitFromId, it's a child — look for siblings from the same parent
    const parentId = parentOrder.splitFromId || parentOrder.id;

    // Find all split children via splitFromId
    let splitChildren = await Transaction.findAll({
      where: {
        splitFromId: parentId,
        ...(isSuperAdmin ? {} : { tenantId })
      },
      include: [
        { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: TransactionPayment, as: 'payments' },
        { model: RestaurantTable, as: 'table' },
        { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Fallback: if no children found via splitFromId (pre-fix data), search by notes
    if (splitChildren.length === 0 && parentOrder.status === 'split') {
      splitChildren = await Transaction.findAll({
        where: {
          notes: { [Op.like]: `%Split dari ${parentOrder.transactionNumber}%` },
          id: { [Op.ne]: parentOrder.id },
          ...(isSuperAdmin ? {} : { tenantId })
        },
        include: [
          { model: TransactionItem, as: 'items', include: [{ model: Product, as: 'product' }] },
          { model: TransactionPayment, as: 'payments' },
          { model: RestaurantTable, as: 'table' },
          { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    res.json({
      success: true,
      data: {
        parentOrder,
        splitOrders: splitChildren,
        totalSplits: splitChildren.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  addOrderItems,
  getOrdersByTable,
  getKitchenOrders,
  validateVoucher,
  completeOrder,
  splitBill,
  getSplitOrders,
  mergeBills,
  createDirectOrder,
  printReceipt,
  openDrawer,
  // Item status tracking
  updateItemStatus,
  getItemsGroupedByStatus,
  // Queue management
  getQueueList,
  getQueueDisplay,
  updateQueueStatus,
  callQueueNumber,
  // SSE Stream
  streamQueueList,
  streamQueueDisplay,
  broadcastQueueUpdate,
  // Kitchen SSE
  streamKitchenOrders,
  broadcastKitchenUpdate,
  getQueueStreamStats,
  // Table management
  moveTable,
  transferItems
};
