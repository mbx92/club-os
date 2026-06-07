#!/usr/bin/env node
/**
 * Test Printer Health Stream
 * 
 * Usage:
 *   node test-health-stream.js <printerId> <jwtToken>
 * 
 * Example:
 *   node test-health-stream.js abc-123-def Bearer_eyJhbGc...
 */

const http = require('http');

const printerId = process.argv[2];
const jwtToken = process.argv[3];

if (!printerId || !jwtToken) {
  console.error('❌ Usage: node test-health-stream.js <printerId> <jwtToken>');
  process.exit(1);
}

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/v1/system/printers/${printerId}/stream/health`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

console.log('🏥 Connecting to printer health stream...');
console.log(`📡 URL: http://${options.hostname}:${options.port}${options.path}`);
console.log('⏳ Waiting for health updates (press Ctrl+C to stop)...\n');

const req = http.request(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
    process.exit(1);
  }

  console.log(`✅ Health stream connected (Status: ${res.statusCode})\n`);

  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk.toString();
    
    // Process complete messages (ends with \n\n)
    const messages = buffer.split('\n\n');
    buffer = messages.pop();

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

  if (data.type === 'health') {
    const statusEmoji = getHealthEmoji(data.healthStatus);
    const connectionEmoji = data.isConnected ? '🟢' : '🔴';
    
    console.log('═'.repeat(60));
    console.log(`[${timestamp}] ${statusEmoji} Health Check`);
    console.log('═'.repeat(60));
    console.log(`Printer: ${data.printerName} (${data.printerId})`);
    console.log(`Health Status: ${data.healthStatus.toUpperCase()}`);
    console.log(`Message: ${data.healthMessage}`);
    console.log(`Connection: ${connectionEmoji} ${data.isConnected ? 'ONLINE' : 'OFFLINE'}`);
    
    if (data.consecutiveFailures > 0) {
      console.log(`⚠️  Consecutive Failures: ${data.consecutiveFailures}`);
    }
    
    if (data.lastSuccessfulPrint) {
      const lastPrint = new Date(data.lastSuccessfulPrint);
      const minutesAgo = Math.floor((Date.now() - lastPrint) / 1000 / 60);
      console.log(`✅ Last Success: ${minutesAgo} minutes ago`);
    }
    
    console.log('\n📊 Statistics:');
    console.log(`   Total Jobs: ${data.statistics.total}`);
    console.log(`   Completed: ${data.statistics.completed}`);
    console.log(`   Failed: ${data.statistics.failed}`);
    console.log(`   Pending: ${data.statistics.pending}`);
    console.log(`   Success Rate: ${data.statistics.successRate}%`);
    
    if (data.statistics.avgDuration) {
      console.log(`   Avg Duration: ${data.statistics.avgDuration}ms`);
    }
    
    if (data.stuckJobsCount > 0) {
      console.log(`\n⚠️  Stuck Jobs: ${data.stuckJobsCount}`);
      console.log(`   Oldest: ${data.oldestStuckJobAge} minutes`);
      
      console.log('\n   Details:');
      data.stuckJobs.forEach((job, idx) => {
        console.log(`   ${idx + 1}. ${job.jobType} - ${job.status} (${job.ageMinutes} min, ${job.attempts} attempts)`);
      });
    }
    
    console.log('');
  }
}

function getHealthEmoji(status) {
  switch (status) {
    case 'healthy': return '🟢';
    case 'degraded': return '🟡';
    case 'unhealthy': return '🔴';
    default: return '⚪';
  }
}
