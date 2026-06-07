#!/usr/bin/env node

/**
 * Hikvision Device Configuration Checker
 *
 * Checks current settings of all Hikvision devices in the database:
 *   - Connectivity
 *   - Device info (model, serial, firmware)
 *   - Current time on device
 *   - NTP configuration
 *   - Event push configuration
 *
 * Usage:
 *   node scripts/checkHikvisionDevices.js
 *   node scripts/checkHikvisionDevices.js --deviceId <uuid>
 *   node scripts/checkHikvisionDevices.js --tenantId <uuid>
 */

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const { DigestClient } = require('digest-fetch');
const { HikvisionDevice, Tenant } = require('../src/models');

const TIMEOUT_MS = 8000;
const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fetchDevice(device, path, method = 'GET') {
  const client = new DigestClient(device.username, device.password, { algorithm: 'MD5' });
  const url = `http://${device.ipAddress}:${device.port}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await client.fetch(url, { method, signal: controller.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, status: null, body: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

// ── XML parser (minimal) ─────────────────────────────────────────────────────

function extractXml(xml, tag) {
  const m = xml?.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
  return m ? m[1].trim() : null;
}

// ── Checks ───────────────────────────────────────────────────────────────────

async function checkDeviceInfo(device) {
  const res = await fetchDevice(device, '/ISAPI/System/deviceInfo');
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` };
  return {
    model: extractXml(res.body, 'model') || extractXml(res.body, 'deviceType'),
    serial: extractXml(res.body, 'serialNumber'),
    firmware: extractXml(res.body, 'firmwareVersion'),
    macAddress: extractXml(res.body, 'macAddress'),
  };
}

async function checkDeviceTime(device) {
  const res = await fetchDevice(device, '/ISAPI/System/time');
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` };
  return {
    timeMode: extractXml(res.body, 'timeMode'),
    localTime: extractXml(res.body, 'localTime'),
    timeZone: extractXml(res.body, 'timeZone'),
    raw: res.body?.substring(0, 400),
  };
}

async function checkNtpConfig(device) {
  const res = await fetchDevice(device, '/ISAPI/System/time/ntpServers');
  if (!res.ok) return { error: res.error || `HTTP ${res.status}`, supported: false };
  return {
    supported: true,
    hostName: extractXml(res.body, 'hostName'),
    portNo: extractXml(res.body, 'portNo'),
    syncInterval: extractXml(res.body, 'synchronizeInterval'),
    raw: res.body?.substring(0, 400),
  };
}

async function checkPushConfig(device) {
  const res = await fetchDevice(device, '/ISAPI/Event/notification/httpHosts');
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` };

  // Try to extract first HTTP host entry
  const url = extractXml(res.body, 'url') || extractXml(res.body, 'ipAddress');
  const protocol = extractXml(res.body, 'protocolType');
  const format = extractXml(res.body, 'parameterFormatType');
  return {
    configured: !!url,
    url,
    protocol,
    format,
    raw: res.body?.substring(0, 400),
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

function ok(v) { return v ? `✅ ${v}` : '❌ (empty)'; }
function warn(v) { return `⚠️  ${v}`; }
function err(v) { return `❌ ${v}`; }

function printSection(title) {
  console.log(`\n  ── ${title} ${'─'.repeat(Math.max(0, 44 - title.length))}`);
}

function printRow(label, value) {
  console.log(`     ${label.padEnd(22)} ${value}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function checkDevice(device, tenantName) {
  const label = `[${device.name}] ${device.ipAddress}:${device.port}`;

  console.log('\n' + '═'.repeat(60));
  console.log(`  Device : ${label}`);
  console.log(`  Tenant : ${tenantName}`);
  console.log(`  ID     : ${device.id}`);
  console.log(`  Active : ${device.isActive ? '✅ Yes' : '❌ No'}`);
  console.log(`  DB push: ${device.pushEnabled ? `✅ enabled → ${device.pushUrl}` : '❌ disabled'}`);
  console.log('═'.repeat(60));

  // ── Device Info ────────────────────────────────────────────────────────────
  printSection('Device Info');
  const info = await checkDeviceInfo(device);
  if (info.error) {
    printRow('Status', err(`Cannot connect — ${info.error}`));
    console.log('\n  ⚠️  Skipping remaining checks (device unreachable)\n');
    return;
  }
  printRow('Model', ok(info.model));
  printRow('Serial', ok(info.serial));
  printRow('Firmware', ok(info.firmware));
  printRow('MAC', ok(info.macAddress));

  // ── Time ───────────────────────────────────────────────────────────────────
  printSection('Time Settings');
  const time = await checkDeviceTime(device);
  if (time.error) {
    printRow('Time', err(time.error));
  } else {
    const modeOk = time.timeMode === 'NTP';
    printRow('timeMode', modeOk ? ok(time.timeMode) : warn(`${time.timeMode} (not NTP — run sync-time)`));
    printRow('localTime', ok(time.localTime));
    printRow('timeZone', time.timeZone === 'CST-8:00:00'
      ? ok(`${time.timeZone} (WITA ✓)`)
      : warn(`${time.timeZone} — expected CST-8:00:00 (WITA)`));

    // Compare device time vs server time
    if (time.localTime) {
      const deviceMs = new Date(time.localTime).getTime();
      const serverMs = Date.now() + 8 * 60 * 60 * 1000; // server UTC → WITA
      const diffSec = Math.round((serverMs - deviceMs) / 1000);
      const diffLabel = Math.abs(diffSec) < 60
        ? `${diffSec}s drift`
        : `${Math.round(diffSec / 60)} min drift`;
      printRow('vs server time', Math.abs(diffSec) <= 30
        ? ok(diffLabel)
        : warn(`${diffLabel} — sync recommended`));
    }
  }

  // ── NTP ────────────────────────────────────────────────────────────────────
  printSection('NTP Configuration');
  const ntp = await checkNtpConfig(device);
  if (!ntp.supported || ntp.error) {
    printRow('NTP API', warn(ntp.error || 'Not supported by this firmware'));
  } else {
    printRow('NTP server', ok(ntp.hostName));
    printRow('NTP port', ok(ntp.portNo));
    printRow('Sync interval', ntp.syncInterval ? ok(`${ntp.syncInterval} min`) : warn('(not set)'));
  }

  // ── Event Push ─────────────────────────────────────────────────────────────
  printSection('Event Push Config');
  const push = await checkPushConfig(device);
  if (push.error) {
    printRow('Push API', warn(push.error));
  } else if (!push.configured) {
    printRow('Push URL', warn('Not configured — device will not send events'));
  } else {
    printRow('Push URL', ok(push.url));
    printRow('Protocol', ok(push.protocol));
    printRow('Format', ok(push.format));
  }

  console.log('');
}

async function main() {
  console.log('\n🔍 Hikvision Device Configuration Check');
  console.log(`   Server time (WITA): ${new Date(Date.now() + 8*60*60*1000).toISOString().replace('T',' ').substring(0,19)}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

  const deviceId = getArg('deviceId');
  const tenantId = getArg('tenantId');

  const where = { deletedAt: null };
  if (deviceId) where.id = deviceId;
  if (tenantId) where.tenantId = tenantId;

  const devices = await HikvisionDevice.findAll({
    where,
    include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  if (devices.length === 0) {
    console.log('⚠️  No devices found in database.');
    process.exit(0);
  }

  console.log(`Found ${devices.length} device(s).\n`);

  for (const device of devices) {
    await checkDevice(device, device.tenant?.name || device.tenantId);
  }

  console.log('Done.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
