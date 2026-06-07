'use strict';

/**
 * Ticket Comment Controller - Ticketing Module
 * 
 * Handles ticket comments and activity log
 * 
 * @module modules/ticketing/controllers/ticketCommentController
 */

const { TicketComment, Ticket, User } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');

/**
 * Get comments for a ticket
 */
const getTicketComments = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { ticketId } = req.params;
    const { includeInternal = 'true' } = req.query;

    // Verify ticket access
    const ticket = await Ticket.findOne({
      where: {
        id: ticketId,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!ticket) {
      throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
    }

    const where = { ticketId };

    // Filter internal comments if requested
    if (includeInternal === 'false') {
      where.isInternal = false;
    }

    const comments = await TicketComment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create comment
 */
const createComment = async (req, res, next) => {
  try {
    const { tenantId, id: userId, isSuperAdmin } = req.user;
    const { ticketId } = req.params;
    const { comment, isInternal } = req.body;

    if (!comment) {
      throw createError('VALIDATION_ERROR', 'Comment is required');
    }

    // Verify ticket access
    const ticket = await Ticket.findOne({
      where: {
        id: ticketId,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!ticket) {
      throw createError('RESOURCE_NOT_FOUND', 'Ticket not found');
    }

    const ticketComment = await TicketComment.create({
      tenantId: ticket.tenantId,
      ticketId,
      userId,
      comment,
      isInternal: isInternal || false,
      isSystemGenerated: false
    });

    const completeComment = await TicketComment.findByPk(ticketComment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeComment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update comment
 */
const updateComment = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;
    const { comment, isInternal } = req.body;

    const ticketComment = await TicketComment.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!ticketComment) {
      throw createError('RESOURCE_NOT_FOUND', 'Comment not found');
    }

    // Only allow user to edit their own comments (unless super admin)
    if (!isSuperAdmin && ticketComment.userId !== userId) {
      throw createError('FORBIDDEN', 'You can only edit your own comments');
    }

    // Don't allow editing system-generated comments
    if (ticketComment.isSystemGenerated) {
      throw createError('FORBIDDEN', 'Cannot edit system-generated comments');
    }

    if (comment !== undefined) ticketComment.comment = comment;
    if (isInternal !== undefined) ticketComment.isInternal = isInternal;

    await ticketComment.save();

    res.json({
      success: true,
      data: ticketComment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete comment
 */
const deleteComment = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;

    const ticketComment = await TicketComment.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!ticketComment) {
      throw createError('RESOURCE_NOT_FOUND', 'Comment not found');
    }

    // Only allow user to delete their own comments (unless super admin)
    if (!isSuperAdmin && ticketComment.userId !== userId) {
      throw createError('FORBIDDEN', 'You can only delete your own comments');
    }

    // Don't allow deleting system-generated comments
    if (ticketComment.isSystemGenerated) {
      throw createError('FORBIDDEN', 'Cannot delete system-generated comments');
    }

    await ticketComment.destroy();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTicketComments,
  createComment,
  updateComment,
  deleteComment
};
