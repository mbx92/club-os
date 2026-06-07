/**
 * Merge duplicate DeviceEmployee records.
 *
 * Usage:
 *   node scripts/mergeDeviceEmployee.js --keep <employeeNo> --remove <employeeNo> [--dry-run]
 *
 * --keep   : employeeNo yang dipertahankan (yang device pakai untuk tap FP)
 * --remove : employeeNo duplikat yang akan dihapus (semua referensinya dipindah ke --keep)
 *
 * Contoh:
 *   node scripts/mergeDeviceEmployee.js --keep 6 --remove 1021 --dry-run
 *   node scripts/mergeDeviceEmployee.js --keep 6 --remove 1021
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const {
  DeviceEmployee,
  StaffAttendance,
  EmployeeSchedule,
  DeviceAttendanceLog,
  sequelize,
} = require('../src/models');

const args = process.argv.slice(2);
const keepNo   = args[args.indexOf('--keep')   + 1];
const removeNo = args[args.indexOf('--remove') + 1];
const DRY_RUN  = args.includes('--dry-run');

if (!keepNo || !removeNo) {
  console.error('Usage: node scripts/mergeDeviceEmployee.js --keep <empNo> --remove <empNo> [--dry-run]');
  process.exit(1);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Merge DeviceEmployee Records');
  console.log(`   KEEP:   empNo=${keepNo}`);
  console.log(`   REMOVE: empNo=${removeNo}`);
  console.log(`   Mode:   ${DRY_RUN ? '🔍 DRY RUN' : '⚡ APPLY'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const [keepEmp, removeEmp] = await Promise.all([
    DeviceEmployee.findOne({ where: { employeeNo: keepNo } }),
    DeviceEmployee.findOne({ where: { employeeNo: removeNo } }),
  ]);

  if (!keepEmp)   { console.error(`❌ Employee empNo=${keepNo} tidak ditemukan`);   process.exit(1); }
  if (!removeEmp) { console.error(`❌ Employee empNo=${removeNo} tidak ditemukan`); process.exit(1); }

  console.log(`✓ KEEP   : id=${keepEmp.id}   name="${keepEmp.name}"   empNo=${keepEmp.employeeNo}`);
  console.log(`✓ REMOVE : id=${removeEmp.id} name="${removeEmp.name}" empNo=${removeEmp.employeeNo}\n`);

  // Count references
  const [attCount, schCount, logCount] = await Promise.all([
    StaffAttendance.count({ where: { deviceEmployeeId: removeEmp.id } }),
    EmployeeSchedule.count({ where: { deviceEmployeeId: removeEmp.id } }),
    DeviceAttendanceLog.count({ where: { matchedDeviceEmployeeId: removeEmp.id } }),
  ]);

  console.log('── Referensi yang akan dipindahkan ──────────────────────');
  console.log(`   StaffAttendance:    ${attCount} records`);
  console.log(`   EmployeeSchedule:   ${schCount} records`);
  console.log(`   DeviceAttendanceLog (matched): ${logCount} records`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — tidak ada perubahan diterapkan.');
    process.exit(0);
  }

  const t = await sequelize.transaction();
  try {
    // 1. Pindahkan StaffAttendance
    if (attCount > 0) {
      // Cek konflik: apakah ada attendance pada hari yang sama di keepEmp
      const removedAtt = await StaffAttendance.findAll({
        where: { deviceEmployeeId: removeEmp.id },
        transaction: t,
      });

      let moved = 0, skipped = 0;
      for (const att of removedAtt) {
        const dateStr = att.date instanceof Date
          ? att.date.toISOString().split('T')[0]
          : String(att.date).split('T')[0];

        const conflict = await StaffAttendance.findOne({
          where: { deviceEmployeeId: keepEmp.id, date: dateStr },
          transaction: t,
        });

        if (conflict) {
          console.log(`   ⚠  StaffAttendance konflik ${dateStr} — skip (keepEmp sudah ada attendance)`);
          skipped++;
        } else {
          await att.update({ deviceEmployeeId: keepEmp.id }, { transaction: t });
          moved++;
        }
      }
      console.log(`✓ StaffAttendance: ${moved} dipindah, ${skipped} di-skip (konflik)`);
    }

    // 2. Pindahkan EmployeeSchedule
    if (schCount > 0) {
      const removedSch = await EmployeeSchedule.findAll({
        where: { deviceEmployeeId: removeEmp.id },
        transaction: t,
      });

      let moved = 0, skipped = 0;
      for (const sch of removedSch) {
        const dateStr = sch.date instanceof Date
          ? sch.date.toISOString().split('T')[0]
          : String(sch.date).split('T')[0];

        const conflict = await EmployeeSchedule.findOne({
          where: { deviceEmployeeId: keepEmp.id, date: dateStr },
          transaction: t,
        });

        if (conflict) {
          console.log(`   ⚠  EmployeeSchedule konflik ${dateStr} — skip`);
          skipped++;
        } else {
          await sch.update({ deviceEmployeeId: keepEmp.id }, { transaction: t });
          moved++;
        }
      }
      console.log(`✓ EmployeeSchedule: ${moved} dipindah, ${skipped} di-skip (konflik)`);
    }

    // 3. Update DeviceAttendanceLog matched references
    if (logCount > 0) {
      await DeviceAttendanceLog.update(
        { matchedDeviceEmployeeId: keepEmp.id },
        { where: { matchedDeviceEmployeeId: removeEmp.id }, transaction: t }
      );
      console.log(`✓ DeviceAttendanceLog: ${logCount} records diupdate`);
    }

    // 4. Hapus DeviceEmployee yang redundan
    await removeEmp.destroy({ transaction: t });
    console.log(`✓ DeviceEmployee empNo=${removeNo} dihapus`);

    await t.commit();
    console.log('\n✅ Merge selesai.');
  } catch (err) {
    await t.rollback();
    console.error('❌ Error — rollback:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
