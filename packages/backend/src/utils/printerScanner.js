'use strict';

/**
 * Network Printer Scanner Utility
 * 
 * Scans local network for thermal printers using common protocols:
 * - Raw TCP/IP (port 9100 - most thermal printers)
 * - LPD (port 515)
 * - IPP (port 631)
 * - HTTP (port 80 - web interface)
 * 
 * Supports ESC/POS, Star, and other thermal printer protocols.
 * 
 * @module utils/printerScanner
 */

const net = require('net');
const dgram = require('dgram');
const { promisify } = require('util');

/**
 * Common printer ports to scan
 */
const PRINTER_PORTS = {
  raw: 9100,      // Raw TCP/IP (most common for thermal printers)
  lpd: 515,       // Line Printer Daemon
  ipp: 631,       // Internet Printing Protocol
  http: 80        // Web interface (only checked if printer ports found)
};

/**
 * Known printer manufacturer OUI (MAC address prefixes)
 */
const PRINTER_VENDORS = {
  'Epson': ['00:00:48', '00:01:97', '00:26:AB'],
  'Star': ['00:11:62', '00:1C:B0'],
  'Citizen': ['00:07:E9'],
  'Bixolon': ['00:12:2C'],
  'Zebra': ['00:07:4D'],
  'HP': ['00:01:E6', '00:1B:78', '00:1F:29'],
  'Canon': ['00:00:85'],
  'Brother': ['00:80:77']
};

/**
 * Get local network IP range
 */
function getLocalIPRange() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ranges = [];

  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address.split('.');
        const subnet = `${ip[0]}.${ip[1]}.${ip[2]}`;
        ranges.push({
          subnet,
          netmask: iface.netmask,
          cidr: iface.cidr
        });
      }
    }
  }

  return ranges;
}

/**
 * Check if port is open on IP address
 * @param {string} ip IP address
 * @param {number} port Port number
 * @param {number} timeout Timeout in ms
 * @returns {Promise<boolean>}
 */
function checkPort(ip, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

/**
 * Try to identify printer by sending ESC/POS status request
 * @param {string} ip IP address
 * @param {number} port Port number
 * @returns {Promise<object|null>}
 */
function identifyPrinter(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let dataBuffer = Buffer.alloc(0);
    let responseReceived = false;
    
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      // Send multiple ESC/POS identification commands
      // GS I 1 - Printer model
      socket.write(Buffer.from([0x1D, 0x49, 0x01]));
      
      setTimeout(() => {
        // GS I 2 - Type ID
        socket.write(Buffer.from([0x1D, 0x49, 0x02]));
      }, 200);
      
      setTimeout(() => {
        // GS I 67 - Printer ID (some models)
        socket.write(Buffer.from([0x1D, 0x49, 0x43]));
      }, 400);
      
      setTimeout(() => {
        // DLE EOT 1 - Printer status
        socket.write(Buffer.from([0x10, 0x04, 0x01]));
      }, 600);
    });
    
    socket.on('data', (chunk) => {
      responseReceived = true;
      dataBuffer = Buffer.concat([dataBuffer, chunk]);
      
      // Wait for more data
      clearTimeout(socket._closeTimer);
      socket._closeTimer = setTimeout(() => {
        socket.destroy();
        const result = parsePrinterResponse(dataBuffer);
        resolve(result);
      }, 800);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      if (responseReceived && dataBuffer.length > 0) {
        resolve(parsePrinterResponse(dataBuffer));
      } else {
        resolve(null);
      }
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.connect(port, ip);
  });
}

/**
 * Parse printer response to extract model info
 */
