'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Expenses', 'fundSource', {
      type: Sequelize.STRING(30),
      allowNull: true,
      comment: 'Source of funds: cash_drawer, vault, bank, petty_cash'
    });

    await queryInterface.addColumn('Expenses', 'vaultAccountId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'VaultAccounts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Vault account used when fundSource = vault'
    });

    await queryInterface.addIndex('Expenses', ['fundSource']);
    await queryInterface.addIndex('Expenses', ['vaultAccountId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Expenses', ['vaultAccountId']);
    await queryInterface.removeIndex('Expenses', ['fundSource']);
    await queryInterface.removeColumn('Expenses', 'vaultAccountId');
    await queryInterface.removeColumn('Expenses', 'fundSource');
  }
};
