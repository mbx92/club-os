require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}`, override: true });

const printerScanner = require('./src/utils/printerScanner');

async function testVerifyPrinter() {
  const ip = '10.50.30.45';
  const port = 9100;

  console.log(`\n🔍 Testing printer: ${ip}:${port}\n`);

  // Test with requireResponse = false (non-strict)
  console.log('Test 1: Non-strict mode (port reachability only)');
  const result1 = await printerScanner.verifyPrinter(ip, port, false);
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n---\n');

  // Test with requireResponse = true (strict)
  console.log('Test 2: Strict mode (requires ESC/POS response)');
  const result2 = await printerScanner.verifyPrinter(ip, port, true);
  console.log(JSON.stringify(result2, null, 2));

  console.log('\n✅ Test completed\n');
  process.exit(0);
}

testVerifyPrinter().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
