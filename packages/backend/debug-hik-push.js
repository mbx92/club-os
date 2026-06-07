/**
 * Debug script: test configure push directly against DS-K1T8003
 * Usage: node debug-hik-push.js
 */
'use strict';

const { DigestClient } = require('digest-fetch');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const DEVICE_IP   = process.env.DEVICE_IP   || '192.168.1.23';
const DEVICE_PORT = process.env.DEVICE_PORT || 80;
const USERNAME    = process.env.DEVICE_USER || 'admin';
const PASSWORD    = process.env.DEVICE_PASS || 'Admin1234';

const SERVER_URL  = 'http://192.168.1.3:3000/api/v1/integrations/hikvision/event';
// ────────────────────────────────────────────────────────────────────────────

const u = new URL(SERVER_URL);
const parsedPath = u.pathname + (u.search || '');
const parsedPort = u.port ? parseInt(u.port, 10) : 80;
const ip         = u.hostname;
const ns         = 'http://www.isapi.org/ver20/XMLSchema';

const BASE_URL = `http://${DEVICE_IP}:${DEVICE_PORT}`;
const mkClient = () => new DigestClient(USERNAME, PASSWORD, { algorithm: 'MD5' });

const VARIANTS = [
  {
    // Key insight: device returns parameterFormatType=XML, not JSON. And entry 1 is missing <userName>.
    label: 'A — HTTP + XML format + userName + password (full fields)',
    endpoint: '/ISAPI/Event/notification/httpHosts',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>2</id>',
      '<url></url>',
      '<protocolType></protocolType>',
      '<parameterFormatType></parameterFormatType>',
      '<addressingFormatType></addressingFormatType>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\r\n'),
  },
  {
    label: 'B — HTTP + XML format + userName (no password)',
    endpoint: '/ISAPI/Event/notification/httpHosts',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>2</id>',
      '<url></url>',
      '<protocolType></protocolType>',
      '<parameterFormatType></parameterFormatType>',
      '<addressingFormatType></addressingFormatType>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\r\n'),
  },
  {
    label: 'C — HTTP + XML + userName + password + SubscribeEvent on id=1 too',
    endpoint: '/ISAPI/Event/notification/httpHosts',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>2</id>',
      '<url></url>',
      '<protocolType></protocolType>',
      '<parameterFormatType></parameterFormatType>',
      '<addressingFormatType></addressingFormatType>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\r\n'),
  },
  {
    label: 'D — PUT /httpHosts/1 single + XML format + userName + password',
    endpoint: '/ISAPI/Event/notification/httpHosts/1',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
    ].join('\r\n'),
  },
  {
    label: 'E — HTTP + JSON format + userName + password (JSON+missing fields test)',
    endpoint: '/ISAPI/Event/notification/httpHosts',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>HTTP</protocolType>',
      '<parameterFormatType>JSON</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>2</id>',
      '<url></url>',
      '<protocolType></protocolType>',
      '<parameterFormatType></parameterFormatType>',
      '<addressingFormatType></addressingFormatType>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\r\n'),
  },
  {
    label: 'F — EHome protocol + XML format + userName + password (device native)',
    endpoint: '/ISAPI/Event/notification/httpHosts',
    xml: [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<HttpHostNotificationList version="2.0" xmlns="${ns}">`,
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>1</id>',
      `<url>${parsedPath}</url>`,
      '<protocolType>EHome</protocolType>',
      '<parameterFormatType>XML</parameterFormatType>',
      '<addressingFormatType>ipaddress</addressingFormatType>',
      `<ipAddress>${ip}</ipAddress>`,
      `<portNo>${parsedPort}</portNo>`,
      '<userName></userName>',
      '<password></password>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '</HttpHostNotification>',
      `<HttpHostNotification version="2.0" xmlns="${ns}">`,
      '<id>2</id>',
      '<url></url>',
      '<protocolType></protocolType>',
      '<parameterFormatType></parameterFormatType>',
      '<addressingFormatType></addressingFormatType>',
      '<portNo>0</portNo>',
      '<userName></userName>',
      '<httpAuthenticationMethod>none</httpAuthenticationMethod>',
      '<SubscribeEvent>',
      '<eventMode>all</eventMode>',
      '</SubscribeEvent>',
      '</HttpHostNotification>',
      '</HttpHostNotificationList>',
    ].join('\r\n'),
  },
];

async function doRequest(method, endpoint, body, contentType) {
  // Fresh DigestClient per request (Hikvision nonce is single-use)
  const client = mkClient();
  const resp = await client.fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': contentType || 'application/xml',
      Accept: 'application/json, text/xml, */*',
    },
    body,
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

async function main() {
  console.log(`\n=== DS-K1T8003 Push Config Debug ===`);
  console.log(`Device:     ${BASE_URL}`);
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Path: ${parsedPath}  Port: ${parsedPort}  IP: ${ip}\n`);

  // ── Step 0: GET current config ──────────────────────────────────────────
  console.log('--- GET current config ---');
  let rawDeviceXml = null;
  try {
    const get = await doRequest('GET', '/ISAPI/Event/notification/httpHosts', undefined, 'application/xml');
    console.log(`Status: ${get.status}`);
    console.log(get.text);
    rawDeviceXml = get.text;
  } catch (err) {
    console.log(`GET error: ${err.message}`);
  }
  console.log('');

  // ── Step 1: Mirror PUT (use device's own XML, fill empty fields + inject missing ones) ─
  if (rawDeviceXml && rawDeviceXml.includes('<id>1</id>')) {
    let mirrorXml = rawDeviceXml
      .replace(/<url><\/url>/, `<url>${parsedPath}</url>`)
      .replace(/<protocolType>EHome<\/protocolType>/, '<protocolType>HTTP</protocolType>')
      .replace(/<protocolType><\/protocolType>/, '<protocolType>HTTP</protocolType>')
      .replace(/<parameterFormatType>XML<\/parameterFormatType>/, '<parameterFormatType>XML</parameterFormatType>')
      .replace(/<parameterFormatType><\/parameterFormatType>/, '<parameterFormatType>XML</parameterFormatType>')
      .replace(/<addressingFormatType><\/addressingFormatType>/, '<addressingFormatType>ipaddress</addressingFormatType>')
      .replace(/<ipAddress><\/ipAddress>/, `<ipAddress>${ip}</ipAddress>`)
      .replace(/<portNo><\/portNo>/, `<portNo>${parsedPort}</portNo>`);

    // Inject <userName> and <password> into entry id=1 if missing (before </HttpHostNotification>)
    // Find first </HttpHostNotification> occurrence (entry id=1)
    const firstEnd = mirrorXml.indexOf('</HttpHostNotification>');
    if (firstEnd !== -1) {
      const beforeEnd = mirrorXml.substring(0, firstEnd);
      // Only inject if not already present in entry id=1
      let inject = '';
      if (!beforeEnd.includes('<userName>')) inject += '<userName></userName>\r\n';
      if (!beforeEnd.includes('<password>')) inject += '<password></password>\r\n';
      if (inject) {
        mirrorXml = mirrorXml.substring(0, firstEnd) + inject + mirrorXml.substring(firstEnd);
      }
    }

    console.log('--- PUT Variant MIRROR: exact device XML with fields filled ---');
    console.log('XML sent:');
    console.log(mirrorXml);
    console.log('');
    try {
      const result = await doRequest('PUT', '/ISAPI/Event/notification/httpHosts', mirrorXml, 'application/xml');
      console.log(`Status: ${result.status} | OK: ${result.ok}`);
      console.log(`Response: ${result.text}`);
      if (result.ok) {
        console.log('\n✅ SUCCESS with MIRROR variant\n');
        const verify = await doRequest('GET', '/ISAPI/Event/notification/httpHosts', undefined, 'application/xml');
        console.log('--- GET after success ---\n' + verify.text);
        return;
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
    console.log('');
  }

  // ── Step 2: Try all static variants ─────────────────────────────────────
  for (let i = 0; i < VARIANTS.length; i++) {
    const v = VARIANTS[i];
    const label = String.fromCharCode(65 + i);
    console.log(`--- PUT Variant ${label}: ${v.label} ---`);
    console.log('XML sent:');
    console.log(v.xml);
    console.log('');
    try {
      const result = await doRequest('PUT', v.endpoint, v.xml, v.contentType || 'application/xml');
      console.log(`Status: ${result.status} | OK: ${result.ok}`);
      console.log(`Response: ${result.text.substring(0, 400)}`);
      if (result.ok) {
        console.log(`\n✅ SUCCESS with variant ${label}\n`);
        const verify = await doRequest('GET', '/ISAPI/Event/notification/httpHosts', undefined, 'application/xml');
        console.log('--- GET after success ---\n' + verify.text);
        return;
      }
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
    console.log('');
  }

  console.log('\n❌ ALL variants failed.\n');
}

main().catch(console.error);
