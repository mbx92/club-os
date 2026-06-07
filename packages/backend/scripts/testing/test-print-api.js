#!/usr/bin/env node
/**
 * Test Print API Utility
 * 
 * Test thermal printer via REST API with authentication.
 * Usage: node test-print-api.js [printerId]
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Demo credentials - replace with your actual credentials
const CREDENTIALS = {
  username: 'superadmin',
  password: 'superadmin123'
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-print-api/1.0.0'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Login and get token
 */
async function login() {
  console.log('🔐 Logging in...');
  
  const response = await makeRequest('POST', '/auth/login', CREDENTIALS);
  
  if (response.statusCode !== 200) {
    throw new Error(`Login failed: ${response.body?.message || 'Unknown error'}`);
  }
  
  const token = response.body?.data?.token;
  if (!token) {
    throw new Error('No token in response');
  }
  
  console.log('✅ Login successful');
  return token;
}

/**
 * Get all printers
 */
async function listPrinters(token) {
  console.log('\n📋 Fetching printers...');
  
  const response = await makeRequest('GET', '/system/printers', null, token);
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to list printers: ${response.body?.message || 'Unknown error'}`);
  }
  
  const printers = response.body?.data || [];
  
  console.log(`\nFound ${printers.length} printer(s):\n`);
  
  printers.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.name}`);
    console.log(`     ID: ${p.id}`);
    console.log(`     Type: ${p.printerType}`);
    console.log(`     Connection: ${p.connectionType}`);
    if (p.ipAddress) {
      console.log(`     IP: ${p.ipAddress}:${p.port || 9100}`);
    }
    console.log(`     Active: ${p.isActive ? '✓' : '✗'}`);
    console.log(`     Default: ${p.isDefault ? '✓' : '✗'}`);
    console.log('');
  });
  
  return printers;
}

/**
 * Test print to printer
 */
async function testPrint(token, printerId) {
  console.log(`\n🖨️  Sending test print to printer: ${printerId}`);
  
  const response = await makeRequest(
    'POST',
    `/system/printers/${printerId}/test-print`,
    {
      metadata: {
        source: 'test-print-api',
        description: 'Test print via REST API'
      }
    },
    token
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Test print failed: ${response.body?.message || 'Unknown error'}`);
  }
  
  const result = response.body?.data;
  
  console.log('\n✅ Test print successful!');
  console.log(`   Job ID: ${result.jobId}`);
  console.log(`   Printer: ${result.printer.name}`);
  console.log(`   Model: ${result.printer.model || 'Unknown'}`);
  console.log(`   IP: ${result.printer.ipAddress}:${result.printer.port}`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Duration: ${result.duration}ms`);
  console.log(`   Timestamp: ${result.timestamp}`);
  
  return result;
}

/**
 * Get printer jobs
 */
async function getPrinterJobs(token, printerId, limit = 10) {
  console.log(`\n📄 Fetching recent jobs for printer: ${printerId}`);
  
  const response = await makeRequest(
    'GET',
    `/system/printers/${printerId}/jobs?limit=${limit}`,
    null,
    token
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get jobs: ${response.body?.message || 'Unknown error'}`);
  }
  
  const result = response.body?.data;
  const jobs = result?.jobs || [];
  
  console.log(`\nTotal jobs: ${result.total}`);
  console.log(`Recent ${jobs.length} jobs:\n`);
  
  jobs.forEach((job, idx) => {
    console.log(`  ${idx + 1}. Job #${job.id.substring(0, 8)}...`);
    console.log(`     Type: ${job.jobType}`);
    console.log(`     Status: ${job.status}`);
    console.log(`     Created: ${job.createdAt}`);
    if (job.completedAt) {
      console.log(`     Completed: ${job.completedAt}`);
    }
    if (job.duration) {
      console.log(`     Duration: ${job.duration}ms`);
    }
    if (job.errorMessage) {
      console.log(`     Error: ${job.errorMessage}`);
    }
    console.log('');
  });
  
  return result;
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  console.log(`
🖨️  Test Print API Utility

Usage:
  node test-print-api.js list                    # List all printers
  node test-print-api.js test <printerId>        # Test print to printer
  node test-print-api.js jobs <printerId>        # View recent jobs

Examples:
  node test-print-api.js list
  node test-print-api.js test a0746034-832f-44c8-9eb6-01005078c6e7
  node test-print-api.js jobs a0746034-832f-44c8-9eb6-01005078c6e7

Configuration:
  Edit CREDENTIALS in this file to use your login details.
  Default: superadmin / superadmin123
  `);
  process.exit(0);
}

// Execute
(async () => {
  try {
    const token = await login();
    
    if (command === 'list') {
      await listPrinters(token);
      
    } else if (command === 'test') {
      const printerId = args[1];
      if (!printerId) {
        console.error('❌ Please provide printer ID');
        console.log('   Usage: node test-print-api.js test <printerId>');
        process.exit(1);
      }
      
      await testPrint(token, printerId);
      await getPrinterJobs(token, printerId, 5);
      
    } else if (command === 'jobs') {
      const printerId = args[1];
      if (!printerId) {
        console.error('❌ Please provide printer ID');
        console.log('   Usage: node test-print-api.js jobs <printerId>');
        process.exit(1);
      }
      
      await getPrinterJobs(token, printerId);
      
    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.log('   Use --help to see available commands');
      process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
})();
