'use strict';

/**
 * Dashboard Controller - Ticketing Module
 * 
 * Provides statistics and analytics for ticketing dashboard
 * 
 * @module modules/ticketing/controllers/dashboardController
 */

const { Ticket, TicketCategory, TicketPriority, User } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../models').sequelize;

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { startDate, endDate } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get ticket counts by status
    const statusCounts = await Ticket.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get ticket counts by category
    const categoryCounts = await Ticket.findAll({
      where,
      attributes: [
        'categoryId',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
      ],
      include: [
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }
      ],
      group: ['categoryId', 'category.id', 'category.name', 'category.color'],
      raw: true
    });

    // Get ticket counts by priority
    const priorityCounts = await Ticket.findAll({
      where,
      attributes: [
        'priorityId',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'count']
      ],
      include: [
        {
          model: TicketPriority,
          as: 'priority',
          attributes: ['id', 'name', 'level', 'color']
        }
      ],
      group: ['priorityId', 'priority.id', 'priority.name', 'priority.level', 'priority.color'],
      raw: true
    });

    // Get assigned staff performance
    const staffPerformance = await Ticket.findAll({
      where: {
        ...where,
        assignedToId: { [Op.ne]: null }
      },
      attributes: [
        'assignedToId',
        [sequelize.fn('COUNT', sequelize.col('Ticket.id')), 'totalTickets'],
        [
          sequelize.fn('COUNT', 
            sequelize.literal(`CASE WHEN status = 'resolved' THEN 1 END`)
          ), 
          'resolvedTickets'
        ],
        [
          sequelize.fn('COUNT', 
            sequelize.literal(`CASE WHEN status = 'closed' THEN 1 END`)
          ), 
          'closedTickets'
        ]
      ],
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      group: ['assignedToId', 'assignedTo.id', 'assignedTo.firstName', 'assignedTo.lastName'],
      raw: true
    });

    // Get recent tickets
    const recentTickets = await Ticket.findAll({
      where,
      include: [
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'color']
        },
        {
          model: TicketPriority,
          as: 'priority',
          attributes: ['id', 'name', 'level', 'color']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Get overdue tickets
    const overdueTickets = await Ticket.findAll({
      where: {
        ...where,
        dueDate: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['resolved', 'closed', 'cancelled'] }
      },
      include: [
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'color']
        },
        {
          model: TicketPriority,
          as: 'priority',
          attributes: ['id', 'name', 'level', 'color']
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: 10
    });

    // Calculate resolution stats
    const resolutionStats = await Ticket.findAll({
      where: {
        ...where,
        status: 'resolved',
        resolvedAt: { [Op.ne]: null }
      },
      attributes: [
        [
          sequelize.fn('AVG',
            sequelize.literal(`EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))`)
          ),
          'avgResolutionTime'
        ],
        [
          sequelize.fn('MIN',
            sequelize.literal(`EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))`)
          ),
          'minResolutionTime'
        ],
        [
          sequelize.fn('MAX',
            sequelize.literal(`EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))`)
          ),
          'maxResolutionTime'
        ]
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        statusCounts,
        categoryCounts,
        priorityCounts,
        staffPerformance,
        recentTickets,
        overdueTickets,
        resolutionStats: resolutionStats[0] || {}
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get ticket trends (daily/weekly/monthly counts)
 */
const getTicketTrends = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { period = 'daily', days = 30 } = req.query;

    const where = {};
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    where.createdAt = {
      [Op.between]: [startDate, endDate]
    };

    let dateFormat;
    switch (period) {
      case 'hourly':
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        break;
      case 'monthly':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const trends = await Ticket.findAll({
      where,
      attributes: [
        [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), dateFormat), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('TO_CHAR', sequelize.col('createdAt'), dateFormat)],
      order: [[sequelize.fn('TO_CHAR', sequelize.col('createdAt'), dateFormat), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: trends
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getTicketTrends
};
