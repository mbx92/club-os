/**
 * Ticketing Module - Routes Index
 * 
 * Aggregates all ticketing module routes
 * @module modules/ticketing/routes
 */

const express = require('express');
const router = express.Router();

// Import routes
const ticketRoutes = require('./ticket.routes');
const categoryRoutes = require('./ticketCategory.routes');
const priorityRoutes = require('./ticketPriority.routes');
const commentRoutes = require('./ticketComment.routes');
const attachmentRoutes = require('./ticketAttachment.routes');
const dashboardRoutes = require('./dashboard.routes');

// Mount routes
router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/priorities', priorityRoutes);
router.use('/tickets/:ticketId/comments', commentRoutes);
router.use('/tickets/:ticketId/attachments', attachmentRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
