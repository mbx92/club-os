#!/usr/bin/env node
'use strict';

/**
 * Controller Health Check Script
 * 
 * Checks all controllers for common issues:
 * 1. Transaction handling (commit/rollback patterns)
 * 2. Error handling (try-catch blocks)
 * 3. Function signature issues (missing parameters)
 * 4. Async/await patterns
 * 5. Resource cleanup
 * 
 * Usage: node scripts/checkControllersHealth.js [--fix]
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const issues = {
  critical: [],
  warning: [],
  info: []
};

/**
 * Check transaction handling patterns
 */
function checkTransactionHandling(content, filePath) {
  const lines = content.split('\n');
  const problems = [];
  
  // Find all transaction.commit() calls
  const commitLines = [];
  const rollbackLines = [];
  
  lines.forEach((line, index) => {
    if (line.includes('transaction.commit()')) {
      commitLines.push(index + 1);
    }
    if (line.includes('transaction.rollback()')) {
      rollbackLines.push(index + 1);
    }
  });
  
  // Check for unsafe rollback (without checking transaction.finished)
  lines.forEach((line, index) => {
    if (line.includes('await transaction.rollback()')) {
      const prevLines = lines.slice(Math.max(0, index - 3), index).join('\n');
      if (!prevLines.includes('transaction.finished') && !prevLines.includes('!transaction.finished')) {
        problems.push({
          line: index + 1,
          type: 'critical',
          message: 'Unsafe transaction rollback - should check transaction.finished first',
          code: line.trim()
        });
      }
    }
  });
  
  // Check for operations after commit
  commitLines.forEach(commitLine => {
    const afterCommit = lines.slice(commitLine, commitLine + 10);
    const hasOperations = afterCommit.some(line => 
      line.includes('await ') && 
      !line.includes('logger') &&
      !line.includes('res.') &&
      !line.includes('return')
    );
    
    if (hasOperations) {
      problems.push({
        line: commitLine,
        type: 'warning',
        message: 'Async operations after transaction.commit() - may cause rollback errors',
        code: lines[commitLine - 1].trim()
      });
    }
  });
  
  // Check for commit without corresponding rollback in catch
  if (commitLines.length > 0 && rollbackLines.length === 0) {
    problems.push({
      line: commitLines[0],
      type: 'warning',
      message: 'Transaction commit found but no rollback in catch block',
      code: 'Missing error handling'
    });
  }
  
  return problems;
}

/**
 * Check error handling patterns
 */
function checkErrorHandling(content, filePath) {
  const lines = content.split('\n');
  const problems = [];
  
  // Find all async functions
  const asyncFunctions = [];
  lines.forEach((line, index) => {
    if (line.match(/async\s+function\s+\w+/)) {
      asyncFunctions.push({
        line: index + 1,
        name: line.match(/function\s+(\w+)/)?.[1] || 'unknown'
      });
    }
  });
  
  // Check if async functions have try-catch
  asyncFunctions.forEach(func => {
    const funcStartLine = func.line;
    const funcEndLine = lines.findIndex((line, i) => 
      i > funcStartLine && line.match(/^}\s*$/)
    );
    
    if (funcEndLine === -1) return;
    
    const funcBody = lines.slice(funcStartLine, funcEndLine).join('\n');
    
    if (!funcBody.includes('try {') && !funcBody.includes('catch')) {
      problems.push({
        line: func.line,
        type: 'critical',
        message: `Async function '${func.name}' missing try-catch block`,
        code: lines[funcStartLine - 1].trim()
      });
    }
  });
  
  // Check for bare throw without proper error creation
  lines.forEach((line, index) => {
    if (line.includes('throw ') && !line.includes('createError') && !line.includes('new Error')) {
      problems.push({
        line: index + 1,
        type: 'warning',
        message: 'Throwing raw value instead of Error object',
        code: line.trim()
      });
    }
  });
  
  return problems;
}

/**
 * Check for common function signature issues
 */
