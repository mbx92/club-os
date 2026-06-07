const { MembershipPayment, Member, Membership, User, Tenant } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');
const { normalizePaymentMethod } = require('../../utils/paymentMethodNormalizer');

/**
 * Create a new membership payment
 */
exports.createMembershipPayment = async (req, res) => {
  try {
    const { 
      memberId, 
      membershipId, 
      paymentMethod, 
      amount, 
      currency = 'IDR',
      paymentDate,
      notes,
      paymentDetails 
    } = req.body;
    
    // Get tenant ID from authenticated user
    const tenantId = req.user.tenantId;
    
    // Verify member exists and belongs to the same tenant
    const member = await Member.findOne({
      where: { 
        id: memberId, 
        tenantId 
      }
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or does not belong to your tenant'
      });
    }
    
    // If membershipId is provided, verify it exists and belongs to the same tenant
    if (membershipId) {
      const membership = await Membership.findOne({
        where: { 
          id: membershipId, 
          tenantId 
        }
      });
      
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membership not found or does not belong to your tenant'
        });
      }
    }
    
    // Create the membership payment
    const membershipPayment = await MembershipPayment.create({
      tenantId,
      memberId,
      membershipId,
      paymentMethod: normalizePaymentMethod(paymentMethod),
      amount,
      currency,
      paymentDate: paymentDate || new Date(),
      status: 'pending',
      notes,
      paymentDetails: paymentDetails || {},
      createdBy: req.user.id
    });
    
    // Log the action
    logger.logAudit('Membership payment created', {
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      action: 'CREATE_MEMBERSHIP_PAYMENT',
      userId: req.user.id,
      tenantId,
      membershipPaymentId: membershipPayment.id,
      memberId,
      amount,
      paymentMethod,
      ip: getClientIp(req)
    });
    
    // Fetch the created payment with associations
    const paymentWithAssociations = await MembershipPayment.findByPk(membershipPayment.id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Membership,
          as: 'membership',
          attributes: ['id', 'startDate', 'endDate', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Membership payment created successfully',
      data: paymentWithAssociations
    });
  } catch (error) {
    console.error('Error creating membership payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create membership payment',
      error: error.message
    });
  }
};

/**
 * Get all membership payments for a tenant
 */
