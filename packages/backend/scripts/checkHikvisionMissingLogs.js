#!/usr/bin/env node
'use strict';

/**
 * Cek event log yang ada di mesin Hikvision tapi belum masuk ke database.
 *
 * Cara kerja:
 *  1. Pull AcsEvent dari device untuk rentang waktu tertentu
 *  2. Untuk setiap event, cek apakah sudah ada di tabel DeviceAttendanceLogs
 *  3. Tampilkan event yang belum masuk DB beserta detailnya
 *
 * Usage:
 *   node scripts/checkHikvisionMissingLogs.js
 *   node scripts/checkHikvisionMissingLogs.js --days 14         # Default 7 hari
 *   node scripts/checkHikvisionMissingLogs.js --deviceId <uuid>
 *   node scripts/checkHikvisionMissingLogs.js --employeeNo <no>
 *   node scripts/checkHikvisionMissingLogs.js --import          # Auto-import yang belum masuk
 *   node scripts/checkHikvisionMissingLogs.js --raw             # Dump raw event JSON
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { Op }          = require('sequelize');
const { DigestClient } = require('digest-fetch');
const {
  HikvisionDevice, DeviceAttendanceLog, DeviceEmployee, Tenant,
} = require('../src/models');
const HikvisionService        = require('../src/services/hikvisionService');
const HikvisionEventProcessor = require('../src/services/hikvisionEventProcessor');

// Silence Winston console transport so script output is clean
const logger = require('../src/utils/logger');
if (logger.transports) {
  logger.transports.forEach(t => { t.silent = true; });
}

const args = process.argv.slice(2);
const rawDump    = args.includes('--raw');
const doImport   = args.includes('--import');

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const DAYS      = parseInt(getArg('days') || '7', 10);
const filterDev = getArg('deviceId');
const filterEmp = getArg('employeeNo');

// ── Colours ───────────────────────────────────────────────────────────────────
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      B = '\x1b[1m',  X = '\x1b[0m';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(s, n)  { return String(s ?? '').substring(0, n).padEnd(n); }
function fmtDt(d)   { return d ? new Date(d).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) : '—'; }

// ── Main ──────────────────────────────────────────────────────────────────────

async function checkDevice(device, tenantName) {
  const label = `${device.name} — ${device.ipAddress}:${device.port}`;
  console.log('\n' + B + '═'.repeat(70) + X);
  console.log(B + `  Device : ${label}` + X);
  console.log(`  Tenant : ${tenantName}`);
  console.log(`  Rentang: ${DAYS} hari terakhir`);
  console.log('═'.repeat(70));

  // ── Tentukan time range ───────────────────────────────────────────────────
  const endTime   = new Date();
  const startTime = new Date(endTime.getTime() - DAYS * 24 * 60 * 60 * 1000);

  console.log(`  Start  : ${fmtDt(startTime)}`);
  console.log(`  End    : ${fmtDt(endTime)}`);

  // ── Pull events dari device ───────────────────────────────────────────────
  process.stdout.write(`\n  Menarik event dari device (AcsEvent)... `);
  let rawEvents;
  try {
    rawEvents = await HikvisionService.pullEvents(device, startTime, endTime);
    console.log(G + `${rawEvents.length} event` + X);
  } catch (err) {
    console.log(R + 'GAGAL' + X);
    console.log(`  ${R}❌ ${err.message}${X}`);
    return;
  }

  if (rawEvents.length === 0) {
    console.log(`  ${Y}⚠  Tidak ada event di device untuk periode ini.${X}`);
    return;
  }

  if (rawDump) {
    console.log('\n  [RAW] Contoh 3 event pertama dari device:');
    rawEvents.slice(0, 3).forEach((e, i) => {
      console.log(`  [${i + 1}] ${JSON.stringify(e, null, 2).substring(0, 400)}`);
    });
  }

  // ── Normalisasi + filter ──────────────────────────────────────────────────
  // Hanya event access (major=5 atau tidak ada field major = format push)
  const accessEvents = rawEvents.filter(e =>
    e.major === undefined || e.major === 5
  );
  console.log(`  Event access (major=5): ${accessEvents.length} dari ${rawEvents.length} total`);

  if (filterEmp) {
    const before = accessEvents.length;
    const filtered = accessEvents.filter(e => {
      const empNo = String(e.employeeNoString || e.employeeNo || '');
      return empNo === String(filterEmp);
    });
    console.log(`  Filter employeeNo=${filterEmp}: ${filtered.length} dari ${before}`);
    accessEvents.length = 0;
    accessEvents.push(...filtered);
  }

  // ── Ambil semua log yang sudah ada di DB untuk rentang ini ────────────────
  process.stdout.write(`  Mengambil log dari DB... `);
  const dbLogs = await DeviceAttendanceLog.findAll({
    where: {
      deviceId: device.id,
      eventTime: { [Op.between]: [startTime, endTime] },
    },
    attributes: ['deviceEmployeeNo', 'eventTime'],
    raw: true,
  });

  // Buat Set untuk lookup cepat: "empNo|ISO"
  const dbSet = new Set(
    dbLogs.map(l => `${l.deviceEmployeeNo}|${new Date(l.eventTime).toISOString()}`)
  );
  console.log(G + `${dbLogs.length} records` + X);

  // ── Bandingkan ────────────────────────────────────────────────────────────
  const missing  = [];
  const inDb     = [];

  for (const evt of accessEvents) {
    const normalized = HikvisionService.normalizeEvent(evt);
    if (!normalized.deviceEmployeeNo || !normalized.eventTime) continue;

    const eventIso = new Date(normalized.eventTime).toISOString();
    const key      = `${normalized.deviceEmployeeNo}|${eventIso}`;

    if (dbSet.has(key)) {
      inDb.push({ normalized, raw: evt });
    } else {
      missing.push({ normalized, raw: evt });
    }
  }

  // ── Tampilkan hasil ───────────────────────────────────────────────────────
  console.log(`\n  ${B}Ringkasan:${X}`);
  console.log(`  ${G}✓ Sudah ada di DB  : ${inDb.length}${X}`);
  console.log(`  ${missing.length > 0 ? R : G}${missing.length > 0 ? '❌' : '✓'} Belum ada di DB  : ${missing.length}${X}`);

  if (missing.length === 0) {
    console.log(`\n  ${G}${B}✓ Semua log sudah tersimpan di database.${X}`);
    return;
  }

  // Print tabel event yang belum masuk DB
  console.log(`\n  ${B}${R}Event yang BELUM masuk database:${X}`);
  console.log('  ' + '─'.repeat(80));
  const hdr = [pad('EmpNo', 8), pad('Waktu Event (WITA)', 22), pad('Mode', 14), pad('CardNo', 12), 'Status DB'].join(' | ');
  console.log('  ' + B + hdr + X);
  console.log('  ' + '─'.repeat(80));

  // Kelompokkan per employee agar mudah dibaca
  const byEmp = {};
  for (const m of missing) {
    const k = m.normalized.deviceEmployeeNo;
    if (!byEmp[k]) byEmp[k] = [];
    byEmp[k].push(m);
  }

  for (const [empNo, evts] of Object.entries(byEmp).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    // Lookup nama dari DB
    const dbEmp = await DeviceEmployee.findOne({
      where: { deviceId: device.id, employeeNo: String(empNo) },
      attributes: ['name'],
      raw: true,
    });
    const empLabel = dbEmp?.name ? `${empNo} (${dbEmp.name})` : empNo;
    console.log(`\n  ${C}  ── EmpNo ${empLabel} ──${X}`);

    for (const { normalized, raw } of evts) {
      const row = [
        pad(normalized.deviceEmployeeNo, 8),
        pad(fmtDt(normalized.eventTime), 22),
        pad(normalized.verifyMode || '—', 14),
        pad(normalized.cardNo || '—', 12),
        R + 'MISSING' + X,
      ].join(' | ');
      console.log('  ' + row);

      if (rawDump) {
        console.log(`     ${C}[raw] ${JSON.stringify(raw).substring(0, 300)}${X}`);
      }
    }
  }

  console.log('\n  ' + '─'.repeat(80));

  // ── Kemungkinan penyebab ──────────────────────────────────────────────────
  console.log(`\n  ${Y}${B}Kemungkinan penyebab event tidak masuk DB:${X}`);
  console.log(`  ${Y}1. Push event handler tidak berjalan (server down/restart saat event terjadi)${X}`);
  console.log(`  ${Y}2. Push URL tidak dikonfigurasi di device — device cuma simpan log lokal${X}`);
  console.log(`  ${Y}3. Event diblok cooldown (duplikat dalam ${device.eventCooldownMinutes || 5} menit pertama)${X}`);
  console.log(`  ${Y}4. employeeNo tidak cocok dengan DeviceEmployee di DB (sync belum dijalankan)${X}`);
  console.log(`  ${Y}5. Cron pull-job tidak berjalan atau skip device ini${X}`);

  // ── Auto-import ───────────────────────────────────────────────────────────
  if (doImport) {
    console.log(`\n  ${B}Mengimport ${missing.length} event ke database...${X}`);
    const missingRaw = missing.map(m => m.raw);
    try {
      const stats = await HikvisionEventProcessor.processEvents(device.id, missingRaw, 'pull');
      console.log(`  ${G}✓ Import selesai:${X}`);
      console.log(`     Processed  : ${stats.processed}`);
      console.log(`     Matched    : ${stats.matched}`);
      console.log(`     Unmatched  : ${stats.unmatched}`);
      console.log(`     Duplicates : ${stats.duplicates}`);
      console.log(`     Cooldown   : ${stats.cooldownSkipped}`);
    } catch (err) {
      console.log(`  ${R}❌ Import gagal: ${err.message}${X}`);
    }
  } else {
    console.log(`\n  ${C}Tip: Tambahkan --import untuk otomatis memasukkan event yang hilang ke DB.${X}`);
  }
}

async function main() {
  console.log(B + '\n🔍 Hikvision Missing Log Diagnostic' + X);
  console.log(`   Waktu server : ${new Date().toLocaleString('id-ID')}`);
  console.log(`   NODE_ENV     : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Rentang      : ${DAYS} hari terakhir`);
  if (doImport) console.log(`   ${Y}Mode IMPORT aktif — event yang hilang akan dimasukkan ke DB${X}`);
  console.log('');

  const where = { isActive: true, deletedAt: null };
  if (filterDev) where.id = filterDev;

  const devices = await HikvisionDevice.findAll({
    where,
    include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  if (!devices.length) {
    console.log(Y + '⚠  Tidak ada device aktif.' + X);
    process.exit(0);
  }

  console.log(`Ditemukan ${devices.length} device aktif.\n`);

  for (const device of devices) {
    await checkDevice(device, device.tenant?.name || device.tenantId);
  }

  console.log('\n' + B + 'Selesai.' + X + '\n');
  process.exit(0);
}

main().catch(err => {
  console.error(R + 'Fatal error: ' + X + err.message);
  console.error(err.stack);
  process.exit(1);
});
