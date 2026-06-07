'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'auth' value to the enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Logs_level" ADD VALUE IF NOT EXISTS 'auth';`
    );

    // Add 'system' value to the enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Logs_level" ADD VALUE IF NOT EXISTS 'system';`
    );
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL does not support removing enum values directly
    console.log('Reverting enum values is not supported. Manual intervention required.');
  }
};