function parsePrinterResponse(data) {
  if (!data || data.length === 0) return null;
  
  // Convert buffer to string and hex for analysis
  const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const hexString = bufferData.toString('hex');
  const readable = bufferData.toString('utf8').replace(/[^\x20-\x7E]/g, '').trim();
  const asciiString = bufferData.toString('ascii').replace(/[^\x20-\x7E]/g, '').trim();
  
  // Check if response looks like a printer (has status bytes or model info)
  const hasPrinterStatus = /^[\x00-\x1F]/.test(bufferData.toString('binary'));
  const hasModelInfo = readable.length >= 3 || asciiString.length >= 3;
  
  // If no valid response, likely not a printer
  if (!hasPrinterStatus && !hasModelInfo) {
    return null;
  }
  
  // Use the longer/more readable string
  const modelString = asciiString.length > readable.length ? asciiString : readable;
  
  if (modelString.length < 2) return null;
  
  // Detect manufacturer from response
  let manufacturer = 'Unknown';
  let model = modelString.substring(0, 50);
  
  const upper = readable.toUpperCase();
  if (upper.includes('EPSON') || upper.includes('TM-')) {
    manufacturer = 'Epson';
    model = readable;
  } else if (upper.includes('STAR') || upper.includes('TSP')) {
    manufacturer = 'Star Micronics';
    model = readable;
  } else if (upper.includes('CITIZEN')) {
    manufacturer = 'Citizen';
    model = readable;
  } else if (upper.includes('BIXOLON')) {
    manufacturer = 'Bixolon';
    model = readable;
  } else if (upper.includes('ZEBRA')) {
    manufacturer = 'Zebra';
    model = readable;
  }
  
  return {
    manufacturer,
    model,
    rawResponse: readable
  };
}

/**
 * Scan single IP for printers
 * @param {string} ip IP address
 * @param {boolean} strictMode Only return if ESC/POS identification succeeds
 * @returns {Promise<object|null>}
 */
async function scanIP(ip, strictMode = true) {
  const results = {
    ip,
    ports: {},
    printerInfo: null
  };
  
  // Check printer-specific ports first (raw, lpd, ipp)
  const printerPorts = ['raw', 'lpd', 'ipp'];
  const hasPrinterPort = [];
  
  for (const protocol of printerPorts) {
    const port = PRINTER_PORTS[protocol];
    const isOpen = await checkPort(ip, port, 800);
    if (isOpen) {
      results.ports[protocol] = port;
      hasPrinterPort.push(protocol);
      
      // Try to identify printer on raw port
      if (protocol === 'raw' && !results.printerInfo) {
        const info = await identifyPrinter(ip, port);
        if (info) {
          results.printerInfo = info;
        }
      }
    }
  }
  
  // In strict mode, filter out devices that don't respond to ESC/POS
  // This removes virtual servers and other non-printer devices
  if (strictMode && hasPrinterPort.includes('raw') && !results.printerInfo) {
    // Has port 9100 open but doesn't respond to ESC/POS = likely not a printer
    return null;
  }
  
  // Only check HTTP port if printer-specific ports are found
  // (This filters out routers, cameras, and other HTTP devices)
  if (hasPrinterPort.length > 0) {
    const httpPort = PRINTER_PORTS.http;
    const isHttpOpen = await checkPort(ip, httpPort, 800);
    if (isHttpOpen) {
      results.ports.http = httpPort;
    }
  }
  
  // Return only if at least one printer port is open
  if (hasPrinterPort.length > 0) {
    return results;
  }
  
  return null;
}

/**
 * Scan network range for printers
 * @param {string} subnet Network subnet (e.g., "192.168.1")
 * @param {number} startIP Start IP (e.g., 1)
 * @param {number} endIP End IP (e.g., 254)
 * @param {function} onProgress Progress callback
 * @returns {Promise<array>}
 */
async function scanNetwork(subnet, startIP = 1, endIP = 254, onProgress = null) {
  const found = [];
  const total = endIP - startIP + 1;
  let scanned = 0;
  
  console.log(`🔍 Scanning ${subnet}.${startIP}-${endIP} for printers...`);
  
  // Scan in batches to avoid overwhelming network
  const batchSize = 20;
  
  for (let i = startIP; i <= endIP; i += batchSize) {
    const batch = [];
    const end = Math.min(i + batchSize - 1, endIP);
    
    // Create batch of scan promises
    for (let j = i; j <= end; j++) {
      const ip = `${subnet}.${j}`;
      batch.push(scanIP(ip));
    }
    
    // Wait for batch to complete
    const results = await Promise.all(batch);
    
    // Collect found printers
    results.forEach(result => {
      if (result) {
        found.push(result);
        console.log(`✅ Found printer at ${result.ip}:`, result.printerInfo?.model || 'Unknown model');
      }
    });
    
    scanned += batch.length;
    
    if (onProgress) {
      onProgress({
        scanned,
        total,
        found: found.length,
        percentage: Math.round((scanned / total) * 100)
      });
    }
  }
  
  return found;
}

