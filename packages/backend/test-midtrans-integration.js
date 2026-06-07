/**
 * Midtrans Integration Tests
 * 
 * Manual test suite untuk testing Midtrans integration
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFkNWZhMDQ1LTgyNzItNGZmNC1iMjcwLTk2ZTAxNWYxYTc5ZCIsImVtYWlsIjoiYWRtaW5AdGVuYW50LWEuY29tIiwicm9sZSI6ImFkbWluIiwidGVuYW50SWQiOiIzMTUxZjdiOC1iMzRjLTRhYmMtOGNmMi1kYjRlOWE1MjAyZTciLCJpc1N1cGVyQWRtaW4iOmZhbHNlLCJpYXQiOjE3NjYwMjQ0NjEsImV4cCI6MTc2NjAzMTY2MX0.EmpY2qlML24owNkD1vWLz1fpcXFlhhrbd7INclWDp7M'; // Replace with actual token

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Test 1: Get Midtrans Configuration
 */
async function testGetConfig() {
  console.log('\n📝 Test 1: Get Midtrans Configuration');
  console.log('=====================================');
  
  try {
    const response = await client.get('/payment/midtrans/config');
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 2: Create Snap Payment
 */
async function testCreatePayment(transactionId) {
  console.log('\n📝 Test 2: Create Snap Payment');
  console.log('================================');
  
  try {
    const response = await client.post('/payment/midtrans/create', {
      transactionId: transactionId
    });
    
    console.log('✅ Success:');
    console.log('  Transaction Number:', response.data.data.transactionNumber);
    console.log('  Snap Token:', response.data.data.snapToken);
    console.log('  Redirect URL:', response.data.data.redirectUrl);
    console.log('\n💡 Open this URL in browser to complete payment:');
    console.log('  ', response.data.data.redirectUrl);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 3: Create Direct Charge (Bank Transfer)
 */
async function testCreateCharge(transactionId) {
  console.log('\n📝 Test 3: Create Direct Charge (BCA VA)');
  console.log('=========================================');
  
  try {
    const response = await client.post('/payment/midtrans/charge', {
      transactionId: transactionId,
      paymentType: 'bank_transfer',
      bankTransfer: {
        bank: 'bca'
      }
    });
    
    console.log('✅ Success:');
    console.log('  Status:', response.data.data.transaction_status);
    console.log('  VA Number:', response.data.data.va_numbers?.[0]?.va_number);
    console.log('  Bank:', response.data.data.va_numbers?.[0]?.bank);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 4: Check Payment Status
 */
async function testCheckStatus(transactionNumber) {
  console.log('\n📝 Test 4: Check Payment Status');
  console.log('=================================');
  
  try {
    const response = await client.get(`/payment/midtrans/status/${transactionNumber}`);
    
    console.log('✅ Success:');
    console.log('  Transaction Number:', response.data.data.transactionNumber);
    console.log('  Midtrans Status:', response.data.data.midtransStatus);
    console.log('  Current Status:', response.data.data.currentStatus);
    console.log('  Payment Type:', response.data.data.paymentType);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 5: Simulate Webhook Notification
 */
async function testWebhookNotification(orderNumber) {
  console.log('\n📝 Test 5: Simulate Webhook Notification');
  console.log('=========================================');
  
  // Simulate settlement notification
  const notification = {
    order_id: orderNumber,
    transaction_status: 'settlement',
    fraud_status: 'accept',
    payment_type: 'credit_card',
    transaction_id: 'test-' + Date.now(),
    gross_amount: '150000.00',
    transaction_time: new Date().toISOString(),
    settlement_time: new Date().toISOString(),
    status_code: '200',
    status_message: 'Success',
    signature_key: 'test-signature' // Will be validated
  };
  
  try {
    // Note: This will fail signature validation in real scenario
    // Use actual Midtrans notification for real testing
    const response = await axios.post(`${BASE_URL}/payment/midtrans/notification`, notification);
    
    console.log('✅ Notification accepted:', response.data);
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 6: Cancel Payment
 */
async function testCancelPayment(transactionNumber) {
  console.log('\n📝 Test 6: Cancel Payment');
  console.log('==========================');
  
  try {
    const response = await client.post(`/payment/midtrans/cancel/${transactionNumber}`);
    
    console.log('✅ Success:', response.data);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Test 7: Refund Payment
 */
async function testRefundPayment(transactionNumber, amount = null) {
  console.log('\n📝 Test 7: Refund Payment');
  console.log('==========================');
  
  try {
    const payload = {
      reason: 'Customer request'
    };
    
    if (amount) {
      payload.amount = amount;
      console.log('  Refund Type: Partial');
      console.log('  Amount:', amount);
    } else {
      console.log('  Refund Type: Full');
    }
    
    const response = await client.post(`/payment/midtrans/refund/${transactionNumber}`, payload);
    
    console.log('✅ Success:', response.data);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Midtrans Integration Tests');
  console.log('======================================\n');
  
  // IMPORTANT: Replace with actual transaction ID from your database
  const TEST_TRANSACTION_ID = 'YOUR_TRANSACTION_ID_HERE';
  const TEST_TRANSACTION_NUMBER = 'YOUR_TRANSACTION_NUMBER_HERE';
  
  if (TEST_TRANSACTION_ID === 'YOUR_TRANSACTION_ID_HERE') {
    console.error('\n❌ ERROR: Please set TEST_TRANSACTION_ID before running tests');
    console.log('\n📝 Steps to run tests:');
    console.log('  1. Create a transaction in your system');
    console.log('  2. Replace TEST_TRANSACTION_ID with the UUID');
    console.log('  3. Replace TOKEN with your auth token');
    console.log('  4. Run: node test-midtrans-integration.js\n');
    return;
  }
  
  // Test 1: Get config
  await testGetConfig();
  
  // Test 2: Create payment (Snap)
  await new Promise(resolve => setTimeout(resolve, 1000));
  const paymentData = await testCreatePayment(TEST_TRANSACTION_ID);
  
  // Test 3: Create charge (Bank Transfer)
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // await testCreateCharge(TEST_TRANSACTION_ID);
  
  // Test 4: Check status
  if (paymentData?.transactionNumber) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testCheckStatus(paymentData.transactionNumber);
  }
  
  // Test 5: Simulate webhook (optional)
  // await testWebhookNotification(TEST_TRANSACTION_NUMBER);
  
  // Test 6: Cancel payment (uncomment to test)
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // await testCancelPayment(TEST_TRANSACTION_NUMBER);
  
  // Test 7: Refund payment (uncomment to test - only for paid transactions)
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // await testRefundPayment(TEST_TRANSACTION_NUMBER);
  // await testRefundPayment(TEST_TRANSACTION_NUMBER, 50000); // Partial refund
  
  console.log('\n✅ All tests completed!\n');
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGetConfig,
  testCreatePayment,
  testCreateCharge,
  testCheckStatus,
  testWebhookNotification,
  testCancelPayment,
  testRefundPayment
};
