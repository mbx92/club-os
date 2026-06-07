#!/usr/bin/env node
'use strict';

/**
 * Hikvision Fingerprint Data Diagnostic
 *
 * Cek data fingerprint di mesin Hikvision vs database:
 *  - Ambil semua employees dari device (UserInfo/Search)
 *  - Cek FP count via 3 strategi (FingerPrint/Search, numOfFP dari UserInfo, FingerPrintUpload per employee)
 *  - Bandingkan dengan data DeviceEmployee di DB
 *  - Tampilkan discrepancy: siapa yang sudah di-post FP tapi device menunjukkan 0
 *
 * Usage:
 *   node scripts/checkHikvisionFingerprintData.js
 *   node scripts/checkHikvisionFingerprintData.js --deviceId <uuid>
 *   node scripts/checkHikvisionFingerprintData.js --employeeNo <no>
 *   node scripts/checkHikvisionFingerprintData.js --verbose
 *   node scripts/checkHikvisionFingerprintData.js --raw          # Dump raw device response
 */

require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { DigestClient } = require('digest-fetch');
const { HikvisionDevice, DeviceEmployee, User, Tenant } = require('../src/models');

const TIMEOUT_MS = 15_000;
const args = process.argv.slice(2);
const verbose  = args.includes('--verbose');
const rawDump  = args.includes('--raw');

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newClient(device) {
  return new DigestClient(device.username, device.password, { algorithm: 'MD5' });
}

function base(device) {
  return `http://${device.ipAddress}:${device.port}`;
}

async function fetchJ(client, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await client.fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, status: null, text: null, error: `Timeout after ${TIMEOUT_MS}ms` };
    return { ok: false, status: null, text: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// ── Device queries ────────────────────────────────────────────────────────────

async function getDeviceInfo(device) {
  const url = `${base(device)}/ISAPI/System/deviceInfo`;
  const r = await fetchJ(newClient(device), url, { headers: { Accept: 'application/xml' } });
  if (!r.ok) return { error: r.error || `HTTP ${r.status}` };
  const model    = r.text.match(/<model>(.*?)<\/model>/)?.[1];
  const serial   = r.text.match(/<serialNumber>(.*?)<\/serialNumber>/)?.[1];
  const firmware = r.text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/)?.[1];
  return { model, serial, firmware };
}

/**
 * Ambil semua employee dari device via UserInfo/Search.
 * Juga cek apakah field numOfFP tersedia (beberapa firmware menyertakannya).
 */
async function getDeviceEmployees(device) {
  const url = `${base(device)}/ISAPI/AccessControl/UserInfo/Search?format=json`;
  const body = JSON.stringify({
    UserInfoSearchCond: {
      searchID: `diag_${Date.now()}`,
      searchResultPosition: 0,
      maxResults: 1000,
    },
  });

  const r = await fetchJ(newClient(device), url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });

  if (!r.ok) return { error: r.error || `HTTP ${r.status}`, list: [] };

  if (rawDump) {
    console.log('\n[RAW] UserInfo/Search response:');
    console.log(r.text.substring(0, 2000));
  }

  let data;
  try {
    data = JSON.parse(r.text);
  } catch {
    return { error: 'Non-JSON response from UserInfo/Search', list: [] };
  }

  const list = data?.UserInfoSearch?.UserInfo || [];
  const hasNumOfFPField = list.length > 0 && (
    list[0].hasOwnProperty('numOfFP') || list[0].hasOwnProperty('numOfFingerPrint')
  );

  return { list, hasNumOfFPField, totalMatches: data?.UserInfoSearch?.numOfMatches || list.length };
}

/**
 * Strategi 1: FingerPrint/Search — ambil semua FP records, count per employeeNo.
 */
async function getFpViaSearch(device) {
  const url = `${base(device)}/ISAPI/AccessControl/FingerPrint/Search?format=json`;
  const body = JSON.stringify({
    FingerPrintCond: {
      searchID: `fp_diag_${Date.now()}`,
      searchResultPosition: 0,
      maxResults: 1000,
    },
  });

  const r = await fetchJ(newClient(device), url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });

  if (!r.ok) return { error: r.error || `HTTP ${r.status}`, supported: false, map: null };

  if (rawDump) {
    console.log('\n[RAW] FingerPrint/Search response:');
    console.log(r.text.substring(0, 2000));
  }

  let data;
  try {
    data = JSON.parse(r.text);
  } catch {
    return { error: 'Non-JSON', supported: false, map: null };
  }

  const searchResult = data?.FingerPrintSearch || data?.FingerPrintList || data;
  const fpList = searchResult?.FingerPrintInfo || searchResult?.fingerPrintInfo || [];
  const responseStatus = searchResult?.responseStatusStrg || '';

  if (responseStatus === 'NO MATCH' || fpList.length === 0) {
    return { supported: true, map: {}, total: 0 };
  }

  const map = {};
  for (const fp of fpList) {
    const no = String(fp.employeeNo);
    map[no] = (map[no] || 0) + 1;
  }
  return { supported: true, map, total: fpList.length };
}

