/**
 * Ticketing Module - Services Index
 * 
 * Exports all ticketing business logic services
 * @module modules/ticketing/services
 */

const TicketService = require('./ticketService');
const NotificationService = require('./notificationService');

module.exports = {
  TicketService,
  NotificationService
};
