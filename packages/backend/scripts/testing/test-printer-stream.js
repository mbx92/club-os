#!/usr/bin/env node
/**
 * Test Printer Connection Stream
 * 
 * Usage:
 *   node test-printer-stream.js <printerId> <jwtToken>
 * 
 * Example:
 *   node test-printer-stream.js abc-123-def Bearer_eyJhbGc...
 */

const http = require('http');

const printerId = process.argv[2];
const jwtToken = process.argv[3];

if (!printerId || !jwtToken) {
  console.error('❌ Usage: node test-printer-stream.js <printerId> <jwtToken>');
  process.exit(1);
}

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/v1/system/printers/${printerId}/stream/connection`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

console.log('🔌 Connecting to printer stream...');
console.log(`📡 URL: http://${options.hostname}:${options.port}${options.path}`);
console.log('⏳ Waiting for events (press Ctrl+C to stop)...\n');

const req = http.request(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
    process.exit(1);
  }

  console.log(`✅ Stream connected (Status: ${res.statusCode})\n`);

  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk.toString();
    
    // Process complete messages (ends with \n\n)
    const messages = buffer.split('\n\n');
    buffer = messages.pop(); // Keep incomplete message in buffer

    messages.forEach(message => {
      if (message.startsWith('data: ')) {
        const data = message.substring(6);
        try {
          const json = JSON.parse(data);
          handleEvent(json);
        } catch (err) {
          console.error('❌ Parse error:', err.message);
        }
      }
    });
  });

  res.on('end', () => {
    console.log('\n🔌 Stream closed by server');
    process.exit(0);
  });

  res.on('error', (err) => {
    console.error('❌ Stream error:', err.message);
    process.exit(1);
  });
});

req.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

req.end();

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Closing connection...');
  req.destroy();
  process.exit(0);
});

function handleEvent(data) {
  const timestamp = new Date().toLocaleTimeString();

  if (data.type === 'connected') {
    console.log(`[${timestamp}] 🟢 ${data.message}\n`);
  }

  if (data.type === 'status') {
    const emoji = data.status === 'online' ? '🟢' : '🔴';
    console.log(`[${timestamp}] ${emoji} Printer: ${data.printerName}`);
    console.log(`           Status: ${data.status.toUpperCase()}`);
    
    if (data.status === 'online') {
      console.log(`           Latency: ${data.latency}ms`);
    } else {
      console.log(`           Error: ${data.error}`);
    }
    console.log('');
  }
}
