'use strict';

/**
 * Migration: Add isCustomized field to Products table
 * 
 * Adds a boolean field to enable product customization with extras/additions.
 * This allows products like "Nasi Goreng" to have customizable extras like "Extra Telur +5000".
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'isCustomized', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this product allows custom extras/additions'
    });

    // Add index for quick filtering of customizable products
    await queryInterface.addIndex('Products', ['tenantId', 'isCustomized'], {
      name: 'products_tenant_customized_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Products', 'products_tenant_customized_idx');
    await queryInterface.removeColumn('Products', 'isCustomized');
  }
};
