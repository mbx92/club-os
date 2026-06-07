'use strict';

/**
 * Ticket Formatter - Ticketing Module
 * 
 * Formatting utilities for ticketing data
 * @module modules/ticketing/utils/ticketFormatter
 */

class TicketFormatter {
  /**
   * Format ticket for API response
   * @param {Object} ticket - Ticket instance
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted ticket
   */
  static formatTicket(ticket, options = {}) {
    const {
      includeComments = false,
      includeAttachments = false,
      includeMetrics = false
    } = options;

    const formatted = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      category: ticket.category ? {
        id: ticket.category.id,
        name: ticket.category.name,
        color: ticket.category.color,
        icon: ticket.category.icon
      } : null,
      priority: ticket.priority ? {
        id: ticket.priority.id,
        name: ticket.priority.name,
        level: ticket.priority.level,
        color: ticket.priority.color,
        slaHours: ticket.priority.slaHours
      } : null,
      requester: ticket.requester ? {
        id: ticket.requester.id,
        name: `${ticket.requester.firstName} ${ticket.requester.lastName}`,
        email: ticket.requester.email
      } : null,
      assignedTo: ticket.assignedTo ? {
        id: ticket.assignedTo.id,
        name: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`,
        email: ticket.assignedTo.email
      } : null,
      member: ticket.member ? {
        id: ticket.member.id,
        name: `${ticket.member.firstName} ${ticket.member.lastName}`,
        email: ticket.member.email,
        phone: ticket.member.phone
      } : null,
      dueDate: ticket.dueDate,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      tags: ticket.tags || [],
      metadata: ticket.metadata || {},
      resolution: ticket.resolution,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    };

    if (includeComments && ticket.comments) {
      formatted.comments = ticket.comments.map(comment => this.formatComment(comment));
    }

    if (includeAttachments && ticket.attachments) {
      formatted.attachments = ticket.attachments.map(attachment => this.formatAttachment(attachment));
    }

    if (includeMetrics) {
      formatted.metrics = this.calculateTicketMetrics(ticket);
    }

    return formatted;
  }

  /**
   * Format comment for API response
   * @param {Object} comment - Comment instance
   * @returns {Object} Formatted comment
   */
  static formatComment(comment) {
    return {
      id: comment.id,
      comment: comment.comment,
      user: comment.user ? {
        id: comment.user.id,
        name: `${comment.user.firstName} ${comment.user.lastName}`
      } : null,
      isInternal: comment.isInternal,
      isSystemGenerated: comment.isSystemGenerated,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    };
  }

  /**
   * Format attachment for API response
   * @param {Object} attachment - Attachment instance
   * @returns {Object} Formatted attachment
   */
  static formatAttachment(attachment) {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      fileType: attachment.fileType,
      user: attachment.user ? {
        id: attachment.user.id,
        name: `${attachment.user.firstName} ${attachment.user.lastName}`
      } : null,
      createdAt: attachment.createdAt,
      downloadUrl: `/api/v1/ticketing/tickets/${attachment.ticketId}/attachments/${attachment.id}/download`
    };
  }

  /**
   * Calculate ticket metrics
   * @param {Object} ticket - Ticket instance
   * @returns {Object} Ticket metrics
   */
  static calculateTicketMetrics(ticket) {
    const metrics = {
      isOverdue: false,
      ageInHours: 0,
      resolutionTimeInHours: null,
      slaStatus: null
    };

    const now = new Date();
    const created = new Date(ticket.createdAt);
    
    // Calculate age
    metrics.ageInHours = Math.floor((now - created) / (1000 * 60 * 60));

    // Check if overdue
    if (ticket.dueDate && !['resolved', 'closed', 'cancelled'].includes(ticket.status)) {
      metrics.isOverdue = new Date(ticket.dueDate) < now;
    }

    // Calculate resolution time
    if (ticket.resolvedAt) {
      const resolved = new Date(ticket.resolvedAt);
      metrics.resolutionTimeInHours = Math.floor((resolved - created) / (1000 * 60 * 60));
    }

    // Calculate SLA status
    if (ticket.priority?.slaHours) {
      const slaDeadline = new Date(created.getTime() + ticket.priority.slaHours * 60 * 60 * 1000);
      
      if (['resolved', 'closed'].includes(ticket.status)) {
        const resolutionDate = new Date(ticket.resolvedAt || ticket.closedAt);
        metrics.slaStatus = {
          met: resolutionDate <= slaDeadline,
          deadline: slaDeadline,
          resolutionDate
        };
      } else {
        metrics.slaStatus = {
          met: now <= slaDeadline,
          breached: now > slaDeadline,
          deadline: slaDeadline,
          hoursRemaining: Math.max(0, Math.floor((slaDeadline - now) / (1000 * 60 * 60)))
        };
      }
    }

    return metrics;
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration in seconds to human readable
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  static formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

module.exports = TicketFormatter;
