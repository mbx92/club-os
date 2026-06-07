/**
 * Test Script for Receipt Template System
 * 
 * Tests end-to-end flow:
 * 1. Create new template
 * 2. Preview template with sample data
 * 3. Update template
 * 4. Test print with template
 * 5. Duplicate template
 * 6. Delete template
 */

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}`, override: true });

const axios = require('axios');

const API_BASE = 'http://localhost:8000/api/v1';
let authToken = '';
let testTemplateId = '';
let testPrinterId = '';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Step 1: Login
async function login() {
  logSection('STEP 1: Login');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@tenant-a.com',
      password: 'password123'
    });
    
    authToken = response.data.data.token;
    logSuccess('Login successful');
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError('Login failed');
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Step 2: Get first printer
async function getPrinter() {
  logSection('STEP 2: Get Printer');
  
  try {
    const response = await axios.get(`${API_BASE}/system/printers`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const printers = response.data.data;
    if (printers.length === 0) {
      logWarning('No printers found. Please create a printer first.');
      return false;
    }
    
    testPrinterId = printers[0].id;
    logSuccess(`Found printer: ${printers[0].name}`);
    logInfo(`Printer ID: ${testPrinterId}`);
    logInfo(`Type: ${printers[0].printerType}`);
    return true;
  } catch (error) {
    logError('Failed to get printers');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 3: Create template
async function createTemplate() {
  logSection('STEP 3: Create Receipt Template');
  
  const templateData = {
    name: 'Test Template - Kasir Utama',
    templateType: 'receipt',
    paperWidth: 48,
    header: {
      showLogo: false,
      showBusinessName: true,
      showBusinessInfo: true,
      customText: 'TERIMA KASIH ATAS KUNJUNGAN ANDA'
    },
    body: {
      showItems: true,
      showItemDetails: true,
      showPrices: true,
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
      customSections: []
    },
    footer: {
      showThankYou: true,
      showDateTime: true,
      customText: 'Barang yang sudah dibeli tidak dapat dikembalikan',
      showQRCode: false
    },
    isActive: true,
    isDefault: false
  };
  
  try {
    const response = await axios.post(
      `${API_BASE}/system/receipt-templates`,
      templateData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    testTemplateId = response.data.data.id;
    logSuccess('Template created successfully');
    logInfo(`Template ID: ${testTemplateId}`);
    logInfo(`Template Name: ${response.data.data.name}`);
    logInfo(`Template Type: ${response.data.data.templateType}`);
    console.log('\nTemplate Data:', JSON.stringify(response.data.data, null, 2));
    return true;
  } catch (error) {
    logError('Failed to create template');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 4: Get all templates
async function getAllTemplates() {
  logSection('STEP 4: Get All Templates');
  
  try {
    const response = await axios.get(`${API_BASE}/system/receipt-templates`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const templates = response.data.data;
    logSuccess(`Found ${templates.length} template(s)`);
    
    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      logInfo(`   ID: ${template.id}`);
      logInfo(`   Type: ${template.templateType}`);
      logInfo(`   Active: ${template.isActive ? 'Yes' : 'No'}`);
      logInfo(`   Default: ${template.isDefault ? 'Yes' : 'No'}`);
    });
    
    return true;
  } catch (error) {
    logError('Failed to get templates');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 5: Preview template
async function previewTemplate() {
  logSection('STEP 5: Preview Template');
  
  const sampleData = {
    businessName: 'GYM MEMBERSHIP TEST',
    businessAddress: 'Jl. Testing No. 123, Jakarta',
    businessPhone: '021-12345678',
    transactionNumber: 'TRX-TEST-001',
    transactionDate: new Date().toISOString(),
    cashierName: 'Admin Test',
    items: [
      {
        name: 'Membership 1 Bulan',
        quantity: 1,
        price: 500000,
        total: 500000
      },
      {
        name: 'Personal Training (5 Sesi)',
        quantity: 1,
        price: 750000,
        total: 750000
      }
    ],
    subtotal: 1250000,
    discount: 50000,
    tax: 120000,
    total: 1320000,
    paymentMethod: 'CASH',
    amountPaid: 1500000,
    change: 180000
  };
  
  try {
    const response = await axios.post(
      `${API_BASE}/system/receipt-templates/${testTemplateId}/preview`,
      { data: sampleData },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logSuccess('Preview generated successfully');
    console.log('\n' + '-'.repeat(60));
    log('PREVIEW OUTPUT:', 'yellow');
    console.log('-'.repeat(60));
    console.log(response.data.data.preview);
    console.log('-'.repeat(60) + '\n');
    
    logInfo(`Raw ESC/POS length: ${response.data.data.raw.length} bytes`);
    
    return true;
  } catch (error) {
    logError('Failed to preview template');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 6: Update template
async function updateTemplate() {
  logSection('STEP 6: Update Template');
  
  const updates = {
    name: 'Test Template - Kasir Utama (Updated)',
    header: {
      showLogo: false,
      showBusinessName: true,
      showBusinessInfo: true,
      customText: '*** SELAMAT BERBELANJA ***'
    }
  };
  
  try {
    const response = await axios.patch(
      `${API_BASE}/system/receipt-templates/${testTemplateId}`,
      updates,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logSuccess('Template updated successfully');
    logInfo(`New Name: ${response.data.data.name}`);
    logInfo(`Custom Header Text: ${response.data.data.header.customText}`);
    return true;
  } catch (error) {
    logError('Failed to update template');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 7: Duplicate template
async function duplicateTemplate() {
  logSection('STEP 7: Duplicate Template');
  
  try {
    const response = await axios.post(
      `${API_BASE}/system/receipt-templates/${testTemplateId}/duplicate`,
      { name: 'Test Template - Copy for Backup' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const duplicateId = response.data.data.id;
    logSuccess('Template duplicated successfully');
    logInfo(`Original ID: ${testTemplateId}`);
    logInfo(`Duplicate ID: ${duplicateId}`);
    logInfo(`Duplicate Name: ${response.data.data.name}`);
    
    // Cleanup: Delete duplicate
    await axios.delete(
      `${API_BASE}/system/receipt-templates/${duplicateId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    logInfo('Duplicate template deleted (cleanup)');
    
    return true;
  } catch (error) {
    logError('Failed to duplicate template');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 8: Test print with template
async function testPrintWithTemplate() {
  logSection('STEP 8: Test Print with Template');
  
  if (!testPrinterId) {
    logWarning('No printer available, skipping test print');
    return true;
  }
  
  try {
    // Update printer settings to use our template
    await axios.patch(
      `${API_BASE}/system/printers/${testPrinterId}`,
      {
        settings: {
          defaultTemplateId: testTemplateId
        }
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logInfo('Printer settings updated with template');
    
    // Execute test print
    const response = await axios.post(
      `${API_BASE}/system/printers/${testPrinterId}/test-print`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logSuccess('Test print executed successfully');
    logInfo(`Job ID: ${response.data.data.jobId}`);
    logInfo(`Status: ${response.data.data.status}`);
    
    if (response.data.data.metadata?.templateId) {
      logInfo(`Template Used: ${response.data.data.metadata.templateName}`);
      logInfo(`Template ID: ${response.data.data.metadata.templateId}`);
    }
    
    return true;
  } catch (error) {
    logError('Failed to test print');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 9: Set as default template
async function setAsDefault() {
  logSection('STEP 9: Set as Default Template');
  
  try {
    const response = await axios.patch(
      `${API_BASE}/system/receipt-templates/${testTemplateId}`,
      { isDefault: true },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logSuccess('Template set as default');
    logInfo(`Template: ${response.data.data.name}`);
    logInfo(`Is Default: ${response.data.data.isDefault}`);
    return true;
  } catch (error) {
    logError('Failed to set as default');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Step 10: Delete template
async function deleteTemplate() {
  logSection('STEP 10: Delete Template (Cleanup)');
  
  const confirmDelete = process.argv.includes('--delete');
  
  if (!confirmDelete) {
    logWarning('Skipping template deletion');
    logInfo('To delete test template, run with --delete flag');
    logInfo(`Template ID to delete manually: ${testTemplateId}`);
    return true;
  }
  
  try {
    await axios.delete(
      `${API_BASE}/system/receipt-templates/${testTemplateId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    logSuccess('Template deleted successfully');
    logInfo(`Deleted Template ID: ${testTemplateId}`);
    return true;
  } catch (error) {
    logError('Failed to delete template');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       RECEIPT TEMPLATE SYSTEM - END-TO-END TEST            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const startTime = Date.now();
  let passedTests = 0;
  let totalTests = 10;
  
  try {
    // Run tests sequentially
    const results = [
      await login(),
      await getPrinter(),
      await createTemplate(),
      await getAllTemplates(),
      await previewTemplate(),
      await updateTemplate(),
      await duplicateTemplate(),
      await testPrintWithTemplate(),
      await setAsDefault(),
      await deleteTemplate()
    ];
    
    passedTests = results.filter(r => r === true).length;
    
    // Summary
    logSection('TEST SUMMARY');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`Total Tests:    ${totalTests}`);
    console.log(`Passed:         ${colors.green}${passedTests}${colors.reset}`);
    console.log(`Failed:         ${colors.red}${totalTests - passedTests}${colors.reset}`);
    console.log(`Pass Rate:      ${passRate}%`);
    console.log(`Duration:       ${duration}s`);
    
    if (passedTests === totalTests) {
      log('\n🎉 All tests passed successfully!', 'green');
    } else {
      log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    }
    
    // Cleanup instructions
    if (testTemplateId && !process.argv.includes('--delete')) {
      logSection('CLEANUP INSTRUCTIONS');
      logWarning('Test template was not deleted automatically');
      logInfo(`To delete: node test-receipt-template.js --delete`);
      logInfo(`Or delete manually via API: DELETE /system/receipt-templates/${testTemplateId}`);
    }
    
  } catch (error) {
    logError('Test execution failed');
    console.error(error);
  }
}

// Run tests
runTests();
