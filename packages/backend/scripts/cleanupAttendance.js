#!/usr/bin/env node
'use strict';

/**
 * Rapikan Absensi Staff — Comprehensive Attendance Filler
 *
 * Scan semua EmployeeSchedule (isOff=false) dalam range tanggal.
 * Untuk setiap schedule:
 *   1. Jika BELUM ada StaffAttendance → buat baru
 *   2. Jika SUDAH ada tapi checkInTime NULL → isi
 *   3. Jika SUDAH ada tapi checkOutTime NULL → isi
 *   4. Jika status = 'absent' tapi ada schedule → update ke 'present'
 *
 * Waktu:
 *   checkIn  = shiftStart - random(2..5) menit   (datang lebih awal)
 *   checkOut = shiftEnd   + 3 menit               (pulang sedikit lewat)
 *
 * Usage:
 *   node scripts/cleanupAttendance.js
 *       DRY-RUN — hanya tampilkan, tidak ada perubahan
 *
 *   node scripts/cleanupAttendance.js --confirm
 *       EKSEKUSI — buat/update record di database
 *
 *   node scripts/cleanupAttendance.js --startDate 2026-02-01 --endDate 2026-02-28
 *       Custom range
 *
 *   NODE_ENV=production node scripts/cleanupAttendance.js --confirm
 *       Jalankan di production
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Op } = require('sequelize');
const {
  Tenant, DeviceEmployee, EmployeeSchedule, StaffAttendance, Shift,
} = require('../src/models');

const logger = require('../src/utils/logger');
if (logger.transports) logger.transports.forEach(t => { t.silent = true; });

// ── Config ────────────────────────────────────────────────────────────────────
const CHECKIN_MIN_OFFSET  = -5;   // paling awal: shiftStart - 5 mnt
const CHECKIN_MAX_OFFSET  = -2;   // paling lambat: shiftStart - 2 mnt
const CHECKOUT_OFFSET     = +3;   // shiftEnd + 3 mnt

const TIMEZONE    = 'Asia/Jakarta';
const TENANT_NAME = 'Dynasty Gym';
const DEFAULT_START = '2026-02-01';
const DEFAULT_END   = '2026-02-28';

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      D = '\x1b[90m', B = '\x1b[1m',  X = '\x1b[0m';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const confirmed = args.includes('--confirm');
function getArg(n) { const i = args.indexOf(`--${n}`); return i !== -1 ? args[i+1] : null; }

const startDate  = getArg('startDate')  || DEFAULT_START;
const endDate    = getArg('endDate')    || DEFAULT_END;
const tenantName = getArg('tenantName') || TENANT_NAME;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Random int between min (inclusive) and max (inclusive) */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
  const totalMin = parseInt(hh) * 60 + parseInt(mm) + offsetMin;
  const clamped = ((totalMin % 1440) + 1440) % 1440;
  const fh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const fm = String(clamped % 60).padStart(2, '0');
  return new Date(`${dateStr}T${fh}:${fm}:${ss}${getTZOffset(dateStr)}`);
}

