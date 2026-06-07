/**
 * JSONB Query Helper Utilities
 * 
 * Provides clean and performant methods for querying PostgreSQL JSONB fields
 * Used primarily for Product.productDetails queries
 * 
 * @module utils/jsonbQueryHelper
 */

const { Op } = require('sequelize');
const { sequelize } = require('../models');

class JsonbQueryHelper {
  /**
   * Check if JSONB field has a specific property with a value
   * 
   * @param {string} field - JSONB field name (e.g., 'productDetails')
   * @param {string} key - Property key in JSON (e.g., 'productType')
   * @param {string} value - Expected value
   * @returns {Object} Sequelize literal for WHERE clause
   * 
   * @example
   * where: {
   *   [Op.and]: [JsonbQueryHelper.hasProperty('productDetails', 'productType', 'food')]
   * }
   */
  static hasProperty(field, key, value) {
    return sequelize.literal(`${field}->>'${key}' = '${value}'`);
  }

  /**
   * Check if JSONB field property equals a boolean value
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key in JSON
   * @param {boolean} value - Boolean value
   * @returns {Object} Sequelize literal
   * 
   * @example
   * where: {
   *   [Op.and]: [JsonbQueryHelper.hasBoolean('productDetails', 'isAvailable', true)]
   * }
   */
  static hasBoolean(field, key, value) {
    return sequelize.literal(`${field}->>'${key}' = '${value}'`);
  }

  /**
   * Check if JSONB field property is greater than a value
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key in JSON
   * @param {number} value - Comparison value
   * @returns {Object} Sequelize literal
   * 
   * @example
   * // Find products with preparationTime < 10 minutes
   * where: {
   *   [Op.and]: [JsonbQueryHelper.numberLessThan('productDetails', 'preparationTime', 10)]
   * }
   */
  static numberLessThan(field, key, value) {
    return sequelize.literal(
      `(${field}->>'${key}')::integer < ${value}`
    );
  }

  /**
   * Check if JSONB field property is less than a value
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key in JSON
   * @param {number} value - Comparison value
   * @returns {Object} Sequelize literal
   */
  static numberGreaterThan(field, key, value) {
    return sequelize.literal(
      `(${field}->>'${key}')::integer > ${value}`
    );
  }

  /**
   * Check if JSONB array contains an object with specific property
   * 
   * @param {string} field - JSONB field name
   * @param {string} arrayKey - Array property name
   * @param {string} searchKey - Key to search in array objects
   * @param {string} searchValue - Value to match
   * @returns {Object} Sequelize literal
   * 
   * @example
   * // Find products that have "Extra Cheese" in customOptions
   * where: {
   *   [Op.and]: [
   *     JsonbQueryHelper.arrayContains('productDetails', 'customOptions', 'name', 'Extra Cheese')
   *   ]
   * }
   */
  static arrayContains(field, arrayKey, searchKey, searchValue) {
    return sequelize.literal(
      `${field}->'${arrayKey}' @> '[{"${searchKey}": "${searchValue}"}]'::jsonb`
    );
  }

  /**
   * Check if JSONB field contains a partial object
   * Uses PostgreSQL @> containment operator
   * 
   * @param {string} field - JSONB field name
   * @param {Object} searchObject - Object structure to find
   * @returns {Object} Sequelize literal
   * 
   * @example
   * // Find products with specific variant structure
   * where: {
   *   [Op.and]: [
   *     JsonbQueryHelper.contains('productDetails', {
   *       variants: [{ name: "Size" }]
   *     })
   *   ]
   * }
   */
  static contains(field, searchObject) {
    return sequelize.literal(
      `${field} @> '${JSON.stringify(searchObject)}'::jsonb`
    );
  }

  /**
   * Full-text search in JSONB field values
   * 
   * @param {string} field - JSONB field name
   * @param {string} searchTerm - Search term
   * @returns {Object} Sequelize literal
   * 
   * @example
   * // Search for "spicy" anywhere in productDetails
   * where: {
   *   [Op.and]: [JsonbQueryHelper.textSearch('productDetails', 'spicy')]
   * }
   */
  static textSearch(field, searchTerm) {
    return sequelize.literal(
      `${field}::text ILIKE '%${searchTerm}%'`
    );
  }

