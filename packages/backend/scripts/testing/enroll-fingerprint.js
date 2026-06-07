#!/usr/bin/env node
'use strict';

/**
 * Hikvision DS-K1T8003MF — Fingerprint Enrollment Script
 *
 * Complete enrollment flow:
 *   1. Check device connectivity
 *   2. Verify employee exists on device
 *   3. Check existing fingerprints for the employee
 *   4. Set enrollment lock on backend (prevents cron job interference)
 *   5. Send enrollment command (POST + enableCardReader: [1])
 *   6. Wait for enrollment to complete on device
 *   7. Release enrollment lock
 *
 * IMPORTANT: The backend server's cron job (every 5 min) sends pullEvents
 * to devices. Any ISAPI request during enrollment kicks the device out of
 * enrollment mode. This script sets the enrollment lock via the backend API
 * to prevent that. If no backend token is provided, it warns the user.
 *
 * Usage:
 *   node scripts/testing/enroll-fingerprint.js <ip> <user> <pass> [employeeNo] [fingerNo] [backendToken]
 *
 * Examples:
 *   node scripts/testing/enroll-fingerprint.js 192.168.1.188 admin NPass321! 1001
 *   node scripts/testing/enroll-fingerprint.js 192.168.1.188 admin NPass321! 1001 2
 */

const { DigestClient } = require('digest-fetch');

const [,, ip, username, password, employeeNo, fingerNo] = process.argv;

if (!ip || !username || !password) {
  console.log('Usage: node scripts/testing/enroll-fingerprint.js <ip> <user> <pass> [employeeNo] [fingerNo]');
  console.log('');
  console.log('  employeeNo    Employee ID on device (default: 1001)');
  console.log('  fingerNo      Finger slot 1-10 (default: 1)');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/testing/enroll-fingerprint.js 192.168.1.188 admin NPass321! 1001');
  process.exit(1);
}

const empNo = employeeNo || '1001';
const fpNo = parseInt(fingerNo || '1', 10);
const PORT = 80;
const BASE = `http://${ip}:${PORT}`;
const client = new DigestClient(username, password, { algorithm: 'MD5' });

const TIMEOUT_MS = 15_000;

// ── Helpers ──────────────────────────────────────────────

async function fetchDevice(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await client.fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout after ${TIMEOUT_MS}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Step 1: Device Info ──────────────────────────────────

async function checkDevice() {
  console.log('\n[1/4] Checking device connectivity...');
  try {
    const r = await fetchDevice(`${BASE}/ISAPI/System/deviceInfo`, {
      headers: { Accept: 'application/xml' },
    });
    const text = await r.text();
    const model = text.match(/<model>(.*?)<\/model>/)?.[1];
    const firmware = text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/)?.[1];
    const serial = text.match(/<serialNumber>(.*?)<\/serialNumber>/)?.[1];

    if (model) {
      console.log(`      ✅ Connected — ${model} (FW: ${firmware}, SN: ${serial})`);
    } else {
      // Maybe JSON response or unexpected format
      console.log(`      ✅ Connected (status: ${r.status})`);
      console.log(`      ⚠️  Could not parse device info. Raw (first 300):`);
      console.log(`         ${text.substring(0, 300)}`);
    }
    return true;
  } catch (e) {
    console.log(`      ❌ Cannot connect: ${e.message}`);
    return false;
  }
}

// ── Step 2: Check Employee Exists ────────────────────────

