'use strict';

/**
 * Invitation Revenue Controller
 * 
 * Handles preview and recalculation of invitation order revenue
 */

const db = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const { getClientIp, getUserAgent } = require('../../utils/requestHelper');

/**
 * Preview invitation order revenue impact
 * GET /api/v1/admin/revenue/invitation/preview
 */
async function previewInvitationRevenue(req, res, next) {
  try {
    const { status, startDate, endDate, limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {
      finalAmount: 0,
      baseAmount: { [Op.gt]: 0 },
      invitationId: { [Op.ne]: null }
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate + 'T23:59:59.999Z');
    }

    // Get current revenue
    const currentRevenue = await db.PsychologyOrder.sum('finalAmount', {
      where: {
        status: { [Op.in]: ['paid', 'in_progress', 'completed', 'verified'] }
      }
    }) || 0;

    // Find invitation orders with pagination
    const { count, rows: invitationOrders } = await db.PsychologyOrder.findAndCountAll({
      where,
      attributes: [
        'id', 'orderNumber', 'status', 'baseAmount', 
        'discountAmount', 'finalAmount', 'createdAt', 
        'invitationId', 'tenantId'
      ],
      include: [{
        model: db.PsychologyInvitation,
        as: 'invitation',
        attributes: ['id', 'invitationType', 'name']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Separate by status
    const completedOrders = invitationOrders.filter(o => o.status === 'completed');
    const outstandingOrders = invitationOrders.filter(o => 
      ['paid', 'in_progress', 'verified'].includes(o.status)
    );

    // Calculate potential revenue
    const potentialRevenue = completedOrders.reduce((sum, order) => 
      sum + parseFloat(order.baseAmount), 0
    );

    const outstandingValue = outstandingOrders.reduce((sum, order) => 
      sum + parseFloat(order.baseAmount), 0
    );

    // Get totals without pagination
    const allOrdersCount = await db.PsychologyOrder.count({ where });
    const completedCount = await db.PsychologyOrder.count({
      where: { ...where, status: 'completed' }
    });
    const outstandingCount = await db.PsychologyOrder.count({
      where: { 
        ...where, 
        status: { [Op.in]: ['paid', 'in_progress', 'verified'] }
      }
    });

    // Calculate total potential revenue (all completed orders)
    const totalPotentialRevenue = await db.PsychologyOrder.sum('baseAmount', {
      where: { ...where, status: 'completed' }
    }) || 0;

    // Breakdown by status
    const statusBreakdown = await db.PsychologyOrder.findAll({
      where,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('baseAmount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    });

    const breakdown = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = {
        count: parseInt(item.count),
        amount: parseFloat(item.totalAmount) || 0,
        revenueImpact: item.status === 'completed' ? 'counted' : 
                       ['paid', 'in_progress', 'verified'].includes(item.status) ? 'outstanding' : 
                       'not_counted'
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          currentRevenue: parseFloat(currentRevenue),
          potentialRevenue: parseFloat(totalPotentialRevenue),
          newTotalRevenue: parseFloat(currentRevenue) + parseFloat(totalPotentialRevenue),
          revenueIncrease: parseFloat(totalPotentialRevenue),
          revenueIncreasePercent: currentRevenue > 0 
            ? ((totalPotentialRevenue / currentRevenue) * 100).toFixed(2)
            : 0,
          outstandingValue: parseFloat(outstandingValue),
          totalOrders: allOrdersCount,
          completedOrders: completedCount,
          outstandingOrders: outstandingCount
        },
        breakdown,
        orders: invitationOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          baseAmount: parseFloat(order.baseAmount),
          currentFinalAmount: parseFloat(order.finalAmount),
          newFinalAmount: parseFloat(order.baseAmount),
          revenueImpact: order.status === 'completed' ? 'will_be_counted' :
                        ['paid', 'in_progress', 'verified'].includes(order.status) ? 'outstanding' :
                        'not_counted',
          invitation: order.invitation ? {
            id: order.invitation.id,
            type: order.invitation.invitationType,
            name: order.invitation.name
          } : null,
          createdAt: order.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

    logger.logInfo('Invitation revenue preview retrieved', {
      action: 'INVITATION_REVENUE_PREVIEW',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: { totalOrders: count, completedOrders: completedCount }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Recalculate invitation order revenue (selected orders)
 * POST /api/v1/admin/revenue/invitation/recalculate
 * Body: { orderIds: ['id1', 'id2', ...] } or { all: true, filters: {...} }
 */
async function recalculateInvitationRevenue(req, res, next) {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { orderIds, all, filters = {} } = req.body;

    if (!orderIds && !all) {
      return res.status(400).json({
        success: false,
        message: 'Either orderIds array or all=true is required'
      });
    }

    // Build where clause
    let where = {
      finalAmount: 0,
      baseAmount: { [Op.gt]: 0 },
      invitationId: { [Op.ne]: null },
      status: 'completed' // Only recalculate completed orders
    };

    if (orderIds && !all) {
      // Recalculate specific orders
      where.id = { [Op.in]: orderIds };
    } else if (all) {
      // Apply filters if recalculating all
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) where.createdAt[Op.lte] = new Date(filters.endDate + 'T23:59:59.999Z');
      }
      if (filters.tenantId && req.user.isSuperAdmin) {
        where.tenantId = filters.tenantId;
      }
    }

    // Fetch orders to update
    const orders = await db.PsychologyOrder.findAll({
      where,
      transaction
    });

    if (orders.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'No orders found to recalculate'
      });
    }

    // Update orders
    const results = {
      success: [],
      errors: []
    };

    for (const order of orders) {
      try {
        const oldFinalAmount = order.finalAmount;
        const oldDiscountAmount = order.discountAmount;

        await order.update({
          discountAmount: 0,
          finalAmount: order.baseAmount,
          metadata: {
            ...order.metadata,
            revenueRecalculated: true,
            recalculatedAt: new Date().toISOString(),
            recalculatedBy: req.user.id,
            oldFinalAmount,
            oldDiscountAmount
          }
        }, { transaction });

        results.success.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldFinalAmount: parseFloat(oldFinalAmount),
          newFinalAmount: parseFloat(order.baseAmount),
          revenueAdded: parseFloat(order.baseAmount)
        });
      } catch (error) {
        results.errors.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          error: error.message
        });
      }
    }

    await transaction.commit();

    // Calculate totals
    const totalRevenueAdded = results.success.reduce((sum, r) => sum + r.revenueAdded, 0);

    res.json({
      success: true,
      message: `Successfully recalculated ${results.success.length} orders`,
      data: {
        summary: {
          totalProcessed: orders.length,
          successCount: results.success.length,
          errorCount: results.errors.length,
          totalRevenueAdded
        },
        results: {
          success: results.success,
          errors: results.errors
        }
      }
    });

    logger.logInfo('Invitation revenue recalculated', {
      action: 'INVITATION_REVENUE_RECALCULATED',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      method: req.method,
      path: req.originalUrl,
      metadata: {
        ordersProcessed: orders.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
        totalRevenueAdded
      }
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

module.exports = {
  previewInvitationRevenue,
  recalculateInvitationRevenue
};
