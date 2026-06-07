'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HikvisionDevices', {
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
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Human-readable device name (e.g. "Front Door Fingerprint")',
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: false,
        comment: 'Device IP address',
      },
      port: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 80,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'ISAPI auth username',
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'ISAPI auth password (encrypted)',
      },
      serialNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Device serial number',
      },
      useForMemberCheckIn: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'If true, also try matching against Members table',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last successful pull-sync timestamp',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Index for tenant lookup
    await queryInterface.addIndex('HikvisionDevices', ['tenantId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('HikvisionDevices');
  }
};
