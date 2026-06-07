/**
 * Restaurant Module API Test Script
 * 
 * Tests all restaurant module endpoints to ensure proper integration.
 * Validates routes, authentication, CASL permissions, and feature gating.
 * 
 * Usage: node scripts/testRestaurantAPI.js
 */

const axios = require('axios');
const colors = require('colors');

// Base configuration
const BASE_URL = 'http://localhost:8000/api/v1';
let authToken = null;
let tenantId = null;

// Test credentials (update with actual credentials)
const TEST_USER = {
  email: 'admin@tenant-a.com',
  password: 'password123'
};

// Color configuration
colors.setTheme({
  success: 'green',
  error: 'red',
  info: 'cyan',
  warn: 'yellow',
  test: 'blue'
});

/**
 * Login and get auth token
 */
async function authenticate() {
  console.log('\n🔐 Authenticating...'.info);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      tenantId = response.data.data.user.tenantId;
      console.log('✅ Authentication successful'.success);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      console.log(`   Tenant ID: ${tenantId}`);
      return true;
    }
  } catch (error) {
    console.log('❌ Authentication failed'.error);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

/**
 * Create axios instance with auth
 */
function getAxiosInstance() {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Test endpoint
 */
async function testEndpoint(method, endpoint, data = null, description) {
  const api = getAxiosInstance();
  
  console.log(`\n🧪 ${description}`.test);
  console.log(`   ${method.toUpperCase()} ${endpoint}`);
  
  try {
    let response;
    
    switch (method.toLowerCase()) {
      case 'get':
        response = await api.get(endpoint);
        break;
      case 'post':
        response = await api.post(endpoint, data);
        break;
      case 'put':
        response = await api.put(endpoint, data);
        break;
      case 'delete':
        response = await api.delete(endpoint);
        break;
    }
    
    if (response.data.success) {
      console.log('✅ Success'.success);
      if (response.data.data) {
        const dataType = Array.isArray(response.data.data) ? 'array' : typeof response.data.data;
        const dataLength = Array.isArray(response.data.data) ? response.data.data.length : 1;
        console.log(`   Response: ${dataType} (${dataLength} items)`);
      }
      return { success: true, data: response.data };
    }
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    if (status === 403) {
      console.log('⚠️  Forbidden (expected if feature not enabled)'.warn);
      console.log(`   Message: ${message}`);
      return { success: false, forbidden: true };
    } else {
      console.log('❌ Failed'.error);
      console.log(`   Status: ${status}`);
      console.log(`   Message: ${message}`);
      return { success: false, error: message };
    }
  }
}

/**
 * Test Product Category endpoints
 */
async function testProductCategories() {
  console.log('\n═══════════════════════════════════════'.info);
  console.log('📦 Testing Product Category Endpoints'.info.bold);
  console.log('═══════════════════════════════════════'.info);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    forbidden: 0
  };
  
  // Test GET all categories
  results.total++;
  const getAll = await testEndpoint('get', '/restaurant/categories', null, 'Get all categories');
  if (getAll.success) results.passed++;
  else if (getAll.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test GET category tree
  results.total++;
  const getTree = await testEndpoint('get', '/restaurant/categories/tree', null, 'Get category tree');
  if (getTree.success) results.passed++;
  else if (getTree.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test POST create category
  results.total++;
  const createCategory = await testEndpoint('post', '/restaurant/categories', {
    name: 'Test Beverages',
    description: 'Test category for beverages',
    displayOrder: 1,
    isActive: true
  }, 'Create new category');
  
  let categoryId = null;
  if (createCategory.success) {
    results.passed++;
    categoryId = createCategory.data.data.id;
  } else if (createCategory.forbidden) {
    results.forbidden++;
  } else {
    results.failed++;
  }
  
  // Test GET category by ID
  if (categoryId) {
    results.total++;
    const getById = await testEndpoint('get', `/restaurant/categories/${categoryId}`, null, 'Get category by ID');
    if (getById.success) results.passed++;
    else if (getById.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test PUT update category
    results.total++;
    const updateCategory = await testEndpoint('put', `/restaurant/categories/${categoryId}`, {
      description: 'Updated test category description'
    }, 'Update category');
    if (updateCategory.success) results.passed++;
    else if (updateCategory.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test DELETE category
    results.total++;
    const deleteCategory = await testEndpoint('delete', `/restaurant/categories/${categoryId}`, null, 'Delete category');
    if (deleteCategory.success) results.passed++;
    else if (deleteCategory.forbidden) results.forbidden++;
    else results.failed++;
  }
  
  return results;
}

/**
 * Test Product endpoints
 */
async function testProducts() {
  console.log('\n═══════════════════════════════════════'.info);
  console.log('🍔 Testing Product Endpoints'.info.bold);
  console.log('═══════════════════════════════════════'.info);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    forbidden: 0
  };
  
  // Test GET all products
  results.total++;
  const getAll = await testEndpoint('get', '/restaurant/products', null, 'Get all products');
  if (getAll.success) results.passed++;
  else if (getAll.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test GET low stock products
  results.total++;
  const getLowStock = await testEndpoint('get', '/restaurant/products/low-stock', null, 'Get low stock products');
  if (getLowStock.success) results.passed++;
  else if (getLowStock.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test POST create product
  results.total++;
  const createProduct = await testEndpoint('post', '/restaurant/products', {
    name: 'Test Coffee',
    sku: 'TEST-COFFEE-001',
    price: 25000,
    costPrice: 15000,
    trackInventory: true,
    stockQuantity: 100,
    minStockLevel: 10,
    isActive: true,
    productDetails: {
      productType: 'beverage',
      hasVariants: false
    }
  }, 'Create new product');
  
  let productId = null;
  if (createProduct.success) {
    results.passed++;
    productId = createProduct.data.data.id;
  } else if (createProduct.forbidden) {
    results.forbidden++;
  } else {
    results.failed++;
  }
  
  // Test GET product by ID
  if (productId) {
    results.total++;
    const getById = await testEndpoint('get', `/restaurant/products/${productId}`, null, 'Get product by ID');
    if (getById.success) results.passed++;
    else if (getById.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test PUT update product
    results.total++;
    const updateProduct = await testEndpoint('put', `/restaurant/products/${productId}`, {
      price: 27000
    }, 'Update product');
    if (updateProduct.success) results.passed++;
    else if (updateProduct.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test POST adjust stock
    results.total++;
    const adjustStock = await testEndpoint('post', `/restaurant/products/${productId}/adjust-stock`, {
      newQuantity: 80,
      notes: 'Test stock adjustment'
    }, 'Adjust product stock');
    if (adjustStock.success) results.passed++;
    else if (adjustStock.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test DELETE product
    results.total++;
    const deleteProduct = await testEndpoint('delete', `/restaurant/products/${productId}`, null, 'Delete product');
    if (deleteProduct.success) results.passed++;
    else if (deleteProduct.forbidden) results.forbidden++;
    else results.failed++;
  }
  
  return results;
}

/**
 * Test Restaurant Table endpoints
 */
async function testTables() {
  console.log('\n═══════════════════════════════════════'.info);
  console.log('🪑 Testing Restaurant Table Endpoints'.info.bold);
  console.log('═══════════════════════════════════════'.info);
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    forbidden: 0
  };
  
  // Test GET all tables
  results.total++;
  const getAll = await testEndpoint('get', '/restaurant/tables', null, 'Get all tables');
  if (getAll.success) results.passed++;
  else if (getAll.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test GET table statistics
  results.total++;
  const getStats = await testEndpoint('get', '/restaurant/tables/statistics', null, 'Get table statistics');
  if (getStats.success) results.passed++;
  else if (getStats.forbidden) results.forbidden++;
  else results.failed++;
  
  // Test POST create table
  results.total++;
  const createTable = await testEndpoint('post', '/restaurant/tables', {
    tableNumber: 'TEST-01',
    capacity: 4,
    section: 'Test Area',
    status: 'available',
    shape: 'square',
    positionX: 0,
    positionY: 0,
    width: 100,
    height: 100
  }, 'Create new table');
  
  let tableId = null;
  if (createTable.success) {
    results.passed++;
    tableId = createTable.data.data.id;
  } else if (createTable.forbidden) {
    results.forbidden++;
  } else {
    results.failed++;
  }
  
  // Test GET table by ID
  if (tableId) {
    results.total++;
    const getById = await testEndpoint('get', `/restaurant/tables/${tableId}`, null, 'Get table by ID');
    if (getById.success) results.passed++;
    else if (getById.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test PUT update table
    results.total++;
    const updateTable = await testEndpoint('put', `/restaurant/tables/${tableId}`, {
      capacity: 6
    }, 'Update table');
    if (updateTable.success) results.passed++;
    else if (updateTable.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test POST occupy table
    results.total++;
    const occupyTable = await testEndpoint('post', `/restaurant/tables/${tableId}/occupy`, {
      numberOfGuests: 4
    }, 'Occupy table');
    if (occupyTable.success) results.passed++;
    else if (occupyTable.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test POST release table
    results.total++;
    const releaseTable = await testEndpoint('post', `/restaurant/tables/${tableId}/release`, null, 'Release table');
    if (releaseTable.success) results.passed++;
    else if (releaseTable.forbidden) results.forbidden++;
    else results.failed++;
    
    // Test DELETE table
    results.total++;
    const deleteTable = await testEndpoint('delete', `/restaurant/tables/${tableId}`, null, 'Delete table');
    if (deleteTable.success) results.passed++;
    else if (deleteTable.forbidden) results.forbidden++;
    else results.failed++;
  }
  
  return results;
}

/**
 * Print summary
 */
function printSummary(allResults) {
  console.log('\n╔═══════════════════════════════════════╗'.info);
  console.log('║       TEST SUMMARY                    ║'.info.bold);
  console.log('╚═══════════════════════════════════════╝'.info);
  
  const totalTests = allResults.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalForbidden = allResults.reduce((sum, r) => sum + r.forbidden, 0);
  
  console.log(`\n✅ Passed:    ${totalPassed}/${totalTests}`.success);
  console.log(`❌ Failed:    ${totalFailed}/${totalTests}`.error);
  console.log(`⚠️  Forbidden: ${totalForbidden}/${totalTests}`.warn);
  
  const successRate = ((totalPassed / totalTests) * 100).toFixed(2);
  console.log(`\n📊 Success Rate: ${successRate}%`);
  
  if (totalForbidden > 0) {
    console.log('\n⚠️  Note: Forbidden responses indicate the restaurant module is not enabled in your subscription.'.warn);
    console.log('   To enable it, update your subscription plan or enable trial mode.'.warn);
  }
  
  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed!'.success.bold);
  } else {
    console.log(`\n⚠️  ${totalFailed} tests failed. Check the logs above for details.`.warn);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('═══════════════════════════════════════'.info);
  console.log('  Restaurant Module API Tests'.info.bold);
  console.log('═══════════════════════════════════════'.info);
  
  // Authenticate first
  const authenticated = await authenticate();
  
  if (!authenticated) {
    console.log('\n❌ Cannot proceed without authentication'.error);
    process.exit(1);
  }
  
  // Run all tests
  const results = [];
  
  try {
    results.push(await testProductCategories());
    results.push(await testProducts());
    results.push(await testTables());
    
    // Print summary
    printSummary(results);
    
  } catch (error) {
    console.log('\n❌ Test execution failed'.error);
    console.log(error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