  /**
   * Check if JSONB property exists
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key to check
   * @returns {Object} Sequelize literal
   * 
   * @example
   * where: {
   *   [Op.and]: [JsonbQueryHelper.propertyExists('productDetails', 'customOptions')]
   * }
   */
  static propertyExists(field, key) {
    return sequelize.literal(`${field} ? '${key}'`);
  }

  /**
   * Build complex filter for product queries
   * Convenience method that combines common filters
   * 
   * @param {Object} filters - Filter object
   * @param {string} filters.productType - Product type (food, beverage, retail, service)
   * @param {boolean} filters.isAvailable - Availability status
   * @param {number} filters.maxPrepTime - Maximum preparation time
   * @param {string} filters.hasIngredient - Search in ingredients
   * @returns {Array} Array of Sequelize literals for WHERE clause
   * 
   * @example
   * const where = {
   *   tenantId,
   *   [Op.and]: JsonbQueryHelper.buildProductFilter({
   *     productType: 'food',
   *     isAvailable: true,
   *     maxPrepTime: 15
   *   })
   * };
   */
  static buildProductFilter(filters) {
    const conditions = [];
    
    if (filters.productType) {
      conditions.push(this.hasProperty('productDetails', 'productType', filters.productType));
    }
    
    if (filters.isAvailable !== undefined) {
      conditions.push(this.hasBoolean('productDetails', 'isAvailable', filters.isAvailable));
    }
    
    if (filters.maxPrepTime) {
      conditions.push(this.numberLessThan('productDetails', 'preparationTime', filters.maxPrepTime));
    }
    
    if (filters.hasIngredient) {
      conditions.push(
        this.arrayContains('productDetails', 'baseIngredients', 'name', filters.hasIngredient)
      );
    }
    
    if (filters.hasCustomOption) {
      conditions.push(
        this.arrayContains('productDetails', 'customOptions', 'name', filters.hasCustomOption)
      );
    }
    
    return conditions;
  }

  /**
   * Helper to build ORDER BY for JSONB numeric fields
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key
   * @param {string} direction - 'ASC' or 'DESC'
   * @returns {Array} Sequelize order clause
   * 
   * @example
   * order: JsonbQueryHelper.orderByNumber('productDetails', 'preparationTime', 'ASC')
   */
  static orderByNumber(field, key, direction = 'ASC') {
    return [
      sequelize.literal(`(${field}->>'${key}')::integer`),
      direction
    ];
  }

  /**
   * Helper to build ORDER BY for JSONB string fields
   * 
   * @param {string} field - JSONB field name
   * @param {string} key - Property key
   * @param {string} direction - 'ASC' or 'DESC'
   * @returns {Array} Sequelize order clause
   */
  static orderByString(field, key, direction = 'ASC') {
    return [
      sequelize.literal(`${field}->>'${key}'`),
      direction
    ];
  }

  /**
   * Get default productDetails structure for new products
   * 
   * @param {string} productType - Type of product
   * @returns {Object} Default JSONB structure
   */
  static getDefaultProductDetails(productType = 'retail') {
    return {
      productType,
      isAvailable: true,
      baseIngredients: [],
      customOptions: [],
      variants: [],
      preparationTime: null,
      images: [],
      metadata: {}
    };
  }

  /**
   * Validate productDetails structure
   * 
   * @param {Object} productDetails - Product details object
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateProductDetails(productDetails) {
    const errors = [];
    
    if (!productDetails) {
      return { valid: false, errors: ['productDetails is required'] };
    }
    
    // Validate productType
    const validTypes = ['retail', 'food', 'beverage', 'service'];
    if (productDetails.productType && !validTypes.includes(productDetails.productType)) {
      errors.push(`productType must be one of: ${validTypes.join(', ')}`);
    }
    
    // Validate isAvailable is boolean
    if (productDetails.isAvailable !== undefined && typeof productDetails.isAvailable !== 'boolean') {
      errors.push('isAvailable must be a boolean');
    }
    
    // Validate arrays
    if (productDetails.customOptions && !Array.isArray(productDetails.customOptions)) {
      errors.push('customOptions must be an array');
    }
    
    if (productDetails.variants && !Array.isArray(productDetails.variants)) {
      errors.push('variants must be an array');
    }
    
    // Validate preparationTime is number
    if (productDetails.preparationTime !== null && 
        productDetails.preparationTime !== undefined && 
        typeof productDetails.preparationTime !== 'number') {
      errors.push('preparationTime must be a number');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = JsonbQueryHelper;
