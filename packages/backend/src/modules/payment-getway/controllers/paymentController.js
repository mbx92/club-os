'use strict';

/**
 * Payment Controller
 * 
 * Handle payment gateway operations with Midtrans
 */

const midtransService = require('../services/midtransService');
const { Transaction, TransactionItem, TransactionPayment, Member, Tenant, ActiveService, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

/**
 * Create payment transaction with Midtrans Snap
 * POST /api/v1/payment/midtrans/create
 */
async function createPayment(req, res, next) {
  try {
    const { transactionId } = req.body;
    const tenantId = req.user.tenantId;

    // Validate transaction
    const transaction = await Transaction.findOne({
      where: {
        id: transactionId,
        tenantId: tenantId
      },
      include: [
        {
          model: TransactionItem,
          as: 'items'
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if already paid
    if (transaction.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Transaction already paid'
      });
    }

    // Check if already have valid Snap token (idempotency)
    if (transaction.metadata?.midtrans?.token && transaction.metadata?.midtrans?.redirectUrl) {
      const tokenCreatedAt = new Date(transaction.metadata.midtrans.createdAt);
      const tokenAge = Date.now() - tokenCreatedAt.getTime();
      const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours

      // If token still valid (less than 24 hours), return existing token
      if (tokenAge < tokenMaxAge) {
        logger.info('[Payment] Returning existing Snap token', {
          transactionNumber: transaction.transactionNumber,
          tokenAge: Math.round(tokenAge / 1000 / 60) + ' minutes'
        });

        return res.json({
          success: true,
          message: 'Payment token retrieved (existing)',
          data: {
            transactionId: transaction.id,
            transactionNumber: transaction.transactionNumber,
            amount: transaction.totalAmount,
            snapToken: transaction.metadata.midtrans.token,
            redirectUrl: transaction.metadata.midtrans.redirectUrl,
            clientKey: midtransService.config.clientKey,
            isExisting: true
          }
        });
      }
    }

    // Validate transaction data
    if (!transaction.totalAmount || parseFloat(transaction.totalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction total'
      });
    }

    if (!transaction.items || transaction.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction must have at least one item'
      });
    }

    // Prepare customer details
    let customerDetails = {
      first_name: transaction.customerName || 'Guest',
      email: req.user.email || 'customer@example.com',
      phone: transaction.customerPhone || '081234567890'
    };

    // If member, get member details
    if (transaction.customerType === 'member' && transaction.customerId) {
      const member = await Member.findByPk(transaction.customerId);
      if (member) {
        customerDetails = {
          first_name: member.fullName,
          email: member.email || customerDetails.email,
          phone: member.phone || customerDetails.phone
        };
      }
    }

    // Prepare item details
    logger.info('[Payment] Raw transaction items', {
      transactionNumber: transaction.transactionNumber,
      itemsCount: transaction.items?.length,
      items: transaction.items?.map(item => ({
        id: item.id,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity
      }))
    });

    const itemDetails = transaction.items
      .filter(item => item.unitPrice && parseFloat(item.unitPrice) > 0) // Use unitPrice
      .map(item => ({
        id: item.id,
        price: Math.round(parseFloat(item.unitPrice)), // Use unitPrice
        quantity: parseInt(item.quantity) || 1,
        name: item.itemName || item.description || 'Item' // Use itemName
      }));

    // Validate items after filtering
    if (itemDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found in transaction'
      });
    }

    // Add tax as separate item if exists
    if (transaction.tax && parseFloat(transaction.tax) > 0) {
      itemDetails.push({
        id: 'TAX',
        price: Math.round(parseFloat(transaction.tax)),
        quantity: 1,
        name: 'Tax'
      });
    }

    // Calculate total from items (untuk validasi)
    const calculatedTotal = itemDetails.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Use calculated total or transaction total (rounded)
    const grossAmount = Math.round(parseFloat(transaction.totalAmount));

    // Log data before sending to Midtrans
    logger.info('[Midtrans] Preparing Snap token', {
      orderId: transaction.transactionNumber,
      grossAmount: grossAmount,
      itemCount: itemDetails.length,
      calculatedTotal: calculatedTotal
    });

    // Generate unique order ID with timestamp suffix to avoid duplicate error
    const uniqueOrderId = `${transaction.transactionNumber}-${Date.now()}`;

    // Create Snap token
    const snapResult = await midtransService.createSnapToken({
      orderId: uniqueOrderId,
      grossAmount: grossAmount,
      customerDetails: customerDetails,
      itemDetails: itemDetails,
      transactionType: transaction.transactionType
    });

    // Update transaction with Midtrans token
    await transaction.update({
      paymentStatus: 'pending',
      metadata: {
        ...transaction.metadata,
        midtrans: {
          token: snapResult.token,
          redirectUrl: snapResult.redirectUrl,
          orderId: uniqueOrderId,
          originalOrderId: transaction.transactionNumber,
          createdAt: new Date()
        }
      }
    });

    logger.info('[Payment] Snap token created', {
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      token: snapResult.token
    });

    res.json({
      success: true,
      message: 'Payment created successfully',
      data: {
        transactionId: transaction.id,
        transactionNumber: transaction.transactionNumber,
        amount: transaction.totalAmount,
        snapToken: snapResult.token,
        redirectUrl: snapResult.redirectUrl,
        clientKey: midtransService.config.clientKey
      }
    });
  } catch (error) {
    logger.error('[Payment] Failed to create payment', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Create direct charge (for specific payment methods)
 * POST /api/v1/payment/midtrans/charge
 */
async function createCharge(req, res, next) {
  try {
    const {
      transactionId,
      paymentType,
      bankTransfer,
      creditCard,
      gopay
    } = req.body;
    const tenantId = req.user.tenantId;

    // Validate transaction
    const transaction = await Transaction.findOne({
      where: {
        id: transactionId,
        tenantId: tenantId
      },
      include: [
        {
          model: TransactionItem,
          as: 'items'
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Validate transaction data
    if (!transaction.totalAmount || parseFloat(transaction.totalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction total'
      });
    }

    if (!transaction.items || transaction.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction must have at least one item'
      });
    }

    // Prepare customer details
    const customerDetails = {
      first_name: transaction.customerName || 'Guest',
      email: req.user.email || 'customer@example.com',
      phone: transaction.customerPhone || '081234567890'
    };

    // Prepare item details
    const itemDetails = transaction.items
      .filter(item => item.unitPrice && parseFloat(item.unitPrice) > 0)
      .map(item => ({
        id: item.id,
        price: Math.round(parseFloat(item.unitPrice)),
        quantity: parseInt(item.quantity) || 1,
        name: item.itemName || item.description || 'Item'
      }));

    if (itemDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found in transaction'
      });
    }

    const grossAmount = Math.round(parseFloat(transaction.totalAmount));

    // Create charge
    const chargeResult = await midtransService.createCharge({
      orderId: transaction.transactionNumber,
      grossAmount: grossAmount,
      paymentType: paymentType,
      customerDetails: customerDetails,
      itemDetails: itemDetails,
      bankTransfer: bankTransfer,
      creditCard: creditCard,
      gopay: gopay
    });

    // Update transaction
    await transaction.update({
      paymentStatus: 'pending',
      metadata: {
        ...transaction.metadata,
        midtrans: {
          transactionId: chargeResult.transaction_id,
          paymentType: chargeResult.payment_type,
          status: chargeResult.transaction_status,
          createdAt: new Date()
        }
      }
    });

    logger.info('[Payment] Charge created', {
      transactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      midtransTransactionId: chargeResult.transaction_id
    });

    res.json({
      success: true,
      message: 'Charge created successfully',
      data: chargeResult
    });
  } catch (error) {
    logger.error('[Payment] Failed to create charge', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Check payment status
 * GET /api/v1/payment/midtrans/status/:transactionNumber
 */
async function checkStatus(req, res, next) {
  try {
    const { transactionNumber } = req.params;
    const tenantId = req.user.tenantId;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: {
        transactionNumber: transactionNumber,
        tenantId: tenantId
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check status from Midtrans
    const statusResult = await midtransService.checkStatus(transactionNumber);

    logger.info('[Payment] Status checked', {
      transactionNumber,
      status: statusResult.transaction_status
    });

    res.json({
      success: true,
      message: 'Status retrieved successfully',
      data: {
        transactionNumber: transactionNumber,
        midtransStatus: statusResult.transaction_status,
        fraudStatus: statusResult.fraud_status,
        paymentType: statusResult.payment_type,
        currentStatus: transaction.paymentStatus,
        rawData: statusResult
      }
    });
  } catch (error) {
    logger.error('[Payment] Failed to check status', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Handle Midtrans notification webhook
 * POST /api/v1/payment/midtrans/notification
 */
async function handleNotification(req, res, next) {
  try {
    const notification = req.body;

    logger.info('[Payment] Received notification', {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status
    });

    // Handle notification
    const result = await midtransService.handleNotification(notification);

    logger.info('[Payment] Notification processed', {
      orderId: notification.order_id,
      paymentStatus: result.transaction.paymentStatus
    });

    // Always return 200 OK to Midtrans
    res.status(200).json({
      success: true,
      message: 'Notification received'
    });
  } catch (error) {
    logger.error('[Payment] Failed to handle notification', {
      error: error.message,
      notification: req.body
    });
    
    // Still return 200 to prevent Midtrans from retrying
    res.status(200).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Cancel payment
 * POST /api/v1/payment/midtrans/cancel/:transactionNumber
 */
async function cancelPayment(req, res, next) {
  try {
    const { transactionNumber } = req.params;
    const tenantId = req.user.tenantId;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: {
        transactionNumber: transactionNumber,
        tenantId: tenantId
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Cancel in Midtrans
    const cancelResult = await midtransService.cancelTransaction(transactionNumber);

    // Update transaction
    await transaction.update({
      paymentStatus: 'failed',
      status: 'cancelled'
    });

    logger.info('[Payment] Payment cancelled', {
      transactionNumber,
      cancelResult
    });

    res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: cancelResult
    });
  } catch (error) {
    logger.error('[Payment] Failed to cancel payment', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Refund payment
 * POST /api/v1/payment/midtrans/refund/:transactionNumber
 */
async function refundPayment(req, res, next) {
  const t = await sequelize.transaction();
  
  try {
    const { transactionNumber } = req.params;
    const { amount, reason } = req.body;
    const tenantId = req.user.tenantId;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: {
        transactionNumber: transactionNumber,
        tenantId: tenantId
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if paid
    if (transaction.paymentStatus !== 'paid') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only paid transactions can be refunded'
      });
    }

    // Check if already refunded
    if (transaction.paymentStatus === 'refunded' || transaction.status === 'refunded') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Transaction is already refunded'
      });
    }

    // Refund in Midtrans
    const refundResult = await midtransService.refundTransaction(
      transactionNumber,
      amount,
      reason
    );

    // Find and cancel all active services related to this transaction
    const activeServices = await ActiveService.findAll({
      where: {
        purchaseTransactionId: transaction.id,
        tenantId,
        status: { [Op.in]: ['active', 'suspended', 'depleted'] }
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    // Cancel each active service
    for (const service of activeServices) {
      service.status = 'cancelled';
      service.notes = service.notes 
        ? `${service.notes}\n[REFUNDED ${new Date().toISOString()}] Payment refunded: ${reason || 'No reason provided'}`
        : `[REFUNDED ${new Date().toISOString()}] Payment refunded: ${reason || 'No reason provided'}`;
      await service.save({ transaction: t });
    }

    // Update transaction
    const isPartialRefund = amount && parseFloat(amount) < parseFloat(transaction.totalAmount);
    await transaction.update({
      paymentStatus: isPartialRefund ? 'partial_refund' : 'refunded',
      status: isPartialRefund ? transaction.status : 'refunded', // Also update status field for full refund
      notes: transaction.notes
        ? `${transaction.notes}\n[REFUNDED ${new Date().toISOString()}] ${reason || 'No reason provided'}`
        : `[REFUNDED ${new Date().toISOString()}] ${reason || 'No reason provided'}`,
      metadata: {
        ...transaction.metadata,
        refund: {
          amount: amount || transaction.totalAmount,
          reason: reason,
          refundedAt: new Date(),
          cancelledServicesCount: activeServices.length
        }
      }
    }, { transaction: t });

    await t.commit();

    logger.info('[Payment] Payment refunded and services cancelled', {
      transactionNumber,
      transactionId: transaction.id,
      amount: amount || 'full',
      cancelledServicesCount: activeServices.length,
      refundResult,
      tenantId
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully and related services cancelled',
      data: {
        refundResult,
        cancelledServicesCount: activeServices.length,
        cancelledServices: activeServices.map(s => ({
          id: s.id,
          servicePlanId: s.servicePlanId,
          serviceType: s.serviceType,
          status: s.status
        }))
      }
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    logger.error('[Payment] Failed to refund payment', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
}

/**
 * Get payment configuration (for frontend)
 * GET /api/v1/payment/midtrans/config
 */
async function getConfig(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        clientKey: midtransService.config.clientKey,
        isProduction: midtransService.config.isProduction,
        snapUrl: midtransService.config.snapUrl,
        enabledPayments: midtransService.config.paymentSettings.enabledPayments
      }
    });
  } catch (error) {
    logger.error('[Payment] Failed to get config', {
      error: error.message
    });
    next(error);
  }
}

module.exports = {
  createPayment,
  createCharge,
  checkStatus,
  handleNotification,
  cancelPayment,
  refundPayment,
  getConfig
};
