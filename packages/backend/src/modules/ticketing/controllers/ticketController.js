'use strict';

/**
 * Ticket Controller - Ticketing Module
 * 
 * Handles ticket CRUD operations, status management, and assignment.
 * 
 * @module modules/ticketing/controllers/ticketController
 */

const { Ticket, TicketCategory, TicketPriority, TicketComment, TicketAttachment, User, Member, Tenant } = require('../../../models');
const { Op } = require('sequelize');
const { createError } = require('../../../utils/errorCodes');
const { generateUniqueSequence } = require('../../../utils/concurrency');
const { withRetry } = require('../../../utils/concurrency');

/**
 * Get all tickets with filters and pagination
 */
const getAllTickets = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const {
      page = 1,
      limit = 20,
      search,
      status,
      categoryId,
      priorityId,
      assignedToId,
      requesterId,
      memberId,
      startDate,
      endDate,
      tags,
      includeComments,
      includeAttachments
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Tenant filtering
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    // Search by ticket number, subject, description
    if (search) {
      where[Op.or] = [
        { ticketNumber: { [Op.iLike]: `%${search}%` } },
        { subject: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Status filter (can be comma-separated)
    if (status) {
      const statuses = status.split(',');
      where.status = { [Op.in]: statuses };
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Priority filter
    if (priorityId) {
      where.priorityId = priorityId;
    }

    // Assigned to filter
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Requester filter
    if (requesterId) {
      where.requesterId = requesterId;
    }

    // Member filter
    if (memberId) {
      where.memberId = memberId;
    }

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    // Tags filter (JSONB array contains)
    if (tags) {
      const tagArray = tags.split(',');
      where.tags = { [Op.contains]: tagArray };
    }

    // Build includes
    const include = [
      {
        model: TicketCategory,
        as: 'category',
        attributes: ['id', 'name', 'color', 'icon']
      },
      {
        model: TicketPriority,
        as: 'priority',
        attributes: ['id', 'name', 'level', 'color', 'slaHours']
      },
      {
        model: User,
        as: 'requester',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: Member,
        as: 'member',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }
    ];

    if (includeComments === 'true') {
      include.push({
        model: TicketComment,
        as: 'comments',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }],
        order: [['createdAt', 'ASC']]
      });
    }

    if (includeAttachments === 'true') {
      include.push({
        model: TicketAttachment,
        as: 'attachments',
        attributes: ['id', 'fileName', 'filePath', 'fileSize', 'mimeType', 'fileType', 'createdAt']
      });
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      include,
      order: [
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get ticket by ID
 */
const getTicketById = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const where = { id };
    if (!isSuperAdmin) {
      where.tenantId = tenantId;
    }

    const ticket = await Ticket.findOne({
      where,
      include: [
        {
          model: TicketCategory,
          as: 'category'
        },
        {
          model: TicketPriority,
          as: 'priority'
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: TicketComment,
          as: 'comments',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }],
          order: [['createdAt', 'ASC']]
        },
        {
          model: TicketAttachment,
          as: 'attachments'
        }
      ]
    });

    if (!ticket) {
      throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create new ticket
 */
const createTicket = async (req, res, next) => {
  try {
    const { tenantId, id: userId } = req.user;
    const {
      subject,
      description,
      categoryId,
      priorityId,
      memberId,
      dueDate,
      tags,
      metadata
    } = req.body;

    // Generate unique ticket number
    const ticketNumber = await generateUniqueSequence(
      Ticket,
      'ticketNumber',
      tenantId,
      'TKT',
      6
    );

    const ticket = await Ticket.create({
      tenantId,
      ticketNumber,
      subject,
      description,
      categoryId: categoryId || null,
      priorityId: priorityId || null,
      requesterId: userId,
      memberId: memberId || null,
      dueDate: dueDate || null,
      tags: tags || [],
      metadata: metadata || {},
      status: 'open'
    });

    // Create system comment
    await TicketComment.create({
      tenantId,
      ticketId: ticket.id,
      userId,
      comment: `Ticket created`,
      isInternal: false,
      isSystemGenerated: true
    });

    // Fetch complete ticket data
    const completeTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: TicketCategory, as: 'category' },
        { model: TicketPriority, as: 'priority' },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeTicket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update ticket
 */
const updateTicket = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const {
      subject,
      description,
      categoryId,
      priorityId,
      assignedToId,
      memberId,
      dueDate,
      tags,
      metadata,
      resolution
    } = req.body;

    await withRetry(async () => {
      const ticket = await Ticket.findOne({
        where: {
          id,
          ...(isSuperAdmin ? {} : { tenantId })
        }
      });

      if (!ticket) {
        throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
      }

      // Track changes for comments
      const changes = [];

      if (subject !== undefined && ticket.subject !== subject) {
        changes.push(`Subject changed`);
        ticket.subject = subject;
      }

      if (description !== undefined && ticket.description !== description) {
        changes.push(`Description updated`);
        ticket.description = description;
      }

      if (categoryId !== undefined && ticket.categoryId !== categoryId) {
        changes.push(`Category changed`);
        ticket.categoryId = categoryId;
      }

      if (priorityId !== undefined && ticket.priorityId !== priorityId) {
        changes.push(`Priority changed`);
        ticket.priorityId = priorityId;
      }

      if (assignedToId !== undefined && ticket.assignedToId !== assignedToId) {
        changes.push(`Assigned to changed`);
        ticket.assignedToId = assignedToId;
      }

      if (memberId !== undefined) ticket.memberId = memberId;
      if (dueDate !== undefined) ticket.dueDate = dueDate;
      if (tags !== undefined) ticket.tags = tags;
      if (metadata !== undefined) ticket.metadata = metadata;
      if (resolution !== undefined) ticket.resolution = resolution;

      await ticket.save();

      // Create system comment for changes
      if (changes.length > 0) {
        await TicketComment.create({
          tenantId: ticket.tenantId,
          ticketId: ticket.id,
          userId,
          comment: changes.join(', '),
          isInternal: false,
          isSystemGenerated: true
        });
      }
    });

    // Fetch updated ticket
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: TicketCategory, as: 'category' },
        { model: TicketPriority, as: 'priority' },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Member, as: 'member', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
      ]
    });

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update ticket status
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!status) {
      throw createError('VALIDATION_ERROR', 'Status is required');
    }

    await withRetry(async () => {
      const ticket = await Ticket.findOne({
        where: {
          id,
          ...(isSuperAdmin ? {} : { tenantId })
        }
      });

      if (!ticket) {
        throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
      }

      const oldStatus = ticket.status;
      ticket.status = status;

      if (resolution) {
        ticket.resolution = resolution;
      }

      await ticket.save();

      // Create system comment
      await TicketComment.create({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        userId,
        comment: `Status changed from ${oldStatus} to ${status}`,
        isInternal: false,
        isSystemGenerated: true
      });
    });

    // Fetch updated ticket
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: TicketCategory, as: 'category' },
        { model: TicketPriority, as: 'priority' },
        { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Assign ticket to staff
 */
const assignTicket = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { assignedToId } = req.body;

    if (!assignedToId) {
      throw createError('VALIDATION_ERROR', 'assignedToId is required');
    }

    await withRetry(async () => {
      const ticket = await Ticket.findOne({
        where: {
          id,
          ...(isSuperAdmin ? {} : { tenantId })
        }
      });

      if (!ticket) {
        throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
      }

      ticket.assignedToId = assignedToId;
      
      // Auto-change status to in_progress if currently open
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }

      await ticket.save();

      // Create system comment
      await TicketComment.create({
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        userId,
        comment: `Ticket assigned to staff member`,
        isInternal: false,
        isSystemGenerated: true
      });
    });

    // Fetch updated ticket
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete ticket (soft delete)
 */
const deleteTicket = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const ticket = await Ticket.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!ticket) {
      throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
    }

    await ticket.destroy();

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  updateTicketStatus,
  assignTicket,
  deleteTicket
};
