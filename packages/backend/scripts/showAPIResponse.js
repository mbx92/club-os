const { Product, ProductCategory } = require('../src/models');

require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

async function simulateAPIResponse() {
  const tenantId = '3151f7b8-b34c-4abc-8cf2-db4e9a5202e7';
  
  console.log('============================================================');
  console.log('SIMULATED API RESPONSE FOR FRONTEND');
  console.log('============================================================\n');
  
  console.log('📌 Endpoint: GET /api/v1/restaurant/products\n');
  
  // Simulate getAllProducts response
  const products = await Product.findAll({
    where: { tenantId },
    include: [
      { model: ProductCategory, as: 'productCategory', attributes: ['id', 'name', 'color'] }
    ],
    order: [['name', 'ASC']],
    limit: 5
  });
  
  const response = {
    success: true,
    data: products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      description: p.description,
      isActive: p.isActive,
      isCustomized: p.isCustomized,
      categoryId: p.categoryId,
      productCategory: p.productCategory,
      productDetails: p.productDetails,  // ✅ This field contains variants & extras
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })),
    pagination: {
      total: 65,
      page: 1,
      limit: 50,
      totalPages: 2
    }
  };
  
  console.log(JSON.stringify(response, null, 2));
  
  console.log('\n\n============================================================');
  console.log('SPECIFIC EXAMPLES');
  console.log('============================================================\n');
  
  // Show Cappuccino (with variants)
  const cappuccino = products.find(p => p.name.toLowerCase().includes('cappuccino'));
  if (cappuccino) {
    console.log('🎯 Example 1: Product with VARIANTS (Cappuccino)\n');
    console.log(JSON.stringify({
      id: cappuccino.id,
      name: cappuccino.name,
      price: cappuccino.price,  // Base price (Regular)
      productDetails: cappuccino.productDetails
    }, null, 2));
  }
  
  // Show Aglio E Olio (with extras)
  const aglio = await Product.findOne({
    where: {
      tenantId,
      name: { [require('sequelize').Op.iLike]: '%aglio%' }
    }
  });
  
  if (aglio) {
    console.log('\n\n🎯 Example 2: Product with EXTRAS (Aglio E Olio)\n');
    console.log(JSON.stringify({
      id: aglio.id,
      name: aglio.name,
      price: aglio.price,  // Base price
      isCustomized: aglio.isCustomized,  // true if has extras
      productDetails: aglio.productDetails
    }, null, 2));
  }
  
  console.log('\n\n============================================================');
  console.log('FRONTEND IMPLEMENTATION GUIDE');
  console.log('============================================================\n');
  
  console.log('1️⃣  Check if product has variants:');
  console.log('   if (product.productDetails?.hasVariants) {');
  console.log('     // Show variant selector (Regular/Large)');
  console.log('     product.productDetails.variants.forEach(variant => {');
  console.log('       console.log(variant.name, variant.price);');
  console.log('     });');
  console.log('   }');
  
  console.log('\n2️⃣  Check if product has extras:');
  console.log('   if (product.productDetails?.hasExtras) {');
  console.log('     // Show extra options checkboxes');
  console.log('     product.productDetails.extras.forEach(extra => {');
  console.log('       console.log(extra.name, extra.price);');
  console.log('     });');
  console.log('   }');
  
  console.log('\n3️⃣  Calculate total price:');
  console.log('   let total = selectedVariant.price; // or product.price');
  console.log('   selectedExtras.forEach(extra => {');
  console.log('     total += extra.price;');
  console.log('   });');
  
  console.log('\n✅ Data structure in productDetails:');
  console.log('   {');
  console.log('     variants: [{ name: "Regular", price: 35000, sku: "..." }],');
  console.log('     extras: [{ name: "Add ham/bacon", price: 25000 }],');
  console.log('     hasVariants: true,');
  console.log('     hasExtras: false');
  console.log('   }');
  
  process.exit(0);
}

simulateAPIResponse().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