/**
 * Strategi 3: FingerPrintUpload per employee (paling lambat tapi paling reliabel).
 * Hanya dicek untuk employee tertentu kalau --employeeNo diberikan,
 * atau semua employee kalau ada flag --verbose.
 */
async function getFpViaUpload(device, employees) {
  const url = `${base(device)}/ISAPI/AccessControl/FingerPrintUpload?format=json`;
  const map = {};
  let supported = null;

  for (const emp of employees) {
    const empNo = String(emp.employeeNo);
    const body = JSON.stringify({
      FingerPrintCond: {
        searchID: `fp_up_${Date.now()}`,
        employeeNo: empNo,
      },
    });

    const r = await fetchJ(newClient(device), url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    });

    if (!r.ok) {
      if (r.status === 400 || r.status === 405) {
        supported = false;
        break; // endpoint tidak didukung
      }
      continue;
    }

    if (supported === null) supported = true;

    if (rawDump) {
      console.log(`\n[RAW] FingerPrintUpload for empNo ${empNo}:`);
      console.log(r.text.substring(0, 1000));
    }

    let data;
    try { data = JSON.parse(r.text); } catch { continue; }

    const fpInfo = data?.FingerPrintInfo;
    if (!fpInfo || fpInfo.status !== 'OK') continue;

    const fpList = fpInfo.FingerPrintList;
    if (Array.isArray(fpList) && fpList.length > 0) {
      map[empNo] = fpList.length;
    } else if (fpList && typeof fpList === 'object') {
      map[empNo] = 1;
    }
  }

  return { supported: supported !== false, map };
}

// ── Display ───────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

