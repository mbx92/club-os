const { Product, ProductCategory } = require('../src/models');

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

async function checkProductDetails() {
  const tenantId = '3151f7b8-b34c-4abc-8cf2-db4e9a5202e7';
  
  console.log('🔍 Checking products with variants and extras...\n');
  
  // Find products with variants
  const productsWithVariants = await Product.findAll({
    where: {
      tenantId
    },
    include: [
      { model: ProductCategory, as: 'productCategory', attributes: ['name'] }
    ],
    limit: 10,
    order: [['createdAt', 'DESC']]
  });
  
  console.log(`Found ${productsWithVariants.length} recent products\n`);
  
  productsWithVariants.forEach((product, idx) => {
    console.log(`\n[${idx + 1}] ${product.name}`);
    console.log(`    SKU: ${product.sku}`);
    console.log(`    Price: Rp ${product.price.toLocaleString('id-ID')}`);
    console.log(`    Category: ${product.productCategory?.name || 'N/A'}`);
    console.log(`    isCustomized: ${product.isCustomized}`);
    
    if (product.productDetails) {
      console.log(`    productDetails:`, JSON.stringify(product.productDetails, null, 2));
    } else {
      console.log(`    ❌ productDetails: NULL atau EMPTY`);
    }
  });
  
  // Test: Find specific product with variants
  const cappuccino = await Product.findOne({
    where: {
      tenantId,
      name: { [require('sequelize').Op.iLike]: '%cappuccino%' }
    }
  });
  
  if (cappuccino) {
    console.log('\n\n' + '='.repeat(60));
    console.log('🎯 Test Case: Cappuccino');
    console.log('='.repeat(60));
    console.log(JSON.stringify(cappuccino.toJSON(), null, 2));
  }
  
  process.exit(0);
}

checkProductDetails().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
