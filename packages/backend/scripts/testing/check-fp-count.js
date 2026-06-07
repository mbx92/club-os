#!/usr/bin/env node
'use strict';

/**
 * Check fingerprint counts for specific employees on the Hikvision device.
 * 
 * Tests both:
 *   1. /FingerPrint/Search — dedicated FP search endpoint
 *   2. /UserInfo/Search — numOfFP field per employee
 * 
 * Usage:
 *   node scripts/testing/check-fp-count.js
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.development' });

const { Sequelize } = require('sequelize');
const { DigestClient } = require('digest-fetch');

const TIMEOUT_MS = 10_000;
const EMPLOYEE_NOS = ['1', '1002', '1003'];

async function fetchWithTimeout(client, url, options = {}, timeoutMs = TIMEOUT_MS) {
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

async function main() {
  // 1. Get device from DB
  const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  const [devices] = await seq.query('SELECT id, name, "ipAddress", port, username, password FROM "HikvisionDevices" WHERE "isActive" = true ORDER BY port ASC LIMIT 1');
  
  if (!devices.length) {
    console.log('No active Hikvision devices found in database.');
    await seq.close();
    return;
  }

  const device = devices[0];
  console.log(`\nDevice: ${device.name} (${device.ipAddress}:${device.port})`);
  console.log(`Target employees: ${EMPLOYEE_NOS.join(', ')}\n`);

  // Also check DB DeviceEmployee records
  console.log('=== DB DeviceEmployee Records ===');
  const [dbRecords] = await seq.query(
    `SELECT "employeeNo", "hasFingerprint", "fingerprintCount", "status", "lastSyncAt" 
     FROM "DeviceEmployees" 
     WHERE "deviceId" = :deviceId AND "employeeNo" IN (:empNos)
     ORDER BY "employeeNo"`,
    { replacements: { deviceId: device.id, empNos: EMPLOYEE_NOS } }
  );
  
  if (dbRecords.length) {
    for (const rec of dbRecords) {
      console.log(`  Employee ${rec.employeeNo}: hasFingerprint=${rec.hasFingerprint}, fpCount=${rec.fingerprintCount}, status=${rec.status}, lastSync=${rec.lastSyncAt}`);
    }
  } else {
    console.log('  No DeviceEmployee records found for these employee numbers.');
  }

  await seq.close();

  const BASE = `http://${device.ipAddress}:${device.port}`;

  // 2. Test /UserInfo/Search (numOfFP field)
  console.log('\n=== UserInfo/Search (numOfFP) ===');
  try {
    const client1 = new DigestClient(device.username, device.password, { algorithm: 'MD5' });
    const r1 = await fetchWithTimeout(client1, `${BASE}/ISAPI/AccessControl/UserInfo/Search?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        UserInfoSearchCond: {
          searchID: `test_${Date.now()}`,
          searchResultPosition: 0,
          maxResults: 100,
        },
      }),
    });

    const data1 = await r1.json();
    const users = data1?.UserInfoSearch?.UserInfo || [];
    
    console.log(`  Total employees on device: ${users.length}`);
    console.log(`  Response numOfMatches: ${data1?.UserInfoSearch?.numOfMatches}`);
    
    const targetUsers = users.filter(u => EMPLOYEE_NOS.includes(String(u.employeeNo)));
    
    for (const u of targetUsers) {
      console.log(`  Employee ${u.employeeNo}: name="${u.name}", numOfFP=${u.numOfFP}, numOfCard=${u.numOfCard}, numOfFace=${u.numOfFace}`);
    }

    // Show all employees if targets not found
    if (targetUsers.length === 0) {
      console.log('  (Target employees not found. All employees on device:)');
      for (const u of users) {
        console.log(`    Employee ${u.employeeNo}: name="${u.name}", numOfFP=${u.numOfFP}`);
      }
    }

    // Log raw first employee for structure understanding
    if (users.length > 0) {
      console.log('\n  Raw first employee object keys:', Object.keys(users[0]).join(', '));
      console.log('  Raw first employee:', JSON.stringify(users[0]).substring(0, 400));
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }

  // 3. Test /FingerPrint/Search (all FPs)
  console.log('\n=== FingerPrint/Search (all) ===');
  try {
    const client2 = new DigestClient(device.username, device.password, { algorithm: 'MD5' });
    const r2 = await fetchWithTimeout(client2, `${BASE}/ISAPI/AccessControl/FingerPrint/Search?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        FingerPrintCond: {
          searchID: `fp_test_${Date.now()}`,
          searchResultPosition: 0,
          maxResults: 100,
        },
      }),
    });

    console.log(`  HTTP Status: ${r2.status} ${r2.ok ? 'OK' : 'FAIL'}`);

    const rawText = await r2.text();
    console.log(`  Raw response (first 600 chars):`);
    console.log(`  ${rawText.substring(0, 600)}`);

    try {
      const data2 = JSON.parse(rawText);
      console.log(`\n  Top-level keys: ${Object.keys(data2).join(', ')}`);
      
      const search = data2?.FingerPrintSearch || data2?.FingerPrintList;
      if (search) {
        console.log(`  Search result keys: ${Object.keys(search).join(', ')}`);
        console.log(`  numOfMatches: ${search.numOfMatches}`);
        console.log(`  totalMatches: ${search.totalMatches}`);
        
        const fpList = search?.FingerPrintInfo || search?.fingerPrintInfo || [];
        console.log(`  FingerPrintInfo count: ${fpList.length}`);
        
        // Count per employee
        const countMap = {};
        for (const fp of fpList) {
          const no = String(fp.employeeNo);
          countMap[no] = (countMap[no] || 0) + 1;
        }
        
        console.log(`\n  FP counts per employee:`);
        for (const [empNo, count] of Object.entries(countMap)) {
          const isTarget = EMPLOYEE_NOS.includes(empNo) ? ' <<<' : '';
          console.log(`    Employee ${empNo}: ${count} fingerprint(s)${isTarget}`);
        }
        
        // Show raw first FP record
        if (fpList.length > 0) {
          console.log(`\n  Raw first FP record keys: ${Object.keys(fpList[0]).join(', ')}`);
        }
      } else {
        console.log('  No FingerPrintSearch or FingerPrintList key found');
      }
    } catch {
      console.log('  (Response is not valid JSON)');
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }

  // 4. Test /FingerPrint/Search per employee
  console.log('\n=== FingerPrint/Search (per employee) ===');
  for (const empNo of EMPLOYEE_NOS) {
    try {
      const client3 = new DigestClient(device.username, device.password, { algorithm: 'MD5' });
      const r3 = await fetchWithTimeout(client3, `${BASE}/ISAPI/AccessControl/FingerPrint/Search?format=json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          FingerPrintCond: {
            searchID: `fp_emp_${Date.now()}`,
            employeeNo: empNo,
            searchResultPosition: 0,
            maxResults: 10,
          },
        }),
      });

      const rawText = await r3.text();
      let fpCount = 0;
      try {
        const data3 = JSON.parse(rawText);
        const search = data3?.FingerPrintSearch || data3?.FingerPrintList;
        const fpList = search?.FingerPrintInfo || search?.fingerPrintInfo || [];
        fpCount = Array.isArray(fpList) ? fpList.length : 0;
        console.log(`  Employee ${empNo}: HTTP ${r3.status}, FP records=${fpCount}, numOfMatches=${search?.numOfMatches || 'N/A'}`);
      } catch {
        console.log(`  Employee ${empNo}: HTTP ${r3.status}, Raw: ${rawText.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`  Employee ${empNo}: ERROR ${e.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);
