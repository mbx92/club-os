const {
  Transaction,
  TransactionItem,
  TransactionPayment,
  Product,
  Member,
  ServicePlan,
  User,
  Tenant,
  Voucher,
  VoucherUsage,
  ActiveService,
  RestaurantTable
} = require('../../../models');
const { Op, sequelize } = require('sequelize');
const { logAudit } = require('../../../utils/auditLogger');
const ConcurrencyUtils = require('../../../utils/concurrency');
const voucherService = require('../../../services/voucherService');
const transactionSettingsService = require('../../../services/transactionSettingsService');
const receiptPrinterService = require('../../../services/receiptPrinterService');
const logger = require('../../../utils/logger');
const { getClientIp, getUserAgent } = require('../../../utils/requestHelper');
const { createError } = require('../../../utils/errorCodes');
const { normalizePaymentMethod } = require('../../../utils/paymentMethodNormalizer');
const { REVENUE_RECOGNIZED_TRANSACTION_STATUSES } = require('../../../utils/reportingStatus');

function appendAuditNote(existingNotes, tag, note) {
  const entry = `[${tag} ${new Date().toISOString()}] ${note}`;
  return existingNotes ? `${existingNotes}\n${entry}` : entry;
}

function getProductVariants(product) {
  const rawVariants = Array.isArray(product?.productDetails?.variants)
    ? product.productDetails.variants
    : [];

  return rawVariants
    .map((variant, index) => {
      if (!variant || typeof variant !== 'object') {
        return null;
      }

      const name = typeof variant.name === 'string' ? variant.name.trim() : '';
      const sku = typeof variant.sku === 'string' ? variant.sku.trim() : '';
      const price = Number.parseFloat(variant.price);

      if ((!name && !sku) || Number.isNaN(price)) {
        return null;
      }

      return {
        ...variant,
        index,
        name,
        sku,
        price
      };
    })
    .filter(Boolean);
}

function collectVariantLookupValues(item) {
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
}

function resolveProductVariant(product, item) {
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
}

function getProductStockConfig(product) {
  if (typeof product?.trackInventory === 'boolean' || product?.stockQuantity !== undefined) {
    return {
      isTracked: Boolean(product.trackInventory),
      stockField: 'stockQuantity',
      availableStock: Number(product.stockQuantity || 0)
    };
  }

  return {
    isTracked: Boolean(product?.isTrackStock),
    stockField: 'stock',
    availableStock: Number(product?.stock || 0)
  };
}

