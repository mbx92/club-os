#!/usr/bin/env node
'use strict';

/**
 * Re-push Employee Profiles ke Hikvision Device
 *
 * Cari employee yang ada di DB tapi tidak ada di device, lalu push ulang profilnya.
 *
 * SAFE: Hanya POST UserInfo/Record — tidak menghapus FP, tidak mengubah DB apapun.
 * Jika employee sudah ada di device → device balas "deviceUserAlreadyExist" → aman.
 *
 * Usage:
 *   node scripts/repushMissingEmployees.js --deviceId <uuid>
 *         (DRY-RUN — hanya tampilkan, tidak ada yang diubah)
 *
 *   node scripts/repushMissingEmployees.js --deviceId <uuid> --confirm
 *         (EKSEKUSI — push employee yang hilang ke device)
 *
 *   node scripts/repushMissingEmployees.js --deviceId <uuid> --employeeNo 1010 --confirm
 *         (Push hanya 1 employee tertentu)
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { HikvisionDevice, DeviceEmployee, Tenant } = require('../src/models');
const HikvisionService = require('../src/services/hikvisionService');

// Silence Winston
const logger = require('../src/utils/logger');
if (logger.transports) logger.transports.forEach(t => { t.silent = true; });

const args      = process.argv.slice(2);
const confirmed = args.includes('--confirm');

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const deviceId    = getArg('deviceId');
const onlyEmpNo   = getArg('employeeNo');

const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m',
      B = '\x1b[1m',  X = '\x1b[0m';

if (!deviceId) {
  console.error(`${R}Error: --deviceId wajib diisi${X}`);
  console.error('Usage: node scripts/repushMissingEmployees.js --deviceId <uuid> [--confirm] [--employeeNo <no>]');
  process.exit(1);
}

async function main() {
  console.log(B + '\n🔧 Re-push Missing Employee Profiles ke Hikvision' + X);
  console.log(`   NODE_ENV : ${process.env.NODE_ENV || 'development'}`);
  console.log(confirmed
    ? `   ${Y}Mode     : EKSEKUSI — employee akan di-push ke device${X}`
    : `   ${C}Mode     : DRY-RUN — tidak ada yang diubah (tambah --confirm untuk eksekusi)${X}`);
  console.log('');

  // ── Ambil device ──────────────────────────────────────────────────────────
  const device = await HikvisionDevice.findOne({
    where: { id: deviceId, deletedAt: null },
    include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }],
  });

  if (!device) {
    console.error(`${R}❌ Device tidak ditemukan: ${deviceId}${X}`);
    process.exit(1);
  }

  console.log(`Device : ${B}${device.name}${X} — ${device.ipAddress}:${device.port}`);
  console.log(`Tenant : ${device.tenant?.name || device.tenantId}`);

  // ── Ambil employee dari device ────────────────────────────────────────────
  process.stdout.write('\nMengambil daftar employee dari device... ');
  let deviceEmployees;
  try {
    deviceEmployees = await HikvisionService.listEmployees(device);
    console.log(G + `${deviceEmployees.length} employee` + X);
  } catch (err) {
    console.log(R + 'GAGAL' + X);
    console.error(`${R}❌ ${err.message}${X}`);
    process.exit(1);
  }

  const onDeviceSet = new Set(deviceEmployees.map(e => String(e.employeeNo)));

  // ── Ambil employee dari DB ────────────────────────────────────────────────
  const dbWhere = { deviceId: device.id, status: 'active' };
  if (onlyEmpNo) dbWhere.employeeNo = String(onlyEmpNo);

  const dbEmployees = await DeviceEmployee.findAll({
    where: dbWhere,
    order: [['employeeNo', 'ASC']],
    raw: true,
  });
  console.log(`DB (active) : ${dbEmployees.length} employee`);

  // ── Identifikasi yang hilang ──────────────────────────────────────────────
  const missing = dbEmployees.filter(e => !onDeviceSet.has(String(e.employeeNo)));
  const alreadyOk = dbEmployees.filter(e => onDeviceSet.has(String(e.employeeNo)));

  console.log(`\n${G}✓ Sudah ada di device  : ${alreadyOk.length}${X}`);
  console.log(`${missing.length > 0 ? R : G}${missing.length > 0 ? '❌' : '✓'} Tidak ada di device  : ${missing.length}${X}`);

  if (missing.length === 0) {
    console.log(`\n${G}${B}✓ Semua employee sudah ada di device. Tidak perlu push.${X}\n`);
    process.exit(0);
  }

  // ── Tampilkan daftar yang akan di-push ────────────────────────────────────
  console.log(`\n${B}Employee yang akan di-push ke device:${X}`);
  console.log('  ' + '─'.repeat(50));
  for (const emp of missing) {
    const fp = emp.hasFingerprint ? `${G}FP: ${emp.fingerprintCount}x${X}` : `${Y}FP: -${X}`;
    console.log(`  ${Y}#${String(emp.employeeNo).padEnd(7)}${X} ${emp.name?.padEnd(22) || '(no name)'.padEnd(22)} ${fp}`);
  }
  console.log('  ' + '─'.repeat(50));

  if (!confirmed) {
    console.log(`\n${C}${B}DRY-RUN selesai. Tidak ada yang diubah.${X}`);
    console.log(`${C}Untuk eksekusi, jalankan dengan flag --confirm:${X}`);
    console.log(`${C}  NODE_ENV=${process.env.NODE_ENV || 'development'} node scripts/repushMissingEmployees.js --deviceId ${deviceId} --confirm${X}\n`);
    process.exit(0);
  }

  // ── Konfirmasi manual ──────────────────────────────────────────────────────
  console.log(`\n${Y}${B}⚠  PUSH AKAN DIMULAI — ${missing.length} employee ke device live${X}`);
  console.log(`${Y}   Ini hanya menambah/update profil di device, tidak menghapus FP${X}`);
  console.log('   Lanjut dalam 3 detik... (Ctrl+C untuk cancel)\n');
  await new Promise(r => setTimeout(r, 3000));

  // ── Eksekusi push satu per satu ───────────────────────────────────────────
  let pushedOk = 0;
  let pushedFail = 0;
  const results = [];

  for (const emp of missing) {
    process.stdout.write(`  Pushing #${String(emp.employeeNo).padEnd(6)} ${(emp.name || '').padEnd(22)} ... `);

    try {
      const result = await HikvisionService.setEmployee(device, {
        employeeNo: emp.employeeNo,
        name: emp.name,
      });

      // Parse sub-status
      let parsed = null;
      try { parsed = typeof result.result === 'string' ? JSON.parse(result.result) : result.result; } catch (_) {}
      const alreadyExists = parsed?.subStatusCode === 'deviceUserAlreadyExist';
      const ok = result.success || alreadyExists;

      if (ok) {
        pushedOk++;
        const note = alreadyExists ? ` ${Y}(sudah ada di device)${X}` : '';
        console.log(G + 'OK' + X + note);
        results.push({ employeeNo: emp.employeeNo, name: emp.name, status: 'ok', alreadyExists });
      } else {
        pushedFail++;
        const errMsg = parsed?.statusString || result.result || `HTTP ${result.status}`;
        console.log(R + 'GAGAL' + X + ` — ${errMsg}`);
        results.push({ employeeNo: emp.employeeNo, name: emp.name, status: 'failed', error: errMsg });
      }
    } catch (err) {
      pushedFail++;
      console.log(R + 'ERROR' + X + ` — ${err.message}`);
      results.push({ employeeNo: emp.employeeNo, name: emp.name, status: 'error', error: err.message });
    }

    // Jeda kecil antar request agar device tidak overwhelmed
    await new Promise(r => setTimeout(r, 300));
  }

  // ── Ringkasan ─────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log(`${G}✓ Berhasil di-push : ${pushedOk}${X}`);
  if (pushedFail > 0) {
    console.log(`${R}❌ Gagal            : ${pushedFail}${X}`);
    console.log('\nEmployee yang gagal:');
    results.filter(r => r.status !== 'ok').forEach(r => {
      console.log(`  ${R}#${r.employeeNo} ${r.name} — ${r.error}${X}`);
    });
  }

  if (pushedOk > 0) {
    console.log(`\n${C}Langkah selanjutnya:${X}`);
    const okEmps = results.filter(r => r.status === 'ok' && !r.alreadyExists);
    if (okEmps.length > 0) {
      console.log(`${C}  Employee baru berhasil ditambahkan ke device.${X}`);
      console.log(`${C}  Lakukan enrollment fingerprint via frontend atau API:${X}`);
      console.log(`${C}  POST /integrations/hikvision/devices/${deviceId}/employees/:employeeNo/enroll-fingerprint${X}`);
    }
    console.log(`${C}  Jalankan sync-employees setelah enroll untuk update DB:${X}`);
    console.log(`${C}  POST /integrations/hikvision/devices/${deviceId}/sync-employees${X}`);
  }

  console.log('');
  process.exit(pushedFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(R + '\nFatal error: ' + X + err.message);
  console.error(err.stack);
  process.exit(1);
});
