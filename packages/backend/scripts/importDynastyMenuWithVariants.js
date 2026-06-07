#!/usr/bin/env node

/**
 * Dynasty Menu Import Script with Variants & Extras Support
 * 
 * This script imports menu data from Dynasty_Menu_2026_FULL.xlsx with support for:
 * - Product variants (Regular/Large/Cup/Pot) with different prices
 * - Product extras (Add ham/bacon, Add Nutella, etc.) with additional charges
 * 
 * Uses Product.productDetails JSONB field to store:
 * {
 *   variants: [{ name, price, sku }],
 *   extras: [{ name, price }],
 *   hasVariants: boolean,
 *   hasExtras: boolean
 * }
 * 
 * Usage: node scripts/importDynastyMenuWithVariants.js <tenantId>
 */

const path = require('path');
const XLSX = require('xlsx');
const { sequelize, Product, ProductCategory, Tenant } = require('../src/models');

// Load environment
require('dotenv').config();
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const EXCEL_FILE = path.join(__dirname, '../docs/Dynasty_Menu_2026_FULL.xlsx');

// Column mapping (flexible)
const COLUMN_MAP = {
  category: ['category', 'kategori', 'cat'],
  name: ['item name', 'name', 'nama', 'produk', 'product'],
  variant: ['variant', 'varian', 'size', 'type'],
  description: ['description', 'deskripsi', 'desc'],
  price: ['price (idr)', 'price', 'harga', 'price (k)'],
  extras: ['product extra', 'extras', 'tambahan', 'extra']
};

/**
 * Find column name in row (case-insensitive)
 */
function findColumn(row, possibleNames) {
  const keys = Object.keys(row);
  for (const possible of possibleNames) {
    const found = keys.find(k => k.toLowerCase() === possible.toLowerCase());
    if (found) return found;
  }
  return null;
}

/**
 * Parse product extras from string format
 * Format: "Add ham/bacon 25000 | Add smoked salmon 35000"
 * Returns: [{ name: "Add ham/bacon", price: 25000 }, ...]
 */
function parseExtras(extrasString) {
  if (!extrasString || typeof extrasString !== 'string') return [];
  
  const extras = [];
  const parts = extrasString.split('|').map(s => s.trim());
  
  for (const part of parts) {
    // Match pattern: "Add something 25000" or "Extra something 15000"
    const match = part.match(/^(.+?)\s+(\d+)$/);
    if (match) {
      const [, name, priceStr] = match;
      extras.push({
        name: name.trim(),
        price: parseInt(priceStr, 10)
      });
    }
  }
  
  return extras;
}

/**
 * Generate SKU for variant
 */
function generateVariantSKU(baseSKU, variantName) {
  const variantCode = variantName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);
  return `${baseSKU}-${variantCode}`;
}

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

/**
 * Read and parse Excel file
 */
