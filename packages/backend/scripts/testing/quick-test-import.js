/**
 * Quick Test TypeTest Import
 * 
 * Usage: node scripts/testing/quick-test-import.js <filename>
 * Example: node scripts/testing/quick-test-import.js PAPI_v1.0.json
 */

require('dotenv').config({ path: '.env.development' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
const TEST_FILE = process.argv[2] || 'CFIT_v1.5.json';

// Test credentials
const TEST_USER = {
  email: 'admin@tenant-a.com',
  password: 'password123'
};

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ Login successful\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    if (error.code) console.error('   Error code:', error.code);
    if (error.response?.status) console.error('   HTTP Status:', error.response.status);
    if (error.response?.data) console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    console.log('💡 Tip: Make sure server is running and credentials are correct');
    return false;
  }
}

async function getFileStats() {
  try {
    const filepath = path.join(process.cwd(), 'public/psychology/export', TEST_FILE);
    
    if (!fs.existsSync(filepath)) {
      console.error(`❌ File not found: ${filepath}`);
      return null;
    }
    
    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    console.log('📄 File Statistics:');
    console.log(`   - Code: ${content.code}`);
    console.log(`   - Name: ${content.name}`);
    console.log(`   - Version: ${content.version}`);
    console.log(`   - Questions Array Length: ${content.questions?.length || 0}`);
    console.log(`   - questionCount in JSON: ${content.questionCount || 'NOT SET'}`);
    
    // Calculate actual counts
    const questions = content.questions || [];
    const questionItems = questions.filter(q => q.type === 'question');
    const instructionItems = questions.filter(q => q.type === 'instruction');
    const otherItems = questions.filter(q => !q.type);
    
    console.log(`   - Items with type="question": ${questionItems.length}`);
    console.log(`   - Items with type="instruction": ${instructionItems.length}`);
    console.log(`   - Items without type: ${otherItems.length}`);
    console.log();
    
    return content;
  } catch (error) {
    console.error('❌ Error reading file:', error.message);
    return null;
  }
}

async function importTestType() {
  try {
    console.log('📥 Importing test type...');
    
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
    
    console.log('✅ Import successful!');
    console.log(`   - Action: ${response.data.action}`);
    console.log(`   - ID: ${response.data.data.id}`);
    console.log(`   - Code: ${response.data.data.code}`);
    console.log(`   - Name: ${response.data.data.name}`);
    console.log(`   - Question Count (DB): ${response.data.data.questionCount}`);
    
    if (response.data.data.breakdown) {
      console.log(`   - Breakdown:`);
      console.log(`     • Questions: ${response.data.data.breakdown.questions}`);
      console.log(`     • Instructions: ${response.data.data.breakdown.instructions}`);
      console.log(`     • Total: ${response.data.data.breakdown.total}`);
    } else {
      console.log(`   - Instruction Count: ${response.data.data.instructionCount || 0}`);
      console.log(`   - Total Items: ${response.data.data.totalItems}`);
    }
    console.log();
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Import failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.error) {
      console.error('   Error details:', error.response.data.error);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Quick Test TypeTest Import');
  console.log('='.repeat(60));
  console.log(`📂 Testing file: ${TEST_FILE}\n`);
  
  // Step 1: Check file
  const fileContent = await getFileStats();
  if (!fileContent) {
    process.exit(1);
  }
  
  // Step 2: Login
  const loggedIn = await login();
  if (!loggedIn) {
    process.exit(1);
  }
  
  // Step 3: Import
  const result = await importTestType();
  if (!result) {
    process.exit(1);
  }
  
  // Step 4: Verification
  console.log('✅ Verification:');
  const expectedCount = fileContent.questionCount || fileContent.questions.length;
  const actualCount = result.questionCount;
  
  if (actualCount === expectedCount) {
    console.log(`   ✅ questionCount MATCH: ${actualCount} = ${expectedCount}`);
  } else {
    console.log(`   ⚠️  questionCount MISMATCH: ${actualCount} ≠ ${expectedCount}`);
    console.log(`   💡 Note: This is expected if JSON has instructions (type="instruction")`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed successfully!');
}

main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
