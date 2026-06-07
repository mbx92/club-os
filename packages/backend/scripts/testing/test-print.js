#!/usr/bin/env node
/**
 * Test Print Utility
 * 
 * Test thermal printer dengan sample receipt.
 * Usage: node test-print.js [printerId]
 */

const net = require('net');

// ESC/POS Commands
const ESC = '\x1b';
const GS = '\x1d';

const INIT = `${ESC}@`;
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const ALIGN_RIGHT = `${ESC}a\x02`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const DOUBLE_SIZE_ON = `${GS}!\x30`;
const NORMAL_SIZE = `${GS}!\x00`;
const LINE_FEED = '\n';
const CUT_PAPER = `${GS}V\x00`;
const FEED_AND_CUT = `${GS}V\x41\x03`;

/**
 * Build test receipt content
 */
function buildTestReceipt() {
  let content = '';
  
  // Initialize
  content += INIT;
  
  // Header
  content += ALIGN_CENTER;
  content += DOUBLE_SIZE_ON;
  content += 'TEST PRINT' + LINE_FEED;
  content += NORMAL_SIZE;
  content += LINE_FEED;
  
  // Gym info
  content += BOLD_ON + 'GYM MEMBERSHIP SYSTEM' + BOLD_OFF + LINE_FEED;
  content += 'Jl. Sehat No.1, Jakarta' + LINE_FEED;
  content += 'Telp: 0812-3456-7890' + LINE_FEED;
  content += LINE_FEED;
  
  // Separator
  content += ALIGN_LEFT;
  content += '='.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  // Test info
  content += BOLD_ON + 'TEST INFORMATION' + BOLD_OFF + LINE_FEED;
  content += padLine('Date', new Date().toLocaleString('id-ID'), 48) + LINE_FEED;
  content += padLine('Type', 'Connection Test', 48) + LINE_FEED;
  content += padLine('Status', 'SUCCESS', 48) + LINE_FEED;
  content += LINE_FEED;
  
  // Sample items
  content += '-'.repeat(48) + LINE_FEED;
  content += BOLD_ON + 'SAMPLE ITEMS' + BOLD_OFF + LINE_FEED;
  content += '-'.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  content += '1x Membership Gold (3 Bulan)' + LINE_FEED;
  content += padLine('', 'Rp 1.500.000', 48) + LINE_FEED;
  content += LINE_FEED;
  
  content += '2x PT Session (12 Sesi)' + LINE_FEED;
  content += padLine('', 'Rp 2.400.000', 48) + LINE_FEED;
  content += LINE_FEED;
  
  // Total
  content += '-'.repeat(48) + LINE_FEED;
  content += BOLD_ON;
  content += padLine('TOTAL', 'Rp 3.900.000', 48) + LINE_FEED;
  content += BOLD_OFF;
  content += '='.repeat(48) + LINE_FEED;
  content += LINE_FEED;
  
  // Footer
  content += ALIGN_CENTER;
  content += 'Terima kasih atas kunjungan Anda' + LINE_FEED;
  content += 'Stay healthy!' + LINE_FEED;
  content += LINE_FEED;
  content += 'Printer Test - ' + new Date().toLocaleTimeString() + LINE_FEED;
  content += LINE_FEED;
  content += LINE_FEED;
  content += LINE_FEED;
  
  // Cut paper
  content += FEED_AND_CUT;
  
  return content;
}

/**
 * Pad line for receipt alignment
 */
function padLine(left, right, width = 48) {
  const padding = width - left.length - right.length;
  if (padding < 1) return `${left} ${right}`;
  return `${left}${' '.repeat(padding)}${right}`;
}

/**
 * Send to printer via TCP socket
 */