exports.getAllMembershipPayments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      memberId, 
      paymentMethod,
      startDate,
      endDate,
      search
    } = req.query;
    
    // Build where clause
    const whereClause = { tenantId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (memberId) {
      whereClause.memberId = memberId;
    }
    
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }
    
    if (startDate && endDate) {
      whereClause.paymentDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.paymentDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.paymentDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Find membership payments with pagination
    const { count, rows: membershipPayments } = await MembershipPayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          where: search ? {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${search}%` } },
              { lastName: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } }
            ]
          } : {}
        },
        {
          model: Membership,
          as: 'membership',
          attributes: ['id', 'startDate', 'endDate', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['paymentDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      success: true,
      message: 'Membership payments retrieved successfully',
      data: {
        membershipPayments,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving membership payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve membership payments',
      error: error.message
    });
  }
};

/**
 * Get a membership payment by ID
 */
exports.getMembershipPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    
    const membershipPayment = await MembershipPayment.findOne({
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
          model: Membership,
          as: 'membership',
          attributes: ['id', 'startDate', 'endDate', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!membershipPayment) {
      return res.status(404).json({
        success: false,
        message: 'Membership payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Membership payment retrieved successfully',
      data: membershipPayment
    });
  } catch (error) {
    console.error('Error retrieving membership payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve membership payment',
      error: error.message
    });
  }
};

/**
 * Update a membership payment
 */
exports.updateMembershipPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { 
      paymentMethod, 
      amount, 
      paymentDate, 
      status, 
      transactionId,
      notes,
      paymentDetails 
    } = req.body;
    
    // Find the membership payment
    const membershipPayment = await MembershipPayment.findOne({
      where: { 
        id, 
        tenantId 
      }
    });
    
    if (!membershipPayment) {
      return res.status(404).json({
        success: false,
        message: 'Membership payment not found'
      });
    }
    
    // Update the membership payment
    await membershipPayment.update({
      paymentMethod: paymentMethod || membershipPayment.paymentMethod,
      amount: amount || membershipPayment.amount,
      paymentDate: paymentDate || membershipPayment.paymentDate,
      status: status || membershipPayment.status,
      transactionId: transactionId || membershipPayment.transactionId,
      notes: notes !== undefined ? notes : membershipPayment.notes,
      paymentDetails: paymentDetails || membershipPayment.paymentDetails
    });
    
    // Log the action
    logger.logAudit('Membership payment updated', {
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      action: 'UPDATE_MEMBERSHIP_PAYMENT',
      userId: req.user.id,
      tenantId,
      membershipPaymentId: id,
      changes: { paymentMethod, amount, paymentDate, status, transactionId },
      ip: getClientIp(req)
    });
    
    // Fetch the updated payment with associations
    const updatedPayment = await MembershipPayment.findByPk(id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Membership,
          as: 'membership',
          attributes: ['id', 'startDate', 'endDate', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Membership payment updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error updating membership payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update membership payment',
      error: error.message
    });
  }
};

/**
 * Delete a membership payment (soft delete)
 */
exports.deleteMembershipPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    
    const membershipPayment = await MembershipPayment.findOne({
      where: { 
        id, 
        tenantId 
      }
    });
    
    if (!membershipPayment) {
      return res.status(404).json({
        success: false,
        message: 'Membership payment not found'
      });
    }
    
    // Soft delete the membership payment
    await membershipPayment.destroy();
    
    // Log the action
    logger.logAudit('Membership payment deleted', {
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      action: 'DELETE_MEMBERSHIP_PAYMENT',
      userId: req.user.id,
      tenantId,
      membershipPaymentId: id,
      ip: getClientIp(req)
    });
    
    res.status(200).json({
      success: true,
      message: 'Membership payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting membership payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete membership payment',
      error: error.message
    });
  }
};

/**
 * Process a membership payment (mark as completed)
 */
exports.processMembershipPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { transactionId } = req.body;
    
    const membershipPayment = await MembershipPayment.findOne({
      where: { 
        id, 
        tenantId,
        status: 'pending'
      }
    });
    
    if (!membershipPayment) {
      return res.status(404).json({
        success: false,
        message: 'Pending membership payment not found'
      });
    }
    
    // Update payment status to completed
    await membershipPayment.update({
      status: 'completed',
      transactionId: transactionId || membershipPayment.transactionId
    });
    
    // If this payment is for a membership, update the membership status
    if (membershipPayment.membershipId) {
      const membership = await Membership.findOne({
        where: { 
          id: membershipPayment.membershipId,
          tenantId
        }
      });
      
      if (membership) {
        // Update membership status to active if it was pending
        if (membership.status === 'pending') {
          await membership.update({ status: 'active' });
        }
        
        // Update member's membershipStatus to 'active' (include soft-deleted members)
        const member = await Member.findByPk(membershipPayment.memberId, { paranoid: false });
        if (member) {
          // Restore if soft-deleted
          if (member.deletedAt) {
            await member.restore();
          }
          await member.update({ membershipStatus: 'active' });
        }
      }
    }
    
    // Log the action
    logger.logAudit('Membership payment processed', {
      tenantId: req.user?.tenantId,
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.path,
      action: 'PROCESS_MEMBERSHIP_PAYMENT',
      userId: req.user.id,
      tenantId,
      membershipPaymentId: id,
      transactionId,
      ip: getClientIp(req)
    });
    
    // Fetch the updated payment with associations
    const updatedPayment = await MembershipPayment.findByPk(id, {
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: Membership,
          as: 'membership',
          attributes: ['id', 'startDate', 'endDate', 'status']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Membership payment processed successfully',
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error processing membership payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process membership payment',
      error: error.message
    });
  }
};

/**
 * Get membership payment statistics for a tenant
 */
exports.getMembershipPaymentStatistics = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.paymentDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      dateFilter.paymentDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      dateFilter.paymentDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Get payment statistics
    const payments = await MembershipPayment.findAll({
      where: { 
        tenantId,
        ...dateFilter
      },
      attributes: [
        'status',
        'paymentMethod',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'paymentMethod'],
      raw: true
    });
    
    // Calculate overall statistics
    const overallStats = await MembershipPayment.findOne({
      where: { 
        tenantId,
        ...dateFilter
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalPayments'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageAmount']
      ],
      raw: true
    });
    
    // Get monthly statistics
    const monthlyStats = await MembershipPayment.findAll({
      where: { 
        tenantId,
        ...dateFilter
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('paymentDate')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('paymentDate'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('paymentDate')), 'ASC']],
      raw: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Membership payment statistics retrieved successfully',
      data: {
        overall: overallStats,
        byStatusAndMethod: payments,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    console.error('Error retrieving membership payment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve membership payment statistics',
      error: error.message
    });
  }
};