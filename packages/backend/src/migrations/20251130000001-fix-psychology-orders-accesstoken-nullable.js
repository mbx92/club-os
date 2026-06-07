'use strict';

/**
 * Migration: Fix PsychologyOrders accessToken to allow null
 * 
 * Problem: accessToken was set as NOT NULL but the value is generated
 * in beforeCreate hook, which runs AFTER validation. This causes
 * "cannot be null" errors during order creation.
 * 
 * Solution: Allow NULL in database, let Sequelize model handle
 * the default value generation.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column exists and current constraint
    const tableDescription = await queryInterface.describeTable('PsychologyOrders');
    
    if (tableDescription.accessToken) {
      // Change accessToken to allow NULL
      await queryInterface.changeColumn('PsychologyOrders', 'accessToken', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Unique token for accessing the test via QR/link'
      });
      
      console.log('✅ Changed accessToken column to allow NULL');
    }
  },

  async down(queryInterface, Sequelize) {
    // First, ensure all records have accessToken before reverting
    await queryInterface.sequelize.query(`
      UPDATE "PsychologyOrders"
      SET "accessToken" = CONCAT(
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4), '-',
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4), '-',
        SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
      )
      WHERE "accessToken" IS NULL;
    `);
    
    // Revert to NOT NULL
    await queryInterface.changeColumn('PsychologyOrders', 'accessToken', {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'Unique token for accessing the test via QR/link'
    });
    
    console.log('✅ Reverted accessToken column to NOT NULL');
  }
};
