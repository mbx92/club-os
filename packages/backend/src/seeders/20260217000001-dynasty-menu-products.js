'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Dynasty Menu 2026 - Products with Variants & Extras
 * 
 * Seeder based on Dynasty_Menu_2026_FULL.xlsx import script.
 * Creates ProductCategories and Products with productDetails JSONB
 * containing variants and extras for each tenant.
 */

// ── Raw menu data from Dynasty_Menu_2026_FULL.xlsx ──────────────────────────
const RAW_MENU = [
  // ── Coffee & Tea ──
  { category: 'Coffee & Tea', name: 'Espresso', variant: 'Regular', price: 28000 },
  { category: 'Coffee & Tea', name: 'Macchiato', variant: 'Regular', price: 28000 },
  { category: 'Coffee & Tea', name: 'Cappuccino', variant: 'Regular', price: 35000 },
  { category: 'Coffee & Tea', name: 'Cappuccino', variant: 'Large', price: 50000 },
  { category: 'Coffee & Tea', name: 'Latte', variant: 'Regular', price: 35000 },
  { category: 'Coffee & Tea', name: 'Latte', variant: 'Large', price: 50000 },
  { category: 'Coffee & Tea', name: 'Long Black / Americano', variant: 'Regular', price: 30000 },
  { category: 'Coffee & Tea', name: 'Piccolo Latte', variant: 'Regular', price: 30000 },
  { category: 'Coffee & Tea', name: 'Bali Coffee', variant: 'Cup', price: 20000 },
  { category: 'Coffee & Tea', name: 'Bali Coffee', variant: 'Pot', price: 30000 },
  { category: 'Coffee & Tea', name: 'Extra Shot Coffee', variant: 'Add On', price: 10000 },
  { category: 'Coffee & Tea', name: 'Hot Tea', variant: 'Cup', price: 25000, description: 'English Breakfast / Green Tea / Chamomile' },
  { category: 'Coffee & Tea', name: 'Hot Tea', variant: 'Pot', price: 35000, description: 'English Breakfast / Green Tea / Chamomile' },
  { category: 'Coffee & Tea', name: 'Hot Ginger', variant: 'Regular', price: 25000 },
  { category: 'Coffee & Tea', name: 'Iced Lychee Tea', variant: 'Regular', price: 25000 },
  { category: 'Coffee & Tea', name: 'Matcha Latte', variant: 'Regular', price: 40000 },
  { category: 'Coffee & Tea', name: 'Matcha Latte', variant: 'Large', price: 50000 },

  // ── Smoothies ──
  { category: 'Smoothies', name: 'Vitamin C', variant: 'Regular', price: 55000, description: 'lemon, orange, lime, blueberry, strawberry, soy milk, honey, yogurt' },
  { category: 'Smoothies', name: 'Sexy Nutty', variant: 'Regular', price: 55000, description: 'peanut butter, vanilla ice cream, banana, honey, milk, chia' },
  { category: 'Smoothies', name: 'Tropical', variant: 'Regular', price: 55000, description: 'pineapple, mango, banana, coconut milk, honey, yogurt' },
  { category: 'Smoothies', name: 'Blessing Berry', variant: 'Regular', price: 55000, description: 'blueberry, blackberry, cranberry, raspberry, strawberry, honey, yogurt' },
  { category: 'Smoothies', name: 'Antistress', variant: 'Regular', price: 55000, description: 'spinach, pineapple, orange, avocado, banana, strawberry, honey, yogurt' },

  // ── Healthy Booster ──
  { category: 'Healthy Booster', name: 'Energy', variant: 'Regular', price: 45000, description: 'apple, carrot, celery, cucumber, spinach' },
  { category: 'Healthy Booster', name: 'Refresh', variant: 'Regular', price: 45000, description: 'apple, mint, orange, honey, lime' },
  { category: 'Healthy Booster', name: 'Weight Loss', variant: 'Regular', price: 45000, description: 'carrot, orange, apple, beetroot, lime' },
  { category: 'Healthy Booster', name: 'Turmeric Sunrise', variant: 'Regular', price: 45000, description: 'apple, pear, carrot, celery, lime, turmeric, ginger, honey' },
  { category: 'Healthy Booster', name: 'Anti Inflammatory', variant: 'Regular', price: 45000, description: 'turmeric, ginger, tamarind, honey, lime juice' },

  // ── Fresh Fruit Juice ──
  { category: 'Fresh Fruit Juice', name: 'Pure Tangerine', variant: 'Regular', price: 40000 },
  { category: 'Fresh Fruit Juice', name: 'Whole Coconut', variant: 'Regular', price: 35000 },
  { category: 'Fresh Fruit Juice', name: 'Avocado / Mango / Carrot / Mixed Fruit', variant: 'Regular', price: 45000 },
  { category: 'Fresh Fruit Juice', name: 'Orange / Lime / Watermelon / Pineapple / Banana', variant: 'Regular', price: 35000 },

  // ── Protein Shake ──
  { category: 'Protein Shake', name: 'Budy Power', variant: 'Regular', price: 65000, description: 'banana, almond milk, 1 scoop protein powder' },
  { category: 'Protein Shake', name: 'Berry Blast Protein', variant: 'Regular', price: 76000, description: 'yogurt, pure orange, blueberry, raspberry, strawberry, 1 scoop protein powder' },
  { category: 'Protein Shake', name: 'Whey Power', variant: 'Regular', price: 49000, description: 'banana, whey protein, almond milk' },
  { category: 'Protein Shake', name: 'BCAA Boost', variant: 'Regular', price: 39000, description: '1 scoop BCAA boost, water, ice and shaken' },
  { category: 'Protein Shake', name: 'Pre Work Out', variant: 'Regular', price: 39000, description: '1 scoop legendary pre work out, water, ice and shaken' },
  { category: 'Protein Shake', name: 'Amino', variant: 'Per Pcs', price: 5000 },

  // ── Breakfast ──
  { category: 'Breakfast', name: 'Protein Plates', variant: 'Regular', price: 89000, description: '150g grilled chicken breast, eggs your way, bacon, toast, mushroom, spinach, tomato chutney' },
  { category: 'Breakfast', name: 'Salmon Avocado On Toast', variant: 'Regular', price: 79000, description: 'sourdough with creamy dill, onion and capers' },
  { category: 'Breakfast', name: 'Roasted Pumpkin Feta', variant: 'Regular', price: 69000, description: 'hashbrowns, poached egg, basil pesto and walnut' },
  { category: 'Breakfast', name: 'Bacon Omelette', variant: 'Regular', price: 69000, description: 'tomato, leek, onion, toast on the side' },
  { category: 'Breakfast', name: 'Scrambled Eggs', variant: 'Regular', price: 65000, description: '3 eggs, parsley with toast and sauteed mushroom' },
  { category: 'Breakfast', name: 'Eggs Benedict', variant: 'Regular', price: 50000, description: 'english muffin, poached eggs, spinach, mushroom, caramelized onion, hollandaise', extras: 'Add ham/bacon 25000 | Add smoked salmon 35000' },
  { category: 'Breakfast', name: 'Oat Chia Porridge', variant: 'Regular', price: 65000, description: 'oat, chia, milk, toasted almond, coconut, strawberry, dried raisin, cranberry and banana' },
  { category: 'Breakfast', name: 'Strawberry Banana Crepe', variant: 'Regular', price: 45000, extras: 'Add Nutella 15000' },
  { category: 'Breakfast', name: 'Granola & Yoghurt Bowl', variant: 'Regular', price: 70000, description: 'banana, strawberry, pineapple, mango, mixed berry compote, chia seeds and wild honey' },

  // ── Salad & Others ──
  { category: 'Salad & Others', name: 'Quinoa', variant: 'Regular', price: 75000, description: 'pumpkin, avocado, spinach, carrot, red cabbage, feta cheese, summer dressing' },
  { category: 'Salad & Others', name: 'Grilled Chicken Salad', variant: 'Regular', price: 70000, description: 'romaine, carrot, red cabbage, mint, cashew nut' },
  { category: 'Salad & Others', name: 'Caesar Salad with Chicken or Bacon', variant: 'Regular', price: 70000 },
  { category: 'Salad & Others', name: 'Fries / Sweet Potato Fries', variant: 'Regular', price: 30000 },
  { category: 'Salad & Others', name: 'Rice', variant: 'Regular', price: 15000 },
  { category: 'Salad & Others', name: 'Spicy Basil Chicken', variant: 'Regular', price: 75000 },
  { category: 'Salad & Others', name: 'Chicken Cordon Bleu', variant: 'Regular', price: 90000, description: 'ham and cheese stuffed chicken breast' },
  { category: 'Salad & Others', name: 'Grilled Chicken Breast 200gr', variant: 'Regular', price: 85000 },
  { category: 'Salad & Others', name: 'Chicken Steak', variant: 'Regular', price: 85000, description: 'turmeric sauce, sauteed potato and vegetables' },
  { category: 'Salad & Others', name: 'Beef Yakiniku', variant: 'Regular', price: 95000 },
  { category: 'Salad & Others', name: 'Local Beef Steak 200gr', variant: 'Regular', price: 135000, description: 'served with mashed potato, sauteed veggies and sauce' },

  // ── Pasta ──
  { category: 'Pasta', name: 'Spicy Alfredo Chicken', variant: 'Regular', price: 85000 },
  { category: 'Pasta', name: 'Creamy Smoked Salmon', variant: 'Regular', price: 95000 },
  { category: 'Pasta', name: 'Spaghetti Bolognese', variant: 'Regular', price: 80000 },
  { category: 'Pasta', name: 'Carbonara Bacon', variant: 'Regular', price: 85000 },
  { category: 'Pasta', name: 'Aglio E Olio', variant: 'Regular', price: 55000, extras: 'Add Chicken 25000 | Add Prawn 35000' },

  // ── Burger & Sandwich ──
  { category: 'Burger & Sandwich', name: 'The Ultimate Wagyu Burger', variant: 'Regular', price: 135000, description: 'bacon, mushroom, hashbrown, sunny side up, onion, tomato, pickle, double cheese' },
  { category: 'Burger & Sandwich', name: 'Classic Cheese Burger', variant: 'Regular', price: 105000, description: 'beef patty, lettuce, tomato, pickle, cheese, onion, ingka\'s mayo' },
  { category: 'Burger & Sandwich', name: 'Grilled Chicken Burger', variant: 'Regular', price: 85000, description: 'tomato cayenne chutney, tapenade aioli, egg, onion, tomato, lettuce, cheese' },
  { category: 'Burger & Sandwich', name: 'Clubhouse Sandwich', variant: 'Regular', price: 90000, description: 'toasted bread with chicken mayo, onion, tomato, avocado, ham, boiled egg, cheese, lettuce' },
  { category: 'Burger & Sandwich', name: 'Chicken Schnitzel Sandwich', variant: 'Regular', price: 85000, description: 'country bread, rucola, coleslaw, caramelized onions, mozzarella, tomato chutney, garlic aioli, honey mustard' },

  // ── Protein Bowl ──
  { category: 'Protein Bowl', name: 'Gainer', variant: 'Regular', price: 95000, description: 'chocolate protein, banana, peanut butter, nutella, cocoa powder, honey, yoghurt + toppings' },
  { category: 'Protein Bowl', name: 'Muscle', variant: 'Regular', price: 95000, description: 'vanilla protein, raspberry, strawberry, mango, milk, yoghurt + toppings' },
  { category: 'Protein Bowl', name: 'Power', variant: 'Regular', price: 105000, description: 'strawberry protein, acai, blackberry, banana, gojiberry, milk, yoghurt + toppings' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse extras string format: "Add ham/bacon 25000 | Add smoked salmon 35000"
 */
function parseExtras(extrasString) {
  if (!extrasString) return [];
  return extrasString
    .split('|')
    .map(s => s.trim())
    .map(part => {
      const match = part.match(/^(.+?)\s+(\d+)$/);
      if (!match) return null;
      return { name: match[1].trim(), price: parseInt(match[2], 10) };
    })
    .filter(Boolean);
}

/**
 * Group raw rows into unique products with aggregated variants/extras
 */
function buildProducts(rawMenu) {
  const productsMap = new Map();
  const categoriesSet = new Set();

  for (const row of rawMenu) {
    categoriesSet.add(row.category);

    if (!productsMap.has(row.name)) {
      productsMap.set(row.name, {
        name: row.name,
        category: row.category,
        description: row.description || '',
        variants: [],
        extras: [],
      });
    }

    const product = productsMap.get(row.name);
    product.variants.push({ name: row.variant, price: row.price });

    if (row.extras && product.extras.length === 0) {
      product.extras = parseExtras(row.extras);
    }
    if (!product.description && row.description) {
      product.description = row.description;
    }
  }

  return { productsMap, categories: Array.from(categoriesSet) };
}

// ── Category display config ─────────────────────────────────────────────────
const CATEGORY_META = {
  'Coffee & Tea':       { color: '#6F4E37', icon: 'cafe',       productType: 'beverage' },
  'Smoothies':          { color: '#E91E63', icon: 'nutrition',   productType: 'beverage' },
  'Healthy Booster':    { color: '#4CAF50', icon: 'leaf',        productType: 'beverage' },
  'Fresh Fruit Juice':  { color: '#FF9800', icon: 'water',       productType: 'beverage' },
  'Protein Shake':      { color: '#2196F3', icon: 'fitness',     productType: 'beverage' },
  'Breakfast':          { color: '#FF5722', icon: 'sunny',       productType: 'food' },
  'Salad & Others':     { color: '#8BC34A', icon: 'restaurant',  productType: 'food' },
  'Pasta':              { color: '#FFC107', icon: 'pizza',       productType: 'food' },
  'Burger & Sandwich':  { color: '#795548', icon: 'fast-food',   productType: 'food' },
  'Protein Bowl':       { color: '#9C27B0', icon: 'bowl',        productType: 'food' },
};

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all tenants
    const tenants = await queryInterface.sequelize.query(
      'SELECT id FROM "Tenants";',
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tenants.length === 0) {
      console.log('No tenants found. Skipping Dynasty menu seeder.');
      return;
    }

    const { productsMap, categories } = buildProducts(RAW_MENU);
    const now = new Date();

    // ── Insert categories per tenant ────────────────────────────────────
    const categoryRows = [];
    // Map: `${tenantId}::${categoryName}` → categoryId
    const categoryIdMap = new Map();

    tenants.forEach(tenant => {
      categories.forEach((catName, idx) => {
        const id = uuidv4();
        const meta = CATEGORY_META[catName] || { color: '#9E9E9E', icon: 'pricetag' };

        categoryIdMap.set(`${tenant.id}::${catName}`, id);

        categoryRows.push({
          id,
          tenantId: tenant.id,
          name: catName,
          description: '',
          parentId: null,
          color: meta.color,
          icon: meta.icon,
          sortOrder: idx + 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      });
    });

    await queryInterface.bulkInsert('ProductCategories', categoryRows, {});
    console.log(`✅ Created ${categoryRows.length} product categories for ${tenants.length} tenant(s)`);

    // ── Insert products per tenant ──────────────────────────────────────
    const productRows = [];
    let productIdx = 0;

    tenants.forEach(tenant => {
      productIdx = 0;
      for (const [, data] of productsMap) {
        productIdx++;
        const categoryId = categoryIdMap.get(`${tenant.id}::${data.category}`);

        // Base price = Regular variant price, or first variant
        const regularVariant = data.variants.find(v => v.name.toLowerCase() === 'regular');
        const basePrice = regularVariant ? regularVariant.price : data.variants[0].price;

        // SKU format: DYN-xxx
        const baseSKU = `DYN-${String(productIdx).padStart(3, '0')}`;

        // Variants with SKU
        const variantsWithSKU = data.variants.map(v => ({
          name: v.name,
          price: v.price,
          sku: `${baseSKU}-${v.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3)}`,
        }));

        // productDetails JSONB
        const productDetails = {
          variants: variantsWithSKU,
          extras: data.extras,
          hasVariants: data.variants.length > 1,
          hasExtras: data.extras.length > 0,
        };

        productRows.push({
          id: uuidv4(),
          tenantId: tenant.id,
          name: data.name,
          description: data.description || null,
          sku: baseSKU,
          barcode: null,
          category: data.category,          // legacy string field
          categoryId,                       // FK to ProductCategories
          locationId: null,
          price: basePrice,
          cost: 0,
          taxRate: 0,
          stockQuantity: 0,
          minStockLevel: 0,
          unit: 'pcs',
          isActive: true,
          trackInventory: false,
          image: null,
          productDetails: JSON.stringify(productDetails),
          productType: (CATEGORY_META[data.category] || {}).productType || 'food',
          taxable: true,
          isCustomized: data.extras.length > 0,
          version: 0,
          createdBy: null,
          updatedBy: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }
    });

    await queryInterface.bulkInsert('Products', productRows, {});
    console.log(`✅ Created ${productRows.length} products (${productsMap.size} menu items × ${tenants.length} tenant(s))`);
  },

  async down(queryInterface, Sequelize) {
    // Remove seeded products by SKU prefix
    await queryInterface.bulkDelete('Products', {
      sku: { [Sequelize.Op.like]: 'DYN-%' }
    });

    // Remove seeded categories by name
    const categoryNames = Object.keys(CATEGORY_META);
    await queryInterface.bulkDelete('ProductCategories', {
      name: { [Sequelize.Op.in]: categoryNames }
    });

    console.log('✅ Reverted Dynasty menu seeder');
  }
};
