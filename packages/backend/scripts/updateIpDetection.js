/**
 * Script to update IP detection across all controller and middleware files
 * Replaces old pattern (req.ip || req.connection.remoteAddress) with getClientIp(req)
 */

const fs = require('fs');
const path = require('path');

// Files to update (based on grep search results)
const filesToUpdate = [
  'src/controllers/gym/member/memberController.js',
  'src/controllers/subscription/subscriptionController.js',
  'src/controllers/gym/payment/paymentController.js',
  'src/controllers/auth/authController.js',
  'src/controllers/tenant/tenantController.js',
  'src/controllers/user/userController.js',
  // Add more files as needed
];

const oldPattern = /req\.ip \|\| req\.connection\.remoteAddress/g;
const newPattern = 'getClientIp(req)';

const importStatement = "const { getClientIp } = require('../utils/requestHelper');";

function updateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if file needs update
  if (!oldPattern.test(content)) {
    console.log(`✓ ${filePath} - Already updated or no old pattern found`);
    return;
  }

  // Check if import already exists
  const hasImport = content.includes("getClientIp") && content.includes("requestHelper");
  
  if (!hasImport) {
    // Find the last require statement to insert after it
    const requireRegex = /const .+ = require\(.+\);/g;
    const matches = content.match(requireRegex);
    
    if (matches && matches.length > 0) {
      const lastRequire = matches[matches.length - 1];
      const insertPosition = content.indexOf(lastRequire) + lastRequire.length;
      content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
    } else {
      // No require statements found, add at top after any comments
      const firstLine = content.split('\n')[0];
      if (firstLine.startsWith('//') || firstLine.startsWith('/*')) {
        // Find end of comment block
        let insertPos = 0;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*') && lines[i].trim() !== '') {
            insertPos = lines.slice(0, i).join('\n').length;
            break;
          }
        }
        content = content.slice(0, insertPos) + '\n' + importStatement + '\n' + content.slice(insertPos);
      } else {
        content = importStatement + '\n\n' + content;
      }
    }
  }

  // Replace all occurrences
  const originalContent = content;
  content = content.replace(oldPattern, newPattern);

  const matchCount = (originalContent.match(oldPattern) || []).length;

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ ${filePath} - Updated ${matchCount} occurrence(s)`);
  } else {
    console.log(`⚠️  ${filePath} - No changes made`);
  }
}

console.log('🔧 Starting IP detection update...\n');

filesToUpdate.forEach(file => {
  try {
    updateFile(file);
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log('\n✅ IP detection update complete!');
console.log('\nNote: Review the changes and test thoroughly before committing.');