function pad(str, n) { return String(str ?? '').padEnd(n); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function checkDevice(device, tenantName, filterEmpNo) {
  const label = `${device.name} — ${device.ipAddress}:${device.port}`;
  console.log('\n' + BOLD + '═'.repeat(70) + RESET);
  console.log(BOLD + `  Device : ${label}` + RESET);
  console.log(`  Tenant : ${tenantName}`);
  console.log(`  DB ID  : ${device.id}`);
  console.log('═'.repeat(70));

  // ── Device info ──────────────────────────────────────────────────────────
  process.stdout.write('  Mengambil info device... ');
  const info = await getDeviceInfo(device);
  if (info.error) {
    console.log(RED + 'GAGAL' + RESET);
    console.log(`  ${RED}❌ Tidak bisa konek: ${info.error}${RESET}`);
    return;
  }
  console.log(GREEN + 'OK' + RESET);
  console.log(`  Model: ${info.model}  |  Serial: ${info.serial}  |  FW: ${info.firmware}`);

  // ── Ambil employees dari device ──────────────────────────────────────────
  process.stdout.write('  Mengambil data employee dari device (UserInfo/Search)... ');
  const empResult = await getDeviceEmployees(device);
  if (empResult.error) {
    console.log(RED + 'GAGAL' + RESET);
    console.log(`  ${RED}❌ ${empResult.error}${RESET}`);
    return;
  }
  console.log(GREEN + `${empResult.list.length} employee` + RESET);

  let employees = empResult.list;
  if (filterEmpNo) {
    employees = employees.filter(e => String(e.employeeNo) === String(filterEmpNo));
    console.log(`  Filter: employeeNo=${filterEmpNo} → ${employees.length} ditemukan di device`);
  }

  // ── Strategi 1: FingerPrint/Search ────────────────────────────────────────
  process.stdout.write('  Strategi 1 — FingerPrint/Search... ');
  const fpSearch = await getFpViaSearch(device);
  if (!fpSearch.supported) {
    console.log(YELLOW + 'tidak didukung (HTTP ' + (fpSearch.error || '?') + ')' + RESET);
  } else if (fpSearch.error) {
    console.log(YELLOW + 'error: ' + fpSearch.error + RESET);
  } else {
    const empWithFP = Object.keys(fpSearch.map).length;
    console.log(GREEN + `OK — ${fpSearch.total} FP records, ${empWithFP} employee` + RESET);
  }

  // ── Strategi 3: FingerPrintUpload per employee ────────────────────────────
  // Jalankan kalau verbose atau filterEmpNo diberikan (karena lambat untuk semua employee)
  let fpUpload = { supported: null, map: null };
  if (verbose || filterEmpNo) {
    const targetList = filterEmpNo
      ? employees
      : employees.slice(0, 50); // Batasi 50 kalau verbose tanpa filter

    process.stdout.write(`  Strategi 3 — FingerPrintUpload (${targetList.length} employee)... `);
    fpUpload = await getFpViaUpload(device, targetList);
    if (!fpUpload.supported) {
      console.log(YELLOW + 'tidak didukung' + RESET);
    } else {
      const empWithFP = Object.keys(fpUpload.map).length;
      console.log(GREEN + `OK — ${empWithFP} employee punya FP` + RESET);
    }
  }

  // ── Ambil data DB ─────────────────────────────────────────────────────────
  const dbRecords = await DeviceEmployee.findAll({
    where: { deviceId: device.id, ...(filterEmpNo ? { employeeNo: String(filterEmpNo) } : {}) },
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'deviceEmployeeNo'], required: false }],
    order: [['employeeNo', 'ASC']],
  });

  const dbMap = {};
  for (const rec of dbRecords) {
    dbMap[String(rec.employeeNo)] = rec;
  }

  // ── Buat tabel perbandingan ───────────────────────────────────────────────
  console.log('\n' + BOLD + '  Perbandingan Data Fingerprint:' + RESET);
  console.log('  ' + '─'.repeat(100));

  const header = [
    pad('EmpNo', 8),
    pad('Nama', 20),
    pad('FP (FingerSearch)', 18),
    pad('numOfFP (UserInfo)', 19),
    pad('FP (Upload)', 12),
    pad('DB hasFP', 9),
    pad('DB count', 9),
    'Status',
  ].join(' | ');
  console.log('  ' + BOLD + header + RESET);
  console.log('  ' + '─'.repeat(100));

  let issueCount = 0;
  const issues = [];

  // Gabungkan semua employee: dari device + dari DB (untuk yang ada di DB tapi tidak di device)
  const allEmpNos = new Set([
    ...employees.map(e => String(e.employeeNo)),
    ...dbRecords.map(r => String(r.employeeNo)),
  ]);

  for (const empNo of [...allEmpNos].sort((a, b) => Number(a) - Number(b))) {
    const devEmp = employees.find(e => String(e.employeeNo) === empNo);
    const dbRec  = dbMap[empNo];

    const fpFromSearch  = fpSearch.map ? (fpSearch.map[empNo] || 0)  : null;
    const fpFromUserInfo = devEmp
      ? (devEmp.numOfFP ?? devEmp.numOfFingerPrint ?? null)
      : null;
    const fpFromUpload  = fpUpload.map ? (fpUpload.map[empNo] || 0)  : null;

    const dbHasFP    = dbRec?.hasFingerprint ?? null;
    const dbCount    = dbRec?.fingerprintCount ?? null;
    const dbName     = dbRec?.name || devEmp?.name || '—';
    const dbLastSync = dbRec?.lastSyncAt ? new Date(dbRec.lastSyncAt).toLocaleString('id-ID') : null;

    // Deteksi masalah:
    // 1. DB bilang sudah ada FP, tapi device tidak ada
    // 2. Device punya FP, tapi DB belum sinkron
    // 3. Employee di device tapi tidak ada di DB
    let status = '';
    let statusColor = RESET;

    const deviceFpCount = fpFromSearch !== null ? fpFromSearch
      : fpFromUpload  !== null ? fpFromUpload
      : fpFromUserInfo;

    if (!devEmp) {
      status = '⚠  Tidak ada di device (hanya di DB)';
      statusColor = YELLOW;
      issueCount++;
      issues.push({ empNo, name: dbName, issue: 'Ada di DB tapi tidak di device' });
    } else if (!dbRec) {
      status = '⚠  Tidak ada di DB (belum sync-employees)';
      statusColor = YELLOW;
      issueCount++;
      issues.push({ empNo, name: devEmp.name || '—', issue: 'Ada di device tapi belum di-sync ke DB' });
    } else if (dbHasFP && deviceFpCount !== null && deviceFpCount === 0) {
      status = `${RED}❌ DB bilang ada FP tapi device TIDAK ada${RESET}`;
      statusColor = RED;
      issueCount++;
      issues.push({ empNo, name: dbName, issue: 'DB hasFingerprint=true tapi device count=0 — FP tidak tersimpan di device' });
    } else if (!dbHasFP && deviceFpCount !== null && deviceFpCount > 0) {
      status = `${YELLOW}⚠  Device punya FP tapi DB belum update (sync diperlukan)${RESET}`;
      statusColor = YELLOW;
      issueCount++;
      issues.push({ empNo, name: dbName, issue: 'Device ada FP tapi DB hasFingerprint=false — jalankan sync-employees' });
    } else if (dbHasFP) {
      status = GREEN + '✓ OK' + RESET;
    } else {
      status = '— (tidak ada FP)';
    }

    const row = [
      pad(empNo, 8),
      pad(dbName.substring(0, 19), 20),
      pad(fpFromSearch  !== null ? `${fpFromSearch} FP`  : '(skip)', 18),
      pad(fpFromUserInfo !== null ? `${fpFromUserInfo} FP` : '(N/A)', 19),
      pad(fpFromUpload  !== null ? `${fpFromUpload} FP`  : '(skip)', 12),
      pad(dbHasFP  !== null ? (dbHasFP  ? 'true'  : 'false') : '—', 9),
      pad(dbCount  !== null ? dbCount  : '—', 9),
    ].join(' | ');

    const rowColor = statusColor === RED ? RED : statusColor === YELLOW ? YELLOW : RESET;
    console.log('  ' + rowColor + row + ' | ' + status + RESET);

    // Kalau verbose, tampilkan detail FP fields dari device
    if (verbose && devEmp) {
      const fpFields = Object.entries(devEmp)
        .filter(([k]) => /fp|finger|face/i.test(k))
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ');
      if (fpFields) console.log(`      ${CYAN}[device fields] ${fpFields}${RESET}`);
      if (dbRec) {
        console.log(`      ${CYAN}[db lastSync] ${dbLastSync || 'never'} | userId=${dbRec.userId || 'null'}${RESET}`);
        if (dbRec.user) {
          console.log(`      ${CYAN}[linked user] ${dbRec.user.firstName} ${dbRec.user.lastName || ''} <${dbRec.user.email}> deviceEmployeeNo=${dbRec.user.deviceEmployeeNo}${RESET}`);
        }
      }
    }
  }

  console.log('  ' + '─'.repeat(100));
  console.log(`  Total employees di device : ${employees.length}`);
  console.log(`  Total records di DB       : ${dbRecords.length}`);

  if (fpSearch.map) {
    console.log(`  Total FP dari FingerSearch: ${fpSearch.total} records (${Object.keys(fpSearch.map).length} employee)`);
  }

  // ── Ringkasan masalah ─────────────────────────────────────────────────────
  if (issueCount === 0) {
    console.log('\n  ' + GREEN + BOLD + '✓ Tidak ada discrepancy ditemukan.' + RESET);
  } else {
    console.log('\n  ' + RED + BOLD + `⚠  ${issueCount} MASALAH DITEMUKAN:` + RESET);
    for (const issue of issues) {
      console.log(`  ${RED}  • EmpNo ${issue.empNo} (${issue.name}): ${issue.issue}${RESET}`);
    }
    console.log('\n  Kemungkinan penyebab "data kosong setelah post FP":');
    console.log('  1. Step 2 (FingerPrint/SetUp) gagal secara silent — cek logs server saat enrollment');
    console.log('  2. Enrollment belum selesai — user belum taruh jari sebanyak 3x');
    console.log('  3. Device di-restart setelah capture tapi sebelum SetUp selesai');
    console.log('  4. Nonce stale — DigestClient tidak di-refresh, request 401 di-ignore');
    console.log('  5. DB tidak di-sync setelah enrollment (jalankan: POST /devices/:id/sync-employees)');
  }
}

async function main() {
  console.log(BOLD + '\n🔍 Hikvision Fingerprint Data Diagnostic' + RESET);
  console.log(`   Waktu server: ${new Date().toLocaleString('id-ID')}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

  const deviceId  = getArg('deviceId');
  const empNo     = getArg('employeeNo');

  const where = { isActive: true, deletedAt: null };
  if (deviceId) where.id = deviceId;

  const devices = await HikvisionDevice.findAll({
    where,
    include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  if (devices.length === 0) {
    console.log(YELLOW + '⚠  Tidak ada device aktif ditemukan di database.' + RESET);
    process.exit(0);
  }

  console.log(`Ditemukan ${devices.length} device aktif.\n`);

  for (const device of devices) {
    await checkDevice(device, device.tenant?.name || device.tenantId, empNo);
  }

  console.log('\n' + BOLD + 'Selesai.' + RESET + '\n');
  process.exit(0);
}

main().catch(err => {
  console.error(RED + 'Fatal error:' + RESET, err.message);
  if (verbose) console.error(err.stack);
  process.exit(1);
});
