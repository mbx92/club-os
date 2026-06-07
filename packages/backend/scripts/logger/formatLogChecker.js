const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Standard logger format requirements
const REQUIRED_FIELDS = {
  base: ['action', 'userId', 'tenantId', 'ip'],
  request: ['userAgent', 'method', 'path']
};

const ALL_REQUIRED_FIELDS = [...REQUIRED_FIELDS.base, ...REQUIRED_FIELDS.request];

// Logger methods to check
const LOGGER_METHODS = [
  'logAuth',
  'logAudit', 
  'logSecurity',
  'logInfo',
  'logError',
  'logWarn',
  'logSystem'
];

// Statistics
let stats = {
  totalFiles: 0,
  filesWithLoggers: 0,
  totalLoggers: 0,
  completeLoggers: 0,
  incompleteLoggers: 0,
  byMissingField: {
    action: 0,
    userId: 0,
    tenantId: 0,
    ip: 0,
    userAgent: 0,
    method: 0,
    path: 0
  }
};

// Store issues for detailed report
const issues = [];

/**
 * Extract logger calls from file content
 */
function extractLoggerCalls(content, filePath) {
  const loggerCalls = [];
  const loggerPattern = new RegExp(
    `logger\\.(${LOGGER_METHODS.join('|')})\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]\\s*,\\s*\\{([^}]+(?:\\{[^}]*\\}[^}]*)*)\\}\\s*\\)`,
    'gs'
  );

  let match;
  while ((match = loggerPattern.exec(content)) !== null) {
    const [fullMatch, method, message, metaContent] = match;
    const startPos = match.index;
    
    // Calculate line number
    const beforeMatch = content.substring(0, startPos);
    const lineNumber = beforeMatch.split('\n').length;

    // Extract fields from meta object
    const fields = extractFields(metaContent);
    
    // Check which required fields are missing
    const missingFields = ALL_REQUIRED_FIELDS.filter(field => !fields.includes(field));
    
    loggerCalls.push({
      method,
      message,
      lineNumber,
      fields,
      missingFields,
      isComplete: missingFields.length === 0,
      metaContent: metaContent.trim()
    });
  }

  return loggerCalls;
}

/**
 * Extract field names from meta object content
 */
function extractFields(metaContent) {
  const fieldPattern = /(\w+)\s*:/g;
  const fields = [];
  let match;
  
  while ((match = fieldPattern.exec(metaContent)) !== null) {
    fields.push(match[1]);
  }
  
  return [...new Set(fields)]; // Remove duplicates
}

/**
 * Check if file has required imports
 */