function sendToPrinter(ipAddress, port, content) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds
    
    socket.setTimeout(timeout);
    
    socket.connect(port, ipAddress, () => {
      console.log(`✅ Connected to printer at ${ipAddress}:${port}`);
      
      // Send data
      socket.write(content, (err) => {
        if (err) {
          console.error('❌ Error writing to printer:', err.message);
          socket.destroy();
          reject(err);
        } else {
          console.log(`📄 Data sent: ${content.length} bytes`);
          
          // Wait a bit for printer to process
          setTimeout(() => {
            socket.end();
            resolve({ success: true, bytes: content.length });
          }, 1000);
        }
      });
    });
    
    socket.on('error', (err) => {
      console.error('❌ Socket error:', err.message);
      reject(err);
    });
    
    socket.on('timeout', () => {
      console.error('❌ Socket timeout');
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
    
    socket.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

/**
 * Test print with database lookup
 */
async function testPrintWithDB(printerId) {
  try {
    const { Tenant } = require('./src/models');
    
    console.log(`🔍 Looking up printer: ${printerId}`);
    
    // Get all tenants with printers
    const tenants = await Tenant.findAll({
      where: {
        settings: {
          printers: {
            $ne: null
          }
        }
      }
    });
    
    let printer = null;
    let tenant = null;
    
    // Find printer
    for (const t of tenants) {
      const printers = t.settings?.printers || [];
      const found = printers.find(p => p.id === printerId || p.name.includes(printerId));
      if (found) {
        printer = found;
        tenant = t;
        break;
      }
    }
    
    if (!printer) {
      console.error('❌ Printer not found');
      console.log('\n📋 Available printers:');
      
      for (const t of tenants) {
        const printers = t.settings?.printers || [];
        if (printers.length > 0) {
          console.log(`\n  Tenant: ${t.name}`);
          printers.forEach(p => {
            console.log(`    - ${p.name} (${p.id})`);
            console.log(`      IP: ${p.ipAddress}:${p.port || 9100}`);
            console.log(`      Type: ${p.printerType}`);
            console.log(`      Active: ${p.isActive ? '✓' : '✗'}`);
          });
        }
      }
      return;
    }
    
    if (!printer.isActive) {
      console.warn('⚠️  Printer is not active!');
    }
    
    if (printer.connectionType !== 'network') {
      console.error('❌ Only network printers supported');
      console.log(`   Printer type: ${printer.connectionType}`);
      return;
    }
    
    console.log(`\n📋 Printer Details:`);
    console.log(`   Name: ${printer.name}`);
    console.log(`   Tenant: ${tenant.name}`);
    console.log(`   Type: ${printer.printerType}`);
    console.log(`   IP: ${printer.ipAddress}:${printer.port || 9100}`);
    console.log(`   Model: ${printer.model || 'Unknown'}`);
    console.log(`   Active: ${printer.isActive ? '✓' : '✗'}`);
    
    console.log(`\n🖨️  Building test receipt...`);
    const receiptContent = buildTestReceipt();
    
    console.log(`\n📡 Sending to printer...`);
    const result = await sendToPrinter(
      printer.ipAddress,
      printer.port || 9100,
      receiptContent
    );
    
    console.log(`\n✅ Test print successful!`);
    console.log(`   Bytes sent: ${result.bytes}`);
    
  } catch (error) {
    console.error('❌ Test print failed:', error.message);
    throw error;
  }
}

/**
 * Test print with manual IP
 */
async function testPrintManual(ipAddress, port = 9100) {
  console.log(`\n🖨️  Building test receipt...`);
  const receiptContent = buildTestReceipt();
  
  console.log(`\n📡 Sending to printer at ${ipAddress}:${port}...`);
  const result = await sendToPrinter(ipAddress, port, receiptContent);
  
  console.log(`\n✅ Test print successful!`);
  console.log(`   Bytes sent: ${result.bytes}`);
}

/**
 * List all available printers
 */
async function listPrinters() {
  try {
    const { Tenant } = require('./src/models');
    
    console.log('📋 Available Printers:\n');
    
    const tenants = await Tenant.findAll();
    let count = 0;
    
    for (const tenant of tenants) {
      const printers = tenant.settings?.printers || [];
      if (printers.length > 0) {
        console.log(`Tenant: ${tenant.name} (${tenant.id})`);
        printers.forEach((p, idx) => {
          count++;
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
      }
    }
    
    if (count === 0) {
      console.log('No printers found in database.');
    } else {
      console.log(`Total: ${count} printer(s)`);
    }
    
  } catch (error) {
    console.error('❌ Error listing printers:', error.message);
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
🖨️  Thermal Printer Test Utility

Usage:
  node test-print.js list                    # List all printers
  node test-print.js <printerId>             # Test with printer ID or name
  node test-print.js <ipAddress> [port]      # Test with IP address

Examples:
  node test-print.js list
  node test-print.js abc-123-def-456
  node test-print.js "Receipt Printer"
  node test-print.js 192.168.1.100
  node test-print.js 192.168.1.100 9100
  `);
  process.exit(0);
}

// Execute
(async () => {
  try {
    if (command === 'list') {
      await listPrinters();
    } else if (command.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // IP address format
      const ipAddress = command;
      const port = parseInt(args[1]) || 9100;
      await testPrintManual(ipAddress, port);
    } else {
      // Printer ID or name
      await testPrintWithDB(command);
    }
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
})();
