const { Payment, Invoice, Subscription, Tenant, User } = require("../../models");
const { sequelize } = require("../../models");
const logger = require("../../utils/logger");
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { getNextSequence } = require("../../services/sequenceService");

async function createInvoice(req, res) {
  const transaction = await sequelize.transaction();
  
  try {
    const { tenantId, subscriptionId, amount, tax, dueDate, items, notes } = req.body;
    
    // Validation
    if (!tenantId) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({ message: "tenantId is required" });
    }
    if (!subscriptionId) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({ message: "subscriptionId is required" });
    }
    if (!amount || isNaN(parseFloat(amount))) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({ message: "Valid amount is required" });
    }
    if (!dueDate) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(400).json({ message: "dueDate is required" });
    }
    
    // Verify tenant exists
    const tenant = await Tenant.findByPk(tenantId, { transaction });
    if (!tenant) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    // Verify subscription exists
    const subscription = await Subscription.findByPk(subscriptionId, { transaction });
    if (!subscription) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      return res.status(404).json({ message: "Subscription not found" });
    }
    
    // Generate invoice number using sequence service (race-condition safe)
    const invoiceNumber = await getNextSequence('invoice_number', transaction);
    
    // Calculate total
    const total = parseFloat(amount) + parseFloat(tax || 0);
    
    // Create invoice with generated invoice number
    const invoice = await Invoice.create({
      invoiceNumber,
      tenantId,
      subscriptionId,
      amount,
      tax: tax || 0,
      total,
      dueDate,
      items: items || [],
      notes
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    logger.logInfo("Invoice created", {
      action: 'INVOICE_CREATED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId,
      subscriptionId,
      amount,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.status(201).json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId,
        amount: invoice.amount,
        tax: invoice.tax,
        total: invoice.total,
        dueDate: invoice.dueDate,
        status: invoice.status
      }
    });
  } catch (err) {
    // Rollback transaction on error
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    
    logger.logSecurity("Error creating invoice", {
      action: 'CREATING_INVOICE',
      userId: req.user?.id,
      userAgent: getUserAgent(req),
      error: err.message,
      stack: err.stack,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        body: { 
          tenantId: req.body.tenantId, 
          subscriptionId: req.body.subscriptionId,
          amount: req.body.amount
        }
      }
    });
    
    // Handle Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: "Validation error",
        errors: err.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    return res.status(500).json({ 
      message: "Failed to create invoice",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

async function getInvoices(req, res) {
  try {
    const { tenantId } = req.query;
    
    const whereClause = tenantId ? { tenantId } : {};
    
    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        { model: Subscription, as: 'subscription' },
        { model: Tenant, as: 'tenant' }
      ],
      order: [['createdAt', 'DESC']]
    });

    logger.logInfo("Invoices retrieved", {
      action: 'INVOICES_RETRIEVED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      tenantId,
      count: invoices.length,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json(invoices);
  } catch (err) {
    logger.logSecurity("Error retrieving invoices", {
      action: 'RETRIEVING_INVOICES',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        query: req.query
      }
    });
    return res.status(500).json({ message: "Failed to retrieve invoices" });
  }
}

