'use strict';

/**
 * Ticket Attachment Routes - Ticketing Module
 * 
 * Routes for ticket attachments
 * @module modules/ticketing/routes/ticketAttachment
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Merge params to access :ticketId
const multer = require('multer');
const path = require('path');
const ticketAttachmentController = require('../controllers/ticketAttachmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');
const { requireModule } = require('../../../middlewares/featureGateMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ticketing/attachments/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images, documents, and common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'video/mp4',
      'video/mpeg'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and videos are allowed.'));
    }
  }
});

// All routes require authentication and ticketing module access
router.use(authenticate);
router.use(requireModule('ticketing'));

/**
 * @route GET /api/v1/ticketing/tickets/:ticketId/attachments
 * @desc Get all attachments for a ticket
 * @access Private - requires 'read' permission on 'TicketAttachment'
 */
router.get('/',
  authorizeCasl('read', 'TicketAttachment'),
  ticketAttachmentController.getTicketAttachments
);

/**
 * @route POST /api/v1/ticketing/tickets/:ticketId/attachments
 * @desc Upload attachment for a ticket
 * @access Private - requires 'create' permission on 'TicketAttachment'
 */
router.post('/',
  authorizeCasl('create', 'TicketAttachment'),
  upload.single('file'),
  ticketAttachmentController.uploadAttachment
);

/**
 * @route GET /api/v1/ticketing/tickets/:ticketId/attachments/:id/download
 * @desc Download attachment
 * @access Private - requires 'read' permission on 'TicketAttachment'
 */
router.get('/:id/download',
  authorizeCasl('read', 'TicketAttachment'),
  ticketAttachmentController.downloadAttachment
);

/**
 * @route DELETE /api/v1/ticketing/tickets/:ticketId/attachments/:id
 * @desc Delete attachment
 * @access Private - requires 'delete' permission on 'TicketAttachment'
 */
router.delete('/:id',
  authorizeCasl('delete', 'TicketAttachment'),
  ticketAttachmentController.deleteAttachment
);

module.exports = router;
