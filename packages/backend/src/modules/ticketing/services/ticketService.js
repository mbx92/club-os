'use strict';

/**
 * Ticket Service - Ticketing Module
 * 
 * Business logic for ticket operations
 * @module modules/ticketing/services/ticketService
 */

const { Ticket, TicketComment, TicketCategory, TicketPriority, User } = require('../../../models');
const { Op } = require('sequelize');

class TicketService {
  /**
   * Check if ticket is overdue
   * @param {Object} ticket - Ticket instance
   * @returns {boolean}
   */
  static isOverdue(ticket) {
    if (!ticket.dueDate) return false;
    if (['resolved', 'closed', 'cancelled'].includes(ticket.status)) return false;
    return new Date(ticket.dueDate) < new Date();
  }

  /**
   * Calculate time to resolution in seconds
   * @param {Object} ticket - Ticket instance
   * @returns {number|null}
   */
  static getResolutionTime(ticket) {
    if (!ticket.resolvedAt) return null;
    const created = new Date(ticket.createdAt);
    const resolved = new Date(ticket.resolvedAt);
    return Math.floor((resolved - created) / 1000);
  }

  /**
   * Get SLA status for a ticket
   * @param {Object} ticket - Ticket instance with priority included
   * @returns {Object} SLA status info
   */
  static getSLAStatus(ticket) {
    if (!ticket.priority || !ticket.priority.slaHours) {
      return {
        hasSLA: false,
        isBreached: false,
        remainingHours: null
      };
    }

    const slaHours = ticket.priority.slaHours;
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const elapsedHours = (now - createdAt) / (1000 * 60 * 60);

    // If already resolved/closed, check if SLA was met
    if (['resolved', 'closed'].includes(ticket.status)) {
      const resolutionDate = ticket.resolvedAt || ticket.closedAt || now;
      const resolutionHours = (new Date(resolutionDate) - createdAt) / (1000 * 60 * 60);
      return {
        hasSLA: true,
        isBreached: resolutionHours > slaHours,
        remainingHours: 0,
        resolutionHours
      };
    }

    return {
      hasSLA: true,
      isBreached: elapsedHours > slaHours,
      remainingHours: Math.max(0, slaHours - elapsedHours),
      elapsedHours
    };
  }

  /**
   * Get tickets assigned to a user
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async getAssignedTickets(userId, tenantId, options = {}) {
    const {
      status,
      includeOverdue = false,
      limit = 20
    } = options;

    const where = {
      tenantId,
      assignedToId: userId
    };

    if (status) {
      where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    }

    if (includeOverdue) {
      where.dueDate = { [Op.lt]: new Date() };
      where.status = { [Op.notIn]: ['resolved', 'closed', 'cancelled'] };
    }

    return await Ticket.findAll({
      where,
      include: [
        { model: TicketCategory, as: 'category' },
        { model: TicketPriority, as: 'priority' },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  /**
   * Get unassigned tickets
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async getUnassignedTickets(tenantId, options = {}) {
    const {
      categoryId,
      priorityId,
      limit = 20
    } = options;

    const where = {
      tenantId,
      assignedToId: null,
      status: { [Op.notIn]: ['closed', 'cancelled'] }
    };

    if (categoryId) where.categoryId = categoryId;
    if (priorityId) where.priorityId = priorityId;

    return await Ticket.findAll({
      where,
      include: [
        { model: TicketCategory, as: 'category' },
        { model: TicketPriority, as: 'priority' },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'ASC']],
      limit
    });
  }

  /**
   * Auto-assign ticket based on workload
   * @param {string} ticketId - Ticket ID
   * @param {string} tenantId - Tenant ID
   * @param {Array<string>} eligibleUserIds - Array of user IDs eligible for assignment
   * @returns {Promise<Object>}
   */
  static async autoAssignTicket(ticketId, tenantId, eligibleUserIds) {
    // Get workload for each eligible user
    const workloads = await Promise.all(
      eligibleUserIds.map(async (userId) => {
        const count = await Ticket.count({
          where: {
            tenantId,
            assignedToId: userId,
            status: { [Op.notIn]: ['resolved', 'closed', 'cancelled'] }
          }
        });
        return { userId, count };
      })
    );

    // Find user with least workload
    const leastBusy = workloads.reduce((min, current) => 
      current.count < min.count ? current : min
    );

    // Assign ticket
    const ticket = await Ticket.findByPk(ticketId);
    if (ticket) {
      ticket.assignedToId = leastBusy.userId;
      ticket.status = ticket.status === 'open' ? 'in_progress' : ticket.status;
      await ticket.save();

      // Create system comment
      await TicketComment.create({
        tenantId,
        ticketId,
        userId: leastBusy.userId,
        comment: 'Ticket auto-assigned based on workload',
        isInternal: true,
        isSystemGenerated: true
      });
    }

    return ticket;
  }

  /**
   * Bulk update ticket status
   * @param {Array<string>} ticketIds - Array of ticket IDs
   * @param {string} status - New status
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User performing the action
   * @returns {Promise<number>}
   */
  static async bulkUpdateStatus(ticketIds, status, tenantId, userId) {
    const [updated] = await Ticket.update(
      { status },
      {
        where: {
          id: { [Op.in]: ticketIds },
          tenantId
        }
      }
    );

    // Create system comments for each ticket
    await Promise.all(
      ticketIds.map(ticketId =>
        TicketComment.create({
          tenantId,
          ticketId,
          userId,
          comment: `Status bulk updated to ${status}`,
          isInternal: false,
          isSystemGenerated: true
        })
      )
    );

    return updated;
  }
}

module.exports = TicketService;
