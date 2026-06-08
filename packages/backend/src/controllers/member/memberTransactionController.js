const { Member, Transaction, TransactionItem, TransactionPayment } = require('../../models');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * Get member's transaction history
 */
async function getTransactionHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    
    const { 
      page = 1, 
      limit = 10,
      status, // filter by status
      type, // filter by type
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * limit;

    // Find member
    const member = await Member.findOne({
      where: { userId, tenantId }
    });

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    // Build where clause
    const whereClause = {
      tenantId,
      customerId: userId
    };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.transactionDate = {};
      if (startDate) {
        whereClause.transactionDate[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        whereClause.transactionDate[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // Get transactions with pagination
    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: TransactionItem,
          as: 'items',
          attributes: ['id', 'itemType', 'itemName', 'quantity', 'unitPrice', 'subtotal']
        },
        {
          model: TransactionPayment,
          as: 'payments',
          attributes: ['id', 'paymentMethod', 'amount', 'paymentDate', 'status', 'reference']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['transactionDate', 'DESC']]
    });

    // Manually attach member info to each transaction
    const transactionsWithMember = transactions.map(txn => {
      const txnData = txn.toJSON();
      // Add member info from the member we already fetched
      txnData.member = {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        membershipNumber: member.membershipNumber
      };
      return txnData;
    });

    // Calculate summary statistics
    const allTransactions = await Transaction.findAll({
      where: {
        tenantId,
        customerId: userId,
        status: 'completed'
      },
      attributes: ['totalAmount', 'type']
    });

    const summary = {
      totalSpent: allTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0),
      totalTransactions: allTransactions.length,
      byType: {
        service_purchase: allTransactions.filter(t => t.type === 'service_purchase').length,
        restaurant_order: allTransactions.filter(t => t.type === 'restaurant').length,
        pos_sale: allTransactions.filter(t => t.type === 'pos').length
      }
    };

    logger.logInfo('Member transaction history retrieved', {
      action: 'MEMBER_TRANSACTIONS_LIST',
      userId,
      tenantId,
      memberId: member.id,
      page,
      count
    });

    res.json({
      status: 'success',
      message: 'Transaction history retrieved successfully',
      data: {
        transactions: transactionsWithMember.map(t => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          date: t.transactionDate,
          type: t.type,
          category: t.category,
          totalAmount: t.totalAmount,
          status: t.status,
          member: t.member, // Add member info here
          items: t.items.map(item => ({
            id: item.id,
            type: item.itemType,
            name: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal
          })),
          payments: t.payments.map(p => ({
            id: p.id,
            method: p.paymentMethod,
            amount: p.amount,
            date: p.paymentDate,
            status: p.status,
            reference: p.reference
          })),
          notes: t.notes
        })),
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (err) {
    logger.logError('Error retrieving transaction history', {
      action: 'MEMBER_TRANSACTIONS_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      error: err.message
    });
    next(err);
  }
}

/**
 * Get transaction detail
 */
async function getTransactionDetail(req, res, next) {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Get member info
    const member = await Member.findOne({
      where: { userId, tenantId },
      attributes: ['id', 'fullName', 'email', 'phone', 'membershipNumber']
    });

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member profile not found'
      });
    }

    const transaction = await Transaction.findOne({
      where: {
        id,
        tenantId,
        customerId: userId // Ensure user can only see their own transactions
      },
      include: [
        {
          model: TransactionItem,
          as: 'items',
          attributes: ['id', 'itemType', 'itemId', 'itemName', 'quantity', 'unitPrice', 'subtotal', 'notes']
        },
        {
          model: TransactionPayment,
          as: 'payments',
          attributes: ['id', 'paymentMethod', 'amount', 'paymentDate', 'status', 'reference', 'notes']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }

    logger.logInfo('Member transaction detail retrieved', {
      action: 'MEMBER_TRANSACTION_DETAIL',
      userId,
      tenantId,
      transactionId: id
    });

    res.json({
      status: 'success',
      message: 'Transaction detail retrieved successfully',
      data: {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        date: transaction.transactionDate,
        type: transaction.type,
        category: transaction.category,
        totalAmount: transaction.totalAmount,
        discountAmount: transaction.discountAmount,
        taxAmount: transaction.taxAmount,
        status: transaction.status,
        member: {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          membershipNumber: member.membershipNumber
        },
        items: transaction.items.map(item => ({
          id: item.id,
          type: item.itemType,
          itemId: item.itemId,
          name: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          notes: item.notes
        })),
        payments: transaction.payments.map(p => ({
          id: p.id,
          method: p.paymentMethod,
          amount: p.amount,
          date: p.paymentDate,
          status: p.status,
          reference: p.reference,
          notes: p.notes
        })),
        notes: transaction.notes,
        metadata: transaction.metadata
      }
    });

  } catch (err) {
    logger.logError('Error retrieving transaction detail', {
      action: 'MEMBER_TRANSACTION_DETAIL_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      transactionId: req.params.id,
      error: err.message
    });
    next(err);
  }
}

module.exports = {
  getTransactionHistory,
  getTransactionDetail
};
