#!/usr/bin/env node
'use strict';

/**
 * Update Absent → Present: Set checkInTime = shiftStart + 2 menit
 *
 * Cari StaffAttendance yang:
 *   1. status = 'absent'      → punya schedule → update ke 'present', checkIn = shiftStart + 2 mnt
 *   2. status = 'present' DAN checkInTime persis = shiftStart (offset 0) → update checkIn ke +2 mnt
 *      (khusus record auto-fill dari fillMissingAttendance.js)
 *
 * Usage:
 *   node scripts/fixAbsentToPresent.js
 *       DRY-RUN — hanya tampilkan, tidak ada yang berubah
 *
 *   node scripts/fixAbsentToPresent.js --confirm
 *       EKSEKUSI
 *
 *   node scripts/fixAbsentToPresent.js --startDate 2026-02-01 --endDate 2026-02-28 --confirm
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Op } = require('sequelize');
const { Tenant, DeviceEmployee, EmployeeSchedule, StaffAttendance, Shift } = require('../src/models');

const logger = require('../src/utils/logger');
if (logger.transports) logger.transports.forEach(t => { t.silent = true; });

const CHECKIN_OFFSET_MINUTES = 2;
const TIMEZONE  = 'Asia/Jakarta';
const TENANT_NAME = 'Dynasty Gym';
const DEFAULT_START = '2026-02-01';
const DEFAULT_END   = '2026-02-28';

const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      B = '\x1b[1m',  X = '\x1b[0m';

const args      = process.argv.slice(2);
const confirmed = args.includes('--confirm');
function getArg(n) { const i = args.indexOf(`--${n}`); return i !== -1 ? args[i+1] : null; }

const startDate  = getArg('startDate')  || DEFAULT_START;
const endDate    = getArg('endDate')    || DEFAULT_END;
const tenantName = getArg('tenantName') || TENANT_NAME;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTZOffset(dateStr, tz) {
  const formatter = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' });
  const parts = formatter.formatToParts(new Date(`${dateStr}T12:00:00`));
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+7';
  const match = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return '+07:00';
  const h = parseInt(match[1]), m = parseInt(match[2] || 0);
  const sign = h >= 0 ? '+' : '-';
  return `${sign}${String(Math.abs(h)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function buildTimestamp(dateStr, timeStr, offsetMinutes = 0) {
  if (!timeStr) return null;
  const [hh, mm, ss = '00'] = timeStr.split(':');
  const baseMin = parseInt(hh)*60 + parseInt(mm) + offsetMinutes;
  const finalH  = String(Math.floor(((baseMin%1440)+1440)%1440/60)).padStart(2,'0');
  const finalM  = String(((baseMin%1440)+1440)%1440%60).padStart(2,'0');
  return new Date(`${dateStr}T${finalH}:${finalM}:${ss}${getTZOffset(dateStr, TIMEZONE)}`);
}

function fmtLocal(d) {
  if (!d) return '-';
  return d.toLocaleString('id-ID', { timeZone: TIMEZONE, hour12: false });
}

// Check apakah dua Date sama (dalam toleransi 60 detik) — untuk deteksi auto-fill +0
function isSameMinute(a, b) {
  if (!a || !b) return false;
  return Math.abs(new Date(a) - new Date(b)) < 60000;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B + '\n🔄 Fix Absent → Present (checkIn = shiftStart + 2 mnt)' + X);
  console.log(`   NODE_ENV   : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Tenant     : ${tenantName}`);
  console.log(`   Range      : ${startDate} s/d ${endDate}`);
  console.log(`   Offset     : +${CHECKIN_OFFSET_MINUTES} menit dari shiftStart`);
  console.log(confirmed
    ? `   ${Y}Mode       : EKSEKUSI${X}`
    : `   ${C}Mode       : DRY-RUN (tambah --confirm untuk eksekusi)${X}`);
  console.log('');

  const tenant = await Tenant.findOne({ where: { name: tenantName } });
  if (!tenant) { console.error(`${R}❌ Tenant tidak ditemukan: "${tenantName}"${X}`); process.exit(1); }
  console.log(`Tenant : ${B}${tenant.name}${X} (${tenant.id})\n`);

  // ── Load semua EmployeeSchedule aktif (isOff=false) ──────────────────────
  const schedules = await EmployeeSchedule.findAll({
    where: {
      tenantId: tenant.id,
      isOff: false,
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [{ model: Shift, as: 'shift', attributes: ['shiftStart','shiftEnd','name'], required: false }],
    raw: false,
  });

  // Map: deviceEmployeeId|date → { shiftStart, shiftEnd, shiftName }
  const schedMap = new Map();
  for (const s of schedules) {
    const dateStr = typeof s.date === 'string' ? s.date : s.date.toISOString().split('T')[0];
    const shiftStart = s.shiftStart || s.shift?.shiftStart || null;
    const shiftEnd   = s.shiftEnd   || s.shift?.shiftEnd   || null;
    schedMap.set(`${s.deviceEmployeeId}|${dateStr}`, { shiftStart, shiftEnd, shiftName: s.shift?.name || '-', date: dateStr });
  }

  // ── Load StaffAttendance yang perlu dicek ─────────────────────────────────
  //    1. status = 'absent'
  //    2. status = 'present' dan notes mengandung 'Auto-filled' (dari script fillMissingAttendance)
  const toCheck = await StaffAttendance.findAll({
    where: {
      tenantId: tenant.id,
      date: { [Op.between]: [startDate, endDate] },
      [Op.or]: [
        { status: 'absent' },
        {
          status: 'present',
          notes: { [Op.like]: '%Auto-filled from schedule%' },
        },
      ],
    },
    raw: true,
  });

  console.log(`StaffAttendance untuk dicek (absent + auto-fill present): ${toCheck.length}`);

  // ── Identifikasi yang perlu diupdate ──────────────────────────────────────
  const toUpdate = [];

  for (const att of toCheck) {
    const dateStr = typeof att.date === 'string' ? att.date.split('T')[0] : att.date;
    const sched = schedMap.get(`${att.deviceEmployeeId}|${dateStr}`);

    if (!sched || !sched.shiftStart) continue; // tidak ada schedule / tidak ada shiftStart → skip

    const newCheckIn  = buildTimestamp(sched.date, sched.shiftStart, CHECKIN_OFFSET_MINUTES);
    const newCheckOut = sched.shiftEnd ? buildTimestamp(sched.date, sched.shiftEnd, 0) : null;

    // Untuk present auto-fill: hanya update jika checkInTime masih = shiftStart tepat (+0)
    if (att.status === 'present') {
      const exactCheckIn = buildTimestamp(sched.date, sched.shiftStart, 0);
      if (!isSameMinute(att.checkInTime, exactCheckIn)) continue; // sudah benar / diubah manual
    }

    toUpdate.push({
      id:           att.id,
      deviceEmployeeId: att.deviceEmployeeId,
      date:         dateStr,
      oldStatus:    att.status,
      oldCheckIn:   att.checkInTime,
      newCheckIn,
      newCheckOut,
      shiftName:    sched.shiftName,
      shiftStart:   sched.shiftStart,
    });
  }

  console.log(`\n${toUpdate.length > 0 ? Y+'⚠' : G+'✓'} Perlu diupdate : ${toUpdate.length}${X}`);

  if (toUpdate.length === 0) {
    console.log(`\n${G}${B}✓ Tidak ada record yang perlu diupdate.${X}\n`);
    process.exit(0);
  }

  // ── Ambil nama employee ───────────────────────────────────────────────────
  const deIds = [...new Set(toUpdate.map(u => u.deviceEmployeeId))];
  const deRecords = await DeviceEmployee.findAll({ where: { id: { [Op.in]: deIds } }, attributes: ['id','name','employeeNo'], raw: true });
  const deMap = new Map(deRecords.map(r => [r.id, r]));

  // ── Preview ───────────────────────────────────────────────────────────────
  console.log(`\n${B}Record yang akan diupdate (${toUpdate.length}):${X}`);
  console.log('  ' + '─'.repeat(90));
  console.log(`  ${'Tanggal'.padEnd(12)} ${'EmpNo'.padEnd(7)} ${'Nama'.padEnd(20)} ${'Shift'.padEnd(10)} ${'Status Lama'.padEnd(10)} ${'CheckIn Baru (WIB)'}`);
  console.log('  ' + '─'.repeat(90));

  for (const u of toUpdate) {
    const de = deMap.get(u.deviceEmployeeId);
    const empNo   = String(de?.employeeNo || '-').padEnd(7);
    const empName = (de?.name || 'Unknown').substring(0, 18).padEnd(20);
    const oldSt   = (u.oldStatus === 'absent' ? R : Y) + u.oldStatus.padEnd(10) + X;
    const newCI   = G + fmtLocal(u.newCheckIn) + X;
    console.log(`  ${u.date.padEnd(12)} ${empNo} ${empName} ${u.shiftName.padEnd(10)} ${oldSt} → ${newCI}`);
  }
  console.log('  ' + '─'.repeat(90));

  if (!confirmed) {
    console.log(`\n${C}${B}DRY-RUN selesai.${X}`);
    console.log(`${C}Jalankan dengan --confirm untuk eksekusi:${X}`);
    console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/fixAbsentToPresent.js --confirm${X}\n`);
    process.exit(0);
  }

  // ── Eksekusi ──────────────────────────────────────────────────────────────
  console.log(`\n${Y}${B}⚠  UPDATE AKAN DIMULAI — ${toUpdate.length} record${X}`);
  console.log('   Lanjut dalam 3 detik... (Ctrl+C untuk cancel)\n');
  await new Promise(r => setTimeout(r, 3000));

  let updated = 0, failed = 0;

  for (const u of toUpdate) {
    try {
      await StaffAttendance.update(
        {
          checkInTime:  u.newCheckIn,
          checkOutTime: u.newCheckOut || undefined,
          status:       'present',
          notes:        `Auto-filled from schedule (fixAbsentToPresent) — shift: ${u.shiftName}, checkIn +${CHECKIN_OFFSET_MINUTES}mnt`,
        },
        { where: { id: u.id } }
      );
      updated++;
      process.stdout.write(G + '.' + X);
    } catch (err) {
      failed++;
      process.stdout.write(R + 'x' + X);
    }
  }

  console.log('\n');
  console.log('─'.repeat(50));
  console.log(`${G}✓ Berhasil diupdate : ${updated}${X}`);
  if (failed > 0) console.log(`${R}❌ Gagal            : ${failed}${X}`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(R + '\nFatal error: ' + X + err.message);
  console.error(err.stack);
  process.exit(1);
});
