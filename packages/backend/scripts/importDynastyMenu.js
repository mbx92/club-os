const XLSX = require('xlsx');
const path = require('path');
const { ProductCategory, Product, Tenant } = require('../src/models');

/**
 * Import Dynasty Menu from Excel file
 * 
 * Usage:
 *   node scripts/importDynastyMenu.js <tenantId>
 * 
 * Excel file should have columns:
 *   - Category (Kategori)
 *   - Product Name (Nama Produk)
 *   - Price (Harga)
 *   - Description (optional)
 *   - SKU (optional)
 */

/**
 * Determine product type based on category
 * @param {string} categoryName - Category name
 * @returns {string} - 'food' | 'beverage' | 'other'
 */
function determineProductType(categoryName) {
  const beverageCategories = [
    // Hot Beverages
    'coffee', 'kopi', 'espresso', 'cappuccino', 'latte', 'americano', 'mocha',
    'tea', 'teh', 'green tea', 'black tea', 'milk tea', 'bubble tea',
    'hot chocolate', 'coklat panas',
    
    // Cold Beverages
    'juice', 'jus', 'fresh juice', 'smoothie', 'milkshake', 'frappe', 'ice blend',
    'soft drink', 'soda', 'cola', 'sprite', 'fanta',
    'iced coffee', 'iced tea', 'es kopi', 'es teh',
    'mineral water', 'air mineral', 'sparkling water',
    
    // Alcoholic (if any)
    'beer', 'wine', 'cocktail', 'mocktail', 'liquor', 'vodka', 'whiskey',
    
    // General
    'drink', 'beverage', 'minuman', 'drinks', 'beverages'
  ];
  
  const categoryLower = categoryName.toLowerCase();
  
  // Check if category contains any beverage keyword
  const isBeverage = beverageCategories.some(keyword => 
    categoryLower.includes(keyword)
  );
  
  return isBeverage ? 'beverage' : 'food';
}