function checkImports(content) {
  const hasGetClientIp = /getClientIp/.test(content);
  const hasGetUserAgent = /getUserAgent/.test(content);
  const importLine = content.match(/require\(['"].*requestHelper['"]\)/);
  
  return {
    hasGetClientIp,
    hasGetUserAgent,
    hasBothImports: hasGetClientIp && hasGetUserAgent,
    importLine: importLine ? importLine[0] : null
  };
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const loggerCalls = extractLoggerCalls(content, filePath);
    
    if (loggerCalls.length === 0) {
      return null;
    }

    const imports = checkImports(content);
    const incompleteLoggers = loggerCalls.filter(call => !call.isComplete);
    
    stats.filesWithLoggers++;
    stats.totalLoggers += loggerCalls.length;
    stats.completeLoggers += loggerCalls.filter(call => call.isComplete).length;
    stats.incompleteLoggers += incompleteLoggers.length;

    // Count missing fields
    incompleteLoggers.forEach(call => {
      call.missingFields.forEach(field => {
        stats.byMissingField[field]++;
      });
    });

    if (incompleteLoggers.length > 0 || !imports.hasBothImports) {
      issues.push({
        filePath,
        loggerCalls,
        incompleteLoggers,
        imports
      });
    }

    return {
      filePath,
      loggerCalls,
      incompleteLoggers,
      imports
    };
  } catch (err) {
    console.error(`${colors.red}Error reading ${filePath}: ${err.message}${colors.reset}`);
    return null;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath, results = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, coverage, logs, etc.
      if (!['node_modules', 'coverage', 'logs', 'tests', '.git'].includes(entry.name)) {
        scanDirectory(fullPath, results);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      stats.totalFiles++;
      const result = scanFile(fullPath);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Print detailed report
 */
function printReport(results) {
  console.log(`\n${colors.bold}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║         LOGGER FORMAT CHECKER - DETAILED REPORT              ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // Summary statistics
  console.log(`${colors.bold}📊 SUMMARY:${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}`);
  console.log(`Total files scanned:        ${colors.white}${stats.totalFiles}${colors.reset}`);
  console.log(`Files with logger calls:    ${colors.white}${stats.filesWithLoggers}${colors.reset}`);
  console.log(`Total logger calls:         ${colors.white}${stats.totalLoggers}${colors.reset}`);
  console.log(`Complete logger calls:      ${colors.green}${stats.completeLoggers}${colors.reset}`);
  console.log(`Incomplete logger calls:    ${colors.red}${stats.incompleteLoggers}${colors.reset}`);
  
  if (stats.totalLoggers > 0) {
    const completionRate = ((stats.completeLoggers / stats.totalLoggers) * 100).toFixed(1);
    const color = completionRate >= 80 ? colors.green : completionRate >= 50 ? colors.yellow : colors.red;
    console.log(`Completion rate:            ${color}${completionRate}%${colors.reset}`);
  }

  // Missing fields breakdown
  console.log(`\n${colors.bold}🔍 MISSING FIELDS BREAKDOWN:${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}`);
  Object.entries(stats.byMissingField).forEach(([field, count]) => {
    if (count > 0) {
      console.log(`${field.padEnd(20)} ${colors.red}${count} logger calls${colors.reset}`);
    }
  });

  // Detailed issues
  if (issues.length > 0) {
    console.log(`\n${colors.bold}⚠️  ISSUES FOUND IN ${issues.length} FILES:${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}\n`);

    issues.forEach((issue, index) => {
      const relativePath = path.relative(process.cwd(), issue.filePath);
      console.log(`${colors.bold}${index + 1}. ${colors.yellow}${relativePath}${colors.reset}`);

      // Import status
      if (!issue.imports.hasBothImports) {
        console.log(`   ${colors.red}✗${colors.reset} Missing imports:`);
        if (!issue.imports.hasGetClientIp) {
          console.log(`     - getClientIp`);
        }
        if (!issue.imports.hasGetUserAgent) {
          console.log(`     - getUserAgent`);
        }
        if (issue.imports.importLine) {
          console.log(`     Current: ${colors.gray}${issue.imports.importLine}${colors.reset}`);
        }
      }

      // Logger issues
      console.log(`   ${colors.white}Logger calls: ${issue.loggerCalls.length} total, ${colors.red}${issue.incompleteLoggers.length} incomplete${colors.reset}`);
      
      issue.incompleteLoggers.forEach(call => {
        console.log(`   ${colors.gray}Line ${call.lineNumber}:${colors.reset} logger.${call.method}('${call.message}')`);
        console.log(`     ${colors.red}Missing:${colors.reset} ${call.missingFields.join(', ')}`);
        console.log(`     ${colors.gray}Has:${colors.reset} ${call.fields.join(', ')}`);
      });

      console.log('');
    });
  }

  // Final recommendation
  console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}`);
  if (stats.incompleteLoggers > 0) {
    console.log(`\n${colors.bold}${colors.yellow}💡 RECOMMENDATION:${colors.reset}`);
    console.log(`   Run ${colors.cyan}node formatLogFixer.js${colors.reset} to automatically fix these issues.`);
    console.log(`   Or update manually using ${colors.cyan}docs/LOGGER-STANDARD-FORMAT.md${colors.reset} as reference.\n`);
  } else {
    console.log(`\n${colors.bold}${colors.green}✓ All logger calls are complete!${colors.reset}\n`);
  }
}

/**
 * Export results to JSON for fixer script
 */
function exportResults(results) {
  const exportData = {
    timestamp: new Date().toISOString(),
    stats,
    issues: issues.map(issue => ({
      filePath: issue.filePath,
      imports: issue.imports,
      incompleteLoggers: issue.incompleteLoggers.map(call => ({
        lineNumber: call.lineNumber,
        method: call.method,
        message: call.message,
        missingFields: call.missingFields
      }))
    }))
  };

  fs.writeFileSync(
    path.join(__dirname, 'logger-check-results.json'),
    JSON.stringify(exportData, null, 2)
  );

  console.log(`${colors.gray}Results exported to: logger-check-results.json${colors.reset}`);
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}Scanning for logger format issues...${colors.reset}\n`);

  const startTime = Date.now();
  
  // Scan controllers, services, and utils
  const dirsToScan = [
    path.join(__dirname, 'src', 'controllers'),
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'utils')
  ];

  const results = [];
  dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir, results);
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print report
  printReport(results);

  // Export results for fixer
  if (issues.length > 0) {
    exportResults(results);
  }

  console.log(`${colors.gray}Scan completed in ${duration}s${colors.reset}\n`);

  // Exit with error code if issues found
  process.exit(stats.incompleteLoggers > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scanFile, extractLoggerCalls, checkImports };