async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findByPk(id, {
      include: [
        { model: Subscription, as: 'subscription', include: [{ model: Tenant, as: 'tenant' }] },
        { model: Payment, as: 'payments' }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    logger.logInfo("Invoice retrieved", {
      action: 'INVOICE_RETRIEVED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      invoiceId: id,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json(invoice);
  } catch (err) {
    logger.logSecurity("Error retrieving invoice", {
      action: 'RETRIEVING_INVOICE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        params: req.params
      }
    });
    return res.status(500).json({ message: "Failed to retrieve invoice" });
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Update invoice status
    await invoice.update({ status });

    logger.logInfo("Invoice status updated", {
      action: 'INVOICE_STATUS_UPDATED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      invoiceId: id,
      status,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json({
      id: invoice.id,
      status: invoice.status
    });
  } catch (err) {
    logger.logSecurity("Error updating invoice status", {
      action: 'UPDATING_INVOICE_STATUS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        params: req.params,
        body: req.body
      }
    });
    return res.status(500).json({ message: "Failed to update invoice status" });
  }
}

async function processPayment(req, res) {
  try {
    const { 
      tenantId: bodyTenantId,  // For super admin to specify tenant
      invoiceId, 
      subscriptionId, 
      amount, 
      paymentMethod, 
      transactionId,
      paymentType = 'subscription',
      processedBy,
      notes
    } = req.body;
    
    // Determine tenantId based on user role
    let tenantId;
    
    if (req.user.isSuperAdmin) {
      // Super admin must provide tenantId in body
      if (!bodyTenantId) {
        return res.status(400).json({ 
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Super admin must provide tenantId in request body' 
        });
      }
      tenantId = bodyTenantId;
      
      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ 
          success: false,
          code: 'NOT_FOUND',
          message: 'Tenant not found' 
        });
      }
    } else {
      // Regular user uses their own tenantId
      tenantId = req.user.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ 
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'User must be associated with a tenant' 
        });
      }
    }
    
    // Validate required fields
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ 
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Valid amount is required' 
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ 
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Payment method is required' 
      });
    }
    
    // Create payment
    const payment = await Payment.create({
      tenantId,
      invoiceId: invoiceId || null,
      subscriptionId: subscriptionId || null,
      amount: parseFloat(amount),
      paymentMethod,
      paymentType: paymentType || 'subscription',
      transactionId: transactionId || null,
      processedBy: processedBy || req.user.id,
      status: 'completed',
      paymentDate: new Date(),
      notes: notes || null
    });

    // If payment is for an invoice, update invoice status
    if (invoiceId) {
      const invoice = await Invoice.findByPk(invoiceId);
      if (invoice) {
        await invoice.update({ status: 'paid' });
        
        // Update subscription status if applicable
        if (invoice.subscriptionId) {
          const subscription = await Subscription.findByPk(invoice.subscriptionId);
          if (subscription) {
            await subscription.update({ status: 'active' });
          }
        }
      }
    }

    // If payment is for a subscription, update subscription status
    if (subscriptionId) {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (subscription) {
        await subscription.update({ status: 'active' });
      }
    }

    logger.logAuth("Payment processed", {
      action: 'PAYMENT_PROCESSED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      paymentId: payment.id,
      tenantId,
      amount: payment.amount,
      paymentMethod,
      processedBy: req.user.id,
      isSuperAdmin: req.user.isSuperAdmin,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          tenantId: payment.tenantId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          paymentDate: payment.paymentDate,
          invoiceId: payment.invoiceId,
          subscriptionId: payment.subscriptionId
        }
      },
      message: 'Payment processed successfully'
    });
  } catch (err) {
    logger.logSecurity("Error processing payment", {
      action: 'PROCESSING_PAYMENT',
      userId: req.user?.id,
      userAgent: getUserAgent(req),
      error: err.message,
      stack: err.stack,
      tenantId: req.user?.tenantId,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        body: { 
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod
        }
      }
    });
    return res.status(500).json({ 
      success: false,
      code: 'INTERNAL_ERROR',
      message: "Failed to process payment",
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }
}

async function getPayments(req, res) {
  try {
    const { paymentType, status } = req.query;
    
    // Get tenantId from authenticated user (non-super-admin only sees their tenant's data)
    const whereClause = {};
    
    if (!req.user.isSuperAdmin) {
      whereClause.tenantId = req.user.tenantId;
    } else if (req.query.tenantId) {
      // Super admin can filter by specific tenant
      whereClause.tenantId = req.query.tenantId;
    }
    
    if (paymentType) whereClause.paymentType = paymentType;
    if (status) whereClause.status = status;
    
    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'domain'] },
        { model: Invoice, as: 'invoice', required: false },
        { model: Subscription, as: 'subscription', required: false },
        { model: User, as: 'processor', attributes: ['id', 'email', 'firstName', 'lastName'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });

    logger.logInfo("Payments retrieved", {
      action: 'PAYMENTS_RETRIEVED',
      userId: req.user?.id,
      userAgent: getUserAgent(req),
      tenantId: whereClause.tenantId,
      paymentType,
      status,
      count: payments.length,
      isSuperAdmin: req.user.isSuperAdmin,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (err) {
    logger.logSecurity("Error retrieving payments", {
      action: 'RETRIEVING_PAYMENTS',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        query: req.query
      }
    });
    return res.status(500).json({ message: "Failed to retrieve payments" });
  }
}

async function getPayment(req, res) {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findByPk(id, {
      include: [
        { model: Tenant, as: 'tenant' },
        { model: Invoice, as: 'invoice' },
        { model: Subscription, as: 'subscription' },
        { model: Membership, as: 'membership' },
        { model: User, as: 'processor' }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    logger.logInfo("Payment retrieved", {
      action: 'PAYMENT_RETRIEVED',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      paymentId: id,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json(payment);
  } catch (err) {
    logger.logSecurity("Error retrieving payment", {
      action: 'RETRIEVING_PAYMENT',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        params: req.params
      }
    });
    return res.status(500).json({ message: "Failed to retrieve payment" });
  }
}

async function refundPayment(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update payment status to refunded
    await payment.update({ 
      status: 'refunded',
      notes: notes || payment.notes
    });

    logger.logAuth("Payment refunded", {
      action: 'PAYMENT_REFUNDED',
      userId: req.user?.id,
      userAgent: getUserAgent(req),
      paymentId: id,
      tenantId: payment.tenantId,
      amount: payment.amount,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req)
      }
    });

    return res.json({
      id: payment.id,
      status: payment.status,
      message: "Payment refunded successfully"
    });
  } catch (err) {
    logger.logSecurity("Error refunding payment", {
      action: 'REFUNDING_PAYMENT',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      error: err.message,
      request: {
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        params: req.params,
        body: req.body
      }
    });
    return res.status(500).json({ message: "Failed to refund payment" });
  }
}

module.exports = {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoiceStatus,
  processPayment,
  getPayments,
  getPayment,
  refundPayment
};