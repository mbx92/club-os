const db = require('../src/models');

console.log('📦 Loaded Models:', Object.keys(db).filter(k => !['sequelize', 'Sequelize'].includes(k)).sort().join(', '));

console.log('\n🍽️  Restaurant Models:');
['Product', 'ProductCategory', 'Location', 'RestaurantTable', 'StockMovement'].forEach(m => {
  console.log(`  ${m}: ${db[m] ? '✅' : '❌'}`);
});

console.log('\n💪 Gym Models (sample):');
['Member', 'Membership', 'CheckIn', 'Trainer'].forEach(m => {
  console.log(`  ${m}: ${db[m] ? '✅' : '❌'}`);
});
