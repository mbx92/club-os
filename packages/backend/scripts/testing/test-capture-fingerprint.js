#!/usr/bin/env node
'use strict';

/**
 * Hikvision DS-K1T8003MF — Test which endpoint actually triggers enrollment mode
 *
 * Tests:
 *   A) /ISAPI/AccessControl/FingerPrint/SetUp (current - returns 200 but no enrollment screen)
 *   B) /ISAPI/AccessControl/CaptureFingerPrint (XML - trigger scanner capture)
 *   C) /ISAPI/AccessControl/FingerPrint/Capture (JSON variant)
 *
 * Usage:
 *   node scripts/testing/test-capture-fingerprint.js <ip> <user> <pass> [employeeNo] [test]
 *
 * Examples:
 *   node scripts/testing/test-capture-fingerprint.js 192.168.1.188 admin NPass321! 1001 all
 *   node scripts/testing/test-capture-fingerprint.js 192.168.1.188 admin NPass321! 1001 B
 */

const { DigestClient } = require('digest-fetch');

const [,, ip, username, password, employeeNo, testFilter] = process.argv;

if (!ip || !username || !password) {
  console.log('Usage: node test-capture-fingerprint.js <ip> <user> <pass> [employeeNo] [test]');
  console.log('  test = A, B, C, or all (default: all)');
  process.exit(1);
}

const empNo = employeeNo || '1001';
const PORT = 80;
const BASE = `http://${ip}:${PORT}`;
const client = new DigestClient(username, password, { algorithm: 'MD5' });
const filter = (testFilter || 'all').toUpperCase();

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await client.fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Test A: FingerPrint/SetUp (current method) ──────────
async function testA() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('TEST A: POST /ISAPI/AccessControl/FingerPrint/SetUp?format=json');
  console.log('(Current method — returns 200 but may not trigger device screen)');
  console.log('══════════════════════════════════════════════════════');

  const url = `${BASE}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`;
  const body = {
    FingerPrintCfg: {
      employeeNo: String(empNo),
      enableCardReader: [1],
      fingerPrintID: 1,
      fingerType: 'normalFP',
    },
  };

  try {
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    console.log(`Status: ${r.status}`);
    console.log(`Response: ${text}`);
    console.log(`>>> CHECK DEVICE SCREEN NOW — does it show enrollment prompt? <<<`);
    return r.ok;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
}

// ── Test B: CaptureFingerPrint (XML) ────────────────────
async function testB() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('TEST B: POST /ISAPI/AccessControl/CaptureFingerPrint (XML)');
  console.log('(This should trigger the physical scanner on the device)');
  console.log('══════════════════════════════════════════════════════');

  const url = `${BASE}/ISAPI/AccessControl/CaptureFingerPrint`;
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
    '<fingerNo>1</fingerNo>' +
    '</CaptureFingerPrintCond>';

  console.log(`URL: ${url}`);
  console.log(`Body: ${xml}`);

  try {
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
      body: xml,
    });
    const text = await r.text();
    console.log(`Status: ${r.status}`);
    console.log(`Response: ${text.substring(0, 500)}`);
    console.log(`>>> CHECK DEVICE SCREEN NOW — does it show "place finger" prompt? <<<`);
    return r.ok;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
}

// ── Test C: CaptureFingerPrint (JSON) ───────────────────
async function testC() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('TEST C: POST /ISAPI/AccessControl/CaptureFingerPrint?format=json');
  console.log('(JSON variant of capture)');
  console.log('══════════════════════════════════════════════════════');

  const url = `${BASE}/ISAPI/AccessControl/CaptureFingerPrint?format=json`;
  const body = {
    CaptureFingerPrintCond: {
      fingerNo: 1,
    },
  };

  console.log(`URL: ${url}`);
  console.log(`Body: ${JSON.stringify(body)}`);

  try {
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    console.log(`Status: ${r.status}`);
    console.log(`Response: ${text.substring(0, 500)}`);
    console.log(`>>> CHECK DEVICE SCREEN NOW — does it show "place finger" prompt? <<<`);
    return r.ok;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
}

