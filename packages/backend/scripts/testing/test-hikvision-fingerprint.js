#!/usr/bin/env node
'use strict';

/**
 * Hikvision DS-K1T8003MF — Fingerprint Enrollment Diagnostic Script
 *
 * Tests the ISAPI endpoint calls used for fingerprint enrollment to
 * verify which method/body format the device actually accepts.
 *
 * Usage:
 *   node scripts/testing/test-hikvision-fingerprint.js <ip> <user> <pass> <employeeNo>
 *
 * Example:
 *   node scripts/testing/test-hikvision-fingerprint.js 192.168.1.23 admin NPass321! 1
 */

const { DigestClient } = require('digest-fetch');

const [,, ip, username, password, employeeNo] = process.argv;

if (!ip || !username || !password) {
  console.log('Usage: node test-hikvision-fingerprint.js <ip> <user> <pass> [employeeNo]');
  console.log('Example: node test-hikvision-fingerprint.js 192.168.1.23 admin NPass321! 1');
  process.exit(1);
}

const empNo = employeeNo || '1';
const PORT = 80;
const BASE = `http://${ip}:${PORT}`;
const client = new DigestClient(username, password, { algorithm: 'MD5' });

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await client.fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Timeout after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function testDeviceInfo() {
  console.log('\n=== 1. Device Info ===');
  try {
    const r = await fetchWithTimeout(`${BASE}/ISAPI/System/deviceInfo`, {
      headers: { Accept: 'application/xml' },
    });
    const text = await r.text();
    const model = text.match(/<model>(.*?)<\/model>/)?.[1];
    const serial = text.match(/<serialNumber>(.*?)<\/serialNumber>/)?.[1];
    const firmware = text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/)?.[1];
    console.log(`  Status: ${r.status}`);
    console.log(`  Model: ${model}`);
    console.log(`  Serial: ${serial}`);
    console.log(`  Firmware: ${firmware}`);
    return r.ok;
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    return false;
  }
}

