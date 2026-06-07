'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Trainers_commissionType" ADD VALUE IF NOT EXISTS 'per_session';`
    );
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL does not support removing enum values directly.
    // To revert, recreate the enum without 'per_session'.
    // This is a no-op to avoid data loss.
  }
};
