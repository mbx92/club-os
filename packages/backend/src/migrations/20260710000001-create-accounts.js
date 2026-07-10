'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Accounts', {
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
      locationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('bank', 'e_wallet', 'payment_gateway', 'petty_cash', 'custom'),
        allowNull: false,
        defaultValue: 'bank',
      },
      paymentMethod: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      bankName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      openingBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      openingDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      settlementDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pettyCashId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('Accounts', ['tenantId']);
    await queryInterface.addIndex('Accounts', ['tenantId', 'isActive']);
    // Partial unique index: one account per (paymentMethod, bankName) per tenant (excluding soft-deleted)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX accounts_tenant_method_bank_unique
      ON "Accounts" ("tenantId", "paymentMethod", "bankName")
      WHERE "deletedAt" IS NULL
        AND "paymentMethod" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Accounts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Accounts_type";');
  },
};
