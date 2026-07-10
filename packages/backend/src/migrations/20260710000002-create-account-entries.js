'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AccountEntries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      accountId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      entryNumber: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM(
          'opening',
          'inflow',
          'outflow',
          'transfer_in',
          'transfer_out',
          'settlement',
          'adjustment_credit',
          'adjustment_debit'
        ),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      balanceBefore: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      balanceAfter: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      entryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      settlementDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('completed', 'pending_settlement'),
        allowNull: false,
        defaultValue: 'completed',
      },
      performedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('AccountEntries', ['accountId']);
    await queryInterface.addIndex('AccountEntries', ['tenantId']);
    await queryInterface.addIndex('AccountEntries', ['tenantId', 'entryDate']);
    await queryInterface.addIndex('AccountEntries', ['referenceType', 'referenceId']);
    await queryInterface.addIndex('AccountEntries', ['status', 'settlementDate']);
    await queryInterface.addIndex('AccountEntries', ['entryNumber']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AccountEntries');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AccountEntries_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AccountEntries_status";');
  },
};
