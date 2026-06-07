'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Vouchers', 'isCompliment', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, this voucher is a compliment/free treat from the owner. Discount from this voucher is shown separately in reports (Compliment Total), not in regular Discount.'
    });

    // Update existing vouchers whose code or name contains 'complement' or 'compliment'
    await queryInterface.sequelize.query(`
      UPDATE "Vouchers"
      SET "isCompliment" = true
      WHERE LOWER(code) LIKE '%complement%'
         OR LOWER(code) LIKE '%compliment%'
         OR LOWER(name) LIKE '%complement%'
         OR LOWER(name) LIKE '%compliment%'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Vouchers', 'isCompliment');
  }
};
