#!/usr/bin/env node
'use strict';

/**
 * Fill Missing Attendance dari Employee Schedule
 *
 * Cari EmployeeSchedule yang tidak ada StaffAttendance-nya, lalu buat record
 * dengan checkInTime = shiftStart + CHECKIN_OFFSET_MINUTES dan status 'present'.
 *
 * Logika:
 *   - isOff = true            → skip (hari libur)
 *   - Sudah ada StaffAttendance untuk deviceEmployeeId + date → skip
 *   - Tidak ada start time di schedule (shiftStart null)      → buat status 'absent', checkInTime null
 *   - Ada shiftStart                                          → buat checkInTime = shiftStart + offset
 *
 * Usage:
 *   node scripts/fillMissingAttendance.js
 *       (DRY-RUN — hanya tampilkan, tidak ada data yang berubah)
 *
 *   node scripts/fillMissingAttendance.js --confirm
 *       (EKSEKUSI — buat record StaffAttendance yang hilang)
 *
 *   node scripts/fillMissingAttendance.js --startDate 2026-02-01 --endDate 2026-02-28 --confirm
 *       (Custom range)
 *
 * Default tenant : Dynasty Gym
 * Default range  : Bulan ini (Februari 2026)
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Op } = require('sequelize');
const {
  Tenant, DeviceEmployee, EmployeeSchedule, StaffAttendance, Shift,
} = require('../src/models');

// Silence Winston
const logger = require('../src/utils/logger');
if (logger.transports) logger.transports.forEach(t => { t.silent = true; });

// ── Konfigurasi ──────────────────────────────────────────────────────────────
/** Offset menit dari shiftStart untuk checkInTime supaya tidak status late */
const CHECKIN_OFFSET_MINUTES = 0;   // 0 mnt = tepat waktu → on_time
                                     // ganti ke 2 jika ingin +2 mnt (tetap diset status 'present')
const CHECKOUT_OFFSET_MINUTES = 0;  // 0 mnt = tepat shiftEnd

/** Timezone lokasi gym */
const TIMEZONE = 'Asia/Jakarta';    // WIB = UTC+7

/** Nama tenant */
const TENANT_NAME = 'Dynasty Gym';

// ── ANSI color ───────────────────────────────────────────────────────────────
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      B = '\x1b[1m',  X = '\x1b[0m';

// ── Parse args ───────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const confirmed = args.includes('--confirm');

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const argStart  = getArg('startDate');
const argEnd    = getArg('endDate');
const argTenant = getArg('tenantName');

// Default: bulan ini (Februari 2026)
const DEFAULT_START = '2026-02-01';
const DEFAULT_END   = '2026-02-28';

const startDate  = argStart  || DEFAULT_START;
const endDate    = argEnd    || DEFAULT_END;
const tenantName = argTenant || TENANT_NAME;

// ── Helper: gabungkan DATEONLY + TIME → timestamp UTC ────────────────────────
/**
 * Combine date string ("2026-02-03") + time string ("07:00:00") + offset minutes
 * Interpreted in TIMEZONE, returned as JS Date (UTC internally).
 */
function buildTimestamp(dateStr, timeStr, offsetMinutes = 0) {
  if (!timeStr) return null;
  const [hh, mm, ss = '00'] = timeStr.split(':');
  const baseMinutes = parseInt(hh) * 60 + parseInt(mm) + offsetMinutes;
  const finalH = String(Math.floor(((baseMinutes % 1440) + 1440) % 1440 / 60)).padStart(2, '0');
  const finalM = String(((baseMinutes % 1440) + 1440) % 1440 % 60).padStart(2, '0');
  const isoStr = `${dateStr}T${finalH}:${finalM}:${ss}`;

  // Parse in local timezone using Intl
  // Build an offset-aware string like "2026-02-03T07:00:00+07:00"
  const tzOffset = getTZOffset(dateStr, TIMEZONE);
  return new Date(`${isoStr}${tzOffset}`);
}

/**
 * Get UTC offset string for a given date in a timezone, e.g. "+07:00"
 */
