/**
 * Fix Staff Attendance Date Timezone Mismatch
 *
 * Tiga masalah yang diperbaiki:
 *
 * 1. DATE MISMATCH (UTC vs WITA)
 *    StaffAttendance.date menggunakan UTC date (toISOString),
 *    padahal seharusnya menggunakan local date WITA (Asia/Makassar).
 *    Contoh: checkInTime = 2026-02-22T21:55Z (= 23 Feb 05:55 WITA)
 *            date lama = "2026-02-22" ← SALAH
 *            date benar = "2026-02-23" ← BENAR
 *
 * 2. CROSS-DAY CHECKOUT (overnight staff)
 *    Staff tap keluar setelah tengah malam (mis. shift 22:00-06:00 tap jam 06:30 WITA)
 *    Sistem malah buat check-in baru hari berikutnya, padahal harusnya checkout kemarin.
 *    Fix: hapus attendance hari baru, set checkOutTime di attendance kemarin.
 *
 * 3. FALSE CROSS-DAY CHECKOUT (14-hour fallback bug)
 *    Tap checkIn di pagi hari (misal 06:30 WITA) salah diklasifikasikan sebagai
 *    checkout hari sebelumnya oleh logika fallback 14-jam (karena tidak ada schedule).
 *    Deteksi: checkOutTime-nya jatuh di local tanggal > record.date.
 *    Fix: kembalikan checkOut itu sebagai checkIn hari berikutnya.
 *
 * Usage:
 *   node scripts/fixAttendanceDateTimezone.js [--dry-run]
 *   node scripts/fixAttendanceDateTimezone.js           ← apply fix
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const { StaffAttendance, EmployeeSchedule, Tenant, DeviceEmployee, DeviceAttendanceLog, sequelize } = require('../src/models');
const { Op } = require('sequelize');

const DRY_RUN = process.argv.includes('--dry-run');
const TIMEZONE = 'Asia/Makassar'; // fallback; akan di-override dari tenant.settings
const CHECKOUT_GRACE_MINUTES = 60;

function getLocalDateOnly(date, tz) {
  return date.toLocaleDateString('en-CA', { timeZone: tz });
}

function getPreviousLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
}

function getNextLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Fix Staff Attendance Date Timezone Mismatch');
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ APPLY FIXES'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Load tenant timezone
  const tenant = await Tenant.findOne({ attributes: ['id', 'settings'] });
  const tz = tenant?.settings?.timezone || TIMEZONE;
  console.log(`✓ Timezone: ${tz}\n`);

  const stats = {
    dateMismatchFixed: 0,
    dateMismatchMerged: 0,
    crossDayCheckoutFixed: 0,
    falseCrossDayFixed: 0,
    earlyLogRecovered: 0,
    skipped: 0,
  };

  // ─────────────────────────────────────────────────────────────
  // FIX 1: DATE MISMATCH
  // Cari semua attendance, cek apakah date == local date dari checkInTime
  // ─────────────────────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('FIX 1: Date Timezone Mismatch');
  console.log('──────────────────────────────────────────────────────');

  const allAttendance = await StaffAttendance.findAll({
    order: [['date', 'ASC'], ['checkInTime', 'ASC']],
  });

  for (const rec of allAttendance) {
    if (!rec.checkInTime) continue;

    const correctDate = getLocalDateOnly(new Date(rec.checkInTime), tz);
    const storedDate = rec.date instanceof Date
      ? rec.date.toISOString().split('T')[0]
      : String(rec.date).split('T')[0];

    if (correctDate === storedDate) continue;

    console.log(`\n⚠  MISMATCH id=${rec.id}`);
    console.log(`   employeeId: ${rec.deviceEmployeeId}`);
    console.log(`   checkInTime: ${rec.checkInTime.toISOString()} → localDate: ${correctDate}`);
    console.log(`   stored date: ${storedDate} ← SALAH`);

    // Cek apakah sudah ada attendance dengan date yang benar untuk employee yang sama
    const conflict = await StaffAttendance.findOne({
      where: {
        tenantId: rec.tenantId,
        deviceEmployeeId: rec.deviceEmployeeId,
        date: correctDate,
        id: { [Op.ne]: rec.id },
      },
    });

    if (conflict) {
      const recTime = new Date(rec.checkInTime);
      const conflictTime = new Date(conflict.checkInTime);

      if (recTime < conflictTime) {
        // Wrong-dated record adalah tap LEBIH AWAL dari conflict
        // → wrong record seharusnya jadi checkIn, conflict jadi checkOut
        const mergedCheckOut = conflict.checkOutTime ?? conflict.checkInTime;
        console.log(`   ⚡ Conflict: wrong-record lebih awal (${recTime.toISOString()} < ${conflictTime.toISOString()})`);
        console.log(`   → Update wrong-record: date=${correctDate}, checkOut=${mergedCheckOut?.toISOString()}`);
        console.log(`   → Hapus conflict (${conflict.id}) — sebenarnya adalah tap pulang`);
        if (!DRY_RUN) {
          await rec.update({ date: correctDate, checkOutTime: mergedCheckOut });
          await conflict.destroy();
        }
      } else {
        // Conflict lebih awal → conflict adalah checkIn yang benar
        // rec.checkInTime adalah tap berikutnya (bisa jadi checkOut)
        console.log(`   ⚡ Conflict: conflict lebih awal. Merge checkOut jika perlu.`);
        if (!conflict.checkOutTime) {
          console.log(`   → Set checkOutTime ${recTime.toISOString()} ke attendance ${conflict.id}`);
          if (!DRY_RUN) {
            await conflict.update({ checkOutTime: recTime });
          }
          stats.dateMismatchMerged++;
        }
        console.log(`   → Hapus record salah (${rec.id})`);
        if (!DRY_RUN) {
          await rec.destroy();
        }
      }
      stats.dateMismatchFixed++;
    } else {
      // Tidak ada conflict, cukup update datenya
      console.log(`   → Update date: ${storedDate} → ${correctDate}`);
      if (!DRY_RUN) {
        await rec.update({ date: correctDate });
      }
      stats.dateMismatchFixed++;
    }
  }

  console.log(`\n✓ FIX 1 selesai: ${stats.dateMismatchFixed} records diperbaiki\n`);

  // ─────────────────────────────────────────────────────────────
  // FIX 2: CROSS-DAY CHECKOUT
  // Cari attendance tanpa checkOut (kemungkinan checkout-nya adalah
  // check-in di hari berikutnya yang sebenarnya adalah tap pulang)
  // ─────────────────────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('FIX 2: Cross-Day Checkout');
  console.log('──────────────────────────────────────────────────────');

  const unclosedAttendance = await StaffAttendance.findAll({
    where: { checkOutTime: null },
    order: [['date', 'ASC'], ['checkInTime', 'ASC']],
  });

  console.log(`   Ditemukan ${unclosedAttendance.length} attendance tanpa checkOut`);

  for (const prev of unclosedAttendance) {
    const prevDateStr = prev.date instanceof Date
      ? prev.date.toISOString().split('T')[0]
      : String(prev.date).split('T')[0];
    const nextDateStr = getNextLocalDate(prevDateStr);

    // Cari attendance hari berikutnya untuk employee yang sama
    const nextDay = await StaffAttendance.findOne({
      where: {
        tenantId: prev.tenantId,
        deviceEmployeeId: prev.deviceEmployeeId,
        date: nextDateStr,
      },
      order: [['checkInTime', 'ASC']],
    });

    if (!nextDay || !nextDay.checkInTime) continue;

    // Bandingkan jarak tap ke dua titik referensi schedule:
    // distToYesterdayEnd  = jarak ke shiftEnd kemarin
    // distToTodayStart    = jarak ke shiftStart hari ini
    // → yang lebih dekat menentukan klasifikasi
    const [prevSchedule, nextSchedule] = await Promise.all([
      EmployeeSchedule.findOne({
        where: { tenantId: prev.tenantId, deviceEmployeeId: prev.deviceEmployeeId, date: prevDateStr },
      }),
      EmployeeSchedule.findOne({
        where: { tenantId: prev.tenantId, deviceEmployeeId: prev.deviceEmployeeId, date: nextDateStr, isOff: false },
      }),
    ]);

    const eventDate = new Date(nextDay.checkInTime);
    const localTime = eventDate.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    const [eh, em] = localTime.split(':').map(Number);
    const eventLocalMins = eh * 60 + em;

    let distToYesterdayEnd = Infinity;
    if (prevSchedule && !prevSchedule.isOff && prevSchedule.shiftEnd && prevSchedule.shiftStart) {
      const [seh, sem] = prevSchedule.shiftEnd.split(':').map(Number);
      const [ssh, ssm] = prevSchedule.shiftStart.split(':').map(Number);
      const shiftEndMins = seh * 60 + sem;
      const isOvernightShift = shiftEndMins < (ssh * 60 + ssm);
      distToYesterdayEnd = isOvernightShift
        ? Math.abs(eventLocalMins - shiftEndMins)       // shiftEnd pada hari ini (lokal)
        : eventLocalMins + (1440 - shiftEndMins);       // shiftEnd kemarin, sudah lewat tengah malam
    }

    let distToTodayStart = Infinity;
    if (nextSchedule && nextSchedule.shiftStart) {
      const [ssh, ssm] = nextSchedule.shiftStart.split(':').map(Number);
      distToTodayStart = Math.abs(eventLocalMins - (ssh * 60 + ssm));
    }

    let isCrossCheckOut = false;
    if (distToYesterdayEnd !== Infinity || distToTodayStart !== Infinity) {
      // Ada referensi schedule → gunakan proximity
      isCrossCheckOut = distToYesterdayEnd <= distToTodayStart
        && distToYesterdayEnd <= CHECKOUT_GRACE_MINUTES;
    } else {
      // Tidak ada schedule sama sekali → fallback 14 jam dari checkIn
      const hoursSinceCheckIn = (eventDate - new Date(prev.checkInTime)) / (1000 * 60 * 60);
      isCrossCheckOut = hoursSinceCheckIn <= 14;
    }

    if (!isCrossCheckOut) continue;

    console.log(`\n⚠  CROSS-DAY CHECKOUT:`);
    console.log(`   employee: ${prev.deviceEmployeeId}`);
    console.log(`   attendance kemarin: id=${prev.id} date=${prevDateStr} checkIn=${prev.checkInTime?.toISOString()}`);
    console.log(`   attendance hari ini: id=${nextDay.id} date=${nextDateStr} checkIn=${nextDay.checkInTime?.toISOString()}`);
    console.log(`   schedule kemarin: ${prevSchedule ? `${prevSchedule.shiftStart}-${prevSchedule.shiftEnd} (${prevSchedule.shiftEnd < prevSchedule.shiftStart ? 'overnight' : 'normal'})` : 'tidak ada'}`);
    console.log(`   schedule hari ini: ${nextSchedule ? `${nextSchedule.shiftStart}-${nextSchedule.shiftEnd}` : 'tidak ada'}`);
    console.log(`   jarak ke shiftEnd kemarin: ${distToYesterdayEnd === Infinity ? '∞' : distToYesterdayEnd + ' mnt'} | jarak ke shiftStart hari ini: ${distToTodayStart === Infinity ? '∞' : distToTodayStart + ' mnt'}`);
    console.log(`   → Set checkOutTime ${eventDate.toISOString()} di attendance ${prevDateStr}`);

    // Jika nextDay punya checkOut juga, kita perlu pertimbangkan
    if (nextDay.checkOutTime) {
      console.log(`   ⚠  nextDay ada checkOut (${nextDay.checkOutTime?.toISOString()}) → hapus nextDay, pindahkan checkOut kemarin saja`);
      if (!DRY_RUN) {
        await prev.update({ checkOutTime: eventDate });
        await nextDay.destroy();
      }
    } else {
      // nextDay hanya checkIn tanpa checkOut → hapus nextDay, set sebagai checkOut kemarin
      console.log(`   → Hapus attendance nextDay (${nextDay.id}) karena sebenarnya adalah tap pulang`);
      if (!DRY_RUN) {
        await prev.update({ checkOutTime: eventDate });
        await nextDay.destroy();
      }
    }
    stats.crossDayCheckoutFixed++;
  }

  console.log(`\n✓ FIX 2 selesai: ${stats.crossDayCheckoutFixed} records diperbaiki\n`);

  // ─────────────────────────────────────────────────────────────
  // FIX 3: FALSE CROSS-DAY CHECKOUT (14-hour fallback bug)
  // Cari attendance yang checkOutTime-nya jatuh di local tanggal > record.date.
  // Ini terjadi ketika tap checkIn pagi (mis. 06:30 WITA) di-assign sebagai
  // checkout untuk hari sebelumnya oleh fallback 14-jam.
  // Deteksi: getLocalDateOnly(checkOutTime) !== record.date
  // Fix: reset checkOut → null, buat/update attendance hari berikutnya.
  // ─────────────────────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('FIX 3: False Cross-Day Checkout (14-hour fallback bug)');
  console.log('──────────────────────────────────────────────────────');

  // Re-fetch setelah fix 1 & 2
  const closedAttendance = await StaffAttendance.findAll({
    where: { checkOutTime: { [Op.ne]: null } },
    order: [['date', 'ASC'], ['checkInTime', 'ASC']],
  });

  console.log(`   Memeriksa ${closedAttendance.length} attendance dengan checkOut...`);

  for (const rec of closedAttendance) {
    const storedDate = rec.date instanceof Date
      ? rec.date.toISOString().split('T')[0]
      : String(rec.date).split('T')[0];

    const checkOutLocalDate = getLocalDateOnly(new Date(rec.checkOutTime), tz);

    // checkOut harus pada hari yang sama (atau lebih awal) dari stored date
    // Jika checkOut local date lebih besar → ini false cross-day checkout
    if (checkOutLocalDate <= storedDate) continue;

    // Pastikan nextDay = tepat hari berikutnya (bukan 2+ hari)
    const expectedNextDay = getNextLocalDate(storedDate);
    if (checkOutLocalDate !== expectedNextDay) continue;

    // Ambil waktu yang salah diklasifikasikan sebagai checkOut
    const falseCheckOut = new Date(rec.checkOutTime);

    // Cek next-day schedule: jika ada schedule hari ini → tap ini memang check-in baru
    const nextDaySchedule = await EmployeeSchedule.findOne({
      where: {
        tenantId: rec.tenantId,
        deviceEmployeeId: rec.deviceEmployeeId,
        date: expectedNextDay,
        isOff: false,
      },
    });

    // Cek apakah ada schedule kemarin
    const prevSchedule = await EmployeeSchedule.findOne({
      where: {
        tenantId: rec.tenantId,
        deviceEmployeeId: rec.deviceEmployeeId,
        date: storedDate,
      },
    });

    // Kalau ada schedule kemarin DAN shift overnight DAN checkOut dalam 1 jam → biarkan (FIX 2 sudah handle)
    if (prevSchedule && !prevSchedule.isOff && prevSchedule.shiftEnd && prevSchedule.shiftStart) {
      const [seh, sem] = prevSchedule.shiftEnd.split(':').map(Number);
      const [ssh, ssm] = prevSchedule.shiftStart.split(':').map(Number);
      const isOvernightShift = (seh * 60 + sem) < (ssh * 60 + ssm);
      if (isOvernightShift) {
        // Overnight shift checkout adalah valid, skip
        continue;
      }
      // Normal shift → checkOut di hari berikutnya tetap mencurigakan
      // tapi kalau tidak ada schedule hari ini ya biarkan
      if (!nextDaySchedule) continue;
    }

    // Hitung jarak checkOut ke shiftStart hari berikutnya (jika ada)
    // Hanya bertindak jika checkOut memang dekat shiftStart (kemungkinan salah set sebagai checkout)
    // Threshold: dalam 120 menit dari shiftStart → indikasi tap-masuk yang salah dikira checkout
    const FALSE_CHECKOUT_MAX_DIST = 120;
    if (nextDaySchedule && nextDaySchedule.shiftStart) {
      const coTime = new Date(rec.checkOutTime);
      const coLocalTime = coTime.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
      const [coh, com] = coLocalTime.split(':').map(Number);
      const coLocalMins = coh * 60 + com;
      const [nsh, nsm] = nextDaySchedule.shiftStart.split(':').map(Number);
      const distToShiftStart = Math.abs(coLocalMins - (nsh * 60 + nsm));
      if (distToShiftStart > FALSE_CHECKOUT_MAX_DIST) {
        // Terlalu jauh dari shiftStart → bukan false checkout, mungkin lembur. skip
        continue;
      }
    }

    // Cari next-day attendance yang sudah ada
    const nextDayAtt = await StaffAttendance.findOne({
      where: {
        tenantId: rec.tenantId,
        deviceEmployeeId: rec.deviceEmployeeId,
        date: expectedNextDay,
      },
      order: [['checkInTime', 'ASC']],
    });

    const empLabel = `employeeId=${rec.deviceEmployeeId}`;
    console.log(`\n⚠  FALSE CROSS-DAY CHECKOUT:`);
    console.log(`   ${empLabel}`);
    console.log(`   Attendance ${storedDate}: checkIn=${rec.checkInTime?.toISOString()}, checkOut=${rec.checkOutTime?.toISOString()}`);
    console.log(`   checkOut local date = ${checkOutLocalDate} (bukan ${storedDate}) → SALAH`);

    if (nextDayAtt) {
      // Next-day attendance sudah ada
      // falseCheckOut menjadi checkIn yang benar, checkIn lama jadi checkOut
      const oldNextCheckIn = new Date(nextDayAtt.checkInTime);

      // Jika checkIn next-day sudah = falseCheckOut → sudah difix sebelumnya, skip
      if (Math.abs(oldNextCheckIn - falseCheckOut) < 1000) {
        console.log(`   → Sudah difix sebelumnya, skip`);
        stats.skipped++;
        continue;
      }

      console.log(`   → Reset checkOut ${storedDate} → null`);
      console.log(`   → Update next-day (${expectedNextDay}): checkIn ${oldNextCheckIn.toISOString()} → ${falseCheckOut.toISOString()}, checkOut → ${oldNextCheckIn.toISOString()}`);

      if (!DRY_RUN) {
        await rec.update({ checkOutTime: null });
        await nextDayAtt.update({
          checkInTime: falseCheckOut,
          checkOutTime: nextDayAtt.checkOutTime ?? oldNextCheckIn,
        });
      }
    } else {
      // Tidak ada next-day attendance → buat baru
      console.log(`   → Reset checkOut ${storedDate} → null`);
      console.log(`   → Buat attendance baru ${expectedNextDay}: checkIn=${falseCheckOut.toISOString()}`);

      if (!DRY_RUN) {
        await rec.update({ checkOutTime: null });
        await StaffAttendance.create({
          tenantId: rec.tenantId,
          deviceEmployeeId: rec.deviceEmployeeId,
          deviceId: rec.deviceId,
          userId: rec.userId,
          checkInTime: falseCheckOut,
          date: expectedNextDay,
          status: 'present',
        });
      }
    }
    stats.falseCrossDayFixed++;
  }

  console.log(`\n✓ FIX 3 selesai: ${stats.falseCrossDayFixed} records diperbaiki\n`);

  // ─────────────────────────────────────────────────────────────
  // FIX 4: RECOVER CHECKIN FROM DEVICE LOGS
  // Karyawan yang checkIn-nya sangat terlambat (4+ jam setelah shiftStart)
  // kemungkinan checkIn asli hilang karena Fix 1 merge yang salah.
  // Cek DeviceAttendanceLogs: ada tap lebih awal di hari yang sama?
  // ─────────────────────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('FIX 4: Recover checkIn dari DeviceAttendanceLogs');
  console.log('──────────────────────────────────────────────────────');

  const LATE_THRESHOLD_MINUTES = 240; // 4 jam = tap 4+ jam setelah shiftStart

  const allWithPossibleIssue = await StaffAttendance.findAll({
    order: [['date', 'ASC']],
  });

  let fix4Checked = 0;
  for (const rec of allWithPossibleIssue) {
    if (!rec.checkInTime) continue;

    const recDateStr = rec.date instanceof Date
      ? rec.date.toISOString().split('T')[0]
      : String(rec.date).split('T')[0];

    const schedule = await EmployeeSchedule.findOne({
      where: { tenantId: rec.tenantId, deviceEmployeeId: rec.deviceEmployeeId, date: recDateStr },
    });

    if (!schedule || schedule.isOff || !schedule.shiftStart) continue;

    const checkInLocalTime = new Date(rec.checkInTime).toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    const [eh, em] = checkInLocalTime.split(':').map(Number);
    const [ssh, ssm] = schedule.shiftStart.split(':').map(Number);
    const lateMinutes = (eh * 60 + em) - (ssh * 60 + ssm);

    if (lateMinutes < LATE_THRESHOLD_MINUTES) continue;
    fix4Checked++;

    // Range hari lokal dalam UTC (WITA = UTC+8)
    const dayStartUTC = new Date(`${recDateStr}T00:00:00+08:00`);

    const emp = await DeviceEmployee.findOne({ where: { id: rec.deviceEmployeeId } });
    if (!emp) continue;

    // Cari log lebih awal dari checkInTime pada hari lokal yang sama
    const earlierLog = await DeviceAttendanceLog.findOne({
      where: {
        deviceEmployeeNo: emp.employeeNo,
        matchedDeviceEmployeeId: emp.id,
        eventTime: {
          [Op.gte]: dayStartUTC,
          [Op.lt]: rec.checkInTime,
        },
      },
      order: [['eventTime', 'ASC']],
    });

    if (!earlierLog) continue;

    const earlierTime = new Date(earlierLog.eventTime);
    const earlierLocalTime = earlierTime.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });

    console.log(`\n⚠  CHECKIN LEBIH AWAL DITEMUKAN:`);
    console.log(`   ${emp.employeeNo} - ${emp.name} | date: ${recDateStr}`);
    console.log(`   checkIn tersimpan: ${checkInLocalTime} WITA (${lateMinutes} mnt terlambat)`);
    console.log(`   log lebih awal:    ${earlierLocalTime} WITA → logId=${earlierLog.id}`);
    console.log(`   → Set checkInTime  = ${earlierTime.toISOString()} (${earlierLocalTime} WITA)`);
    console.log(`   → Set checkOutTime = ${rec.checkInTime?.toISOString()} (checkIn lama → sekarang jadi checkout)`);

    if (!DRY_RUN) {
      await rec.update({
        checkInTime: earlierTime,
        checkOutTime: rec.checkOutTime ?? rec.checkInTime,
        logId: earlierLog.id,
        status: 'present',
      });
    }
    stats.earlyLogRecovered++;
  }

  console.log(`   Diperiksa: ${fix4Checked} records dengan lateMinutes > ${LATE_THRESHOLD_MINUTES}`);
  console.log(`\n✓ FIX 4 selesai: ${stats.earlyLogRecovered} records diperbaiki\n`);

  // ═══════════════════════════════════════════════════════════════
  // FIX 5 — SMART CHECKIN/CHECKOUT: checkIn stored near shiftEnd
  //
  // Deteksi: record punya checkIn tapi TIDAK punya checkOut,
  //          dan checkIn (local time) lebih dekat ke shiftEnd daripada shiftStart.
  //          → Artinya: tap itu sebenarnya checkout, bukan checkIn.
  //
  // Juga tangani kasus: record punya checkIn yang jauh dari shiftStart
  //          dan tidak ada checkOut, padahal tap-nya di dekat shiftEnd.
  //
  // Action:  pindahkan checkInTime → checkOutTime, set checkInTime = null
  // ═══════════════════════════════════════════════════════════════
  console.log('───────────────────────────────────────────────────────');
  console.log('FIX 5 — Smart checkIn/checkOut: tap near shiftEnd → move to checkOut');
  console.log('───────────────────────────────────────────────────────');

  stats.smartCheckOutFixed = 0;
  let fix5Checked = 0;

  // Find all attendance that has checkIn but no checkOut
  const fix5Records = await StaffAttendance.findAll({
    where: {
      checkInTime: { [Op.ne]: null },
      checkOutTime: null,
    },
    include: [
      { model: DeviceEmployee, as: 'deviceEmployee', attributes: ['id', 'employeeNo', 'name'] },
    ],
    order: [['date', 'ASC']],
  });

  for (const rec of fix5Records) {
    if (!rec.checkInTime) continue;
    const emp = rec.deviceEmployee;
    if (!emp) continue;

    const recDateStr = rec.date instanceof Date
      ? rec.date.toISOString().split('T')[0]
      : String(rec.date).split('T')[0];

    // Load schedule for this day
    const schedule = await EmployeeSchedule.findOne({
      where: {
        tenantId: rec.tenantId,
        deviceEmployeeId: emp.id,
        date: recDateStr,
        isOff: false,
      },
    });

    if (!schedule || !schedule.shiftStart || !schedule.shiftEnd) continue;
    fix5Checked++;

    const checkInDate = new Date(rec.checkInTime);
    const localTime = checkInDate.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    const [eh, em] = localTime.split(':').map(Number);
    const eventMins = eh * 60 + em;

    const [ssh, ssm] = schedule.shiftStart.split(':').map(Number);
    const [seh, sem] = schedule.shiftEnd.split(':').map(Number);
    const shiftStartMins = ssh * 60 + ssm;
    const shiftEndMins   = seh * 60 + sem;

    const distToStart = Math.abs(eventMins - shiftStartMins);
    const distToEnd   = Math.abs(eventMins - shiftEndMins);

    // Calculate shift duration and position within shift
    const shiftDuration = shiftEndMins > shiftStartMins
      ? shiftEndMins - shiftStartMins
      : (1440 - shiftStartMins) + shiftEndMins;
    const halfShift = shiftDuration / 2;
    const minsAfterStart = eventMins >= shiftStartMins
      ? eventMins - shiftStartMins
      : (1440 - shiftStartMins) + eventMins;

    // Only fix if tap is closer to shiftEnd AND past halfway through the shift
    if (distToEnd >= distToStart || minsAfterStart <= halfShift) continue;

    console.log(`\n⚠  CHECKIN DEKAT SHIFTEND:`);
    console.log(`   ${emp.employeeNo} - ${emp.name} | date: ${recDateStr}`);
    console.log(`   checkIn: ${localTime} WITA`);
    console.log(`   shiftStart: ${schedule.shiftStart} | shiftEnd: ${schedule.shiftEnd}`);
    console.log(`   distToStart: ${distToStart} min | distToEnd: ${distToEnd} min`);
    console.log(`   → Pindahkan checkInTime → checkOutTime`);

    if (!DRY_RUN) {
      await rec.update({
        checkOutTime: rec.checkInTime,
        checkInTime: null,
      });
    }
    stats.smartCheckOutFixed++;
  }

  console.log(`   Diperiksa: ${fix5Checked} records dengan schedule`);
  console.log(`\n✓ FIX 5 selesai: ${stats.smartCheckOutFixed} records diperbaiki\n`);

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Fix 1 - Date mismatch:              ${stats.dateMismatchFixed}`);
  console.log(`   Fix 1 - Merged conflicts:            ${stats.dateMismatchMerged}`);
  console.log(`   Fix 2 - Cross-day checkout:          ${stats.crossDayCheckoutFixed}`);
  console.log(`   Fix 3 - False cross-day checkout:    ${stats.falseCrossDayFixed}`);
  console.log(`   Fix 4 - CheckIn recovered from logs: ${stats.earlyLogRecovered}`);
  console.log(`   Fix 5 - Smart checkOut (near shiftEnd): ${stats.smartCheckOutFixed}`);
  console.log(`   Skipped (already fixed):             ${stats.skipped}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN — tidak ada perubahan diterapkan' : '✅ APPLIED'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