/**
 * Auto-detect printers on local network
 * Scans all local network interfaces
 * @param {function} onProgress Progress callback
 * @returns {Promise<array>}
 */
async function autoDetectPrinters(onProgress = null) {
  const ranges = getLocalIPRange();
  const allFound = [];
  
  console.log(`🌐 Found ${ranges.length} local network interface(s)`);
  
  for (const range of ranges) {
    console.log(`📡 Scanning ${range.subnet}.0/24 (${range.cidr})`);
    
    const found = await scanNetwork(range.subnet, 1, 254, onProgress);
    allFound.push(...found);
  }
  
  return allFound;
}

/**
 * Quick scan (common IPs only)
 * Scans typical printer IPs: .100-.110, .200-.210, .250-.254
 * @param {string} subnet Network subnet (optional, auto-detect if not provided)
 * @returns {Promise<array>}
 */
async function quickScan(subnet = null) {
  const commonRanges = [
    { start: 100, end: 110 },  // Common static IPs
    { start: 200, end: 210 },  // Common printer range
    { start: 250, end: 254 }   // Router range
  ];
  
  const found = [];
  
  // Auto-detect subnet if not provided
  if (!subnet) {
    const ranges = getLocalIPRange();
    if (ranges.length === 0) {
      console.log('❌ No network interfaces found');
      return [];
    }
    
    // Scan all local subnets
    for (const range of ranges) {
      console.log(`📡 Quick scanning ${range.subnet}.0/24`);
      
      for (const ipRange of commonRanges) {
        const results = await scanNetwork(range.subnet, ipRange.start, ipRange.end);
        found.push(...results);
      }
    }
  } else {
    // Scan specific subnet
    for (const range of commonRanges) {
      const results = await scanNetwork(subnet, range.start, range.end);
      found.push(...results);
    }
  }
  
  return found;
}

/**
 * Verify printer connection
 * @param {string} ip IP address
 * @param {number} port Port number
 * @param {boolean} requireResponse Require printer info response (strict mode)
 * @returns {Promise<object>}
 */
async function verifyPrinter(ip, port = 9100, requireResponse = false) {
  const startTime = Date.now();
  const isReachable = await checkPort(ip, port, 2000);
  
  if (!isReachable) {
    return {
      isValid: false,
      success: false,
      message: 'Printer not reachable',
      ip,
      port,
      manufacturer: null,
      model: null,
      protocol: null,
      responseTime: Date.now() - startTime
    };
  }
  
  const info = await identifyPrinter(ip, port);
  const responseTime = Date.now() - startTime;
  
  // If requireResponse is true, printer must respond with identification
  if (requireResponse && !info) {
    return {
      isValid: false,
      success: false,
      message: 'Printer reachable but not responding to ESC/POS commands',
      ip,
      port,
      manufacturer: null,
      model: null,
      protocol: null,
      responseTime
    };
  }
  
  return {
    isValid: true,
    success: true,
    message: 'Printer is online',
    ip,
    port,
    manufacturer: info?.manufacturer || null,
    model: info?.model || null,
    protocol: 'ESC/POS',
    printerInfo: info,
    connectionString: `${ip}:${port}`,
    responseTime
  };
}

/**
 * Get printer capabilities (paper sizes, etc)
 * @param {string} ip IP address
 * @param {number} port Port number
 * @returns {Promise<object>}
 */
async function getPrinterCapabilities(ip, port = 9100) {
  // This would require ESC/POS commands specific to each printer
  // For now, return common capabilities
  return {
    paperWidths: ['58mm', '80mm'],
    drivers: ['escpos'],
    features: {
      autoCut: true,
      cashDrawer: true,
      barcodes: true,
      qrCodes: true
    }
  };
}

module.exports = {
  scanNetwork,
  autoDetectPrinters,
  quickScan,
  scanIP,
  verifyPrinter,
  checkPort,
  getPrinterCapabilities,
  getLocalIPRange,
  PRINTER_PORTS
};
