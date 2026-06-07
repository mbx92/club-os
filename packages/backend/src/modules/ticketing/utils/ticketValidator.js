'use strict';

/**
 * Ticket Validator - Ticketing Module
 * 
 * Validation utilities for ticketing module
 * @module modules/ticketing/utils/ticketValidator
 */

const { createError } = require('../../../utils/errorCodes');

class TicketValidator {
  /**
   * Valid ticket statuses
   */
  static VALID_STATUSES = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'cancelled'];

  /**
   * Valid file types for attachments
   */
  static VALID_FILE_TYPES = ['image', 'document', 'video', 'other'];

  /**
   * Validate ticket status
   * @param {string} status - Status to validate
   * @throws {Error} If status is invalid
   */
  static validateStatus(status) {
    if (!this.VALID_STATUSES.includes(status)) {
      throw createError('VALIDATION_ERROR', `Invalid status. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current ticket status
   * @param {string} newStatus - New status to transition to
   * @throws {Error} If transition is invalid
   */
  static validateStatusTransition(currentStatus, newStatus) {
    this.validateStatus(newStatus);

    const invalidTransitions = {
      'closed': ['open', 'in_progress', 'waiting_customer'], // Can't reopen closed tickets directly
      'cancelled': ['open', 'in_progress', 'waiting_customer', 'resolved'] // Can't change cancelled tickets
    };

    if (invalidTransitions[currentStatus]?.includes(newStatus)) {
      throw createError('VALIDATION_ERROR', `Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Validate ticket subject
   * @param {string} subject - Ticket subject
   * @throws {Error} If subject is invalid
   */
  static validateSubject(subject) {
    if (!subject || typeof subject !== 'string') {
      throw createError('VALIDATION_ERROR', 'Subject is required');
    }

    if (subject.trim().length < 5) {
      throw createError('VALIDATION_ERROR', 'Subject must be at least 5 characters');
    }

    if (subject.length > 255) {
      throw createError('VALIDATION_ERROR', 'Subject must not exceed 255 characters');
    }
  }

  /**
   * Validate ticket description
   * @param {string} description - Ticket description
   * @throws {Error} If description is invalid
   */
  static validateDescription(description) {
    if (!description || typeof description !== 'string') {
      throw createError('VALIDATION_ERROR', 'Description is required');
    }

    if (description.trim().length < 10) {
      throw createError('VALIDATION_ERROR', 'Description must be at least 10 characters');
    }
  }

  /**
   * Validate comment
   * @param {string} comment - Comment text
   * @throws {Error} If comment is invalid
   */
  static validateComment(comment) {
    if (!comment || typeof comment !== 'string') {
      throw createError('VALIDATION_ERROR', 'Comment is required');
    }

    if (comment.trim().length < 1) {
      throw createError('VALIDATION_ERROR', 'Comment cannot be empty');
    }

    if (comment.length > 5000) {
      throw createError('VALIDATION_ERROR', 'Comment must not exceed 5000 characters');
    }
  }

  /**
   * Validate due date
   * @param {Date|string} dueDate - Due date
   * @throws {Error} If due date is invalid
   */
  static validateDueDate(dueDate) {
    if (!dueDate) return; // Due date is optional

    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw createError('VALIDATION_ERROR', 'Invalid due date format');
    }

    // Due date should be in the future
    const now = new Date();
    if (date < now) {
      throw createError('VALIDATION_ERROR', 'Due date must be in the future');
    }
  }

  /**
   * Validate tags
   * @param {Array} tags - Array of tags
   * @throws {Error} If tags are invalid
   */
  static validateTags(tags) {
    if (!tags) return; // Tags are optional

    if (!Array.isArray(tags)) {
      throw createError('VALIDATION_ERROR', 'Tags must be an array');
    }

    if (tags.length > 20) {
      throw createError('VALIDATION_ERROR', 'Cannot have more than 20 tags');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string') {
        throw createError('VALIDATION_ERROR', 'All tags must be strings');
      }
      if (tag.length > 50) {
        throw createError('VALIDATION_ERROR', 'Tag length must not exceed 50 characters');
      }
    }
  }

  /**
   * Validate ticket creation data
   * @param {Object} data - Ticket data
   * @throws {Error} If data is invalid
   */
  static validateTicketCreation(data) {
    this.validateSubject(data.subject);
    this.validateDescription(data.description);
    
    if (data.dueDate) {
      this.validateDueDate(data.dueDate);
    }

    if (data.tags) {
      this.validateTags(data.tags);
    }
  }

  /**
   * Validate ticket update data
   * @param {Object} data - Ticket update data
   * @throws {Error} If data is invalid
   */
  static validateTicketUpdate(data) {
    if (data.subject !== undefined) {
      this.validateSubject(data.subject);
    }

    if (data.description !== undefined) {
      this.validateDescription(data.description);
    }

    if (data.dueDate !== undefined && data.dueDate !== null) {
      this.validateDueDate(data.dueDate);
    }

    if (data.tags !== undefined) {
      this.validateTags(data.tags);
    }
  }
}

module.exports = TicketValidator;
