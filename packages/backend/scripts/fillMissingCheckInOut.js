#!/usr/bin/env node
'use strict';

/**
 * Fill NULL checkInTime / checkOutTime pada StaffAttendance yang punya schedule.
 *
 * Aturan:
 *   - checkInTime  IS NULL → isi dengan shiftStart - 2 menit
 *   - checkOutTime IS NULL → isi dengan shiftEnd   + 2 menit
 *   - Jika kedua-duanya diisi dan status masih 'absent' → ubah ke 'present'
 *   - isOff = true di schedule → skip
 *
 * Usage:
 *   node scripts/fillMissingCheckInOut.js
 *       DRY-RUN
 *
 *   node scripts/fillMissingCheckInOut.js --confirm
 *       EKSEKUSI
 *
 *   node scripts/fillMissingCheckInOut.js --startDate 2026-02-01 --endDate 2026-02-28
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Op } = require('sequelize');
const { Tenant, DeviceEmployee, EmployeeSchedule, StaffAttendance, Shift } = require('../src/models');

const logger = require('../src/utils/logger');
if (logger.transports) logger.transports.forEach(t => { t.silent = true; });

// ── Config ────────────────────────────────────────────────────────────────────
const CHECKIN_OFFSET_MINUTES  = -2;   // shiftStart - 2 mnt
const CHECKOUT_OFFSET_MINUTES = +2;   // shiftEnd   + 2 mnt
const TIMEZONE    = 'Asia/Jakarta';
const TENANT_NAME = 'Dynasty Gym';
const DEFAULT_START = '2026-02-01';
const DEFAULT_END   = '2026-02-28';

// ── ANSI ─────────────────────────────────────────────────────────────────────
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      B = '\x1b[1m',  X = '\x1b[0m';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const confirmed = args.includes('--confirm');
function getArg(n) { const i = args.indexOf(`--${n}`); return i !== -1 ? args[i+1] : null; }

const startDate  = getArg('startDate')  || DEFAULT_START;
const endDate    = getArg('endDate')    || DEFAULT_END;
const tenantName = getArg('tenantName') || TENANT_NAME;

// ── Timezone helpers ──────────────────────────────────────────────────────────
function getTZOffset(dateStr) {
  const formatter = new Intl.DateTimeFormat('en', { timeZone: TIMEZONE, timeZoneName: 'shortOffset' });
  const parts = formatter.formatToParts(new Date(`${dateStr}T12:00:00`));
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+7';
  const match = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return '+07:00';
  const h = parseInt(match[1]), m = parseInt(match[2] || 0);
  const sign = h >= 0 ? '+' : '-';
  return `${sign}${String(Math.abs(h)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function buildTimestamp(dateStr, timeStr, offsetMin = 0) {
  if (!timeStr) return null;
  const [hh, mm, ss = '00'] = timeStr.split(':');
  const totalMin = parseInt(hh)*60 + parseInt(mm) + offsetMin;
  // Clamp to same day (0–1439 minutes)
  const clamped = ((totalMin % 1440) + 1440) % 1440;
  const fh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const fm = String(clamped % 60).padStart(2, '0');
  return new Date(`${dateStr}T${fh}:${fm}:${ss}${getTZOffset(dateStr)}`);
}

function fmtLocal(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', { timeZone: TIMEZONE, hour12: false });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B + '\n🔍 Fill Missing checkInTime / checkOutTime dari Schedule' + X);
  console.log(`   NODE_ENV   : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Tenant     : ${tenantName}`);
  console.log(`   Range      : ${startDate} s/d ${endDate}`);
  console.log(`   checkIn    : shiftStart ${CHECKIN_OFFSET_MINUTES} mnt  (fill jika NULL)`);
  console.log(`   checkOut   : shiftEnd   +${CHECKOUT_OFFSET_MINUTES} mnt  (fill jika NULL)`);
  console.log(confirmed
    ? `   ${Y}Mode       : EKSEKUSI${X}`
    : `   ${C}Mode       : DRY-RUN (tambah --confirm untuk eksekusi)${X}`);
  console.log('');

  // ── Cari tenant ──────────────────────────────────────────────────────────
  const tenant = await Tenant.findOne({ where: { name: tenantName } });
  if (!tenant) { console.error(`${R}❌ Tenant "${tenantName}" tidak ditemukan${X}`); process.exit(1); }
  console.log(`Tenant : ${B}${tenant.name}${X} (${tenant.id})\n`);

  // ── Load schedule → map key: deviceEmployeeId|date ───────────────────────
  const schedules = await EmployeeSchedule.findAll({
    where: {
      tenantId: tenant.id,
      isOff: false,
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [{ model: Shift, as: 'shift', attributes: ['shiftStart','shiftEnd','name'], required: false }],
    raw: false,
  });

  const schedMap = new Map();
  for (const s of schedules) {
    const dateStr    = typeof s.date === 'string' ? s.date.split('T')[0] : s.date.toISOString().split('T')[0];
    const shiftStart = s.shiftStart || s.shift?.shiftStart || null;
    const shiftEnd   = s.shiftEnd   || s.shift?.shiftEnd   || null;
    const shiftName  = s.shift?.name || (shiftStart ? `${shiftStart}-${shiftEnd}` : 'No Shift');
    schedMap.set(`${s.deviceEmployeeId}|${dateStr}`, { shiftStart, shiftEnd, shiftName, date: dateStr });
  }

  // ── Load StaffAttendance yang checkInTime atau checkOutTime NULL ──────────
  const attendances = await StaffAttendance.findAll({
    where: {
      tenantId: tenant.id,
      date: { [Op.between]: [startDate, endDate] },
      [Op.or]: [
        { checkInTime: null },
        { checkOutTime: null },
      ],
    },
    raw: true,
  });

  console.log(`StaffAttendance dengan checkIn/checkOut NULL  : ${attendances.length}`);
  console.log(`EmployeeSchedule aktif di range ini           : ${schedules.length}\n`);

  // ── Analisa tiap record ───────────────────────────────────────────────────
  const toUpdate = [];

  for (const att of attendances) {
    const dateStr = typeof att.date === 'string' ? att.date.split('T')[0] : att.date;
    const sched   = schedMap.get(`${att.deviceEmployeeId}|${dateStr}`);
    if (!sched) continue; // tidak ada schedule aktif untuk hari ini

    const newCI  = (!att.checkInTime  && sched.shiftStart) ? buildTimestamp(sched.date, sched.shiftStart, CHECKIN_OFFSET_MINUTES)  : null;
    const newCO  = (!att.checkOutTime && sched.shiftEnd)   ? buildTimestamp(sched.date, sched.shiftEnd,   CHECKOUT_OFFSET_MINUTES) : null;

    if (!newCI && !newCO) continue; // tidak ada yang perlu diisi (mungkin shiftStart/End null)

    // Status baru: jika sebelumnya absent dan checkIn akan diisi → present
    const newStatus = (att.status === 'absent' && newCI) ? 'present' : att.status;

    toUpdate.push({
      id:               att.id,
      deviceEmployeeId: att.deviceEmployeeId,
      date:             dateStr,
      oldStatus:        att.status,
      oldCheckIn:       att.checkInTime,
      oldCheckOut:      att.checkOutTime,
      newCheckIn:       newCI,
      newCheckOut:      newCO,
      newStatus,
      shiftName:        sched.shiftName,
      shiftStart:       sched.shiftStart,
      shiftEnd:         sched.shiftEnd,
    });
  }

  const needCI  = toUpdate.filter(u => u.newCheckIn).length;
  const needCO  = toUpdate.filter(u => u.newCheckOut).length;
  const noSched = attendances.length - toUpdate.length;

  console.log(`${noSched > 0 ? Y : G}  Tidak ada schedule (skip)    : ${noSched}${X}`);
  console.log(`${needCI  > 0 ? Y : G}  Perlu isi checkInTime        : ${needCI}${X}`);
  console.log(`${needCO  > 0 ? Y : G}  Perlu isi checkOutTime       : ${needCO}${X}`);
  console.log(`${toUpdate.length > 0 ? B+Y : G}  Total record yang diupdate   : ${toUpdate.length}${X}`);

  if (toUpdate.length === 0) {
    console.log(`\n${G}${B}✓ Tidak ada yang perlu diupdate.${X}\n`);
    process.exit(0);
  }

  // ── Ambil nama employee ───────────────────────────────────────────────────
  const deIds = [...new Set(toUpdate.map(u => u.deviceEmployeeId))];
  const deRecs = await DeviceEmployee.findAll({ where: { id: { [Op.in]: deIds } }, attributes: ['id','name','employeeNo'], raw: true });
  const deMap  = new Map(deRecs.map(r => [r.id, r]));

  // ── Preview tabel ─────────────────────────────────────────────────────────
  console.log(`\n${B}Detail record (${toUpdate.length}):${X}`);
  console.log('  ' + '─'.repeat(100));
  console.log(`  ${'Tanggal'.padEnd(12)} ${'EmpNo'.padEnd(7)} ${'Nama'.padEnd(18)} ${'Shift'.padEnd(10)} ${'checkIn Lama→Baru'.padEnd(30)} ${'checkOut Lama→Baru'}`);
  console.log('  ' + '─'.repeat(100));

  for (const u of toUpdate) {
    const de      = deMap.get(u.deviceEmployeeId);
    const empNo   = String(de?.employeeNo || '-').padEnd(7);
    const empName = (de?.name || 'Unknown').substring(0,16).padEnd(18);

    const ciOld = u.oldCheckIn  ? fmtLocal(u.oldCheckIn).split(', ')[1] : R+'(null)'+X;
    const ciNew = u.newCheckIn  ? G + fmtLocal(u.newCheckIn).split(', ')[1] + X : Y+'(skip)'+X;
    const coOld = u.oldCheckOut ? fmtLocal(u.oldCheckOut).split(', ')[1] : R+'(null)'+X;
    const coNew = u.newCheckOut ? G + fmtLocal(u.newCheckOut).split(', ')[1] + X : Y+'(skip)'+X;

    const statusTag = u.newStatus !== u.oldStatus ? ` ${Y}→${u.newStatus}${X}` : '';
    console.log(`  ${u.date.padEnd(12)} ${empNo} ${empName} ${u.shiftName.padEnd(10)} ${ciOld}→${ciNew}${' '.repeat(2)} ${coOld}→${coNew}${statusTag}`);
  }
  console.log('  ' + '─'.repeat(100));

  if (!confirmed) {
    console.log(`\n${C}${B}DRY-RUN selesai. Tidak ada yang berubah.${X}`);
    console.log(`${C}Eksekusi:${X}`);
    console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/fillMissingCheckInOut.js --confirm${X}\n`);
    process.exit(0);
  }

  // ── Konfirmasi ────────────────────────────────────────────────────────────
  console.log(`\n${Y}${B}⚠  UPDATE AKAN DIMULAI — ${toUpdate.length} record di DB live${X}`);
  console.log('   Lanjut dalam 3 detik... (Ctrl+C untuk cancel)\n');
  await new Promise(r => setTimeout(r, 3000));

  let updated = 0, failed = 0;

  for (const u of toUpdate) {
    try {
      const fields = {};
      if (u.newCheckIn)  fields.checkInTime  = u.newCheckIn;
      if (u.newCheckOut) fields.checkOutTime = u.newCheckOut;
      if (u.newStatus !== u.oldStatus) fields.status = u.newStatus;
      fields.notes = `Auto-filled checkIn/out dari schedule (fillMissingCheckInOut) — shift: ${u.shiftName}`;

      await StaffAttendance.update(fields, { where: { id: u.id } });
      updated++;
      process.stdout.write(G + '.' + X);
    } catch (err) {
      failed++;
      process.stdout.write(R + 'x' + X);
    }
  }

  console.log('\n\n' + '─'.repeat(50));
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
