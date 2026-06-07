'use strict';

/**
 * Ticket Attachment Controller - Ticketing Module
 * 
 * Handles file uploads and attachments for tickets
 * 
 * @module modules/ticketing/controllers/ticketAttachmentController
 */

const { TicketAttachment, Ticket, User } = require('../../../models');
const { createError } = require('../../../utils/errorCodes');
const path = require('path');
const fs = require('fs').promises;

/**
 * Get attachments for a ticket
 */
const getTicketAttachments = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { ticketId } = req.params;

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

    const attachments = await TicketAttachment.findAll({
      where: { ticketId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: attachments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload attachment
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const { tenantId, id: userId, isSuperAdmin } = req.user;
    const { ticketId } = req.params;

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

    if (!req.file) {
      throw createError('VALIDATION_ERROR', 'No file uploaded');
    }

    const file = req.file;

    // Determine file type
    let fileType = 'other';
    if (file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (
      file.mimetype.includes('pdf') ||
      file.mimetype.includes('document') ||
      file.mimetype.includes('word') ||
      file.mimetype.includes('excel') ||
      file.mimetype.includes('spreadsheet')
    ) {
      fileType = 'document';
    }

    const attachment = await TicketAttachment.create({
      tenantId: ticket.tenantId,
      ticketId,
      userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType
    });

    const completeAttachment = await TicketAttachment.findByPk(attachment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeAttachment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete attachment
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin, id: userId } = req.user;
    const { id } = req.params;

    const attachment = await TicketAttachment.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!attachment) {
      throw createError('RESOURCE_NOT_FOUND', 'Attachment not found');
    }

    // Only allow user to delete their own attachments (unless super admin)
    if (!isSuperAdmin && attachment.userId !== userId) {
      throw createError('FORBIDDEN', 'You can only delete your own attachments');
    }

    // Delete file from filesystem
    try {
      await fs.unlink(attachment.filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
      // Continue even if file deletion fails
    }

    await attachment.destroy();

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download attachment
 */
const downloadAttachment = async (req, res, next) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { id } = req.params;

    const attachment = await TicketAttachment.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { tenantId })
      }
    });

    if (!attachment) {
      throw createError('RESOURCE_NOT_FOUND', 'Attachment not found');
    }

    // Check if file exists
    try {
      await fs.access(attachment.filePath);
    } catch (err) {
      throw createError('RESOURCE_NOT_FOUND', 'File not found on server');
    }

    res.download(attachment.filePath, attachment.fileName);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTicketAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment
};