/**
 * Create a new transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    // Use ConcurrencyUtils.withTransaction for proper isolation level
    return await ConcurrencyUtils.withTransaction(Transaction.sequelize, async (transaction) => {
      const {
        customerId,
        customerType = 'non-member',
        customerName,
        items,
        payments,
        notes,
        voucherCode
      } = req.body;
    
    // Get tenant ID from authenticated user
    const tenantId = req.user.tenantId;
    
    // Validate customer — store reference to avoid re-fetching later in the payment loop
    let memberObj = null;
    if (customerType === 'member' && customerId) {
      memberObj = await Member.findOne({
        where: { 
          id: customerId, 
          tenantId 
        },
        transaction
      });
      
      if (!memberObj) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return res.status(404).json({
          success: false,
          message: 'Member not found or does not belong to your tenant'
        });
      }
    }
    
    // Validate and apply voucher if provided (using centralized voucherService)
    let voucher = null;
    let voucherDiscount = 0;
    
    // ── Validate items in parallel ───────────────────────────────────────
    // All DB lookups fire simultaneously instead of sequentially.
    // Products are locked upfront (FOR UPDATE) to avoid a second findByPk
    // later for stock decrement.
    const _mkVErr = (msg, code = 400) => Object.assign(new Error(msg), { statusCode: code, isValidationError: true });

    const _itemFetchResults = await Promise.all(items.map(async (item) => {
      if (item.itemType === 'product') {
        const product = await Product.findOne({
          where: { id: item.itemId, tenantId, isActive: true },
          transaction,
          lock: transaction.LOCK.UPDATE   // lock upfront — skips duplicate findByPk for stock
        });
        if (!product) throw _mkVErr(`Product with ID ${item.itemId} not found or inactive`, 404);

        const { selectedVariant, explicitSelectionProvided, requestedValues } = resolveProductVariant(product, item);
        if (explicitSelectionProvided && !selectedVariant) {
          throw _mkVErr(
            `Selected variant for product ${product.name} was not found. Requested: ${requestedValues.join(', ')}`
          );
        }

        const stockConfig = getProductStockConfig(product);
        if (stockConfig.isTracked && stockConfig.availableStock < item.quantity) {
          throw _mkVErr(
            `Insufficient stock for product ${product.name}. Available: ${stockConfig.availableStock}, Required: ${item.quantity}`
          );
        }

        const itemDetails = {
          ...(item.itemDetails && typeof item.itemDetails === 'object' ? item.itemDetails : {}),
          sku: product.sku,
          category: product.category || null
        };

        if (selectedVariant) {
          itemDetails.selectedVariant = {
            name: selectedVariant.name,
            sku: selectedVariant.sku || null,
            price: selectedVariant.price
          };
        }

        return {
          item: {
            ...item,
            itemName: item.itemName || (selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name)
          },
          _product: product,
          _productStockField: stockConfig.stockField,
          _productIsTracked: stockConfig.isTracked,
          itemPrice: selectedVariant ? selectedVariant.price : parseFloat(product.price),
          itemDetails
        };

      } else if (item.itemType === 'service_plan') {
        const servicePlan = await ServicePlan.findOne({
          where: { id: item.itemId, tenantId, isActive: true },
          transaction
        });
        if (!servicePlan) throw _mkVErr(`Service plan with ID ${item.itemId} not found or inactive`, 404);
        return {
          item: { ...item, itemName: item.itemName || servicePlan.name },
          _servicePlan: servicePlan,
          itemPrice: parseFloat(servicePlan.price),
          itemDetails: {
            serviceType: servicePlan.serviceType,
            durationType: servicePlan.durationType,
            duration: servicePlan.duration || servicePlan.validityDays,
            sessions: servicePlan.sessions
          }
        };

      } else {
        throw _mkVErr(`Invalid item type: ${item.itemType}`);
      }
    }));

    // Assemble validated items and compute subtotal
    const validatedItems = _itemFetchResults.map(({ item, _product, _productStockField, _productIsTracked, itemPrice, itemDetails }) => {
      const itemSubtotal = itemPrice * item.quantity;
      return {
        ...item,
        itemName: item.itemName || `${item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)} #${item.itemId}`,
        unitPrice: itemPrice,
        subtotal: itemSubtotal,
        total: itemSubtotal,
        itemDetails,
        _product:     _product     || null,
        _productStockField: _productStockField || null,
        _productIsTracked: _productIsTracked || false,
      };
    });
    let subtotal = validatedItems.reduce((s, i) => s + i.subtotal, 0);
    
    // Apply voucher discount using centralized service (before tax calculation)
    if (voucherCode) {
      try {
        const voucherResult = await voucherService.applyVoucher(
          voucherCode,
          tenantId,
          subtotal, // Apply voucher to subtotal
          req.user.id,
          customerType === 'member' ? customerId : null,
          transaction
        );
        
        voucher = voucherResult.voucher;
        voucherDiscount = voucherResult.discount;
      } catch (voucherError) {
        if (transaction && !transaction.finished) {
          await transaction.rollback();
        }
        return res.status(voucherError.statusCode || 400).json({
          success: false,
          message: voucherError.message || 'Voucher validation failed'
        });
      }
    }

    // Calculate subtotal after voucher discount
    const subtotalAfterDiscount = subtotal - voucherDiscount;

    // Get tax configuration and calculate tax (POS doesn't have service charge, only restaurant does)
    const taxConfig = await transactionSettingsService.getTaxConfiguration(tenantId);
    let taxAmount = 0;
    if (taxConfig.taxEnable && taxConfig.taxPercentage > 0) {
      if (taxConfig.taxType === 'percentage') {
        taxAmount = (subtotalAfterDiscount * taxConfig.taxPercentage) / 100;
      } else {
        // Fixed tax
        taxAmount = taxConfig.taxPercentage;
      }
      taxAmount = Math.round(taxAmount);
    }

    // Calculate total amount with rounding
    const totalBeforeRounding = Math.round(subtotalAfterDiscount + taxAmount);
    const roundingConfig = await transactionSettingsService.getRoundingConfiguration(tenantId);
    const totalAmount = transactionSettingsService.applyRounding(totalBeforeRounding, roundingConfig);
    const roundingAmount = totalAmount - totalBeforeRounding;
    
    // Validate payments
    let totalPayment = 0;
    for (const payment of payments) {
      totalPayment += payment.amount;
    }
    
    if (totalPayment < totalAmount) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({
        success: false,
        message: 'Insufficient payment amount'
      });
    }
    
    // Generate transactionNumber explicitly (hook's generateUniqueSequence has arg mismatch)
    const _txPrefixMap = { pos: 'POS', restaurant: 'RST', gym: 'GYM', psychology: 'PSY' };
    const _txDate = new Date();
    const _txPrefix = `${_txPrefixMap['gym'] || 'GYM'}-${_txDate.getFullYear()}${String(_txDate.getMonth() + 1).padStart(2, '0')}${String(_txDate.getDate()).padStart(2, '0')}-`;
    const generatedTxNumber = await ConcurrencyUtils.generateUniqueSequence(
      Transaction,
      { tenantId, transactionNumber: { [Op.like]: `${_txPrefix}%` } },
      _txPrefix,
      'transactionNumber',
      transaction
    );

    // Create transaction
    const newTransaction = await Transaction.create({
      tenantId,
      transactionNumber: generatedTxNumber,
      transactionType: 'gym',
      customerId: customerType === 'member' ? customerId : null,
      customerType,
      customerName: customerType !== 'member' ? (customerName || null) : null,
      subtotal,
      serviceCharge: 0, // POS transaction doesn't have service charge
      tax: taxAmount,
      voucherId: voucher ? voucher.id : null,
      voucherDiscount,
      roundingAmount,
      totalAmount,
      paidAmount: totalPayment,
      changeAmount: Math.max(0, totalPayment - totalAmount),
      status: 'completed',
      completedAt: new Date(),
      notes,
      createdBy: req.user.id
    }, { transaction });
    
    // ── Create transaction items (bulk insert — one round-trip instead of N) ──
    const transactionItems = await TransactionItem.bulkCreate(
      validatedItems.map(item => ({
        transactionId: newTransaction.id,
        itemType:   item.itemType,
        itemId:     item.itemId,
        itemName:   item.itemName,
        quantity:   item.quantity,
        unitPrice:  item.unitPrice,
        subtotal:   item.subtotal,
        total:      item.total,
        notes:      item.notes || null,
        itemDetails: item.itemDetails
      })),
      { transaction, returning: true }
    );

    // Decrement stock for all tracked products in parallel (use already-locked _product)
    const _stockItems = validatedItems.filter(i => i.itemType === 'product' && i._product && i._productIsTracked && i._productStockField);
    if (_stockItems.length > 0) {
      await Promise.all(
        _stockItems.map(item =>
          ConcurrencyUtils.atomicDecrement(item._product, item._productStockField, item.quantity, 0, { transaction })
        )
      );
    }
    
    // Create transaction payments
    const transactionPayments = [];
    
    for (const payment of payments) {
      const transactionPayment = await TransactionPayment.create({
        transactionId: newTransaction.id,
        paymentMethod: normalizePaymentMethod(payment.paymentMethod),
        amount: payment.amount,
        paymentDate: payment.paymentDate || new Date(),
        status: 'completed',
        notes: payment.notes,
        paymentDetails: payment.paymentDetails || {},
        createdBy: req.user.id
      }, { transaction });
      
      transactionPayments.push(transactionPayment);
    }
    
    // Record voucher usage using centralized service (single call, outside payment loop)
    if (voucher) {
      // Increment usage count
      await voucherService.incrementVoucherUsage(voucher, transaction);
      
      // Create usage record
      await voucherService.createVoucherUsage({
        voucherId: voucher.id,
        transactionId: newTransaction.id,
        userId: req.user.id,
        memberId: customerType === 'member' ? customerId : null,
        discountAmount: voucherDiscount,
        originalAmount: totalAmount,
        finalAmount: finalAmount,
        usageDetails: {
          items: validatedItems.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: item.quantity
          }))
        }
      }, transaction);
    }
    
    // Log the action
    logAudit({
      action: 'CREATE_TRANSACTION',
      user: req.user,
      tenant: { name: req.user.tenant?.name || 'Unknown' },
      request: req,
      response: { statusCode: 201 },
      executionTime: 0
    });
    
    // Assemble response from already-in-memory objects — avoids a heavy 5-table
    // JOIN query (findByPk with includes) after the transaction commits.
    const responseTransaction = {
      ...newTransaction.toJSON(),
      member: memberObj
        ? { id: memberObj.id, firstName: memberObj.firstName, lastName: memberObj.lastName, email: memberObj.email, phone: memberObj.phone }
        : null,
      transactionItems: transactionItems.map((ti, idx) => {
        const vi = validatedItems[idx] || {};
        return {
          ...ti.toJSON(),
          product:    vi._product    ? { id: vi._product.id,    name: vi._product.name,    sku: vi._product.sku,       price: vi._product.price }    : null,
        };
      }),
      payments: transactionPayments.map(p => p.toJSON()),
      creator: {
        id:        req.user.id,
        firstName: req.user.firstName,
        lastName:  req.user.lastName,
        email:     req.user.email,
      },
    };

    return {
      transaction: responseTransaction
    };
  }).then(result => {
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: result
    });
  }).catch(error => {
    console.error('Error creating transaction:', error);

    // Handle item/customer validation errors (thrown inside Promise.all item loop)
    if (error.isValidationError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle optimistic locking errors
    if (error.message.includes('Optimistic locking error')) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: Record was modified by another transaction',
        error: error.message
      });
    }
    
    // Handle stock errors
    if (error.message.includes('Cannot decrement stock')) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for one or more products',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  });
} catch (error) {
  console.error('Unexpected error in createTransaction:', error);
  res.status(500).json({
    success: false,
    message: 'Failed to create transaction',
    error: error.message
  });
}
};

/**
 * Get all transactions for a tenant
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      customerType,
      startDate,
      endDate,
      search,
      transactionType,   // 'restaurant' | 'pos' | 'gym' | 'psychology' | 'gym_services'
      sortBy = 'transactionDate',
      sortOrder = 'DESC'
    } = req.query;
    
    // Build where clause
    const whereClause = { tenantId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customerType) {
      whereClause.customerType = customerType;
    }

    // transactionType filter
    // 'gym_services' is a convenience alias for non-restaurant types (pos, gym, psychology)
    if (transactionType) {
      if (transactionType === 'gym_services') {
        whereClause.transactionType = { [Op.in]: ['pos', 'gym', 'psychology'] };
      } else {
        whereClause.transactionType = transactionType;
      }
    }
    
    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)]
      };
    } else if (startDate) {
      whereClause.transactionDate = {
        [Op.gte]: new Date(`${startDate}T00:00:00.000Z`)
      };
    } else if (endDate) {
      whereClause.transactionDate = {
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
      };
    }

    // Validate and sanitize sortBy to prevent SQL injection
    const allowedSortFields = ['transactionDate', 'createdAt', 'totalAmount', 'status', 'transactionNumber', 'transactionType'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'transactionDate';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Find transactions with pagination (without Member include first)
    // Use simple query without includes for count to avoid JOIN issues
    const count = await Transaction.count({
      where: whereClause,
      distinct: true,
      col: 'id'
    });
    
    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: TransactionItem,
          as: 'transactionItems',
          attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'total'],
          required: false
        },
        {
          model: TransactionPayment,
          as: 'payments',
          attributes: ['id', 'paymentMethod', 'amount', 'paymentDate', 'status'],
          required: false
        }
      ],
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Get all transaction IDs to fetch related ActiveServices
    const transactionIds = transactions.map(t => t.id);
    
    // Fetch ActiveServices for these transactions
    let activeServices = [];
    if (transactionIds.length > 0) {
      activeServices = await ActiveService.findAll({
        where: {
          purchaseTransactionId: { [Op.in]: transactionIds }
        },
        attributes: ['id', 'purchaseTransactionId', 'servicePlanId', 'startDate', 'endDate', 'totalSessions', 'remainingSessions', 'status'],
        raw: true
      });
    }
    
    // Create map of transaction items to active services
    const activeServiceMap = {};
    activeServices.forEach(as => {
      if (!activeServiceMap[as.purchaseTransactionId]) {
        activeServiceMap[as.purchaseTransactionId] = [];
      }
      activeServiceMap[as.purchaseTransactionId].push(as);
    });
    
    // Manually fetch member data for transactions that have customerId
    const customerIds = transactions
      .filter(t => t.customerId && t.customerType === 'member')
      .map(t => String(t.customerId)); // Ensure string format for UUID
    
    let members = [];
    if (customerIds.length > 0) {
      // Use Op.in to safely query with UUID array
      const memberWhere = { 
        id: { [Op.in]: customerIds },
        tenantId 
      };
      
      // Add search filter if provided
      if (search) {
        memberWhere[Op.and] = [
          {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${search}%` } },
              { lastName: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } }
            ]
          }
        ];
      }
      
      members = await Member.findAll({
        where: memberWhere,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        raw: true
      });
    }
    
    // Create member map for easy lookup
    const memberMap = {};
    members.forEach(member => {
      memberMap[member.id] = member;
    });
    
    // Attach member data to transactions
    const transactionsWithMembers = transactions.map(transaction => {
      const transactionData = transaction.toJSON();
      
      // Attach member data
      if (transactionData.customerId && transactionData.customerType === 'member') {
        transactionData.member = memberMap[transactionData.customerId] || null;
      } else {
        transactionData.member = null;
      }
      
      // Attach ActiveService data to transaction items and filter out discount/tax items
      const relatedActiveServices = activeServiceMap[transactionData.id] || [];
      if (transactionData.transactionItems && transactionData.transactionItems.length > 0) {
        transactionData.transactionItems = transactionData.transactionItems
          .filter(item => item.itemType !== 'discount' && item.itemType !== 'tax') // Filter out discount/tax items
          .map(item => {
          // Find matching active service by servicePlanId
          if (item.itemType === 'service_plan' && item.itemId) {
            const matchingService = relatedActiveServices.find(as => as.servicePlanId === item.itemId);
            if (matchingService) {
              return {
                ...item,
                startDate: matchingService.startDate,
                endDate: matchingService.endDate,
                totalSessions: matchingService.totalSessions,
                remainingSessions: matchingService.remainingSessions,
                serviceStatus: matchingService.status
              };
            }
          }
          return item;
        });
      }

      // Move voucher discount info to payments (for frontend display)
      if (transactionData.payments && transactionData.payments.length > 0) {
        transactionData.payments = transactionData.payments.map(payment => ({
          ...payment,
          voucherDiscount: transactionData.voucherDiscount || 0
        }));
      }
      
      return transactionData;
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions: transactionsWithMembers,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        },
        filters: {
          transactionType: transactionType || null,
          status: status || null,
          sortBy: safeSortBy,
          sortOrder: safeSortOrder
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions',
      error: error.message
    });
  }
};

/**
 * Get a transaction by ID
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    
    const transaction = await Transaction.findOne({
      where: { 
        id, 
        tenantId 
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: TransactionItem,
          as: 'transactionItems',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'price', 'category'],
              required: false
            }
          ]
        },
        {
          model: TransactionPayment,
          as: 'payments'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Fetch related active services for this transaction
    const activeServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: id,
        tenantId
      },
      attributes: ['id', 'servicePlanId', 'serviceType', 'startDate', 'endDate', 'totalSessions', 'remainingSessions', 'status']
    });

    // Convert transaction to plain object and add active services info
    const transactionData = transaction.toJSON();
    
    // Add active services data to transaction items and filter out discount/tax items
    if (transactionData.transactionItems && transactionData.transactionItems.length > 0) {
      transactionData.transactionItems = transactionData.transactionItems
        .filter(item => item.itemType !== 'discount' && item.itemType !== 'tax') // Filter out discount/tax items
        .map(item => {
        // Find matching active service by servicePlanId
        if (item.itemType === 'service_plan' && item.itemId) {
          const matchingService = activeServices.find(as => as.servicePlanId === item.itemId);
          if (matchingService) {
            const now = new Date();
            const endDate = new Date(matchingService.endDate);
            const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            return {
              ...item,
              startDate: matchingService.startDate,
              endDate: matchingService.endDate,
              daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
              totalSessions: matchingService.totalSessions,
              remainingSessions: matchingService.remainingSessions,
              serviceStatus: matchingService.status,
              activeServiceId: matchingService.id
            };
          }
        }
        return item;
      });
    }

    // Add active services summary to response
    transactionData.activeServices = activeServices.map(service => {
      const now = new Date();
      const endDate = new Date(service.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      return {
        id: service.id,
        servicePlanId: service.servicePlanId,
        serviceType: service.serviceType,
        startDate: service.startDate,
        endDate: service.endDate,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        totalSessions: service.totalSessions,
        remainingSessions: service.remainingSessions,
        status: service.status
      };
    });

    // Move voucher discount info to payments (for frontend display)
    if (transactionData.payments && transactionData.payments.length > 0) {
      transactionData.payments = transactionData.payments.map(payment => ({
        ...payment,
        voucherDiscount: transactionData.voucherDiscount || 0
      }));
    }
    
    res.status(200).json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: transactionData
    });
  } catch (error) {
    console.error('Error retrieving transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction',
      error: error.message
    });
  }
};

/**
 * Update a transaction status
 */
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { status, version } = req.body;
    
    // Use retry logic for optimistic locking
    return await ConcurrencyUtils.withRetry(async () => {
      // Find the transaction with version check
      const transaction = await Transaction.findOne({
        where: {
          id,
          tenantId
        }
      });
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      // Update the transaction status with version check
      await transaction.update({
        status
      }, {
        version // Pass version for optimistic locking
      });
      
      // Log the action
      logAudit({
        action: 'UPDATE_TRANSACTION_STATUS',
        user: req.user,
        tenant: { name: req.user.tenant?.name || 'Unknown' },
        request: req,
        response: { statusCode: 200 },
        executionTime: 0
      });
      
      // Fetch the updated transaction with associations
      const updatedTransaction = await Transaction.findByPk(id, {
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
            {
                model: TransactionItem,
                as: 'transactionItems',
                include: [
                  {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'price']
                  }
                ]
              },
          {
            model: TransactionPayment,
            as: 'payments'
          }
        ]
      });
      
      return updatedTransaction;
    }).then(updatedTransaction => {
      res.status(200).json({
        success: true,
        message: 'Transaction status updated successfully',
        data: updatedTransaction
      });
    }).catch(error => {
      console.error('Error updating transaction status:', error);
      
      // Handle optimistic locking errors
      if (error.message.includes('Optimistic locking error')) {
        return res.status(409).json({
          success: false,
          message: 'Conflict: Transaction was modified by another transaction',
          error: error.message
        });
      }
      
      // Handle not found errors
      if (error.message === 'Transaction not found') {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction status',
        error: error.message
      });
    });
  } catch (error) {
    console.error('Unexpected error in updateTransactionStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction status',
      error: error.message
    });
  }
};

