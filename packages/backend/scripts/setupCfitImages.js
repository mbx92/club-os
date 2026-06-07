/**
 * Setup CFIT Images
 * 
 * Copy CFIT test images from docs/soalPsikolog to public directory
 * for serving via static file endpoint.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../docs/soalPsikolog/CFIT Staterpack');
const TARGET_DIR = path.join(__dirname, '../public/psychology/cfit');

// Mapping direktori source ke target
const SUBTEST_MAPPING = {
  'Subtes 1': 'subtes1',
  'Subtes 2': 'subtes2',
  'Subtes 3': 'subtes3',
  'Subtes 4': 'subtes4'
};

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
}

function copyFile(source, target) {
  try {
    fs.copyFileSync(source, target);
    return true;
  } catch (error) {
    console.error(`✗ Failed to copy ${source}:`, error.message);
    return false;
  }
}

function setupCfitImages() {
  console.log('Setting up CFIT images...\n');
  
  // Check if source exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`✗ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }
  
  // Create target base directory
  ensureDirectoryExists(TARGET_DIR);
  
  let totalCopied = 0;
  let totalFailed = 0;
  
  // Process each subtest
  Object.entries(SUBTEST_MAPPING).forEach(([sourceSubtest, targetSubtest]) => {
    const sourceSubtestDir = path.join(SOURCE_DIR, sourceSubtest);
    const targetSubtestDir = path.join(TARGET_DIR, targetSubtest);
    
    if (!fs.existsSync(sourceSubtestDir)) {
      console.warn(`⚠ Source subtest not found: ${sourceSubtestDir}`);
      return;
    }
    
    // Create subtest directory
    ensureDirectoryExists(targetSubtestDir);
    
    // Create contoh (examples) subdirectory
    const targetContohDir = path.join(targetSubtestDir, 'contoh');
    ensureDirectoryExists(targetContohDir);
    
    // Read all files in source subtest
    const files = fs.readdirSync(sourceSubtestDir);
    
    files.forEach(file => {
      if (!file.toLowerCase().endsWith('.png')) return;
      
      const sourcePath = path.join(sourceSubtestDir, file);
      let targetPath;
      
      // Check if it's a contoh (example) file
      if (file.toLowerCase().startsWith('contoh')) {
        // Contoh 1.png → contoh-1.png
        const cleanName = file.toLowerCase()
          .replace('contoh ', 'contoh-')
          .replace(/\s+/g, '-');
        targetPath = path.join(targetContohDir, cleanName);
      } else {
        // Regular question file: 1.png, 2.png, etc.
        targetPath = path.join(targetSubtestDir, file.toLowerCase());
      }
      
      if (copyFile(sourcePath, targetPath)) {
        totalCopied++;
        console.log(`  ✓ ${sourceSubtest}/${file} → ${path.relative(TARGET_DIR, targetPath)}`);
      } else {
        totalFailed++;
      }
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary:`);
  console.log(`  Total copied: ${totalCopied}`);
  console.log(`  Total failed: ${totalFailed}`);
  console.log(`  Target directory: ${TARGET_DIR}`);
  console.log('='.repeat(60));
  
  if (totalCopied > 0) {
    console.log('\n✓ CFIT images setup completed successfully!');
    console.log('\nImages will be accessible at:');
    console.log('  /psychology/cfit/subtes1/1.png');
    console.log('  /psychology/cfit/subtes1/contoh/contoh-1.png');
    console.log('  ...');
  }
}

// Run
setupCfitImages();
