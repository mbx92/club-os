'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DeviceSyncLogs', {
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
      deviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'HikvisionDevices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      triggeredByUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User yang memicu sync secara manual. Null jika otomatis (cron/push)',
      },
      syncType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'attendance_pull | employee_push_to_device | employee_import_from_device | push_event (realtime)',
      },
      trigger: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'manual | cron | push_event',
      },
      status: {
        type: Sequelize.STRING(15),
        allowNull: false,
        comment: 'success | partial | failed',
      },
      stats: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Stats objek: processed, synced, failed, matched, unmatched, dll.',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Pesan error jika status = failed',
      },
      syncFrom: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Awal rentang waktu untuk attendance_pull',
      },
      syncTo: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Akhir rentang waktu untuk attendance_pull',
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Durasi eksekusi dalam milidetik',
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
    });

    await queryInterface.addIndex('DeviceSyncLogs', ['deviceId', 'createdAt']);
    await queryInterface.addIndex('DeviceSyncLogs', ['tenantId', 'createdAt']);
    await queryInterface.addIndex('DeviceSyncLogs', ['syncType', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DeviceSyncLogs');
  },
};
