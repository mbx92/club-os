const { Product } = require('./src/models');

async function testProductTypeDetection() {
  try {
    console.log('\n=== Testing Product Type Detection ===\n');
    
    // Test categories
    const testCategories = [
      { name: 'Main Course', expected: 'food' },
      { name: 'Coffee', expected: 'beverage' },
      { name: 'Appetizer', expected: 'food' },
      { name: 'Tea & Infusions', expected: 'beverage' },
      { name: 'Dessert', expected: 'food' },
      { name: 'Fresh Juice', expected: 'beverage' },
      { name: 'Soft Drink', expected: 'beverage' },
      { name: 'Salad', expected: 'food' },
      { name: 'Cocktail', expected: 'beverage' },
      { name: 'Wine & Beer', expected: 'beverage' }
    ];
    
    const determineProductType = (categoryName) => {
      const beverageCategories = [
        'coffee', 'tea', 'juice', 'drink', 'beverage', 
        'beer', 'wine', 'cocktail', 'mocktail', 'smoothie',
        'soda', 'soft drink', 'milkshake', 'frappe', 'latte'
      ];
      
      const categoryLower = categoryName.toLowerCase();
      const isBeverage = beverageCategories.some(keyword => 
        categoryLower.includes(keyword)
      );
      
      return isBeverage ? 'beverage' : 'food';
    };
    
    console.log('Category → Product Type Detection:\n');
    
    testCategories.forEach(test => {
      const result = determineProductType(test.name);
      const status = result === test.expected ? '✅' : '❌';
      console.log(`${status} ${test.name.padEnd(20)} → ${result} ${result !== test.expected ? `(expected: ${test.expected})` : ''}`);
    });
    
    console.log('\n=== Summary ===');
    const correct = testCategories.filter(t => determineProductType(t.name) === t.expected).length;
    console.log(`✅ ${correct}/${testCategories.length} categories detected correctly`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testProductTypeDetection();