function fmtTime(d) {
  if (!d) return '(null)';
  return new Date(d).toLocaleTimeString('id-ID', { timeZone: TIMEZONE, hour12: false });
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { timeZone: TIMEZONE });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B + '\n📋 Cleanup Attendance — Fill dari Schedule (Feb 2026)' + X);
  console.log(`   NODE_ENV   : ${B}${process.env.NODE_ENV || 'development'}${X}`);
  console.log(`   Tenant     : ${tenantName}`);
  console.log(`   Range      : ${startDate} s/d ${endDate}`);
  console.log(`   checkIn    : shiftStart - random(${Math.abs(CHECKIN_MIN_OFFSET)}..${Math.abs(CHECKIN_MAX_OFFSET)}) mnt`);
  console.log(`   checkOut   : shiftEnd   + ${CHECKOUT_OFFSET} mnt`);
  console.log(confirmed
    ? `   ${Y}Mode       : EKSEKUSI — data akan diubah${X}`
    : `   ${C}Mode       : DRY-RUN (tambah --confirm untuk eksekusi)${X}`);
  console.log('');

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await Tenant.findOne({ where: { name: tenantName } });
  if (!tenant) { console.error(`${R}❌ Tenant "${tenantName}" tidak ditemukan${X}`); process.exit(1); }
  console.log(`Tenant : ${B}${tenant.name}${X}\n`);

  // ── Load schedules ────────────────────────────────────────────────────────
  const schedules = await EmployeeSchedule.findAll({
    where: {
      tenantId: tenant.id,
      isOff: false,
      date: { [Op.between]: [startDate, endDate] },
    },
    include: [{ model: Shift, as: 'shift', attributes: ['shiftStart','shiftEnd','name'], required: false }],
    raw: false,
  });

  // Map: deviceEmployeeId|date → schedule info
  const schedMap = new Map();
  for (const s of schedules) {
    const dateStr    = typeof s.date === 'string' ? s.date.split('T')[0] : s.date.toISOString().split('T')[0];
    const shiftStart = s.shiftStart || s.shift?.shiftStart || null;
    const shiftEnd   = s.shiftEnd   || s.shift?.shiftEnd   || null;
    const shiftName  = s.shift?.name || '-';
    schedMap.set(`${s.deviceEmployeeId}|${dateStr}`, { shiftStart, shiftEnd, shiftName, date: dateStr, deviceEmployeeId: s.deviceEmployeeId, userId: s.userId, tenantId: s.tenantId });
  }

  // ── Load existing attendance ──────────────────────────────────────────────
  const attendances = await StaffAttendance.findAll({
    where: {
      tenantId: tenant.id,
      date: { [Op.between]: [startDate, endDate] },
    },
    raw: true,
  });

  const attMap = new Map();
  for (const a of attendances) {
    const dateStr = typeof a.date === 'string' ? a.date.split('T')[0] : a.date;
    attMap.set(`${a.deviceEmployeeId}|${dateStr}`, a);
  }

  // ── Analisa semua action yang perlu dilakukan ──────────────────────────────
  const actions = []; // { action: 'create'|'update', ... }

  for (const [key, sched] of schedMap) {
    const att = attMap.get(key);

    if (!sched.shiftStart && !sched.shiftEnd) continue; // no shift info

    // Random offset for checkIn (between -5 and -2 minutes)
    const ciOffset = randomInt(CHECKIN_MIN_OFFSET, CHECKIN_MAX_OFFSET);
    const newCheckIn  = sched.shiftStart ? buildTimestamp(sched.date, sched.shiftStart, ciOffset) : null;
    const newCheckOut = sched.shiftEnd   ? buildTimestamp(sched.date, sched.shiftEnd, CHECKOUT_OFFSET) : null;

    if (!att) {
      // ── CASE 1: Tidak ada attendance → buat baru ──────────────────────────
      actions.push({
        action:           'create',
        deviceEmployeeId: sched.deviceEmployeeId,
        userId:           sched.userId,
        tenantId:         sched.tenantId,
        date:             sched.date,
        checkInTime:      newCheckIn,
        checkOutTime:     newCheckOut,
        status:           newCheckIn ? 'present' : 'absent',
        shiftName:        sched.shiftName,
        shiftStart:       sched.shiftStart,
        shiftEnd:         sched.shiftEnd,
        ciOffset,
      });
    } else {
      // ── CASE 2/3/4: Attendance ada, cek apakah perlu diupdate ─────────────
      const needCI = !att.checkInTime && newCheckIn;
      const needCO = !att.checkOutTime && newCheckOut;
      const needStatus = att.status === 'absent' && newCheckIn;

      if (needCI || needCO || needStatus) {
        actions.push({
          action:           'update',
          id:               att.id,
          deviceEmployeeId: att.deviceEmployeeId,
          date:             sched.date,
          oldCheckIn:       att.checkInTime,
          oldCheckOut:      att.checkOutTime,
          oldStatus:        att.status,
          newCheckIn:       needCI ? newCheckIn : null,
          newCheckOut:      needCO ? newCheckOut : null,
          newStatus:        needStatus ? 'present' : att.status,
          shiftName:        sched.shiftName,
          shiftStart:       sched.shiftStart,
          shiftEnd:         sched.shiftEnd,
          ciOffset,
        });
      }
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const creates = actions.filter(a => a.action === 'create');
  const updates = actions.filter(a => a.action === 'update');

  console.log(`Schedule aktif (isOff=false)     : ${schedules.length}`);
  console.log(`StaffAttendance existing         : ${attendances.length}`);
  console.log(`Sudah lengkap (skip)             : ${schedules.length - actions.length}`);
  console.log('');
  console.log(`${B}Perlu ditangani:${X}`);
  console.log(`  ${creates.length > 0 ? Y : G}CREATE (buat baru)             : ${creates.length}${X}`);
  console.log(`  ${updates.length > 0 ? Y : G}UPDATE (isi checkIn/Out null)  : ${updates.length}${X}`);
  console.log(`  ${B}TOTAL                          : ${actions.length}${X}`);

  if (actions.length === 0) {
    console.log(`\n${G}${B}✓ Semua attendance sudah lengkap. Tidak ada yang perlu diubah.${X}\n`);
    process.exit(0);
  }

  // ── Ambil nama employee ──────────────────────────────────────────────────
  const deIds = [...new Set(actions.map(a => a.deviceEmployeeId))];
  const deRecs = await DeviceEmployee.findAll({
    where: { id: { [Op.in]: deIds } },
    attributes: ['id', 'name', 'employeeNo'],
    raw: true,
  });
  const deMap = new Map(deRecs.map(r => [r.id, r]));

  // ── Preview table ─────────────────────────────────────────────────────────
  console.log(`\n${B}Detail (${actions.length} records):${X}`);
  console.log('  ' + '─'.repeat(105));
  console.log(`  ${'Act'.padEnd(7)} ${'Tanggal'.padEnd(12)} ${'EmpNo'.padEnd(7)} ${'Nama'.padEnd(18)} ${'Shift'.padEnd(10)} ${'checkIn'.padEnd(16)} ${'checkOut'.padEnd(16)} Status`);
  console.log('  ' + '─'.repeat(105));

  // Sort by date then empNo
  actions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aNo = deMap.get(a.deviceEmployeeId)?.employeeNo || 0;
    const bNo = deMap.get(b.deviceEmployeeId)?.employeeNo || 0;
    return aNo - bNo;
  });

  for (const a of actions) {
    const de      = deMap.get(a.deviceEmployeeId);
    const empNo   = String(de?.employeeNo || '-').padEnd(7);
    const empName = (de?.name || '?').substring(0, 16).padEnd(18);
    const actTag  = a.action === 'create'
      ? C + 'CREATE' + X + ' '
      : Y + 'UPDATE' + X + ' ';

    let ciDisplay, coDisplay;
    if (a.action === 'create') {
      ciDisplay = a.checkInTime  ? G + fmtTime(a.checkInTime) + X : R + '(null)' + X;
      coDisplay = a.checkOutTime ? G + fmtTime(a.checkOutTime) + X : R + '(null)' + X;
    } else {
      ciDisplay = a.newCheckIn
        ? R + fmtTime(a.oldCheckIn) + X + '→' + G + fmtTime(a.newCheckIn) + X
        : D + fmtTime(a.oldCheckIn) + X;
      coDisplay = a.newCheckOut
        ? R + fmtTime(a.oldCheckOut) + X + '→' + G + fmtTime(a.newCheckOut) + X
        : D + fmtTime(a.oldCheckOut) + X;
    }

    const st = (a.action === 'create' ? a.status : a.newStatus) || '-';
    const stColor = st === 'present' ? G : (st === 'absent' ? R : Y);

    console.log(`  ${actTag}${a.date.padEnd(12)} ${empNo} ${empName} ${(a.shiftName || '-').padEnd(10)} ${ciDisplay.padEnd(16)} ${coDisplay.padEnd(16)} ${stColor}${st}${X}`);
  }
  console.log('  ' + '─'.repeat(105));

  if (!confirmed) {
    console.log(`\n${C}${B}DRY-RUN selesai. Tidak ada data yang berubah.${X}`);
    console.log(`${C}Eksekusi:${X}`);
    console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/cleanupAttendance.js --confirm${X}\n`);
    process.exit(0);
  }

  // ── Konfirmasi ────────────────────────────────────────────────────────────
  console.log(`\n${Y}${B}⚠  Akan memproses ${actions.length} record (${creates.length} CREATE + ${updates.length} UPDATE)${X}`);
  console.log('   Lanjut dalam 3 detik... (Ctrl+C untuk cancel)\n');
  await new Promise(r => setTimeout(r, 3000));

  // ── Eksekusi ──────────────────────────────────────────────────────────────
  let okCreate = 0, okUpdate = 0, failCreate = 0, failUpdate = 0, skipDup = 0;

  for (const a of actions) {
    try {
      if (a.action === 'create') {
        await StaffAttendance.create({
          tenantId:         a.tenantId,
          deviceEmployeeId: a.deviceEmployeeId,
          userId:           a.userId,
          date:             a.date,
          checkInTime:      a.checkInTime,
          checkOutTime:     a.checkOutTime,
          status:           a.status,
          notes:            `Auto-filled from schedule (cleanupAttendance) — shift: ${a.shiftName}`,
        });
        okCreate++;
        process.stdout.write(G + '+' + X);
      } else {
        const fields = {};
        if (a.newCheckIn)                  fields.checkInTime  = a.newCheckIn;
        if (a.newCheckOut)                 fields.checkOutTime = a.newCheckOut;
        if (a.newStatus !== a.oldStatus)   fields.status       = a.newStatus;
        fields.notes = `Auto-filled checkIn/Out (cleanupAttendance) — shift: ${a.shiftName}`;

        await StaffAttendance.update(fields, { where: { id: a.id } });
        okUpdate++;
        process.stdout.write(Y + '.' + X);
      }
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        skipDup++;
        process.stdout.write(D + 's' + X);
      } else {
        if (a.action === 'create') failCreate++; else failUpdate++;
        process.stdout.write(R + 'x' + X);
      }
    }
  }

  console.log('\n\n' + '═'.repeat(50));
  console.log(`${G}✓ Created  : ${okCreate}${X}`);
  console.log(`${G}✓ Updated  : ${okUpdate}${X}`);
  if (skipDup > 0)    console.log(`${Y}⚡ Skipped  : ${skipDup} (duplikat)${X}`);
  if (failCreate > 0) console.log(`${R}❌ Fail create : ${failCreate}${X}`);
  if (failUpdate > 0) console.log(`${R}❌ Fail update : ${failUpdate}${X}`);
  console.log('═'.repeat(50));
  console.log('');

  process.exit((failCreate + failUpdate) > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(R + '\nFatal error: ' + X + err.message);
  console.error(err.stack);
  process.exit(1);
});
