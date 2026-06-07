const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_FILE = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1];

const STANDARD_FIELDS_TEMPLATE = `action, userId, tenantId, ip, userAgent, method, path`;

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  loggersFixed: 0,
  importsFixed: 0,
  errors: 0
};

/**
 * Generate action name from message
 */
function generateActionName(message) {
  // Remove common prefixes and convert to uppercase with underscores
  let action = message
    .replace(/^(Successfully |Failed to |Error |Unable to )/i, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  // Limit length
  if (action.length > 50) {
    action = action.substring(0, 50);
  }

  return action || 'UNKNOWN_ACTION';
}

/**
 * Fix import statement to include both getClientIp and getUserAgent
 */
function fixImports(content, currentImports) {
  if (currentImports.hasBothImports) {
    return content;
  }

  // Find the requestHelper import line
  const importPattern = /const\s*\{([^}]+)\}\s*=\s*require\(['"]([^'"]*requestHelper)['"]\)/;
  const match = content.match(importPattern);

  if (!match) {
    // No import found, add it at the top after other requires
    const lastRequireMatch = content.match(/(?:const|let|var)\s+.*?=\s+require\([^)]+\);/g);
    if (lastRequireMatch) {
      const lastRequire = lastRequireMatch[lastRequireMatch.length - 1];
      const insertIndex = content.indexOf(lastRequire) + lastRequire.length;
      const newImport = `\nconst { getClientIp, getUserAgent } = require('../../utils/requestHelper');`;
      stats.importsFixed++;
      return content.slice(0, insertIndex) + newImport + content.slice(insertIndex);
    }
    // If no requires found, add at the very top
    const newImport = `const { getClientIp, getUserAgent } = require('../../utils/requestHelper');\n\n`;
    stats.importsFixed++;
    return newImport + content;
  }

  // Update existing import
  const [fullMatch, existingImports, modulePath] = match;
  const imports = existingImports.split(',').map(i => i.trim());
  
  const needsClientIp = !currentImports.hasGetClientIp;
  const needsUserAgent = !currentImports.hasGetUserAgent;

  if (needsClientIp && !imports.includes('getClientIp')) {
    imports.push('getClientIp');
  }
  if (needsUserAgent && !imports.includes('getUserAgent')) {
    imports.push('getUserAgent');
  }

  const newImport = `const { ${imports.join(', ')} } = require('${modulePath}')`;
  stats.importsFixed++;
  return content.replace(fullMatch, newImport);
}

/**
 * Parse logger call to extract components
 */
function parseLoggerCall(content, startIndex) {
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let metaStart = -1;
  let metaEnd = -1;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) {
          metaStart = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          metaEnd = i;
          break;
        }
      }
    }
  }

  if (metaStart === -1 || metaEnd === -1) {
    return null;
  }

  return {
    metaStart,
    metaEnd,
    metaContent: content.substring(metaStart + 1, metaEnd)
  };
}

/**
 * Check if field exists in meta content
 */
function hasField(metaContent, fieldName) {
  const pattern = new RegExp(`\\b${fieldName}\\s*:`, 'i');
  return pattern.test(metaContent);
}

/**
 * Fix a single logger call
 */
function fixLoggerCall(content, match) {
  const [fullMatch, method, message] = match;
  const startIndex = match.index;
  
  const parsed = parseLoggerCall(content, startIndex);
  if (!parsed) {
    if (VERBOSE) {
      console.log(`${colors.yellow}  ⚠ Could not parse logger call${colors.reset}`);
    }
    return content;
  }

  const { metaStart, metaEnd, metaContent } = parsed;

  // Check which fields are missing
  const missingFields = [];
  const requiredFields = ['action', 'userId', 'tenantId', 'ip', 'userAgent', 'method', 'path'];
  
  requiredFields.forEach(field => {
    if (!hasField(metaContent, field)) {
      missingFields.push(field);
    }
  });

  if (missingFields.length === 0) {
    return content; // Already complete
  }

  // Build new fields to add
  const newFields = [];
  
  if (missingFields.includes('action')) {
    const actionName = generateActionName(message);
    newFields.push(`action: '${actionName}'`);
  }
  
  if (missingFields.includes('userId')) {
    newFields.push(`userId: req.user?.id`);
  }
  
  if (missingFields.includes('tenantId')) {
    newFields.push(`tenantId: req.user?.tenantId`);
  }
  
  if (missingFields.includes('ip')) {
    newFields.push(`ip: getClientIp(req)`);
  }
  
  if (missingFields.includes('userAgent')) {
    newFields.push(`userAgent: getUserAgent(req)`);
  }
  
  if (missingFields.includes('method')) {
    newFields.push(`method: req.method`);
  }
  
  if (missingFields.includes('path')) {
    newFields.push(`path: req.path`);
  }

  // Reconstruct meta object with new fields at the beginning
  let newMetaContent = metaContent.trim();
  
  // Remove trailing comma if exists
  newMetaContent = newMetaContent.replace(/,\s*$/, '');
  
  // Add new fields
  const fieldsToAdd = newFields.join(',\n      ');
  
  if (newMetaContent.length > 0) {
    newMetaContent = `\n      ${fieldsToAdd},\n      ${newMetaContent}\n    `;
  } else {
    newMetaContent = `\n      ${fieldsToAdd}\n    `;
  }

  // Replace in content
  const beforeMeta = content.substring(0, metaStart);
  const afterMeta = content.substring(metaEnd + 1);
  const newContent = beforeMeta + '{' + newMetaContent + '}' + afterMeta;

  stats.loggersFixed++;
  return newContent;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check and fix imports first
    const hasGetClientIp = /getClientIp/.test(content);
    const hasGetUserAgent = /getUserAgent/.test(content);
    
    if (!hasGetClientIp || !hasGetUserAgent) {
      content = fixImports(content, { hasGetClientIp, hasGetUserAgent, hasBothImports: hasGetClientIp && hasGetUserAgent });
    }

    // Find and fix all logger calls
    const loggerPattern = /logger\.(logAuth|logAudit|logSecurity|logInfo|logError|logWarn|logSystem)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{/g;
    
    let match;
    const matches = [];
    while ((match = loggerPattern.exec(content)) !== null) {
      matches.push({
        match: match,
        index: match.index
      });
    }

    // Process matches in reverse order to maintain indices
    matches.reverse().forEach(({ match }) => {
      const newContent = fixLoggerCall(content, match);
      if (newContent !== content) {
        content = newContent;
      }
    });

    // Write back if changed
    if (content !== originalContent) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      stats.filesModified++;
      return true;
    }

    return false;
  } catch (err) {
    console.error(`${colors.red}Error processing ${filePath}: ${err.message}${colors.reset}`);
    stats.errors++;
    return false;
  }
}