async function testGetCapabilities() {
  console.log('\n=== 2. FingerPrint Capabilities ===');
  try {
    const r = await fetchWithTimeout(
      `${BASE}/ISAPI/AccessControl/FingerPrint/capabilities?format=json`,
      { headers: { Accept: 'application/json' } }
    );
    const text = await r.text();
    console.log(`  Status: ${r.status}`);
    if (r.ok) {
      try {
        const data = JSON.parse(text);
        console.log(`  Capabilities:`, JSON.stringify(data, null, 2).substring(0, 1000));
      } catch {
        console.log(`  Raw (first 500):`, text.substring(0, 500));
      }
    } else {
      console.log(`  Response:`, text.substring(0, 300));
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

async function testListEmployees() {
  console.log('\n=== 3. List Employees on Device ===');
  try {
    const r = await fetchWithTimeout(
      `${BASE}/ISAPI/AccessControl/UserInfo/Search?format=json`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          UserInfoSearchCond: {
            searchID: `search_${Date.now()}`,
            searchResultPosition: 0,
            maxResults: 100,
          },
        }),
      }
    );
    const text = await r.text();
    console.log(`  Status: ${r.status}`);
    try {
      const data = JSON.parse(text);
      const users = data?.UserInfoSearch?.UserInfo || [];
      console.log(`  Total users on device: ${users.length}`);
      users.forEach(u => {
        console.log(`    - employeeNo: ${u.employeeNo}, name: ${u.name}, userType: ${u.userType}`);
      });
      const hasEmployee = users.some(u => String(u.employeeNo) === String(empNo));
      console.log(`  Employee ${empNo} exists on device: ${hasEmployee}`);
      if (!hasEmployee) {
        console.log(`  ⚠️  Employee ${empNo} NOT found on device — enrollment will fail!`);
        console.log(`     You must add the employee first via POST /UserInfo/Record`);
      }
    } catch {
      console.log(`  Raw:`, text.substring(0, 500));
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

async function testFingerPrintSetup(method, bodyFormat, label) {
  console.log(`\n=== ${label} ===`);

  let body;
  if (bodyFormat === 'intArray') {
    // Old format: enableCardReader as array of integers
    body = {
      FingerPrintCfg: {
        employeeNo: String(empNo),
        enableCardReader: [1],
        fingerPrintID: 1,
        fingerType: 'normalFP',
      },
    };
  } else if (bodyFormat === 'objectArray') {
    // New format: enableCardReader as array of objects
    body = {
      FingerPrintCfg: {
        employeeNo: String(empNo),
        fingerPrintID: 1,
        fingerType: 'normalFP',
        enableCardReader: [{ cardReaderNo: 1 }],
      },
    };
  } else if (bodyFormat === 'noCardReader') {
    // Without enableCardReader
    body = {
      FingerPrintCfg: {
        employeeNo: String(empNo),
        fingerPrintID: 1,
        fingerType: 'normalFP',
      },
    };
  }

  try {
    const r = await fetchWithTimeout(
      `${BASE}/ISAPI/AccessControl/FingerPrint/SetUp?format=json`,
      {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const text = await r.text();
    console.log(`  Method: ${method}`);
    console.log(`  Body: ${JSON.stringify(body)}`);
    console.log(`  Status: ${r.status} ${r.ok ? '✅' : '❌'}`);

    let result;
    try { result = JSON.parse(text); } catch { result = text.substring(0, 500); }
    console.log(`  Response:`, typeof result === 'string' ? result : JSON.stringify(result, null, 2));

    if (r.ok) {
      console.log(`  🎯 SUCCESS — This format works! Device should show enrollment screen.`);
      console.log(`     Employee should place finger on scanner now (3 times).`);
    } else {
      const statusCode = result?.statusCode;
      const subStatus = result?.subStatusCode;
      const errorMsg = result?.errorMsg;
      if (statusCode) {
        console.log(`  statusCode: ${statusCode}, subStatus: ${subStatus}, errorMsg: ${errorMsg}`);
        if (subStatus === 'noEmployee') {
          console.log(`  ⚠️  Employee ${empNo} does not exist on device. Add them first.`);
        } else if (subStatus === 'methodNotAllowed') {
          console.log(`  ⚠️  Method ${method} is not supported. Try the other method.`);
        } else if (subStatus === 'badJsonContent') {
          console.log(`  ⚠️  JSON body format is incorrect for this device/firmware.`);
        }
      }
    }
    return r.ok;
  } catch (e) {
    console.log(`  Method: ${method}`);
    console.log(`  ERROR: ${e.message}`);
    return false;
  }
}

async function testCaptureFingerprint() {
  console.log('\n=== 7. Capture Fingerprint (XML) ===');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<CaptureFingerPrintCond version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">' +
    '<fingerNo>1</fingerNo>' +
    '</CaptureFingerPrintCond>';

  try {
    const r = await fetchWithTimeout(
      `${BASE}/ISAPI/AccessControl/CaptureFingerPrint`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml', Accept: 'application/xml' },
        body: xml,
      },
      5000 // short timeout, just check if endpoint exists
    );
    const text = await r.text();
    console.log(`  Status: ${r.status}`);
    console.log(`  Response (first 300):`, text.substring(0, 300));
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

async function testFingerPrintCount() {
  console.log('\n=== 8. FingerPrint Count ===');
  try {
    const r = await fetchWithTimeout(
      `${BASE}/ISAPI/AccessControl/FingerPrintUpload?format=json`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          FingerPrintCond: {
            searchID: `search_${Date.now()}`,
            employeeNo: String(empNo),
          },
        }),
      }
    );
    const text = await r.text();
    console.log(`  Status: ${r.status}`);
    try {
      const data = JSON.parse(text);
      console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    } catch {
      console.log(`  Raw:`, text.substring(0, 300));
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

// ========================================
// Main
// ========================================
(async () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Hikvision DS-K1T8003MF — Fingerprint Diagnostics  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Device: ${ip}:${PORT}`);
  console.log(`║  User:   ${username}`);
  console.log(`║  Employee: ${empNo}`);
  console.log('╚══════════════════════════════════════════════════════╝');

  // Step 1: Test basic connection
  const connected = await testDeviceInfo();
  if (!connected) {
    console.log('\n❌ Cannot connect to device. Check IP, credentials, and network.');
    process.exit(1);
  }

  // Step 2: Check fingerprint capabilities
  await testGetCapabilities();

  // Step 3: List employees (verify employee exists on device)
  await testListEmployees();

  // Step 4-6: Try different FingerPrint/SetUp combinations
  console.log('\n' + '='.repeat(60));
  console.log('  Testing FingerPrint/SetUp endpoint variants...');
  console.log('='.repeat(60));

  const results = {};

  // Test A: POST + enableCardReader: [1]
  results['POST+intArray'] = await testFingerPrintSetup(
    'POST', 'intArray', '4a. POST + enableCardReader: [1]'
  );

  // Test B: PUT + enableCardReader: [1]
  results['PUT+intArray'] = await testFingerPrintSetup(
    'PUT', 'intArray', '4b. PUT + enableCardReader: [1]'
  );

  // Test C: POST + enableCardReader: [{cardReaderNo: 1}]
  results['POST+objectArray'] = await testFingerPrintSetup(
    'POST', 'objectArray', '5a. POST + enableCardReader: [{cardReaderNo: 1}]'
  );

  // Test D: PUT + enableCardReader: [{cardReaderNo: 1}]
  results['PUT+objectArray'] = await testFingerPrintSetup(
    'PUT', 'objectArray', '5b. PUT + enableCardReader: [{cardReaderNo: 1}]'
  );

  // Test E: POST without enableCardReader
  results['POST+noCardReader'] = await testFingerPrintSetup(
    'POST', 'noCardReader', '6a. POST without enableCardReader'
  );

  // Test F: PUT without enableCardReader
  results['PUT+noCardReader'] = await testFingerPrintSetup(
    'PUT', 'noCardReader', '6b. PUT without enableCardReader'
  );

  // Step 7: Test CaptureFingerPrint endpoint
  await testCaptureFingerprint();

  // Step 8: Check fingerprint count
  await testFingerPrintCount();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(60));
  for (const [key, ok] of Object.entries(results)) {
    console.log(`  ${ok ? '✅' : '❌'} ${key}`);
  }

  const working = Object.entries(results).filter(([, ok]) => ok);
  if (working.length > 0) {
    console.log(`\n🎯 Working format(s): ${working.map(([k]) => k).join(', ')}`);
    console.log('   Update hikvisionService.js startFingerprintEnroll() accordingly.');
  } else {
    console.log('\n❌ None of the tested formats worked.');
    console.log('   Possible issues:');
    console.log('   1. Employee not registered on device (add via UserInfo/Record first)');
    console.log('   2. Device locked (wait for unlock or restart device)');
    console.log('   3. Device firmware does not support remote fingerprint enrollment');
    console.log('   4. Max fingerprints reached for this employee');
  }

  // Cleanup dump file if exists
  try {
    const fs = require('fs');
    if (fs.existsSync('docs/isapi-text-dump.txt')) {
      fs.unlinkSync('docs/isapi-text-dump.txt');
    }
  } catch { }
})();
