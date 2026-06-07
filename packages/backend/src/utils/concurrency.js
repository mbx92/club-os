'use strict';

const { Sequelize } = require('sequelize');
const { logRetryAttempt, logRetrySuccess, logRetryFailure } = require('../middlewares/raceConditionLogger');

/**
 * Concurrency utilities for handling race conditions
 */
class ConcurrencyUtils {
  /**
   * Add version field to a model for optimistic locking
   * @param {Object} model - Sequelize model definition
   * @returns {Object} - Updated model with version field
   */
  static addOptimisticLocking(model) {
    // Add version field to the model definition
    if (!model.attributes.version) {
      model.attributes.version = {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      };
    }

    // Add hooks for optimistic locking
    if (!model.hooks) {
      model.hooks = {};
    }

    // Before update hook to check version
    if (!model.hooks.beforeUpdate) {
      model.hooks.beforeUpdate = [];
    }

    model.hooks.beforeUpdate.push(async (instance, options) => {
      // If version is provided in options, check it
      if (options.version !== undefined && instance.version !== options.version) {
        throw new Error('Optimistic locking error: Record was modified by another transaction');
      }

      // Increment version
      instance.version += 1;
    });

    return model;
  }

  /**
   * Generate a unique sequence number with atomic operation
   * @param {Object} Model - Sequelize model
   * @param {Object} where - Where clause to find the last record
   * @param {string} prefix - Prefix for the sequence
   * @param {string} fieldName - Field name that contains the sequence (e.g., 'transactionNumber')
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<string>} - Generated sequence number
   */
  static async generateUniqueSequence(Model, where, prefix, fieldName, transaction) {
    // Use FOR UPDATE to lock the row for pessimistic locking
    // paranoid: false ensures soft-deleted records are included so we don't
    // re-generate a sequence number that already exists (deleted or not),
    // which would violate the unique constraint at the DB level.
    const lastRecord = await Model.findOne({
      where,
      order: [[fieldName, 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
      paranoid: false
    });

    let sequence = 1;

    if (lastRecord) {
      // Extract sequence number from the last record
      const lastValue = lastRecord[fieldName];
      const lastSequence = ConcurrencyUtils.extractSequence(lastValue, prefix);
      sequence = lastSequence + 1;
    }

    // Pad with zeros to make it 4 digits
    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Extract sequence number from a string
   * @param {string} value - String containing sequence
   * @param {string} prefix - Prefix of the sequence
   * @returns {number} - Extracted sequence number
   */
  static extractSequence(value, prefix) {
    if (!value || !prefix) return 0;

    // Remove prefix and convert to number
    const sequenceStr = value.replace(prefix, '');
    const sequence = parseInt(sequenceStr, 10);

    return isNaN(sequence) ? 0 : sequence;
  }

  /**
   * Execute a function with retry logic for optimistic locking failures
   * @param {Function} fn - Function to execute
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise<any>} - Result of the function
   */
  static async withRetry(fn, maxRetries = 3, delay = 100, operation = 'Unknown operation') {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();

        // Log successful retry if it took more than one attempt
        if (attempt > 1) {
          logRetrySuccess(operation, attempt);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if it's an optimistic locking error
        if (error.message.includes('Optimistic locking error') && attempt < maxRetries) {
          // Log retry attempt
          logRetryAttempt(operation, attempt, maxRetries, { error: error.message });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Log failed retry
        if (attempt === maxRetries) {
          logRetryFailure(operation, attempt, error);
        }

        // Re-throw if it's not an optimistic locking error or we've exceeded retries
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Create a transaction with proper isolation level
   * @param {Object} sequelize - Sequelize instance
   * @param {Function} callback - Function to execute within transaction
   * @param {Object} options - Transaction options
   * @returns {Promise<any>} - Result of the callback
   */
  static async withTransaction(sequelize, callback, options = {}) {
    const transaction = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      ...options
    });

    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Atomic increment operation
   * @param {Object} instance - Model instance
   * @param {string} field - Field to increment
   * @param {number} value - Value to increment by
   * @param {Object} options - Sequelize options
   * @returns {Promise<Object>} - Updated instance
   */
  static async atomicIncrement(instance, field, value, options = {}) {
    const currentValue = instance[field] || 0;
    const newValue = currentValue + value;

    return instance.update({
      [field]: newValue
    }, {
      ...options,
      // Use where clause to ensure we're updating the correct version
      where: {
        ...options.where,
        id: instance.id,
        version: instance.version
      }
    });
  }

  /**
   * Atomic decrement operation with validation
   * @param {Object} instance - Model instance
   * @param {string} field - Field to decrement
   * @param {number} value - Value to decrement by
   * @param {number} minValue - Minimum allowed value
   * @param {Object} options - Sequelize options
   * @returns {Promise<Object>} - Updated instance
   */
  static async atomicDecrement(instance, field, value, minValue = 0, options = {}) {
    const currentValue = instance[field] || 0;

    if (currentValue < value) {
      throw new Error(`Cannot decrement ${field} below ${minValue}. Current value: ${currentValue}, Attempted decrement: ${value}`);
    }

    const newValue = Math.max(currentValue - value, minValue);

    return instance.update({
      [field]: newValue
    }, {
      ...options,
      // Use where clause to ensure we're updating the correct version
      where: {
        ...options.where,
        id: instance.id,
        version: instance.version
      }
    });
  }
}

module.exports = ConcurrencyUtils;