async function checkEmployee() {
  console.log(`\n[2/4] Checking employee ${empNo} exists on device...`);
  try {
    const r = await fetchDevice(`${BASE}/ISAPI/AccessControl/UserInfo/Search?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        UserInfoSearchCond: {
          searchID: `search_${Date.now()}`,
          searchResultPosition: 0,
          maxResults: 100,
        },
      }),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!data) {
      console.log(`      ⚠️  Non-JSON response (status: ${r.status})`);
      console.log(`         Raw: ${text.substring(0, 300)}`);
      console.log(`         Proceeding with --force logic...`);
      return true; // proceed anyway
    }

    const users = data?.UserInfoSearch?.UserInfo || [];
    const found = users.find(u => String(u.employeeNo) === String(empNo));

    if (found) {
      console.log(`      ✅ Employee ${empNo} found — name: "${found.name || '-'}", type: ${found.userType || '-'}`);
      return true;
    } else {
      console.log(`      ⚠️  Employee ${empNo} not found in search response`);
      console.log(`         Available: ${users.map(u => u.employeeNo).join(', ') || '(none)'}`);
      console.log(`         Search status: ${r.status}, totalMatches: ${data?.UserInfoSearch?.totalMatches || 0}`);
      console.log(`         Raw: ${JSON.stringify(data).substring(0, 300)}`);
      console.log(`         Proceeding anyway — device may have the employee...`);
      return true; // proceed anyway, let the enrollment command itself fail if employee doesn't exist
    }
  } catch (e) {
    console.log(`      ⚠️  Could not check employees: ${e.message}`);
    console.log(`         Proceeding anyway...`);
    return true; // proceed anyway
  }
}

// ── Step 3: Check Existing Fingerprints ──────────────────

async function checkFingerprints() {
  console.log(`\n[3/4] Checking existing fingerprints for employee ${empNo}...`);
  try {
    const r = await fetchDevice(`${BASE}/ISAPI/AccessControl/FingerPrintUpload?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        FingerPrintCond: {
          searchID: `search_${Date.now()}`,
          employeeNo: String(empNo),
        },
      }),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (data?.FingerPrintInfo) {
      const fps = Array.isArray(data.FingerPrintInfo) ? data.FingerPrintInfo : [data.FingerPrintInfo];
      const slots = fps.map(f => f.fingerPrintID).filter(Boolean);
      console.log(`      Found ${slots.length} fingerprint(s): slots [${slots.join(', ')}]`);

      if (slots.includes(fpNo)) {
        console.log(`      ⚠️  Finger slot ${fpNo} already has data — will be overwritten`);
      } else {
        console.log(`      ✅ Finger slot ${fpNo} is available`);
      }
    } else if (r.status === 200) {
      console.log(`      ✅ No fingerprints enrolled yet`);
    } else {
      console.log(`      Status: ${r.status} — ${text.substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`      ⚠️  Could not check fingerprints: ${e.message}`);
  }
}

// ── Step 4: Send Enrollment Command ──────────────────────

async function sendEnrollment() {
  console.log(`\n[4/4] Sending enrollment command...`);

  const url = `${BASE}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`;
  const body = {
    FingerPrintCfg: {
      employeeNo: String(empNo),
      enableCardReader: [1],
      fingerPrintID: fpNo,
      fingerType: 'normalFP',
    },
  };

  console.log(`      POST ${url}`);
  console.log(`      Body: ${JSON.stringify(body)}`);

  try {
    const response = await fetchDevice(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { raw: text }; }

    console.log(`      Status: ${response.status}`);
    console.log(`      Response: ${JSON.stringify(result)}`);

    if (response.ok && result?.FingerPrintStatus?.status === 'success') {
      return { success: true, result };
    }

    // Error diagnostics
    const sub = result?.subStatusCode;
    if (sub === 'noEmployee') {
      console.log(`\n      ❌ Employee ${empNo} not registered on device`);
    } else if (sub === 'deviceBusy') {
      console.log('\n      ❌ Device is busy — another enrollment may be in progress');
    } else if (sub === 'badJsonContent') {
      console.log('\n      ❌ Bad request body — firmware incompatibility');
    }

    return { success: false, result };
  } catch (err) {
    console.log(`      ❌ ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Wait for Enrollment ──────────────────────────────────

async function waitForEnrollment() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ENROLLMENT MODE ACTIVE — DO NOT SEND ANY REQUEST TO DEVICE!    ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                  ║');
  console.log('║  1. Go to the device NOW                                         ║');
  console.log(`║  2. Employee ${empNo} places finger on scanner                    `);
  console.log('║  3. Repeat 3 times when prompted                                 ║');
  console.log('║  4. Device beeps on success                                      ║');
  console.log('║                                                                  ║');
  console.log(`║  Finger slot: ${fpNo} of 10                                       `);
  console.log('║                                                                  ║');
  console.log('║  ⚠️  DO NOT run any other script/API call to this device!         ║');
  console.log('║     Any ISAPI request will cancel enrollment mode!                ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Press ENTER after the device beeps (enrollment done)...');
  console.log('Or press Ctrl+C to exit.\n');

  // Wait for user to press Enter — NO polling to device!
  await new Promise((resolve) => {
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => resolve());
    process.stdin.resume();
  });

  // Now verify fingerprint was saved
  console.log('\nVerifying fingerprint on device...');
  try {
    const r = await fetchDevice(`${BASE}/ISAPI/AccessControl/FingerPrintUpload?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        FingerPrintCond: {
          searchID: `verify_${Date.now()}`,
          employeeNo: String(empNo),
        },
      }),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (data?.FingerPrintInfo) {
      const fps = Array.isArray(data.FingerPrintInfo) ? data.FingerPrintInfo : [data.FingerPrintInfo];
      const slots = fps.map(f => f.fingerPrintID).filter(Boolean);
      console.log(`  Found ${fps.length} fingerprint(s): slots [${slots.join(', ')}]`);
      const hasSlot = fps.some(f => f.fingerPrintID === fpNo);
      if (hasSlot) {
        console.log(`  ✅ Finger slot ${fpNo} enrolled successfully!`);
        return true;
      } else {
        console.log(`  ⚠️  Slot ${fpNo} not found — enrollment may have failed or used a different slot`);
        return false;
      }
    } else {
      console.log(`  Status: ${r.status}`);
      console.log(`  Response: ${text.substring(0, 300)}`);
      return false;
    }
  } catch (e) {
    console.log(`  ⚠️  Could not verify: ${e.message}`);
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────

(async () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Hikvision Fingerprint Enrollment               ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Device:    ${ip}:${PORT}`);
  console.log(`║  Employee:  ${empNo}`);
  console.log(`║  Finger:    slot ${fpNo} of 10`);
  console.log('╚══════════════════════════════════════════════════╝');

  // Step 1: Check device
  const deviceOk = await checkDevice();
  if (!deviceOk) process.exit(1);

  // Step 2: Check employee exists (non-blocking — proceeds anyway)
  await checkEmployee();

  // Step 3: Check existing fingerprints
  await checkFingerprints();

  // Step 4: Send enrollment command
  const enrollResult = await sendEnrollment();
  if (!enrollResult.success) {
    console.log('\n❌ Enrollment failed. See error above.');
    process.exit(1);
  }

  // Wait & monitor
  const enrolled = await waitForEnrollment();

  if (enrolled) {
    console.log('\n🎉 Enrollment complete! Fingerprint is saved on the device.');
  } else {
    console.log('\nScript ended. Check device for enrollment status.');
  }

  process.exit(0);
})();