async function importMenu(tenantId) {
  try {
    console.log('='.repeat(60));
    console.log('DYNASTY MENU IMPORT');
    console.log('='.repeat(60));

    // Validate tenant
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }

    console.log(`\nTenant: ${tenant.name} (${tenantId})`);

    // Read Excel file
    const filePath = path.join(__dirname, '../docs/Dynasty_Menu_2026.xlsx');
    console.log(`\nReading Excel file: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`\nFound ${rawData.length} rows in Excel file`);
    console.log('\nFirst 3 rows preview:');
    console.log(JSON.stringify(rawData.slice(0, 3), null, 2));

    if (rawData.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Analyze columns
    console.log('\n' + '='.repeat(60));
    console.log('COLUMN MAPPING');
    console.log('='.repeat(60));
    
    const firstRow = rawData[0];
    const columns = Object.keys(firstRow);
    console.log('\nDetected columns:');
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });

    // Auto-detect column names (case-insensitive, flexible)
    const getColumn = (possibleNames) => {
      return columns.find(col => 
        possibleNames.some(name => 
          col.toLowerCase().includes(name.toLowerCase())
        )
      );
    };

    const categoryCol = getColumn(['category', 'kategori', 'cat', 'jenis']);
    const nameCol = getColumn(['name', 'nama', 'produk', 'product', 'item', 'menu']);
    const priceCol = getColumn(['price', 'harga', 'nominal']);
    const descCol = getColumn(['description', 'deskripsi', 'desk', 'keterangan', 'ket']);
    const skuCol = getColumn(['sku', 'code', 'kode']);

    console.log('\nMapped columns:');
    console.log(`  Category: ${categoryCol || 'NOT FOUND'}`);
    console.log(`  Name: ${nameCol || 'NOT FOUND'}`);
    console.log(`  Price: ${priceCol || 'NOT FOUND'}`);
    console.log(`  Description: ${descCol || '(optional)'}`);
    console.log(`  SKU: ${skuCol || '(will auto-generate)'}`);

    if (!nameCol || !priceCol) {
      throw new Error('Required columns not found. Need at least Name and Price columns.');
    }

    // Process data
    console.log('\n' + '='.repeat(60));
    console.log('PROCESSING DATA');
    console.log('='.repeat(60));

    const categoriesMap = new Map();
    const productsToCreate = [];
    let skippedRows = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number (header is row 1)

      try {
        // Extract data
        const categoryName = categoryCol ? String(row[categoryCol] || 'Uncategorized').trim() : 'Uncategorized';
        const productName = String(row[nameCol] || '').trim();
        const priceValue = row[priceCol];
        const description = descCol ? String(row[descCol] || '').trim() : '';
        const skuValue = skuCol ? String(row[skuCol] || '').trim() : '';

        // Validation
        if (!productName) {
          console.log(`  ⚠️  Row ${rowNum}: Skipped (no product name)`);
          skippedRows++;
          continue;
        }

        // Parse price
        let price = 0;
        if (typeof priceValue === 'number') {
          price = priceValue;
        } else if (typeof priceValue === 'string') {
          // Remove non-numeric characters except decimal point
          const cleaned = priceValue.replace(/[^0-9.]/g, '');
          price = parseFloat(cleaned) || 0;
        }

        if (price <= 0) {
          console.log(`  ⚠️  Row ${rowNum}: Skipped (invalid price: ${priceValue})`);
          skippedRows++;
          continue;
        }

        // Generate SKU if not provided
        const sku = skuValue || `DYN-${Date.now()}-${i}`;

        // Category
        if (!categoriesMap.has(categoryName)) {
          categoriesMap.set(categoryName, {
            name: categoryName,
            sortOrder: categoriesMap.size
          });
        }

        // Product
        productsToCreate.push({
          categoryName,
          name: productName,
          price,
          description,
          sku,
          rowNum
        });

      } catch (error) {
        console.log(`  ❌ Row ${rowNum}: Error - ${error.message}`);
        skippedRows++;
      }
    }

    console.log(`\n✅ Parsed ${productsToCreate.length} valid products`);
    console.log(`⚠️  Skipped ${skippedRows} rows`);
    console.log(`📂 Found ${categoriesMap.size} categories`);

    // Confirm import
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT CONFIRMATION');
    console.log('='.repeat(60));
    console.log(`\nAbout to import:`);
    console.log(`  - ${categoriesMap.size} categories`);
    console.log(`  - ${productsToCreate.length} products`);
    console.log(`  - To tenant: ${tenant.name}`);

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('\nContinue with import? (y/n): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('\n❌ Import cancelled by user');
      process.exit(0);
    }

    // Create categories
    console.log('\n' + '='.repeat(60));
    console.log('CREATING CATEGORIES');
    console.log('='.repeat(60));

    const categoryMap = new Map();
    
    for (const [name, data] of categoriesMap) {
      try {
        const [category, created] = await ProductCategory.findOrCreate({
          where: { tenantId, name },
          defaults: {
            tenantId,
            name: data.name,
            sortOrder: data.sortOrder,
            isActive: true
          }
        });

        categoryMap.set(name, category.id);
        
        if (created) {
          console.log(`  ✅ Created: ${name}`);
        } else {
          console.log(`  ℹ️  Exists: ${name}`);
        }
      } catch (error) {
        console.log(`  ❌ Failed: ${name} - ${error.message}`);
      }
    }

    // Create products
    console.log('\n' + '='.repeat(60));
    console.log('CREATING PRODUCTS');
    console.log('='.repeat(60));

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const productData of productsToCreate) {
      try {
        const categoryId = categoryMap.get(productData.categoryName);

        const [product, created] = await Product.findOrCreate({
          where: { 
            tenantId, 
            sku: productData.sku 
          },
          defaults: {
            tenantId,
            name: productData.name,
            description: productData.description,
            sku: productData.sku,
            price: productData.price,
            productType: determineProductType(productData.categoryName),
            cost: 0,
            categoryId,
            category: productData.categoryName, // Legacy field
            stockQuantity: 0,
            minStockLevel: 0,
            unit: 'pcs',
            isActive: true,
            trackInventory: false,
            taxable: true,
            isCustomized: false
          }
        });

        if (created) {
          console.log(`  ✅ Row ${productData.rowNum}: ${productData.name} (Rp ${productData.price.toLocaleString()})`);
          createdCount++;
        } else {
          // Update existing product
          await product.update({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            productType: determineProductType(productData.categoryName),
            categoryId,
            category: productData.categoryName
          });
          console.log(`  🔄 Row ${productData.rowNum}: ${productData.name} (updated)`);
          updatedCount++;
        }
      } catch (error) {
        console.log(`  ❌ Row ${productData.rowNum}: ${productData.name} - ${error.message}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Categories: ${categoryMap.size}`);
    console.log(`✅ Products created: ${createdCount}`);
    console.log(`🔄 Products updated: ${updatedCount}`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount}`);
    }
    console.log(`\nTotal processed: ${createdCount + updatedCount} products`);
    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node scripts/importDynastyMenu.js <tenantId>');
  console.log('\nExample:');
  console.log('  node scripts/importDynastyMenu.js 3151f7b8-b34c-4abc-8cf2-db4e9a5202e7');
  process.exit(1);
}

const tenantId = args[0];

importMenu(tenantId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
