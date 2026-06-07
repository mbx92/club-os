/**
 * Test TypeTest Import/Export with Question Count
 * 
 * This script tests the import/export functionality for psychology test types,
 * specifically verifying that questionCount is calculated correctly.
 * 
 * Run: node scripts/testing/test-typetest-import-export.js
 */

require('dotenv').config({ path: '.env.development' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const TEST_FILE = 'CFIT_v1.5.json';

// Test credentials (adjust based on your test data)
const TEST_USER = {
  email: 'admin@test.com',
  password: 'password123'
};

let authToken = null;
let testTypeId = null;

/**
 * Step 1: Login
 */
async function login() {
  try {
    console.log('🔐 Step 1: Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ Login successful\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 2: Import test type from JSON file
 */
async function importTestType() {
  try {
    console.log('📥 Step 2: Importing test type from file...');
    
    const filepath = path.join(process.cwd(), 'public/psychology/export', TEST_FILE);
    
    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${filepath}`);
      return false;
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/psychology/test-types/import?filename=${TEST_FILE}&overwrite=true`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    testTypeId = response.data.data.id;
    
    console.log('✅ Import successful:');
    console.log(`   - ID: ${response.data.data.id}`);
    console.log(`   - Code: ${response.data.data.code}`);
    console.log(`   - Name: ${response.data.data.name}`);
    console.log(`   - Question Count: ${response.data.data.questionCount}`);
    console.log(`   - Instruction Count: ${response.data.data.instructionCount}`);
    console.log(`   - Total Items: ${response.data.data.totalItems}`);
    console.log(`   - Breakdown:`, response.data.data.breakdown);
    console.log();
    
    return true;
  } catch (error) {
    console.error('❌ Import failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 3: Get test type by ID to verify
 */
async function getTestType() {
  try {
    console.log('🔍 Step 3: Getting test type to verify...');
    
    const response = await axios.get(
      `${API_BASE_URL}/psychology/test-types/${testTypeId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    const testType = response.data.data;
    const questions = Array.isArray(testType.questions) 
      ? testType.questions 
      : [];
    
    const questionCount = questions.filter(q => q.type === 'question').length;
    const instructionCount = questions.filter(q => q.type === 'instruction').length;
    const totalItems = questions.length;
    
    console.log('✅ Test type retrieved:');
    console.log(`   - ID: ${testType.id}`);
    console.log(`   - Code: ${testType.code}`);
    console.log(`   - Name: ${testType.name}`);
    console.log(`   - Question Count (DB): ${testType.questionCount}`);
    console.log(`   - Question Count (Calculated): ${questionCount}`);
    console.log(`   - Instruction Count: ${instructionCount}`);
    console.log(`   - Total Items: ${totalItems}`);
    
    // Verify counts match
    if (testType.questionCount === questionCount) {
      console.log('✅ Question count matches!\n');
    } else {
      console.log('❌ Question count mismatch!\n');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Get test type failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 4: Export test type
 */
async function exportTestType() {
  try {
    console.log('📤 Step 4: Exporting test type...');
    
    const response = await axios.get(
      `${API_BASE_URL}/psychology/test-types/${testTypeId}/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    const exportData = response.data.data;
    
    console.log('✅ Export successful:');
    console.log(`   - Filename: ${exportData.filename}`);
    console.log(`   - Download URL: ${exportData.filepath}`);
    console.log(`   - Overwritten: ${exportData.overwritten}`);
    console.log(`   - Question Count: ${exportData.testType.questionCount}`);
    console.log(`   - Total Items: ${exportData.testType.totalItems}`);
    
    // Verify exported file
    const exportPath = path.join(process.cwd(), 'public', exportData.filepath);
    if (fs.existsSync(exportPath)) {
      const fileContent = fs.readFileSync(exportPath, 'utf8');
      const exportedData = JSON.parse(fileContent);
      
      console.log('\n📄 Exported file contents:');
      console.log(`   - Code: ${exportedData.code}`);
      console.log(`   - Name: ${exportedData.name}`);
      console.log(`   - Question Count (in JSON): ${exportedData.questionCount}`);
      console.log(`   - Total Questions Array Length: ${exportedData.questions.length}`);
      
      // Calculate from questions array
      const actualQuestionCount = exportedData.questions.filter(q => q.type === 'question').length;
      const actualInstructionCount = exportedData.questions.filter(q => q.type === 'instruction').length;
      
      console.log(`   - Actual Question Count: ${actualQuestionCount}`);
      console.log(`   - Actual Instruction Count: ${actualInstructionCount}`);
      
      if (exportedData.questionCount === actualQuestionCount) {
        console.log('✅ Exported questionCount is correct!\n');
      } else {
        console.log('❌ Exported questionCount is incorrect!\n');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Export failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Step 5: List all test types
 */
async function listTestTypes() {
  try {
    console.log('📋 Step 5: Listing all test types...');
    
    const response = await axios.get(
      `${API_BASE_URL}/psychology/test-types`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    const testTypes = response.data.data;
    
    console.log(`✅ Found ${testTypes.length} test type(s):`);
    testTypes.forEach(tt => {
      console.log(`   - ${tt.code} (${tt.name}): ${tt.questionCount} questions`);
    });
    console.log();
    
    return true;
  } catch (error) {
    console.error('❌ List test types failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting TypeTest Import/Export Test\n');
  console.log('='.repeat(60));
  console.log();
  
  let success = true;
  
  // Step 1: Login
  success = await login();
  if (!success) return;
  
  // Step 2: Import
  success = await importTestType();
  if (!success) return;
  
  // Step 3: Verify
  success = await getTestType();
  if (!success) return;
  
  // Step 4: Export
  success = await exportTestType();
  if (!success) return;
  
  // Step 5: List
  success = await listTestTypes();
  if (!success) return;
  
  console.log('='.repeat(60));
  console.log('✅ All tests passed successfully!');
  console.log('='.repeat(60));
}

// Run the test
main().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