function readExcelFile(filePath) {
  console.log(`\nReading Excel file: ${filePath}\n`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${rawData.length} rows in Excel file\n`);
  
  return rawData;
}

/**
 * Group rows by product name and collect variants/extras
 */
function groupProductData(rawData) {
  const products = new Map();
  const categories = new Set();
  
  // Detect columns
  const firstRow = rawData[0];
  const cols = {
    category: findColumn(firstRow, COLUMN_MAP.category),
    name: findColumn(firstRow, COLUMN_MAP.name),
    variant: findColumn(firstRow, COLUMN_MAP.variant),
    description: findColumn(firstRow, COLUMN_MAP.description),
    price: findColumn(firstRow, COLUMN_MAP.price),
    extras: findColumn(firstRow, COLUMN_MAP.extras)
  };
  
  console.log('============================================================');
  console.log('COLUMN MAPPING');
  console.log('============================================================\n');
  console.log('Detected columns:');
  Object.entries(cols).forEach(([key, value]) => {
    console.log(`  ${key}: ${value || '(not found)'}`);
  });
  console.log();
  
  // Group by product name
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    
    const categoryName = row[cols.category];
    const productName = row[cols.name];
    const variantName = row[cols.variant];
    const description = row[cols.description] || '';
    const price = parseFloat(row[cols.price]) || 0;
    const extrasString = row[cols.extras] || '';
    
    // Validation
    if (!categoryName || !productName || !variantName) {
      console.log(`⚠️  Skipping row ${i + 2}: Missing required fields`);
      continue;
    }
    
    categories.add(categoryName);
    
    // Get or create product entry
    if (!products.has(productName)) {
      products.set(productName, {
        name: productName,
        category: categoryName,
        description: description,
        variants: [],
        extras: [],
        rows: []
      });
    }
    
    const product = products.get(productName);
    
    // Add variant
    product.variants.push({
      name: variantName,
      price: price
    });
    
    // Parse and add extras (only once per product)
    if (extrasString && product.extras.length === 0) {
      product.extras = parseExtras(extrasString);
    }
    
    // Update description if current is empty
    if (!product.description && description) {
      product.description = description;
    }
    
    product.rows.push(i + 2);
  }
  
  console.log('============================================================');
  console.log('PARSING RESULTS');
  console.log('============================================================\n');
  console.log(`✅ Found ${products.size} unique products`);
  console.log(`📂 Found ${categories.size} categories`);
  console.log();
  
  return { products, categories };
}

/**
 * Preview parsed data
 */
function previewData(products, categories) {
  console.log('============================================================');
  console.log('DATA PREVIEW');
  console.log('============================================================\n');
  
  console.log('Categories:');
  Array.from(categories).forEach((cat, idx) => {
    console.log(`  ${idx + 1}. ${cat}`);
  });
  console.log();
  
  console.log('Sample products (first 3):');
  let count = 0;
  for (const [name, data] of products) {
    if (count++ >= 3) break;
    
    console.log(`\n  📦 ${name}`);
    console.log(`     Category: ${data.category}`);
    console.log(`     Variants: ${data.variants.length}`);
    data.variants.forEach(v => {
      console.log(`       - ${v.name}: Rp ${v.price.toLocaleString('id-ID')}`);
    });
    if (data.extras.length > 0) {
      console.log(`     Extras: ${data.extras.length}`);
      data.extras.forEach(e => {
        console.log(`       - ${e.name}: +Rp ${e.price.toLocaleString('id-ID')}`);
      });
    }
  }
  console.log();
}

/**
 * Import products to database
 */
async function importToDatabase(tenantId, products, categories) {
  console.log('============================================================');
  console.log('DATABASE IMPORT');
  console.log('============================================================\n');
  
  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;
  let errors = 0;
  
  // Map to store category name -> categoryId
  const categoryMap = new Map();
  
  // Create/update categories
  console.log('Creating categories...\n');
  let sortOrder = 1;
  
  for (const categoryName of categories) {
    try {
      const [category, created] = await ProductCategory.findOrCreate({
        where: {
          tenantId,
          name: categoryName
        },
        defaults: {
          description: '',
          sortOrder: sortOrder++,
          isActive: true
        }
      });
      
      categoryMap.set(categoryName, category.id);
      
      if (created) {
        categoriesCreated++;
        console.log(`✅ Created category: ${categoryName}`);
      } else {
        categoriesUpdated++;
        console.log(`📝 Category exists: ${categoryName}`);
      }
    } catch (error) {
      console.error(`❌ Error creating category "${categoryName}":`, error.message);
      errors++;
    }
  }
  
  console.log();
  console.log('Creating products with variants...\n');
  
  // Create/update products
  let productIndex = 0;
  for (const [productName, data] of products) {
    productIndex++;
    
    try {
      const categoryId = categoryMap.get(data.category);
      
      // Determine base price (use Regular variant if exists, otherwise first variant)
      const regularVariant = data.variants.find(v => 
        v.name.toLowerCase() === 'regular'
      );
      const basePrice = regularVariant ? regularVariant.price : data.variants[0].price;
      
      // Generate base SKU
      const timestamp = Date.now();
      const baseSKU = `DYN-${timestamp}-${productIndex}`;
      
      // Generate variant SKUs
      const variantsWithSKU = data.variants.map(v => ({
        name: v.name,
        price: v.price,
        sku: generateVariantSKU(baseSKU, v.name)
      }));
      
      // Build productDetails
      const productDetails = {
        variants: variantsWithSKU,
        extras: data.extras,
        hasVariants: data.variants.length > 1,
        hasExtras: data.extras.length > 0
      };
      
      // Check if product exists (by name and tenant)
      const existingProduct = await Product.findOne({
        where: {
          tenantId,
          name: productName
        }
      });
      
      if (existingProduct) {
        // Update existing product
        await existingProduct.update({
          description: data.description,
          categoryId,
          price: basePrice,
          productType: determineProductType(data.category),
          productDetails,
          isCustomized: data.extras.length > 0,
          isActive: true
        });
        
        productsUpdated++;
        console.log(`📝 Updated: ${productName} (${data.variants.length} variants, ${data.extras.length} extras)`);
      } else {
        // Create new product
        await Product.create({
          tenantId,
          name: productName,
          description: data.description,
          sku: baseSKU,
          categoryId,
          price: basePrice,
          productType: determineProductType(data.category),
          cost: 0,
          stockQuantity: 0,
          productDetails,
          isActive: true,
          taxable: true,
          isCustomized: data.extras.length > 0,
          trackInventory: false
        });
        
        productsCreated++;
        console.log(`✅ Created: ${productName} (${data.variants.length} variants, ${data.extras.length} extras)`);
      }
      
    } catch (error) {
      console.error(`❌ Error importing "${productName}":`, error.message);
      errors++;
    }
  }
  
  return {
    categoriesCreated,
    categoriesUpdated,
    productsCreated,
    productsUpdated,
    errors
  };
}

/**
 * Main function
 */
async function main() {
  console.log('============================================================');
  console.log('DYNASTY MENU IMPORT WITH VARIANTS & EXTRAS');
  console.log('============================================================\n');
  
  // Get tenant ID from command line
  const tenantId = process.argv[2];
  
  if (!tenantId) {
    console.error('❌ Error: Tenant ID is required');
    console.log('\nUsage: node scripts/importDynastyMenuWithVariants.js <tenantId>');
    console.log('\nExample: node scripts/importDynastyMenuWithVariants.js 3151f7b8-b34c-4abc-8cf2-db4e9a5202e7');
    process.exit(1);
  }
  
  // Verify tenant exists
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    console.error(`❌ Error: Tenant not found: ${tenantId}`);
    process.exit(1);
  }
  
  console.log(`Tenant: ${tenant.name} (${tenantId})\n`);
  
  // Read Excel file
  const rawData = readExcelFile(EXCEL_FILE);
  
  // Group and parse data
  const { products, categories } = groupProductData(rawData);
  
  // Preview data
  previewData(products, categories);
  
  // Confirm import
  console.log('============================================================');
  console.log('IMPORT CONFIRMATION');
  console.log('============================================================\n');
  console.log('About to import:');
  console.log(`  - ${categories.size} categories`);
  console.log(`  - ${products.size} products`);
  console.log(`  - To tenant: ${tenant.name}`);
  console.log();
  
  // Simple confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Continue with import? (y/n): ', async (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('\n❌ Import cancelled\n');
      rl.close();
      process.exit(0);
    }
    
    rl.close();
    
    try {
      // Import to database
      const stats = await importToDatabase(tenantId, products, categories);
      
      // Print summary
      console.log();
      console.log('============================================================');
      console.log('IMPORT SUMMARY');
      console.log('============================================================\n');
      console.log(`Categories:`);
      console.log(`  ✅ Created: ${stats.categoriesCreated}`);
      console.log(`  📝 Updated: ${stats.categoriesUpdated}`);
      console.log();
      console.log(`Products:`);
      console.log(`  ✅ Created: ${stats.productsCreated}`);
      console.log(`  📝 Updated: ${stats.productsUpdated}`);
      console.log(`  ❌ Errors: ${stats.errors}`);
      console.log();
      console.log('============================================================');
      console.log('✅ IMPORT COMPLETED');
      console.log('============================================================\n');
      
    } catch (error) {
      console.error('\n❌ Import failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
    
    process.exit(0);
  });
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