/**
 * Get transaction statistics for a tenant
 */
exports.getTransactionStatistics = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.transactionDate = {
        [Op.between]: [new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T23:59:59.999Z`)]
      };
    } else if (startDate) {
      dateFilter.transactionDate = {
        [Op.gte]: new Date(`${startDate}T00:00:00.000Z`)
      };
    } else if (endDate) {
      dateFilter.transactionDate = {
        [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
      };
    }
    
    // Get transaction statistics
    const transactions = await Transaction.findAll({
      where: { 
        tenantId,
        ...dateFilter
      },
      attributes: [
        'status',
        'customerType',
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('totalAmount')), 'totalAmount'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
      ],
      group: ['status', 'customerType'],
      raw: true
    });
    
    // Calculate overall statistics (exclude cancelled & refunded from revenue)
    const overallStats = await Transaction.findOne({
      where: { 
        tenantId,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        ...dateFilter
      },
      attributes: [
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('totalAmount')), 'totalRevenue'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'totalTransactions'],
        [Transaction.sequelize.fn('AVG', Transaction.sequelize.col('totalAmount')), 'averageAmount']
      ],
      raw: true
    });
    
    // Get daily statistics (exclude cancelled & refunded)
    const dailyStats = await Transaction.findAll({
      where: { 
        tenantId,
        status: { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES },
        ...dateFilter
      },
      attributes: [
        [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('transactionDate')), 'date'],
        [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('totalAmount')), 'totalAmount'],
        [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
      ],
      group: [Transaction.sequelize.fn('DATE', Transaction.sequelize.col('transactionDate'))],
      order: [[Transaction.sequelize.fn('DATE', Transaction.sequelize.col('transactionDate')), 'ASC']],
      raw: true
    });
    
    // Get top selling products and services
    const topItemsWhere = {
      itemType: { [Op.in]: ['product', 'service_plan'] }, // Include both product and service_plan
      '$transaction.tenantId$': tenantId,
      '$transaction.status$': { [Op.in]: REVENUE_RECOGNIZED_TRANSACTION_STATUSES } // Only count finalized revenue transactions
    };
    
    // Only add date filter if it exists
    if (dateFilter.transactionDate) {
      topItemsWhere['$transaction.transactionDate$'] = dateFilter.transactionDate;
    }
    
    const topProducts = await TransactionItem.findAll({
      where: topItemsWhere,
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: [],
          required: true
        }
      ],
      attributes: [
        'itemType',
        'itemId',
        'itemName',
        [TransactionItem.sequelize.fn('SUM', TransactionItem.sequelize.col('quantity')), 'totalQuantity'],
        [TransactionItem.sequelize.fn('SUM', TransactionItem.sequelize.col('total')), 'totalAmount']
      ],
      group: ['TransactionItem.itemType', 'TransactionItem.itemId', 'TransactionItem.itemName'],
      order: [[TransactionItem.sequelize.fn('SUM', TransactionItem.sequelize.col('total')), 'DESC']], // Order by total revenue
      limit: 10,
      raw: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Transaction statistics retrieved successfully',
      data: {
        overall: overallStats,
        byStatusAndCustomerType: transactions,
        daily: dailyStats,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error retrieving transaction statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction statistics',
      error: error.message
    });
  }
};

/**
 * Refund a transaction
 * - Cancel all active services associated with the transaction
 * - Update transaction status to refunded
 */
exports.refundTransaction = async (req, res) => {
  const t = await Transaction.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { notes } = req.body; // Changed from 'reason' to 'notes'

    if (!notes) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Refund notes is required',
        code: 'REFUND_REASON_REQUIRED'
      });
    }

    // Find the transaction (without include to avoid lock error)
    const transaction = await Transaction.findOne({
      where: { 
        id, 
        tenantId 
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }

    // Check if transaction can be refunded
    if (transaction.status === 'refunded') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Transaction is already refunded',
        code: 'ALREADY_REFUNDED'
      });
    }

    if (transaction.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot refund a cancelled transaction',
        code: 'CANNOT_REFUND_CANCELLED'
      });
    }

    // Find and cancel all active services related to this transaction
    const activeServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: id,
        tenantId,
        status: { [Op.in]: ['active', 'suspended'] }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    // Cancel each active service
    for (const service of activeServices) {
      service.status = 'cancelled';
      service.notes = service.notes 
        ? `${service.notes}\n[REFUNDED ${new Date().toISOString()}] Transaction refunded: ${notes}`
        : `[REFUNDED ${new Date().toISOString()}] Transaction refunded: ${notes}`;
      await service.save({ transaction: t });
    }

    // Update transaction status to refunded
    transaction.status = 'refunded';
    transaction.notes = transaction.notes
      ? `${transaction.notes}\n[REFUNDED ${new Date().toISOString()}] ${notes}`
      : `[REFUNDED ${new Date().toISOString()}] ${notes}`;
    await transaction.save({ transaction: t });

    // Log the action
    logAudit({
      action: 'REFUND_TRANSACTION',
      user: req.user,
      tenant: { name: req.user.tenant?.name || 'Unknown' },
      request: req,
      response: { statusCode: 200 },
      executionTime: 0
    });

    await t.commit();

    // Reload transaction with associations
    const refundedTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: TransactionItem,
          as: 'transactionItems'
        },
        {
          model: TransactionPayment,
          as: 'payments'
        }
      ]
    });

    // Get cancelled services
    const cancelledServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: id,
        tenantId
      }
    });

    logger.logInfo('Transaction refunded', {
      tenantId: req.user?.tenantId,
      action: 'REFUND_TRANSACTION',
      transactionId: id,
      cancelledServicesCount: activeServices.length,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    res.status(200).json({
      success: true,
      message: 'Transaction refunded successfully',
      data: {
        transaction: refundedTransaction,
        cancelledServices: cancelledServices.map(s => ({
          id: s.id,
          servicePlanId: s.servicePlanId,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      }
    });
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error('Error refunding transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refund transaction',
      error: error.message
    });
  }
};

/**
 * Cancel a transaction due to input mistake.
 * - Restores product stock for tracked items
 * - Cancels linked active services
 * - Marks transaction as cancelled
 */
exports.cancelTransaction = async (req, res) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { notes } = req.body;

    if (!notes) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cancellation notes is required',
        code: 'CANCELLATION_REASON_REQUIRED'
      });
    }

    const transaction = await Transaction.findOne({
      where: { id, tenantId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }

    if (transaction.transactionType !== 'gym') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only gym transactions can be cancelled from this endpoint',
        code: 'INVALID_TRANSACTION_TYPE'
      });
    }

    if (transaction.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Transaction is already cancelled',
        code: 'ALREADY_CANCELLED'
      });
    }

    if (['partially_refunded', 'split', 'merged'].includes(transaction.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a transaction with status ${transaction.status}`,
        code: 'INVALID_TRANSACTION_STATUS'
      });
    }

    const wasRefunded = transaction.status === 'refunded';

    const transactionItems = await TransactionItem.findAll({
      where: { transactionId: id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const payments = await TransactionPayment.findAll({
      where: { transactionId: id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const linkedServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: id,
        tenantId
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    const usedService = linkedServices.find(service => {
      if (service.totalSessions == null || service.remainingSessions == null) {
        return false;
      }
      return Number(service.remainingSessions) < Number(service.totalSessions);
    });

    if (usedService) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel transaction because one or more services have already been used',
        code: 'SERVICE_ALREADY_USED'
      });
    }

    const activeServices = linkedServices.filter(service => service.status !== 'cancelled');

    const restockedProducts = [];
    for (const item of transactionItems) {
      if (item.itemType !== 'product' || !item.itemId) {
        continue;
      }

      const product = await Product.findOne({
        where: { id: item.itemId, tenantId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!product || !product.isTrackStock) {
        continue;
      }

      const nextStock = Number(product.stock || 0) + Number(item.quantity || 0);
      await product.update({ stock: nextStock }, { transaction: t });
      restockedProducts.push({
        id: product.id,
        name: product.name,
        quantityRestored: Number(item.quantity || 0),
        stockAfter: nextStock
      });
    }

    for (const item of transactionItems) {
      item.status = 'cancelled';
      item.notes = appendAuditNote(item.notes, 'CANCELLED', notes);
      await item.save({ transaction: t });
    }

    for (const service of activeServices) {
      service.status = 'cancelled';
      service.notes = appendAuditNote(service.notes, 'CANCELLED', `Transaction cancelled: ${notes}`);
      await service.save({ transaction: t });
    }

    if (transaction.customerType === 'member' && transaction.customerId) {
      const member = await Member.findOne({
        where: { id: transaction.customerId, tenantId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (member) {
        const remainingActiveMembership = await ActiveService.count({
          where: {
            tenantId,
            memberId: member.id,
            serviceType: 'membership',
            status: 'active'
          },
          transaction: t
        });

        await member.update({
          membershipStatus: remainingActiveMembership > 0 ? 'active' : 'expired'
        }, { transaction: t });
      }
    }

    if (transaction.voucherId) {
      const voucherUsageRecords = await VoucherUsage.findAll({
        where: {
          voucherId: transaction.voucherId,
          transactionId: transaction.id
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      for (const usage of voucherUsageRecords) {
        await usage.destroy({ transaction: t });
      }

      const voucher = await Voucher.findOne({
        where: { id: transaction.voucherId },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (voucher) {
        const adjustment = voucherUsageRecords.length > 0 ? voucherUsageRecords.length + 1 : 1;
        await voucher.update({
          usageCount: Math.max(0, Number(voucher.usageCount || 0) - adjustment)
        }, { transaction: t });
      }
    }

    transaction.status = 'cancelled';
    transaction.cancelledAt = new Date();
    transaction.cancelledBy = req.user.id;
    transaction.notes = appendAuditNote(transaction.notes, 'CANCELLED', notes);
    await transaction.save({ transaction: t });

    logAudit({
      action: 'CANCEL_TRANSACTION',
      user: req.user,
      tenant: { name: req.user.tenant?.name || 'Unknown' },
      request: req,
      response: { statusCode: 200 },
      executionTime: 0
    });

    await t.commit();

    const cancelledTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: TransactionItem,
          as: 'transactionItems'
        },
        {
          model: TransactionPayment,
          as: 'payments'
        }
      ]
    });

    logger.logInfo('Transaction cancelled', {
      tenantId,
      action: 'CANCEL_TRANSACTION',
      transactionId: id,
      wasRefunded,
      cancelledServicesCount: activeServices.length,
      restockedProductsCount: restockedProducts.length,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.status(200).json({
      success: true,
      message: wasRefunded
        ? 'Refunded transaction converted to cancelled successfully'
        : 'Transaction cancelled successfully',
      data: {
        transaction: cancelledTransaction,
        wasRefunded,
        cancelledServices: activeServices.map(service => ({
          id: service.id,
          servicePlanId: service.servicePlanId,
          status: service.status,
          startDate: service.startDate,
          endDate: service.endDate
        })),
        restockedProducts
      }
    });
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }

    logger.logError('Error cancelling transaction', {
      action: 'CANCEL_TRANSACTION_ERROR',
      transactionId: req.params.id,
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to cancel transaction',
      error: error.message
    });
  }
};

/**
 * Refund selected items from a transaction (partial refund)
 * POST /transactions/:id/refund-items
 *
 * Cancels only the specified TransactionItems and their linked ActiveServices.
 * Updates transaction status to 'partially_refunded' or 'refunded' depending on
 * whether all items are refunded.
 */
exports.refundItems = async (req, res) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { itemIds, notes } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'itemIds array is required and must not be empty', code: 'ITEM_IDS_REQUIRED' });
    }

    if (!notes) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'notes is required', code: 'NOTES_REQUIRED' });
    }

    // Lock the transaction
    const transaction = await Transaction.findOne({
      where: { id, tenantId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' });
    }

    if (transaction.status === 'refunded') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Transaction is already fully refunded', code: 'ALREADY_REFUNDED' });
    }

    if (transaction.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot refund a cancelled transaction', code: 'CANNOT_REFUND_CANCELLED' });
    }

    // Fetch the requested items and verify they belong to this transaction
    const itemsToRefund = await TransactionItem.findAll({
      where: {
        id: { [Op.in]: itemIds },
        transactionId: id
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (itemsToRefund.length !== itemIds.length) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more itemIds not found in this transaction',
        code: 'INVALID_ITEM_IDS'
      });
    }

    // Check none are already refunded
    const alreadyRefunded = itemsToRefund.filter(i => i.isRefunded);
    if (alreadyRefunded.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Items already refunded: ${alreadyRefunded.map(i => i.itemName).join(', ')}`,
        code: 'ITEMS_ALREADY_REFUNDED',
        data: { alreadyRefundedIds: alreadyRefunded.map(i => i.id) }
      });
    }

    const now = new Date();
    const refundedItems = [];
    const cancelledServices = [];

    // Process each item
    for (const item of itemsToRefund) {
      // Cancel linked active service (if service_plan type)
      if (item.itemType === 'service_plan' && item.itemId) {
        const activeService = await ActiveService.findOne({
          where: {
            purchaseTransactionId: id,
            servicePlanId: item.itemId,
            tenantId,
            status: { [Op.in]: ['active', 'suspended', 'depleted'] }
          },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (activeService) {
          activeService.status = 'cancelled';
          activeService.notes = activeService.notes
            ? `${activeService.notes}\n[REFUNDED ${now.toISOString()}] Item refund: ${notes}`
            : `[REFUNDED ${now.toISOString()}] Item refund: ${notes}`;
          await activeService.save({ transaction: t });
          cancelledServices.push(activeService);
        }
      }

      // Mark item as refunded
      item.isRefunded = true;
      item.refundedAt = now;
      item.status = 'cancelled';
      item.notes = item.notes
        ? `${item.notes}\n[REFUNDED ${now.toISOString()}] ${notes}`
        : `[REFUNDED ${now.toISOString()}] ${notes}`;
      await item.save({ transaction: t });
      refundedItems.push(item);
    }

    // Determine new transaction status
    const allItems = await TransactionItem.findAll({
      where: {
        transactionId: id,
        itemType: { [Op.notIn]: ['discount', 'tax'] }
      },
      transaction: t
    });

    const allRefunded = allItems.every(i => i.isRefunded || i.status === 'cancelled');
    const newStatus = allRefunded ? 'refunded' : 'partially_refunded';

    transaction.status = newStatus;
    transaction.notes = transaction.notes
      ? `${transaction.notes}\n[${newStatus.toUpperCase()} ${now.toISOString()}] ${notes}`
      : `[${newStatus.toUpperCase()} ${now.toISOString()}] ${notes}`;
    await transaction.save({ transaction: t });

    logAudit({
      action: 'REFUND_ITEMS',
      user: req.user,
      tenant: { name: req.user.tenant?.name || 'Unknown' },
      request: req,
      response: { statusCode: 200 },
      executionTime: 0
    });

    await t.commit();

    logger.logInfo('Transaction items refunded', {
      action: 'REFUND_TRANSACTION_ITEMS',
      transactionId: id,
      newStatus,
      refundedItemsCount: refundedItems.length,
      cancelledServicesCount: cancelledServices.length,
      tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path
    });

    // Reload transaction
    const updatedTransaction = await Transaction.findByPk(id, {
      include: [
        { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        { model: TransactionItem, as: 'transactionItems' },
        { model: TransactionPayment, as: 'payments' }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Selected items refunded successfully',
      data: {
        transaction: updatedTransaction,
        cancelledServices: cancelledServices.map(s => ({
          id: s.id,
          servicePlanId: s.servicePlanId,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate
        })),
        refundedItems: refundedItems.map(i => ({
          id: i.id,
          itemName: i.itemName,
          total: parseFloat(i.total)
        }))
      }
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    logger.logError('Error refunding transaction items', {
      action: 'REFUND_TRANSACTION_ITEMS_ERROR',
      transactionId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ success: false, message: 'Failed to refund items', error: error.message });
  }
};

/**
 * Pre-print payment receipt for a transaction
 * Prints a receipt/bill to the configured thermal printer
 * Can be used before payment (pre-print/bill) or after payment (receipt)
 * 
 * Supports optional body params for discount override (when voucher is entered in frontend modal):
 * @body {string} voucherCode - Voucher code to validate and apply discount
 * @body {number} discountAmount - Direct discount amount override (used if voucherCode not provided)
 * @body {Array} payments - Payment methods override for display on receipt
 */
exports.prePrintPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.isSuperAdmin;
    const { voucherCode, discountAmount, payments: bodyPayments } = req.body;

    // Find the transaction with all related data
    const transaction = await Transaction.findOne({
      where: {
        id,
        ...(!isSuperAdmin && { tenantId })
      },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: TransactionItem,
          as: 'transactionItems',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'price', 'category'],
              required: false
            }
          ]
        },
        {
          model: TransactionPayment,
          as: 'payments'
        },
        {
          model: Voucher,
          as: 'voucher',
          attributes: ['id', 'code', 'name', 'type', 'value', 'maxDiscountAmount'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: RestaurantTable,
          as: 'table',
          attributes: ['id', 'tableNumber', 'tableName'],
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Fetch related active services for this transaction
    const activeServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: id,
        tenantId: transaction.tenantId
      },
      attributes: ['id', 'servicePlanId', 'serviceType', 'startDate', 'endDate', 'totalSessions', 'remainingSessions', 'status']
    });

    // Enrich transaction items with active service info
    const transactionData = transaction.toJSON();
    if (transactionData.transactionItems && transactionData.transactionItems.length > 0) {
      transactionData.transactionItems = transactionData.transactionItems
        .filter(item => item.itemType !== 'discount' && item.itemType !== 'tax')
        .map(item => {
          if (item.itemType === 'service_plan' && item.itemId) {
            const matchingService = activeServices.find(as => as.servicePlanId === item.itemId);
            if (matchingService) {
              return {
                ...item,
                startDate: matchingService.startDate,
                endDate: matchingService.endDate,
                totalSessions: matchingService.totalSessions,
                remainingSessions: matchingService.remainingSessions,
                serviceStatus: matchingService.status,
                activeServiceId: matchingService.id
              };
            }
          }
          return item;
        });
    }

    // Get tenant with settings for printer configuration
    const tenant = await Tenant.findByPk(transaction.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Override discount from request body (frontend modal voucher input)
    if (voucherCode) {
      // Validate voucher and calculate discount
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode.toUpperCase(),
          isActive: true,
          startDate: { [Op.lte]: new Date() },
          endDate: { [Op.gte]: new Date() },
          [Op.or]: [
            { tenantId },
            { tenantId: null, scope: 'subscription' }
          ]
        }
      });

      if (voucher) {
        const subtotal = parseFloat(transactionData.subtotal || 0);
        let calculatedDiscount = 0;

        if (voucher.type === 'percentage') {
          calculatedDiscount = (subtotal * parseFloat(voucher.value || 0)) / 100;
          if (voucher.maxDiscountAmount && calculatedDiscount > parseFloat(voucher.maxDiscountAmount)) {
            calculatedDiscount = parseFloat(voucher.maxDiscountAmount);
          }
        } else if (voucher.type === 'fixed') {
          calculatedDiscount = parseFloat(voucher.value || 0);
          if (calculatedDiscount > subtotal) {
            calculatedDiscount = subtotal;
          }
        }

        calculatedDiscount = Math.round(calculatedDiscount);

        // Override transactionData with voucher info
        transactionData.voucherDiscount = calculatedDiscount;
        transactionData.voucher = {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          type: voucher.type,
          value: voucher.value
        };

        // Recalculate total
        const tax = parseFloat(transactionData.tax || 0);
        const serviceCharge = parseFloat(transactionData.serviceCharge || 0);
        transactionData.totalAmount = Math.round(subtotal - calculatedDiscount + tax + serviceCharge);
      }
    } else if (discountAmount !== undefined && discountAmount !== null && parseFloat(discountAmount) > 0) {
      // Direct discount override (no voucher code, just amount)
      const overrideDiscount = Math.round(parseFloat(discountAmount));
      transactionData.voucherDiscount = overrideDiscount;

      // Recalculate total
      const subtotal = parseFloat(transactionData.subtotal || 0);
      const tax = parseFloat(transactionData.tax || 0);
      const serviceCharge = parseFloat(transactionData.serviceCharge || 0);
      transactionData.totalAmount = Math.round(subtotal - overrideDiscount + tax + serviceCharge);
    }

    // Override payments from body if provided (for pre-print display)
    if (bodyPayments && Array.isArray(bodyPayments) && bodyPayments.length > 0) {
      transactionData.payments = bodyPayments.map(p => ({
        paymentMethod: p.method || p.paymentMethod || 'cash',
        amount: parseFloat(p.amount || 0)
      }));
      transactionData.paidAmount = bodyPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      transactionData.changeAmount = Math.max(0, transactionData.paidAmount - transactionData.totalAmount);
    }

    // Print the receipt
    const printResult = await receiptPrinterService.printPaymentReceipt(transactionData, tenant);

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

    logger.logInfo('Pre-print payment receipt success', {
      action: 'PRE_PRINT_PAYMENT',
      transactionId: id,
      transactionNumber: transaction.transactionNumber,
      status: transaction.status,
      tenantId: transaction.tenantId,
      userId: req.user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      printJobId: printResult.printJobId
    });

    return res.json({
      success: true,
      message: 'Payment receipt printed successfully',
      data: {
        transactionId: id,
        transactionNumber: transaction.transactionNumber,
        status: transaction.status,
        printJobId: printResult.printJobId
      }
    });
  } catch (error) {
    logger.logError('Error pre-printing payment receipt', {
      action: 'PRE_PRINT_PAYMENT_ERROR',
      transactionId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to print payment receipt',
      error: error.message
    });
  }
};

/**
 * Split bill per item — divide one transaction into multiple bills by items
 * Each split creates a new transaction with selected items.
 * Original transaction is marked as 'split'.
 * 
 * @body {Array} splits - Array of { itemIds: [uuid], customerName?, notes? }
 *   Each split must contain at least one itemId.
 *   All items from the original transaction must be assigned to exactly one split.
 */
exports.splitBillByItem = async (req, res) => {
  const t = await Transaction.sequelize.transaction();

  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const isSuperAdmin = req.user.isSuperAdmin;
    const userId = req.user.id;
    const { splits } = req.body;

    // Validate splits input
    if (!splits || !Array.isArray(splits) || splits.length < 2) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimal 2 split dengan item yang ditentukan'
      });
    }

    // Validate each split has items
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      if (!split.items || !Array.isArray(split.items) || split.items.length === 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Split #${i + 1} harus memiliki minimal 1 item`
        });
      }
      for (const item of split.items) {
        if (!item.itemId || !item.quantity || item.quantity < 1) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Split #${i + 1} memiliki item tidak valid (itemId & quantity wajib)`
          });
        }
      }
    }

    // Lock the transaction row first (no outer joins)
    const lockedTx = await Transaction.findOne({
      where: {
        id,
        ...(!isSuperAdmin && { tenantId })
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!lockedTx) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Fetch full data with includes (row is already locked)
    const originalTransaction = await Transaction.findOne({
      where: { id },
      include: [
        {
          model: TransactionItem,
          as: 'transactionItems',
          where: { isRefunded: false },
          required: false
        },
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      transaction: t
    });

    // Cannot split completed/cancelled/already-split transactions
    if (['cancelled', 'refunded', 'split'].includes(originalTransaction.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Tidak bisa split transaksi dengan status '${originalTransaction.status}'`
      });
    }

    // Build a map of original items by id
    const validItems = (originalTransaction.transactionItems || []).filter(
      item => item.itemType !== 'discount' && item.itemType !== 'tax'
    );
    const itemMap = {};
    for (const item of validItems) {
      itemMap[item.id] = item;
    }

    // Aggregate total assigned quantity per itemId across all splits
    const totalAssigned = {}; // { itemId: totalQty }
    for (let i = 0; i < splits.length; i++) {
      for (const splitItem of splits[i].items) {
        const origItem = itemMap[splitItem.itemId];
        if (!origItem) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Item ID '${splitItem.itemId}' tidak ditemukan dalam transaksi ini`
          });
        }
        totalAssigned[splitItem.itemId] = (totalAssigned[splitItem.itemId] || 0) + splitItem.quantity;
      }
    }

    // Validate total assigned quantity matches original quantity for each item
    for (const item of validItems) {
      const assigned = totalAssigned[item.id] || 0;
      if (assigned !== item.quantity) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Item '${item.itemName}' qty total harus ${item.quantity}, tapi di-assign ${assigned}`
        });
      }
    }

    // Get tax configuration for recalculation
    const taxConfig = await transactionSettingsService.getTaxConfiguration(tenantId);

    // Create split transactions
    const splitTransactions = [];

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];

      // Calculate split subtotal from items
      let splitSubtotal = 0;
      const itemsToCreate = [];

      for (const splitItem of split.items) {
        const origItem = itemMap[splitItem.itemId];
        const unitPrice = parseFloat(origItem.unitPrice);
        const qty = splitItem.quantity;
        const itemSubtotal = unitPrice * qty;
        const itemTotal = itemSubtotal; // tax applied at transaction level

        splitSubtotal += itemTotal;

        itemsToCreate.push({
          itemType: origItem.itemType,
          itemId: origItem.itemId,
          itemName: origItem.itemName,
          quantity: qty,
          unitPrice,
          subtotal: itemSubtotal,
          total: itemTotal,
          notes: origItem.notes || null,
          itemDetails: origItem.itemDetails || {}
        });
      }

      // Calculate serviceCharge for this split
      const originalSubtotalVal = parseFloat(originalTransaction.subtotal || 0);
      const originalServiceCharge = parseFloat(originalTransaction.serviceCharge || 0);
      let splitServiceCharge = 0;
      if (originalServiceCharge > 0 && originalSubtotalVal > 0) {
        splitServiceCharge = Math.round((splitSubtotal / originalSubtotalVal) * originalServiceCharge);
      }

      // Calculate tax for this split
      let splitTax = 0;
      if (taxConfig.taxEnable && taxConfig.taxPercentage > 0) {
        if (taxConfig.taxType === 'percentage') {
          splitTax = ((splitSubtotal + splitServiceCharge) * taxConfig.taxPercentage) / 100;
        } else {
          // Fixed tax — divide proportionally
          const proportion = originalSubtotalVal > 0 ? splitSubtotal / originalSubtotalVal : 0;
          splitTax = parseFloat(originalTransaction.tax || 0) * proportion;
        }
        splitTax = Math.round(splitTax);
      }

      const splitTotal = Math.round(splitSubtotal + splitServiceCharge + splitTax);

      // Generate transactionNumber explicitly (hook's generateUniqueSequence has arg mismatch)
      const txType = originalTransaction.transactionType || 'gym';
      const prefixMap = { pos: 'POS', restaurant: 'RST', gym: 'GYM', psychology: 'PSY' };
      const typePrefix = prefixMap[txType] || 'TRX';
      const date = new Date();
      const txPrefix = `${typePrefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-`;
      const transactionNumber = await ConcurrencyUtils.generateUniqueSequence(
        Transaction,
        {
          tenantId: originalTransaction.tenantId,
          transactionNumber: { [Op.like]: `${txPrefix}%` }
        },
        txPrefix,
        'transactionNumber',
        t
      );

      // Create the new split transaction
      const splitTransaction = await Transaction.create({
        tenantId: originalTransaction.tenantId,
        transactionNumber,
        transactionType: txType,
        orderType: originalTransaction.orderType || null,
        tableId: originalTransaction.tableId || null,
        locationId: originalTransaction.locationId || null,
        customerId: originalTransaction.customerId,
        customerType: originalTransaction.customerType,
        customerName: split.customerName || originalTransaction.customerName,
        customerPhone: originalTransaction.customerPhone || null,
        subtotal: splitSubtotal,
        tax: splitTax,
        serviceCharge: splitServiceCharge,
        voucherDiscount: 0,
        totalAmount: splitTotal,
        splitFromId: originalTransaction.id,
        status: originalTransaction.status === 'completed' ? 'completed' : 'pending',
        notes: split.notes || `Split ${i + 1}/${splits.length} dari transaksi #${originalTransaction.transactionNumber}`,
        createdBy: userId
      }, { transaction: t });

      // Create items for the split transaction
      for (const itemData of itemsToCreate) {
        await TransactionItem.create({
          transactionId: splitTransaction.id,
          ...itemData
        }, { transaction: t });
      }

      splitTransactions.push(splitTransaction);
    }

    // Mark original transaction as 'split'
    await originalTransaction.update({
      status: 'split',
      completedAt: new Date(),
      notes: `${originalTransaction.notes || ''}\nDi-split menjadi ${splits.length} bill pada ${new Date().toISOString()}`.trim()
    }, { transaction: t });

    await t.commit();

    // Reload split transactions with items
    const createdSplits = await Transaction.findAll({
      where: { id: { [Op.in]: splitTransactions.map(s => s.id) } },
      include: [
        {
          model: TransactionItem,
          as: 'transactionItems'
        },
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    logger.logInfo('Transaction split by items', {
      action: 'SPLIT_BILL_BY_ITEM',
      originalTransactionId: id,
      originalTransactionNumber: originalTransaction.transactionNumber,
      splitCount: splits.length,
      splitTransactionIds: createdSplits.map(s => s.id),
      tenantId,
      userId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req)
    });

    return res.json({
      success: true,
      message: `Transaksi berhasil di-split menjadi ${splits.length} bill`,
      data: {
        originalTransaction: {
          id: originalTransaction.id,
          transactionNumber: originalTransaction.transactionNumber,
          status: 'split'
        },
        splitTransactions: createdSplits
      }
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    logger.logError('Error splitting transaction by items', {
      action: 'SPLIT_BILL_BY_ITEM_ERROR',
      transactionId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Gagal split transaksi',
      error: error.message
    });
  }
};