function checkFunctionSignatures(content, filePath) {
  const lines = content.split('\n');
  const problems = [];
  
  // Check for functions called without required parameters
  const functionCalls = {
    'sendPasswordToMember': { minParams: 3, params: ['member', 'password', 'req'] },
    'sendEmail': { minParams: 2, params: ['to', 'template', 'data'] },
    'logAudit': { minParams: 2, params: ['message', 'data'] }
  };
  
  Object.entries(functionCalls).forEach(([funcName, config]) => {
    const regex = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`, 'g');
    lines.forEach((line, index) => {
      const matches = line.matchAll(regex);
      for (const match of matches) {
        const params = match[1].split(',').filter(p => p.trim());
        if (params.length < config.minParams) {
          problems.push({
            line: index + 1,
            type: 'critical',
            message: `Function '${funcName}' called with ${params.length} params, expected ${config.minParams}: ${config.params.join(', ')}`,
            code: line.trim()
          });
        }
      }
    });
  });
  
  return problems;
}

/**
 * Check for unique constraint handling
 */
function checkUniqueConstraints(content, filePath) {
  const lines = content.split('\n');
  const problems = [];
  
  // Check for Model.create without unique constraint check
  lines.forEach((line, index) => {
    if (line.includes('.create(') && !line.includes('//')) {
      const nextLines = lines.slice(index + 1, index + 20).join('\n');
      const hasCatch = nextLines.includes('catch') || nextLines.includes('try {');
      const hasUniqueCheck = lines.slice(Math.max(0, index - 10), index)
        .some(l => l.includes('findOne') || l.includes('findOrCreate'));
      
      if (!hasUniqueCheck && !hasCatch) {
        problems.push({
          line: index + 1,
          type: 'warning',
          message: 'Model.create() without prior unique check or error handling',
          code: line.trim()
        });
      }
    }
  });
  
  // Check for generateUniqueSequence usage
  lines.forEach((line, index) => {
    if ((line.includes('.code =') || line.includes('code:')) && !line.includes('generateUniqueSequence')) {
      const hasAutoGen = lines.slice(Math.max(0, index - 5), index + 5)
        .some(l => l.includes('generateUniqueSequence') || l.includes('generateCode'));
      
      if (!hasAutoGen && filePath.includes('voucher')) {
        problems.push({
          line: index + 1,
          type: 'warning',
          message: 'Voucher code assignment without generateUniqueSequence - may cause duplicates',
          code: line.trim()
        });
      }
    }
  });
  
  return problems;
}

/**
 * Check for req usage without parameter
 */
function checkReqUsage(content, filePath) {
  const lines = content.split('\n');
  const problems = [];
  
  // Find function definitions
  const functions = [];
  lines.forEach((line, index) => {
    const match = line.match(/(const|function)\s+(\w+)\s*=\s*(async\s*)?\(?([^)]*)\)?/);
    if (match) {
      functions.push({
        name: match[2],
        params: match[4] ? match[4].split(',').map(p => p.trim()) : [],
        startLine: index
      });
    }
  });
  
  // Check if function uses req without having it as parameter
  functions.forEach(func => {
    const funcEndLine = lines.findIndex((line, i) => 
      i > func.startLine + 5 && line.match(/^(}|};)/)
    );
    
    if (funcEndLine === -1) return;
    
    const funcBody = lines.slice(func.startLine, funcEndLine).join('\n');
    const usesReq = funcBody.includes('req.') || funcBody.includes('getClientIp(req)');
    const hasReqParam = func.params.some(p => p.includes('req'));
    
    if (usesReq && !hasReqParam && !func.name.includes('middleware')) {
      problems.push({
        line: func.startLine + 1,
        type: 'critical',
        message: `Function '${func.name}' uses 'req' but doesn't have it as parameter`,
        code: lines[func.startLine].trim()
      });
    }
  });
  
  return problems;
}

/**
 * Scan all controller files
 */
function scanControllers(controllersPath) {
  const results = {};
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('Controller.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(controllersPath, fullPath);
        
        results[relativePath] = {
          path: fullPath,
          problems: {
            transaction: checkTransactionHandling(content, fullPath),
            errorHandling: checkErrorHandling(content, fullPath),
            signatures: checkFunctionSignatures(content, fullPath),
            uniqueConstraints: checkUniqueConstraints(content, fullPath),
            reqUsage: checkReqUsage(content, fullPath)
          }
        };
      }
    });
  }
  
  scanDirectory(controllersPath);
  return results;
}

/**
 * Print report
 */
