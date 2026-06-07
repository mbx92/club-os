'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add customerName column for walk-in customers
    await queryInterface.addColumn('ActiveServices', 'customerName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Customer name for walk-in purchases (when memberId is null)'
    });

    // Drop the NOT NULL constraint on memberId using raw SQL (changeColumn is unreliable on Postgres)
    await queryInterface.sequelize.query(
      `ALTER TABLE "ActiveServices" ALTER COLUMN "memberId" DROP NOT NULL;`
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ActiveServices', 'customerName');

    await queryInterface.sequelize.query(
      `ALTER TABLE "ActiveServices" ALTER COLUMN "memberId" SET NOT NULL;`
    );
  }
};