/**
 * Process results from checker
 */
function processFromCheckerResults() {
  const resultsPath = path.join(__dirname, 'logger-check-results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.log(`${colors.yellow}No checker results found. Run formatLogChecker.js first.${colors.reset}`);
    return [];
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  return results.issues.map(issue => issue.filePath);
}

/**
 * Scan directory for all JS files
 */
function scanDirectory(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', 'coverage', 'logs', 'tests', '.git'].includes(entry.name)) {
        scanDirectory(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║            LOGGER FORMAT FIXER                               ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (DRY_RUN) {
    console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified${colors.reset}\n`);
  }

  const startTime = Date.now();

  // Determine files to process
  let filesToProcess = [];

  if (SPECIFIC_FILE) {
    // Process specific file
    const fullPath = path.resolve(SPECIFIC_FILE);
    if (fs.existsSync(fullPath)) {
      filesToProcess = [fullPath];
      console.log(`${colors.cyan}Processing specific file: ${path.relative(process.cwd(), fullPath)}${colors.reset}\n`);
    } else {
      console.log(`${colors.red}File not found: ${SPECIFIC_FILE}${colors.reset}\n`);
      process.exit(1);
    }
  } else {
    // Use checker results if available, otherwise scan all
    filesToProcess = processFromCheckerResults();
    
    if (filesToProcess.length === 0) {
      console.log(`${colors.cyan}Scanning all controller, service, and util files...${colors.reset}\n`);
      const dirsToScan = [
        path.join(__dirname, 'src', 'controllers'),
        path.join(__dirname, 'src', 'services'),
        path.join(__dirname, 'src', 'utils')
      ];

      dirsToScan.forEach(dir => {
        if (fs.existsSync(dir)) {
          scanDirectory(dir, filesToProcess);
        }
      });
    } else {
      console.log(`${colors.cyan}Processing ${filesToProcess.length} files from checker results...${colors.reset}\n`);
    }
  }

  // Process files
  filesToProcess.forEach((filePath, index) => {
    stats.filesProcessed++;
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (VERBOSE) {
      console.log(`${colors.gray}[${index + 1}/${filesToProcess.length}] ${relativePath}${colors.reset}`);
    }

    const modified = processFile(filePath);
    
    if (modified && !VERBOSE) {
      console.log(`${colors.green}✓${colors.reset} ${relativePath}`);
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${colors.gray}${'─'.repeat(65)}${colors.reset}`);
  console.log(`${colors.bold}📊 SUMMARY:${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}`);
  console.log(`Files processed:         ${colors.white}${stats.filesProcessed}${colors.reset}`);
  console.log(`Files modified:          ${colors.green}${stats.filesModified}${colors.reset}`);
  console.log(`Logger calls fixed:      ${colors.green}${stats.loggersFixed}${colors.reset}`);
  console.log(`Imports fixed:           ${colors.green}${stats.importsFixed}${colors.reset}`);
  if (stats.errors > 0) {
    console.log(`Errors encountered:      ${colors.red}${stats.errors}${colors.reset}`);
  }
  console.log(`Duration:                ${colors.white}${duration}s${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(65)}${colors.reset}\n`);

  if (DRY_RUN) {
    console.log(`${colors.yellow}💡 Run without --dry-run to apply changes${colors.reset}\n`);
  } else if (stats.filesModified > 0) {
    console.log(`${colors.green}✓ Files have been updated!${colors.reset}`);
    console.log(`${colors.cyan}💡 Run formatLogChecker.js again to verify all issues are fixed${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ No changes needed - all logger calls are already complete!${colors.reset}\n`);
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

// Show usage
if (process.argv.includes('--help')) {
  console.log(`
${colors.bold}Logger Format Fixer${colors.reset}

Automatically fixes incomplete logger calls to match the standard format.

${colors.bold}Usage:${colors.reset}
  node formatLogFixer.js [options]

${colors.bold}Options:${colors.reset}
  --dry-run          Show what would be changed without modifying files
  --verbose          Show detailed processing information
  --file=<path>      Process only a specific file
  --help             Show this help message

${colors.bold}Examples:${colors.reset}
  node formatLogFixer.js --dry-run
  node formatLogFixer.js --file=src/controllers/subscription/subscriptionController.js
  node formatLogFixer.js --verbose

${colors.bold}Standard Logger Format:${colors.reset}
  logger.logInfo('Message', {
    action: 'ACTION_NAME',
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    method: req.method,
    path: req.path,
    // ... context-specific fields
  });
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processFile, fixImports, generateActionName };