function printReport(results) {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  CONTROLLER HEALTH CHECK REPORT${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  
  let totalFiles = 0;
  let filesWithIssues = 0;
  let totalCritical = 0;
  let totalWarning = 0;
  let totalInfo = 0;
  
  Object.entries(results).forEach(([file, data]) => {
    totalFiles++;
    const allProblems = [
      ...data.problems.transaction,
      ...data.problems.errorHandling,
      ...data.problems.signatures,
      ...data.problems.uniqueConstraints,
      ...data.problems.reqUsage
    ];
    
    if (allProblems.length === 0) {
      console.log(`${colors.green}✓${colors.reset} ${colors.bold}${file}${colors.reset}`);
      return;
    }
    
    filesWithIssues++;
    console.log(`\n${colors.red}✗${colors.reset} ${colors.bold}${file}${colors.reset}`);
    
    // Group by type
    const critical = allProblems.filter(p => p.type === 'critical');
    const warning = allProblems.filter(p => p.type === 'warning');
    const info = allProblems.filter(p => p.type === 'info');
    
    totalCritical += critical.length;
    totalWarning += warning.length;
    totalInfo += info.length;
    
    if (critical.length > 0) {
      console.log(`\n  ${colors.red}${colors.bold}CRITICAL ISSUES (${critical.length}):${colors.reset}`);
      critical.forEach(problem => {
        console.log(`    ${colors.red}●${colors.reset} Line ${problem.line}: ${problem.message}`);
        console.log(`      ${colors.yellow}${problem.code}${colors.reset}`);
      });
    }
    
    if (warning.length > 0) {
      console.log(`\n  ${colors.yellow}${colors.bold}WARNINGS (${warning.length}):${colors.reset}`);
      warning.forEach(problem => {
        console.log(`    ${colors.yellow}●${colors.reset} Line ${problem.line}: ${problem.message}`);
        console.log(`      ${colors.yellow}${problem.code}${colors.reset}`);
      });
    }
    
    if (info.length > 0) {
      console.log(`\n  ${colors.blue}${colors.bold}INFO (${info.length}):${colors.reset}`);
      info.forEach(problem => {
        console.log(`    ${colors.blue}●${colors.reset} Line ${problem.line}: ${problem.message}`);
      });
    }
  });
  
  // Summary
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`  Total controllers scanned: ${colors.bold}${totalFiles}${colors.reset}`);
  console.log(`  Controllers with issues:   ${colors.bold}${colors.red}${filesWithIssues}${colors.reset}`);
  console.log(`  Clean controllers:         ${colors.bold}${colors.green}${totalFiles - filesWithIssues}${colors.reset}`);
  console.log(`\n  ${colors.red}Critical issues: ${totalCritical}${colors.reset}`);
  console.log(`  ${colors.yellow}Warnings:        ${totalWarning}${colors.reset}`);
  console.log(`  ${colors.blue}Info:            ${totalInfo}${colors.reset}`);
  
  if (totalCritical > 0) {
    console.log(`\n${colors.red}${colors.bold}⚠ CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED${colors.reset}`);
    console.log(`${colors.red}These issues may cause runtime errors or data corruption.${colors.reset}`);
  } else if (totalWarning > 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠ WARNINGS FOUND - REVIEW RECOMMENDED${colors.reset}`);
  } else {
    console.log(`\n${colors.green}${colors.bold}✓ ALL CHECKS PASSED${colors.reset}`);
  }
  
  console.log('');
}

// Main execution
const controllersPath = path.join(__dirname, '../src/controllers');

console.log(`${colors.cyan}Scanning controllers in: ${controllersPath}${colors.reset}`);
console.log(`${colors.cyan}Please wait...${colors.reset}\n`);

try {
  const results = scanControllers(controllersPath);
  printReport(results);
  
  // Exit with error code if critical issues found
  const hasCritical = Object.values(results).some(r => 
    [...r.problems.transaction, ...r.problems.errorHandling, ...r.problems.signatures, ...r.problems.reqUsage]
      .some(p => p.type === 'critical')
  );
  
  process.exit(hasCritical ? 1 : 0);
} catch (error) {
  console.error(`${colors.red}Error scanning controllers: ${error.message}${colors.reset}`);
  process.exit(1);
}
