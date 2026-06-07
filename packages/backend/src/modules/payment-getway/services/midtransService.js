'use strict';

/**
 * Midtrans Service
 * 
 * Handle all Midtrans API interactions
 */

const axios = require('axios');
const crypto = require('crypto');
const midtransConfig = require('../config/midtrans.config');
const { Transaction, TransactionPayment } = require('../../../models');
const logger = require('../../../utils/logger');

class MidtransService {
  constructor() {
    this.config = midtransConfig;
    this.config.validate();
    
    // Create axios instance with auth header
    this.apiClient = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(this.config.serverKey + ':').toString('base64')}`
      }
    });
    
    this.snapClient = axios.create({
      baseURL: this.config.snapUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(this.config.serverKey + ':').toString('base64')}`
      }
    });
  }

  /**
   * Create Snap transaction token
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Snap token and redirect URL
   */
  async createSnapToken(transactionData) {
    try {
      const {
        orderId,
        grossAmount,
        customerDetails,
        itemDetails,
        transactionType = 'pos'
      } = transactionData;

      // Build Snap API payload
      const payload = {
        transaction_details: {
          order_id: orderId,
          gross_amount: parseInt(grossAmount)
        },
        customer_details: customerDetails,
        item_details: itemDetails,
        enabled_payments: this.config.paymentSettings.enabledPayments,
        credit_card: this.config.paymentSettings.creditCard,
        custom_expiry: this.config.paymentSettings.customExpiry,
        callbacks: this.config.paymentSettings.callbacks
      };

      logger.info('[Midtrans] Creating Snap token', {
        orderId,
        grossAmount,
        transactionType
      });

      const response = await this.snapClient.post('/transactions', payload);

      logger.info('[Midtrans] Snap token created', {
        orderId,
        token: response.data.token
      });

      return {
        token: response.data.token,
        redirectUrl: response.data.redirect_url
      };
    } catch (error) {
      logger.error('[Midtrans] Failed to create Snap token', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to create Midtrans token: ${error.message}`);
    }
  }

  /**
   * Create charge transaction (Direct API)
   * @param {Object} chargeData - Charge data
   * @returns {Promise<Object>} Charge response
   */
  async createCharge(chargeData) {
    try {
      const {
        orderId,
        grossAmount,
        paymentType,
        customerDetails,
        itemDetails,
        bankTransfer = null,
        creditCard = null,
        gopay = null
      } = chargeData;

      const payload = {
        payment_type: paymentType,
        transaction_details: {
          order_id: orderId,
          gross_amount: parseInt(grossAmount)
        },
        customer_details: customerDetails,
        item_details: itemDetails
      };

      // Add payment-specific data
      if (bankTransfer) payload.bank_transfer = bankTransfer;
      if (creditCard) payload.credit_card = creditCard;
      if (gopay) payload.gopay = gopay;

      logger.info('[Midtrans] Creating charge', {
        orderId,
        paymentType,
        grossAmount
      });

      const response = await this.apiClient.post('/v2/charge', payload);

      logger.info('[Midtrans] Charge created', {
        orderId,
        status: response.data.transaction_status
      });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to create charge', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Failed to create Midtrans charge: ${error.message}`);
    }
  }

  /**
   * Check transaction status
   * @param {String} orderId - Order ID
   * @returns {Promise<Object>} Transaction status
   */
  async checkStatus(orderId) {
    try {
      logger.info('[Midtrans] Checking status', { orderId });

      const response = await this.apiClient.get(`/v2/${orderId}/status`);

      logger.info('[Midtrans] Status retrieved', {
        orderId,
        status: response.data.transaction_status
      });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to check status', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to check Midtrans status: ${error.message}`);
    }
  }

  /**
   * Approve transaction (for challenge status)
   * @param {String} orderId - Order ID
   * @returns {Promise<Object>} Approval result
   */
  async approveTransaction(orderId) {
    try {
      logger.info('[Midtrans] Approving transaction', { orderId });

      const response = await this.apiClient.post(`/v2/${orderId}/approve`);

      logger.info('[Midtrans] Transaction approved', { orderId });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to approve transaction', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to approve transaction: ${error.message}`);
    }
  }

  /**
   * Cancel transaction
   * @param {String} orderId - Order ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelTransaction(orderId) {
    try {
      logger.info('[Midtrans] Canceling transaction', { orderId });

      const response = await this.apiClient.post(`/v2/${orderId}/cancel`);

      logger.info('[Midtrans] Transaction canceled', { orderId });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to cancel transaction', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to cancel transaction: ${error.message}`);
    }
  }

  /**
   * Expire transaction
   * @param {String} orderId - Order ID
   * @returns {Promise<Object>} Expiration result
   */
  async expireTransaction(orderId) {
    try {
      logger.info('[Midtrans] Expiring transaction', { orderId });

      const response = await this.apiClient.post(`/v2/${orderId}/expire`);

      logger.info('[Midtrans] Transaction expired', { orderId });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to expire transaction', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to expire transaction: ${error.message}`);
    }
  }

  /**
   * Refund transaction
   * @param {String} orderId - Order ID
   * @param {Number} amount - Refund amount (optional, full refund if not specified)
   * @param {String} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async refundTransaction(orderId, amount = null, reason = '') {
    try {
      logger.info('[Midtrans] Refunding transaction', {
        orderId,
        amount,
        reason
      });

      const payload = {};
      if (amount) payload.refund_amount = parseInt(amount);
      if (reason) payload.reason = reason;

      const response = await this.apiClient.post(`/v2/${orderId}/refund`, payload);

      logger.info('[Midtrans] Transaction refunded', { orderId });

      return response.data;
    } catch (error) {
      logger.error('[Midtrans] Failed to refund transaction', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to refund transaction: ${error.message}`);
    }
  }

  /**
   * Verify notification signature
   * @param {Object} notification - Notification data from Midtrans
   * @returns {Boolean} Valid or not
   */
  verifySignature(notification) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key
    } = notification;

    const serverKey = this.config.serverKey;
    const input = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const hash = crypto.createHash('sha512').update(input).digest('hex');

    const isValid = hash === signature_key;

    logger.info('[Midtrans] Signature verification', {
      orderId: order_id,
      isValid
    });

    return isValid;
  }

  /**
   * Handle notification from Midtrans
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Updated transaction
   */
  async handleNotification(notification) {
    try {
      const {
        order_id,
        transaction_status,
        fraud_status,
        payment_type,
        transaction_id,
        gross_amount,
        transaction_time,
        settlement_time,
        status_code,
        status_message
      } = notification;

      logger.info('[Midtrans] Handling notification', {
        orderId: order_id,
        transactionStatus: transaction_status,
        fraudStatus: fraud_status
      });

      // Verify signature
      if (!this.verifySignature(notification)) {
        throw new Error('Invalid signature');
      }

      // Extract original order ID from unique order ID (format: ORD-202512-0032-1735123456789)
      const originalOrderId = order_id.includes('-') && order_id.match(/^(.+)-\d{13}$/) 
        ? order_id.match(/^(.+)-\d{13}$/)[1]
        : order_id;

      // Find transaction by original transaction number
      const transaction = await Transaction.findOne({
        where: { transactionNumber: originalOrderId }
      });

      if (!transaction) {
        // Try finding by unique order ID in metadata
        const txWithMetadata = await Transaction.findOne({
          where: sequelize.where(
            sequelize.cast(sequelize.json('metadata.midtrans.orderId'), 'text'),
            order_id
          )
        });

        if (!txWithMetadata) {
          throw new Error(`Transaction not found: ${order_id}`);
        }

        return this.updateTransactionStatus(txWithMetadata, notification);
      }

      return this.updateTransactionStatus(transaction, notification);
    } catch (error) {
      logger.error('[Midtrans] Failed to handle notification', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update transaction status based on Midtrans notification
   * @param {Object} transaction - Transaction instance
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransactionStatus(transaction, notification) {
    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      gross_amount,
      transaction_time,
      settlement_time
    } = notification;

    // Determine payment status based on Midtrans status
    let paymentStatus = 'pending';
    let transactionPaymentStatus = 'pending';

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        paymentStatus = 'paid';
        transactionPaymentStatus = 'completed';
      } else if (fraud_status === 'challenge') {
        paymentStatus = 'pending';
        transactionPaymentStatus = 'pending';
      }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'paid';
      transactionPaymentStatus = 'completed';
    } else if (transaction_status === 'pending') {
      paymentStatus = 'pending';
      transactionPaymentStatus = 'pending';
    } else if (transaction_status === 'deny') {
      paymentStatus = 'failed';
      transactionPaymentStatus = 'failed';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'failed';
      transactionPaymentStatus = 'expired';
    } else if (transaction_status === 'cancel') {
      paymentStatus = 'failed';
      transactionPaymentStatus = 'cancelled';
    }

    // Update transaction
    await transaction.update({
      paymentStatus: paymentStatus,
      status: paymentStatus === 'paid' ? 'completed' : transaction.status
    });

    // Update or create TransactionPayment record
    const [transactionPayment, created] = await TransactionPayment.findOrCreate({
      where: {
        transactionId: transaction.id,
        paymentMethod: payment_type
      },
      defaults: {
        tenantId: transaction.tenantId,
        transactionId: transaction.id,
        paymentMethod: payment_type,
        amount: parseFloat(gross_amount),
        status: transactionPaymentStatus,
        paymentDate: settlement_time || transaction_time || new Date(),
        referenceNumber: transaction_id,
        metadata: notification
      }
    });

    if (!created) {
      await transactionPayment.update({
        status: transactionPaymentStatus,
        paymentDate: settlement_time || transactionPayment.paymentDate,
        metadata: notification
      });
    }

    logger.info('[Midtrans] Notification processed', {
      orderId: order_id,
      paymentStatus,
      transactionPaymentStatus
    });

    return {
      transaction,
      transactionPayment
    };
  }

  /**
   * Map transaction status to Midtrans status
   * @param {String} midtransStatus - Midtrans transaction status
   * @param {String} fraudStatus - Fraud status
   * @returns {Object} Payment status and transaction status
   */
  mapStatus(midtransStatus, fraudStatus = null) {
    const statusMap = {
      'capture': fraudStatus === 'accept' ? 'paid' : 'pending',
      'settlement': 'paid',
      'pending': 'pending',
      'deny': 'failed',
      'expire': 'failed',
      'cancel': 'failed',
      'refund': 'refunded',
      'partial_refund': 'partial_refund'
    };

    return {
      paymentStatus: statusMap[midtransStatus] || 'pending',
      transactionStatus: statusMap[midtransStatus] === 'paid' ? 'completed' : 'pending'
    };
  }
}

module.exports = new MidtransService();
