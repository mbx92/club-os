const { Member, Product, ProductCategory, Transaction, TransactionItem, TransactionPayment, sequelize } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');
const { generateUniqueSequence } = require('../../utils/concurrency');
const { normalizePaymentMethod } = require('../../utils/paymentMethodNormalizer');

/**
 * Get restaurant menu (feature-gated)
 * Only accessible if tenant has restaurant module enabled
 */
async function getMenu(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const { category, search } = req.query;

    const whereClause = {
      tenantId,
      isActive: true,
      category: 'food' // Restaurant products
    };

    if (category) {
      whereClause.categoryId = category;
    }

    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`
      };
    }

    const menuItems = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: ProductCategory,
          as: 'productCategory',
          attributes: ['id', 'name', 'description']
        }
      ],
      attributes: ['id', 'name', 'description', 'price', 'imageUrl', 'stock', 'isAvailable'],
      order: [['name', 'ASC']]
    });

    // Get categories
    const categories = await ProductCategory.findAll({
      where: { tenantId },
      attributes: ['id', 'name', 'description'],
      order: [['name', 'ASC']]
    });

    logger.logInfo('Restaurant menu retrieved by member', {
      action: 'MEMBER_RESTAURANT_MENU_VIEW',
      userId: req.user.id,
      tenantId,
      itemCount: menuItems.length
    });

    res.json({
      status: 'success',
      message: 'Menu retrieved successfully',
      data: {
        menu: menuItems.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          category: item.productCategory,
          isAvailable: item.isAvailable && item.stock > 0
        })),
        categories
      }
    });

  } catch (err) {
    logger.logError('Error retrieving restaurant menu', {
      action: 'MEMBER_RESTAURANT_MENU_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Place restaurant order
 */
async function placeOrder(req, res, next) {
  const t = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { items, notes, paymentMethod } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'Order items are required'
      });
    }

    // Find member
    const member = await Member.findOne({
      where: { userId, tenantId },
      transaction: t
    });

    if (!member) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: {
          id: item.productId,
          tenantId,
          isActive: true,
          category: 'food'
        },
        transaction: t
      });

      if (!product) {
        await t.rollback();
        return res.status(404).json({
          status: 'error',
          message: `Product not found: ${item.productId}`
        });
      }

      if (!product.isAvailable || product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Product not available or insufficient stock: ${product.name}`
        });
      }

      const subtotal = parseFloat(product.price) * parseInt(item.quantity);
      totalAmount += subtotal;

      orderItems.push({
        product,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
        notes: item.notes
      });

      // Reduce stock
      await product.decrement('stock', { by: item.quantity, transaction: t });
    }

    // Generate transaction number
    const transactionNumber = await generateUniqueSequence(
      'Transaction',
      'transactionNumber',
      'REST',
      tenantId
    );

    // Create transaction
    const transaction = await Transaction.create({
      tenantId,
      transactionNumber,
      transactionDate: new Date(),
      type: 'restaurant',
      category: 'food',
      customerId: userId,
      totalAmount,
      status: 'pending',
      notes: notes || 'Member self-service order',
      metadata: {
        orderedBy: 'member',
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`
      }
    }, { transaction: t });

    // Create transaction items
    for (const orderItem of orderItems) {
      await TransactionItem.create({
        tenantId,
        transactionId: transaction.id,
        itemType: 'product',
        itemId: orderItem.product.id,
        itemName: orderItem.product.name,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        subtotal: orderItem.subtotal,
        notes: orderItem.notes
      }, { transaction: t });
    }

    // Create payment record
    await TransactionPayment.create({
      tenantId,
      transactionId: transaction.id,
      paymentMethod: normalizePaymentMethod(paymentMethod || 'pending'),
      amount: totalAmount,
      paymentDate: new Date(),
      status: 'pending',
      notes: 'Awaiting payment confirmation'
    }, { transaction: t });

    await t.commit();

    logger.logInfo('Member placed restaurant order', {
      action: 'MEMBER_RESTAURANT_ORDER_CREATE',
      userId,
      tenantId,
      memberId: member.id,
      transactionId: transaction.id,
      itemCount: orderItems.length,
      totalAmount
    });

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transactionNumber,
          totalAmount: transaction.totalAmount,
          status: transaction.status
        },
        items: orderItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        paymentInstructions: {
          message: 'Please proceed to payment counter or complete payment online',
          amount: totalAmount,
          methods: ['cash', 'transfer', 'credit_card']
        }
      }
    });

  } catch (err) {
    await t.rollback();
    logger.logError('Error placing restaurant order', {
      action: 'MEMBER_RESTAURANT_ORDER_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Get member's restaurant order history
 */
async function getOrderHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      tenantId,
      customerId: userId,
      type: 'restaurant'
    };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: orders } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          attributes: ['id', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'notes']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['transactionDate', 'DESC']]
    });

    logger.logInfo('Member restaurant order history retrieved', {
      action: 'MEMBER_RESTAURANT_ORDERS_LIST',
      userId,
      tenantId,
      count
    });

    res.json({
      status: 'success',
      message: 'Order history retrieved successfully',
      data: {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.transactionNumber,
          date: order.transactionDate,
          totalAmount: order.totalAmount,
          status: order.status,
          items: order.items.map(item => ({
            name: item.itemName,
            quantity: item.quantity,
            price: item.unitPrice
          }))
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (err) {
    logger.logError('Error retrieving restaurant order history', {
      action: 'MEMBER_RESTAURANT_ORDERS_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

module.exports = {
  getMenu,
  placeOrder,
  getOrderHistory
};