function getTZOffset(dateStr, tz) {
  const testDate = new Date(`${dateStr}T12:00:00`);
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(testDate);
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+7';
  // offsetPart like "GMT+7" or "GMT+07:00"
  const match = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return '+07:00';
  const h = parseInt(match[1]);
  const m = parseInt(match[2] || 0);
  const sign = h >= 0 ? '+' : '-';
  return `${sign}${String(Math.abs(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format Date → local string for display */
function fmtLocal(d) {
  if (!d) return '-';
  return d.toLocaleString('id-ID', { timeZone: TIMEZONE, hour12: false });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B + '\n📋 Fill Missing Staff Attendance dari Schedule' + X);
  console.log(`   NODE_ENV   : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Tenant     : ${tenantName}`);
  console.log(`   Range      : ${startDate} s/d ${endDate}`);
  console.log(`   CheckIn +  : ${CHECKIN_OFFSET_MINUTES}mnt dari shiftStart`);
  console.log(confirmed
    ? `   ${Y}Mode       : EKSEKUSI — record akan dibuat${X}`
    : `   ${C}Mode       : DRY-RUN — tidak ada yang berubah (tambah --confirm untuk eksekusi)${X}`);
  console.log('');

  // ── Find tenant ─────────────────────────────────────────────────────────
  const tenant = await Tenant.findOne({ where: { name: tenantName } });
  if (!tenant) {
    console.error(`${R}❌ Tenant tidak ditemukan: "${tenantName}"${X}`);
    process.exit(1);
  }
  console.log(`Tenant ditemukan: ${B}${tenant.name}${X} (${tenant.id})\n`);

  // ── Load EmployeeSchedules (isOff=false) ─────────────────────────────────
  const schedules = await EmployeeSchedule.findAll({
    where: {
      tenantId: tenant.id,
      isOff: false,
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [
      { model: Shift, as: 'shift', attributes: ['shiftStart', 'shiftEnd', 'name'], required: false },
    ],
    order: [['date', 'ASC'], ['deviceEmployeeId', 'ASC']],
    raw: false,
  });

  console.log(`${B}EmployeeSchedule (isOff=false) ditemukan: ${schedules.length}${X}`);

  if (schedules.length === 0) {
    console.log(`${Y}Tidak ada schedule aktif di range ini.${X}\n`);
    process.exit(0);
  }

  // ── Load existing StaffAttendance untuk range ini ─────────────────────────
  // Key: deviceEmployeeId|date
  const existingAttendances = await StaffAttendance.findAll({
    where: {
      tenantId: tenant.id,
      date: { [Op.between]: [startDate, endDate] },
    },
    attributes: ['id', 'deviceEmployeeId', 'date', 'checkInTime', 'status'],
    raw: true,
  });

  const attendanceSet = new Set(
    existingAttendances.map(a => `${a.deviceEmployeeId}|${a.date}`)
  );

  console.log(`StaffAttendance yang sudah ada (range ini): ${existingAttendances.length}\n`);

  // ── Identifikasi yang hilang ──────────────────────────────────────────────
  const missing = [];

  for (const sched of schedules) {
    const dateStr = typeof sched.date === 'string' ? sched.date : sched.date.toISOString().split('T')[0];
    const key     = `${sched.deviceEmployeeId}|${dateStr}`;

    if (attendanceSet.has(key)) continue; // sudah ada

    // Resolve shiftStart / shiftEnd
    // Prioritas: langsung dari schedule, fallback ke Shift master
    const shiftStart = sched.shiftStart || sched.shift?.shiftStart || null;
    const shiftEnd   = sched.shiftEnd   || sched.shift?.shiftEnd   || null;
    const shiftName  = sched.shift?.name || 'No Shift';

    missing.push({
      scheduleId:       sched.id,
      tenantId:         sched.tenantId,
      deviceEmployeeId: sched.deviceEmployeeId,
      userId:           sched.userId || null,
      date:             dateStr,
      shiftStart,
      shiftEnd,
      shiftName,
    });
  }

  console.log(`${G}✓ Sudah ada attendance : ${schedules.length - missing.length}${X}`);
  console.log(`${missing.length > 0 ? Y : G}${missing.length > 0 ? '⚠' : '✓'} Belum ada attendance  : ${missing.length}${X}`);

  if (missing.length === 0) {
    console.log(`\n${G}${B}✓ Semua schedule sudah punya attendance. Tidak ada yang perlu diisi.${X}\n`);
    process.exit(0);
  }

  // ── Ambil nama employee untuk display ─────────────────────────────────────
  const deIds = [...new Set(missing.map(m => m.deviceEmployeeId))];
  const deRecords = await DeviceEmployee.findAll({
    where: { id: { [Op.in]: deIds } },
    attributes: ['id', 'name', 'employeeNo'],
    raw: true,
  });
  const deMap = new Map(deRecords.map(r => [r.id, r]));

  // ── Tampilkan preview ─────────────────────────────────────────────────────
  console.log(`\n${B}Attendance yang akan dibuat (${missing.length} record):${X}`);
  console.log('  ' + '─'.repeat(80));
  console.log(`  ${'Tanggal'.padEnd(12)} ${'EmpNo'.padEnd(8)} ${'Nama'.padEnd(22)} ${'Shift'.padEnd(12)} ${'CheckIn (WIB)'.padEnd(20)} Status`);
  console.log('  ' + '─'.repeat(80));

  let noShiftCount = 0;
  for (const m of missing) {
    const de = deMap.get(m.deviceEmployeeId);
    const empNo   = de?.employeeNo || '-';
    const empName = (de?.name || 'Unknown').substring(0, 20);

    let checkInDisplay, statusDisplay;
    if (m.shiftStart) {
      const ts = buildTimestamp(m.date, m.shiftStart, CHECKIN_OFFSET_MINUTES);
      checkInDisplay = fmtLocal(ts);
      statusDisplay  = G + 'present' + X;
    } else {
      checkInDisplay = Y + '(no shift time)' + X;
      statusDisplay  = R + 'absent' + X;
      noShiftCount++;
    }

    console.log(`  ${m.date.padEnd(12)} ${String(empNo).padEnd(8)} ${empName.padEnd(22)} ${m.shiftName.padEnd(12)} ${checkInDisplay.padEnd(20)} ${statusDisplay}`);
  }
  console.log('  ' + '─'.repeat(80));
  console.log(`  ${G}Akan dibuat: ${missing.length - noShiftCount} record status 'present'${noShiftCount > 0 ? `, ${noShiftCount} status 'absent' (no shift time)` : ''}${X}`);

  if (!confirmed) {
    console.log(`\n${C}${B}DRY-RUN selesai. Tidak ada data yang berubah.${X}`);
    console.log(`${C}Untuk eksekusi, jalankan dengan flag --confirm:${X}`);
    console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/fillMissingAttendance.js --confirm${X}`);
    if (argStart || argEnd) {
      console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/fillMissingAttendance.js --startDate ${startDate} --endDate ${endDate} --confirm${X}`);
    }
    console.log('');
    process.exit(0);
  }

  // ── Konfirmasi delay ──────────────────────────────────────────────────────
  console.log(`\n${Y}${B}⚠  INSERT AKAN DIMULAI — ${missing.length} StaffAttendance record ke DB live${X}`);
  console.log('   Lanjut dalam 3 detik... (Ctrl+C untuk cancel)\n');
  await new Promise(r => setTimeout(r, 3000));

  // ── Bulk insert dengan skip duplikat ─────────────────────────────────────
  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (const m of missing) {
    let checkInTime  = null;
    let checkOutTime = null;
    let status       = 'absent';

    if (m.shiftStart) {
      checkInTime  = buildTimestamp(m.date, m.shiftStart, CHECKIN_OFFSET_MINUTES);
      status       = 'present';
    }
    if (m.shiftEnd) {
      checkOutTime = buildTimestamp(m.date, m.shiftEnd, CHECKOUT_OFFSET_MINUTES);
    }

    try {
      await StaffAttendance.create({
        tenantId:         m.tenantId,
        deviceEmployeeId: m.deviceEmployeeId,
        userId:           m.userId,
        date:             m.date,
        checkInTime,
        checkOutTime,
        status,
        notes:            `Auto-filled from schedule (fillMissingAttendance script) — shift: ${m.shiftName}`,
      });
      created++;
      process.stdout.write(G + '.' + X);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        skipped++;
        process.stdout.write(Y + 's' + X);
      } else {
        failed++;
        process.stdout.write(R + 'x' + X);
        // Print error inline (non-fatal)
        if (process.env.VERBOSE) console.error(`\n  ${R}Error ${m.date} / ${m.deviceEmployeeId}: ${err.message}${X}`);
      }
    }
  }

  console.log('\n');
  console.log('─'.repeat(50));
  console.log(`${G}✓ Berhasil dibuat : ${created}${X}`);
  if (skipped > 0) console.log(`${Y}⚡ Skip (duplikat) : ${skipped}${X}`);
  if (failed  > 0) console.log(`${R}❌ Gagal           : ${failed}${X}`);

  console.log(`\n${C}Selesai. Cek attendance di frontend atau:${X}`);
  console.log(`${C}  GET /gym/staff-attendance?startDate=${startDate}&endDate=${endDate}&includeAbsent=true${X}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(R + '\nFatal error: ' + X + err.message);
  console.error(err.stack);
  process.exit(1);
});