// ── Test D: SetUp first, then CaptureFingerPrint ────────
async function testD() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('TEST D: SetUp + CaptureFingerPrint (two-step flow)');
  console.log('Step 1: FingerPrint/SetUp to configure employee+slot');
  console.log('Step 2: CaptureFingerPrint to trigger scanner');
  console.log('══════════════════════════════════════════════════════');

  // Step 1: SetUp
  console.log('\n--- Step 1: FingerPrint/SetUp ---');
  const setupUrl = `${BASE}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`;
  const setupBody = {
    FingerPrintCfg: {
      employeeNo: String(empNo),
      enableCardReader: [1],
      fingerPrintID: 1,
      fingerType: 'normalFP',
    },
  };

  try {
    const r1 = await fetchWithTimeout(setupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(setupBody),
    });
    const text1 = await r1.text();
    console.log(`Status: ${r1.status}`);
    console.log(`Response: ${text1}`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }

  // Small delay
  await new Promise(r => setTimeout(r, 1000));

  // Step 2: CaptureFingerPrint
  console.log('\n--- Step 2: CaptureFingerPrint ---');
  const captureUrl = `${BASE}/ISAPI/AccessControl/CaptureFingerPrint`;
  const captureXml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
    '<fingerNo>1</fingerNo>' +
    '</CaptureFingerPrintCond>';

  try {
    const r2 = await fetchWithTimeout(captureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
      body: captureXml,
    });
    const text2 = await r2.text();
    console.log(`Status: ${r2.status}`);
    console.log(`Response: ${text2.substring(0, 500)}`);
    console.log(`\n>>> CHECK DEVICE SCREEN NOW <<<`);
    return r2.ok;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
}

// ── Test E: SetUp + CaptureFingerPrint JSON ─────────────
async function testE() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('TEST E: SetUp + CaptureFingerPrint JSON (two-step)');
  console.log('══════════════════════════════════════════════════════');

  // Step 1: SetUp
  console.log('\n--- Step 1: FingerPrint/SetUp ---');
  const setupUrl = `${BASE}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`;
  const setupBody = {
    FingerPrintCfg: {
      employeeNo: String(empNo),
      enableCardReader: [1],
      fingerPrintID: 1,
      fingerType: 'normalFP',
    },
  };

  try {
    const r1 = await fetchWithTimeout(setupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(setupBody),
    });
    const text1 = await r1.text();
    console.log(`Status: ${r1.status}`);
    console.log(`Response: ${text1}`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }

  await new Promise(r => setTimeout(r, 1000));

  // Step 2: CaptureFingerPrint JSON
  console.log('\n--- Step 2: CaptureFingerPrint (JSON) ---');
  const captureUrl = `${BASE}/ISAPI/AccessControl/CaptureFingerPrint?format=json`;
  const captureBody = { CaptureFingerPrintCond: { fingerNo: 1 } };

  try {
    const r2 = await fetchWithTimeout(captureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(captureBody),
    });
    const text2 = await r2.text();
    console.log(`Status: ${r2.status}`);
    console.log(`Response: ${text2.substring(0, 500)}`);
    console.log(`\n>>> CHECK DEVICE SCREEN NOW <<<`);
    return r2.ok;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────
(async () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Hikvision — Enrollment Mode Endpoint Discovery       ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Device:    ${ip}:${PORT}`);
  console.log(`║  Employee:  ${empNo}`);
  console.log(`║  Filter:    ${filter}`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  Watch the device screen after EACH test!');
  console.log('   Report which test makes the device show the enrollment prompt.');
  console.log('');
  console.log('Tests will run ONE AT A TIME with 10s pause between each.');
  console.log('Check device screen during each pause.');

  const results = {};
  const pause = (label) => new Promise(resolve => {
    console.log(`\n⏳ 10 seconds to check device screen for "${label}"...`);
    let countdown = 10;
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        process.stdout.write(`   ${countdown}s... `);
      } else {
        clearInterval(interval);
        console.log('\n');
        resolve();
      }
    }, 1000);
  });

  if (filter === 'ALL' || filter === 'A') {
    results.A = await testA();
    await pause('Test A: FingerPrint/SetUp');
  }

  if (filter === 'ALL' || filter === 'B') {
    results.B = await testB();
    await pause('Test B: CaptureFingerPrint XML');
  }

  if (filter === 'ALL' || filter === 'C') {
    results.C = await testC();
    await pause('Test C: CaptureFingerPrint JSON');
  }

  if (filter === 'ALL' || filter === 'D') {
    results.D = await testD();
    await pause('Test D: SetUp + Capture XML');
  }

  if (filter === 'ALL' || filter === 'E') {
    results.E = await testE();
    await pause('Test E: SetUp + Capture JSON');
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('RESULTS:');
  console.log('══════════════════════════════════════════════════════');
  for (const [key, ok] of Object.entries(results)) {
    console.log(`  ${ok ? '✅' : '❌'} Test ${key}: HTTP ${ok ? 'OK' : 'FAILED'}`);
  }
  console.log('\nWhich test made the device show the enrollment prompt on screen?');
  console.log('Report back: A, B, C, D, or E');
})();
