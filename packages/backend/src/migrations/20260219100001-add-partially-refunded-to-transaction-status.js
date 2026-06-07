'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_Transactions_status" ADD VALUE IF NOT EXISTS 'partially_refunded'`
    );
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL does not support removing enum values without recreating the type.
    // To rollback, you would need to migrate existing rows away from 'partially_refunded'
    // and then recreate the enum. For safety, this is left as a no-op.
    console.log(
      'Cannot remove enum value "partially_refunded" automatically. Manual intervention required if rollback is needed.'
    );
  },
};
