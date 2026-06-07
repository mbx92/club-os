'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PTSessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activeServiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'ActiveServices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'The PT package active service this session belongs to'
      },
      trainerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Trainers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      memberId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Members', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sessionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Scheduled or actual session date/time'
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 60,
        comment: 'Session duration in minutes'
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'scheduled: future/pending, completed: done, cancelled: cancelled, no_show: member did not attend'
      },
      sessionUsed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether a session was deducted from remainingSessions for this PT session'
      },
      checkInId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'CheckIns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional link to a gym check-in record'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      exerciseLog: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Optional workout log (exercises, sets, reps, weight)'
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('PTSessions', ['tenantId'], { name: 'pt_sessions_tenant_id_idx' });
    await queryInterface.addIndex('PTSessions', ['activeServiceId'], { name: 'pt_sessions_active_service_id_idx' });
    await queryInterface.addIndex('PTSessions', ['trainerId'], { name: 'pt_sessions_trainer_id_idx' });
    await queryInterface.addIndex('PTSessions', ['memberId'], { name: 'pt_sessions_member_id_idx' });
    await queryInterface.addIndex('PTSessions', ['sessionDate'], { name: 'pt_sessions_session_date_idx' });
    await queryInterface.addIndex('PTSessions', ['status'], { name: 'pt_sessions_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_status_idx');
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_session_date_idx');
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_member_id_idx');
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_trainer_id_idx');
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_active_service_id_idx');
    await queryInterface.removeIndex('PTSessions', 'pt_sessions_tenant_id_idx');
    await queryInterface.dropTable('PTSessions');
  }
};
