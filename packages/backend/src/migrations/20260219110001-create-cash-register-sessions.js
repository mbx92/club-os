'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CashRegisterSessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Locations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // Shift identification
      shiftName: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'e.g. "pagi", "siang", "malam" or free text',
      },
      shiftDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Calendar date of this shift',
      },
      shiftNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Shift sequence on the same date (1, 2, 3...)',
      },
      // Opening
      openingBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Cash on hand when shift opened (petty cash)',
      },
      openedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      openedById: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      openingNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Closing
      status: {
        type: Sequelize.ENUM('open', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      closingBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Opening balance + cash transactions during shift',
      },
      actualCash: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Physical cash counted at closing',
      },
      difference: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'actualCash - closingBalance (positive = surplus, negative = deficit)',
      },
      closedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      closedById: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      closingNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Timestamps
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

    // Indexes
    await queryInterface.addIndex('CashRegisterSessions', ['tenantId']);
    await queryInterface.addIndex('CashRegisterSessions', ['tenantId', 'shiftDate']);
    await queryInterface.addIndex('CashRegisterSessions', ['tenantId', 'status']);
    await queryInterface.addIndex('CashRegisterSessions', ['locationId']);
    await queryInterface.addIndex('CashRegisterSessions', ['openedById']);
    // Unique: only 1 open session per tenant+location at a time
    await queryInterface.addIndex('CashRegisterSessions', ['tenantId', 'locationId', 'shiftDate', 'shiftNumber'], {
      unique: true,
      name: 'unique_shift_per_tenant_location_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CashRegisterSessions');
  },
};
