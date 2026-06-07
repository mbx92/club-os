/**
 * Ticketing Module - Models Index
 * 
 * Exports all ticketing-related models.
 * These models are registered with Sequelize in the main models/index.js
 * 
 * @module modules/ticketing/models
 */

// Model definitions (will be initialized by Sequelize)
module.exports = {
  Ticket: require('./ticket'),
  TicketCategory: require('./ticketCategory'),
  TicketPriority: require('./ticketPriority'),
  TicketComment: require('./ticketComment'),
  TicketAttachment: require('./ticketAttachment')
};
