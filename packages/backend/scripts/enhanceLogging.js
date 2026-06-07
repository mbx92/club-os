/**
 * Script to enhance logging statements across the codebase
 * Adds IP, userId, action information to logger calls where missing
 */

const fs = require('fs');
const path = require('path');

// Pattern to match logger calls
const loggerPattern = /logger\.(logInfo|logError|logSecurity|logAudit|logAuth|logWarn|logSystem)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+)\}/g;

function enhanceLoggingInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;
  
  // Check if file has req parameter (is a controller/middleware)
  const hasReqParam = content.includes('(req, res') || content.includes('(req,res');
  
  if (!hasReqParam) {
    return { modified: false, reason: 'No req parameter found (not a controller/middleware)' };
  }
  
  const matches = [...content.matchAll(loggerPattern)];
  
  for (const match of matches) {
    const fullMatch = match[0];
    const logLevel = match[1];
    const message = match[2];
    const metaContent = match[3];
    
    // Check if already has IP
    if (metaContent.includes('ip:') || metaContent.includes('getClientIp')) {
      continue;
    }
    
    // Check if already has userId
    const hasUserId = metaContent.includes('userId:');
    
    // Check if already has action
    const hasAction = metaContent.includes('action:');
    
    // Build enhanced meta
    let enhancements = [];
    
    if (!hasAction) {
      // Generate action from message
      const action = message
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');
      enhancements.push(`action: '${action}'`);
    }
    
    if (!hasUserId && (logLevel === 'logInfo' || logLevel === 'logAudit' || logLevel === 'logSecurity')) {
      enhancements.push('userId: req.user?.id');
    }
    
    // Add IP
    enhancements.push('ip: getClientIp(req)');
    
    if (enhancements.length > 0) {
      const enhancedMeta = metaContent.trim() + ',\n      ' + enhancements.join(',\n      ');
      const enhancedLog = `logger.${logLevel}('${message}', {${enhancedMeta}}`;
      
      newContent = newContent.replace(fullMatch, enhancedLog);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return { modified: true, count: matches.length };
  }
  
  return { modified: false, reason: 'All logs already enhanced or no logs found' };
}

// Find all JS files in controllers and services
function findFiles(dir, pattern = /\.(js)$/) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, pattern));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Main execution
console.log('🔧 Enhancing logging statements...\n');

const controllersDir = path.join(__dirname, '..', 'src', 'controllers');
const servicesDir = path.join(__dirname, '..', 'src', 'services');

const controllerFiles = findFiles(controllersDir);
const serviceFiles = findFiles(servicesDir);

let totalModified = 0;
let totalSkipped = 0;

console.log('📁 Processing Controllers...');
for (const file of controllerFiles) {
  try {
    const result = enhanceLoggingInFile(file);
    const fileName = path.relative(process.cwd(), file);
    
    if (result.modified) {
      console.log(`  ✓ ${fileName} - Enhanced ${result.count} log statements`);
      totalModified++;
    } else {
      console.log(`  ○ ${fileName} - ${result.reason}`);
      totalSkipped++;
    }
  } catch (error) {
    console.error(`  ✗ ${file} - Error: ${error.message}`);
  }
}

console.log('\n📁 Processing Services...');
for (const file of serviceFiles) {
  try {
    const result = enhanceLoggingInFile(file);
    const fileName = path.relative(process.cwd(), file);
    
    if (result.modified) {
      console.log(`  ✓ ${fileName} - Enhanced ${result.count} log statements`);
      totalModified++;
    } else {
      console.log(`  ○ ${fileName} - ${result.reason}`);
      totalSkipped++;
    }
  } catch (error) {
    console.error(`  ✗ ${file} - Error: ${error.message}`);
  }
}

console.log(`\n✅ Complete!`);
console.log(`   Modified: ${totalModified} files`);
console.log(`   Skipped: ${totalSkipped} files`);
console.log('\n💡 Next steps:');
console.log('   1. Review the changes');
console.log('   2. Test the application');
console.log('   3. Check log outputs');
