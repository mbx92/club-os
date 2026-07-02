'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('StaffAttendances');

    if (!table.scheduleId) {
      await queryInterface.addColumn('StaffAttendances', 'scheduleId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'EmployeeSchedules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    try {
      await queryInterface.removeConstraint('StaffAttendances', 'uq_staff_attendance_user_date');
    } catch (error) {
      console.log('Note: constraint uq_staff_attendance_user_date not found, skipping removal.');
    }

    try {
      await queryInterface.addConstraint('StaffAttendances', {
        fields: ['scheduleId'],
        type: 'unique',
        name: 'uq_staff_attendance_schedule',
      });
    } catch (error) {
      console.log('Note: constraint uq_staff_attendance_schedule already exists, skipping creation.');
    }

    await queryInterface.sequelize.query(`
      UPDATE "StaffAttendances" sa
      SET "scheduleId" = matched."scheduleId"
      FROM (
        SELECT
          sa_inner.id AS "attendanceId",
          MAX(es.id::text)::uuid AS "scheduleId"
        FROM "StaffAttendances" sa_inner
        JOIN "EmployeeSchedules" es
          ON es."tenantId" = sa_inner."tenantId"
         AND es."deviceEmployeeId" = sa_inner."deviceEmployeeId"
         AND es.date = sa_inner.date
        WHERE sa_inner."scheduleId" IS NULL
        GROUP BY sa_inner.id
        HAVING COUNT(*) = 1
      ) matched
      WHERE sa.id = matched."attendanceId"
        AND sa."scheduleId" IS NULL
    `);

    try {
      await queryInterface.addIndex('StaffAttendances', ['tenantId', 'deviceEmployeeId', 'date'], {
        name: 'idx_staff_attendance_employee_date',
      });
    } catch (error) {
      console.log('Note: index idx_staff_attendance_employee_date already exists, skipping creation.');
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('StaffAttendances', 'idx_staff_attendance_employee_date');
    await queryInterface.removeConstraint('StaffAttendances', 'uq_staff_attendance_schedule');

    await queryInterface.addConstraint('StaffAttendances', {
      fields: ['tenantId', 'userId', 'date'],
      type: 'unique',
      name: 'uq_staff_attendance_user_date',
    });

    await queryInterface.removeColumn('StaffAttendances', 'scheduleId');
  }
};
