/**
 * Ticketing Module - Controllers Index
 * 
 * Exports all ticketing endpoint controllers
 * @module modules/ticketing/controllers
 */

const ticketController = require('./ticketController');
const ticketCategoryController = require('./ticketCategoryController');
const ticketPriorityController = require('./ticketPriorityController');
const ticketCommentController = require('./ticketCommentController');
const ticketAttachmentController = require('./ticketAttachmentController');
const dashboardController = require('./dashboardController');

module.exports = {
  ticketController,
  ticketCategoryController,
  ticketPriorityController,
  ticketCommentController,
  ticketAttachmentController,
  dashboardController
};
