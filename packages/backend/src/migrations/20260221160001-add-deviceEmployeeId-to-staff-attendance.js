'use strict';

/**
 * Migration: Add deviceEmployeeId to StaffAttendance & DeviceAttendanceLogs
 *
 * Staff matching now uses DeviceEmployee instead of system User.
 *
 * Changes:
 * 1. Add deviceEmployeeId FK to StaffAttendances (NOT NULL after backfill)
 * 2. Make userId nullable in StaffAttendances
 * 3. Add matchedDeviceEmployeeId FK to DeviceAttendanceLogs
 * 4. Backfill from User.deviceEmployeeNo → DeviceEmployee
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── StaffAttendances ──────────────────────────────────

    // 1. Add deviceEmployeeId column (temporarily nullable for backfill)
    await queryInterface.addColumn('StaffAttendances', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 2. Backfill deviceEmployeeId from Users → DeviceEmployees
    await queryInterface.sequelize.query(`
      UPDATE "StaffAttendances" sa
      SET "deviceEmployeeId" = de.id
      FROM "Users" u
      JOIN "DeviceEmployees" de ON de."userId" = u.id AND de."tenantId" = u."tenantId"
      WHERE sa."userId" = u.id
        AND sa."deviceEmployeeId" IS NULL
    `);

    // 3. Delete orphan rows that couldn't be linked
    await queryInterface.sequelize.query(`
      DELETE FROM "StaffAttendances" WHERE "deviceEmployeeId" IS NULL
    `);

    // 4. Make deviceEmployeeId NOT NULL
    await queryInterface.changeColumn('StaffAttendances', 'deviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // 5. Make userId nullable (raw SQL — changeColumn doesn't reliably alter nullability)
    await queryInterface.sequelize.query(
      `ALTER TABLE "StaffAttendances" ALTER COLUMN "userId" DROP NOT NULL`
    );

    // 6. Add index on deviceEmployeeId
    await queryInterface.addIndex('StaffAttendances', ['deviceEmployeeId'], {
      name: 'idx_staff_attendances_device_employee',
    });

    // ── DeviceAttendanceLogs ──────────────────────────────

    // 1. Add matchedDeviceEmployeeId column
    await queryInterface.addColumn('DeviceAttendanceLogs', 'matchedDeviceEmployeeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'DeviceEmployees', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // 2. Backfill from matchedUserId → DeviceEmployee
    await queryInterface.sequelize.query(`
      UPDATE "DeviceAttendanceLogs" dal
      SET "matchedDeviceEmployeeId" = de.id
      FROM "Users" u
      JOIN "DeviceEmployees" de ON de."userId" = u.id AND de."tenantId" = u."tenantId"
      WHERE dal."matchedUserId" = u.id
        AND dal."matchedDeviceEmployeeId" IS NULL
    `);

    // 3. Add index
    await queryInterface.addIndex('DeviceAttendanceLogs', ['matchedDeviceEmployeeId'], {
      name: 'idx_device_attendance_logs_matched_device_employee',
    });
  },

  async down(queryInterface, Sequelize) {
    // ── DeviceAttendanceLogs (reverse) ──
    try {
      await queryInterface.removeIndex('DeviceAttendanceLogs', 'idx_device_attendance_logs_matched_device_employee');
    } catch (e) { /* ignore */ }
    await queryInterface.removeColumn('DeviceAttendanceLogs', 'matchedDeviceEmployeeId');

    // ── StaffAttendances (reverse) ──
    try {
      await queryInterface.removeIndex('StaffAttendances', 'idx_staff_attendances_device_employee');
    } catch (e) { /* ignore */ }

    // Make userId NOT NULL again
    await queryInterface.sequelize.query(
      `ALTER TABLE "StaffAttendances" ALTER COLUMN "userId" SET NOT NULL`
    );

    await queryInterface.removeColumn('StaffAttendances', 'deviceEmployeeId');
  },
};
