# FASE 2: MODUL POS & RESTORAN
## Point of Sale dan Manajemen Restoran/Café

**Status**: 📋 Planning  
**Prioritas**: 🔴 High  
**Estimasi**: 3 minggu  
**Dependencies**: Fase 1 (Subscription Features)

---

## 🎯 Tujuan Fase Ini

Membangun modul **POS (Point of Sale)** dan **Restoran/Café** yang lengkap untuk:

1. **POS**: Penjualan produk retail (merchandise, suplemen, minuman, makanan)
2. **Restoran**: Manajemen meja, order makanan/minuman, kitchen management
3. **Inventory**: Stock management dengan alert low stock
4. **Product Catalog**: Kategori produk, variants, pricing
5. **Sales Analytics**: Laporan penjualan per produk, kategori, periode
6. **Multi-location**: Support untuk multiple outlets per tenant
7. **Custom Menu**: Support Custom Product (additional ingredients or custom)

Modul ini akan terintegrasi dengan:
- **Transaction System** yang sudah ada
- **Feature-gating** dari Fase 1
- **Thermal Printing** di Fase 3
- **Combined Billing** di Fase 6

---

## 📊 Database Schema

### 1. Model `Product` (EXISTING - EXTEND)

Model `Product` sudah ada, perlu diperluas:

```javascript
// models/product.js (EXTEND)
Product.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  // Basic Info
  sku: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  
  // Category (NEW)
  categoryId: { type: DataTypes.UUID },  // FK ke ProductCategory
  
  // Pricing
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  cost: { type: DataTypes.DECIMAL(10, 2) },  // Harga pokok (untuk profit margin)
  
  // Stock Management
  stockQuantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  minStockLevel: { type: DataTypes.INTEGER, defaultValue: 0 },  // Alert threshold
  trackInventory: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Product Type (NEW)
  productType: { 
    type: DataTypes.ENUM('retail', 'food', 'beverage', 'service'),
    defaultValue: 'retail'
  },
  
  // Restaurant Specific (NEW)
  preparationTime: { type: DataTypes.INTEGER },  // Dalam menit
  isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },  // Untuk menu availability
  
  // Multi-location (NEW)
  locationId: { type: DataTypes.UUID },  // FK ke Location (optional)
  
  // Tax & Discounts
  taxable: { type: DataTypes.BOOLEAN, defaultValue: true },
  taxRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },  // e.g., 10.00 for 10%
  
  // Images
  imageUrl: DataTypes.STRING,
  thumbnailUrl: DataTypes.STRING,
  
  // Variants (JSON)
  variants: DataTypes.JSONB,  // e.g., [{ name: "Size", values: ["S", "M", "L"] }]
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Optimistic Locking
  version: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'Products',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['categoryId'] },
    { fields: ['locationId'] },
    { fields: ['sku'], unique: true },
    { fields: ['productType'] },
    { fields: ['isActive'] }
  ]
});
```

### 2. Model `ProductCategory` (NEW)

```javascript
// models/productCategory.js
ProductCategory.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  
  // Hierarchy Support
  parentId: { type: DataTypes.UUID },  // Self-referencing for subcategories
  
  // Display
  color: DataTypes.STRING,  // Hex color untuk UI
  icon: DataTypes.STRING,   // Icon name atau URL
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ProductCategory',
  tableName: 'ProductCategories',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['parentId'] },
    { fields: ['sortOrder'] }
  ]
});
```

### 3. Model `Location` (NEW)

```javascript
// models/location.js
Location.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING,  // e.g., "LOC001", "OUTLET-A"
  
  // Address
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  province: DataTypes.STRING,
  postalCode: DataTypes.STRING,
  country: { type: DataTypes.STRING, defaultValue: 'Indonesia' },
  
  // Contact
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  
  // Location Type
  locationType: {
    type: DataTypes.ENUM('main', 'branch', 'warehouse'),
    defaultValue: 'main'
  },
  
  // GPS Coordinates (untuk future features)
  latitude: DataTypes.DECIMAL(10, 8),
  longitude: DataTypes.DECIMAL(11, 8),
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'Location',
  tableName: 'Locations',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['code'], unique: true },
    { fields: ['locationType'] }
  ]
});
```

### 4. Model `RestaurantTable` (NEW)

```javascript
// models/restaurantTable.js
RestaurantTable.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },  // FK ke Location
  
  // Table Info
  tableNumber: { type: DataTypes.STRING, allowNull: false },
  tableName: DataTypes.STRING,  // e.g., "VIP Table 1", "Outdoor A1"
  capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
  
  // Layout Position (untuk Fase 4)
  positionX: DataTypes.INTEGER,
  positionY: DataTypes.INTEGER,
  width: DataTypes.INTEGER,
  height: DataTypes.INTEGER,
  shape: {
    type: DataTypes.ENUM('rectangle', 'circle', 'square'),
    defaultValue: 'rectangle'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'),
    defaultValue: 'available'
  },
  
  // Current Session (jika ada)
  currentOrderId: { type: DataTypes.UUID },  // FK ke Transaction (nullable)
  occupiedAt: DataTypes.DATE,
  occupiedBy: DataTypes.STRING,  // Guest name
  
  // QR Code (untuk self-order)
  qrCode: DataTypes.STRING,
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'RestaurantTable',
  tableName: 'RestaurantTables',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['locationId'] },
    { fields: ['status'] },
    { fields: ['tableNumber', 'tenantId'], unique: true }
  ]
});
```

### 5. Model `StockMovement` (NEW)

```javascript
// models/stockMovement.js
StockMovement.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },
  
  // Movement Info
  movementType: {
    type: DataTypes.ENUM('in', 'out', 'adjustment', 'transfer'),
    allowNull: false
  },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  
  // Balance
  previousQuantity: DataTypes.INTEGER,
  newQuantity: DataTypes.INTEGER,
  
  // Reference
  referenceType: DataTypes.STRING,  // 'purchase', 'sale', 'adjustment', 'transfer'
  referenceId: DataTypes.UUID,      // TransactionId, PurchaseOrderId, etc.
  
  // Notes
  notes: DataTypes.TEXT,
  
  // User who performed the action
  performedBy: { type: DataTypes.UUID },  // FK ke User
  
  // Audit
  createdAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'StockMovement',
  tableName: 'StockMovements',
  timestamps: true,
  updatedAt: false,  // Stock movements tidak bisa diupdate
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['productId'] },
    { fields: ['locationId'] },
    { fields: ['movementType'] },
    { fields: ['referenceType', 'referenceId'] },
    { fields: ['createdAt'] }
  ]
});
```

### 6. Associations

```javascript
// models/index.js (ADD)

// Product associations
Product.belongsTo(ProductCategory, { as: 'category', foreignKey: 'categoryId' });
Product.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
Product.belongsTo(Tenant, { foreignKey: 'tenantId' });

ProductCategory.hasMany(Product, { as: 'products', foreignKey: 'categoryId' });
ProductCategory.belongsTo(ProductCategory, { as: 'parent', foreignKey: 'parentId' });
ProductCategory.hasMany(ProductCategory, { as: 'children', foreignKey: 'parentId' });
ProductCategory.belongsTo(Tenant, { foreignKey: 'tenantId' });

Location.hasMany(Product, { as: 'products', foreignKey: 'locationId' });
Location.hasMany(RestaurantTable, { as: 'tables', foreignKey: 'locationId' });
Location.belongsTo(Tenant, { foreignKey: 'tenantId' });

RestaurantTable.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
RestaurantTable.belongsTo(Tenant, { foreignKey: 'tenantId' });
RestaurantTable.belongsTo(Transaction, { as: 'currentOrder', foreignKey: 'currentOrderId' });

StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
StockMovement.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
StockMovement.belongsTo(User, { as: 'performer', foreignKey: 'performedBy' });
StockMovement.belongsTo(Tenant, { foreignKey: 'tenantId' });

Product.hasMany(StockMovement, { as: 'stockMovements', foreignKey: 'productId' });
```

---

## 🏗️ Controllers

### 1. Product Controller (NEW)

```javascript
// controllers/productController.js
const { Product, ProductCategory, StockMovement, Tenant } = require('../models');
const { sequelize } = require('../models');
const sequenceGenerator = require('../utils/sequenceGenerator');

class ProductController {
  // GET /api/v1/pos/products
  async getAllProducts(req, res) {
    try {
      const { categoryId, productType, isAvailable, search, page = 1, limit = 50 } = req.query;
      const tenantId = req.user.tenantId;
      
      const where = { tenantId };
      
      if (categoryId) where.categoryId = categoryId;
      if (productType) where.productType = productType;
      if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      const offset = (page - 1) * limit;
      
      const { rows: products, count } = await Product.findAndCountAll({
        where,
        include: [
          { model: ProductCategory, as: 'category' },
          { model: Location, as: 'location' }
        ],
        order: [['name', 'ASC']],
        limit: parseInt(limit),
        offset: offset
      });
      
      res.json({
        success: true,
        data: products,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, message: 'Error fetching products' });
    }
  }
  
  // POST /api/v1/pos/products
  async createProduct(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const tenantId = req.user.tenantId;
      const productData = req.body;
      
      // Generate SKU if not provided
      if (!productData.sku) {
        const prefix = 'PRD';
        const sku = await sequenceGenerator.generate(tenantId, 'product', prefix);
        productData.sku = sku;
      }
      
      const product = await Product.create({
        ...productData,
        tenantId
      }, { transaction });
      
      // Create initial stock movement if stockQuantity > 0
      if (productData.stockQuantity > 0) {
        await StockMovement.create({
          tenantId,
          productId: product.id,
          locationId: productData.locationId,
          movementType: 'in',
          quantity: productData.stockQuantity,
          previousQuantity: 0,
          newQuantity: productData.stockQuantity,
          referenceType: 'initial',
          referenceId: product.id,
          notes: 'Initial stock',
          performedBy: req.user.id
        }, { transaction });
      }
      
      await transaction.commit();
      
      // Reload dengan associations
      await product.reload({
        include: [
          { model: ProductCategory, as: 'category' },
          { model: Location, as: 'location' }
        ]
      });
      
      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create product error:', error);
      res.status(500).json({ success: false, message: 'Error creating product' });
    }
  }
  
  // PUT /api/v1/pos/products/:id
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const updates = req.body;
      
      const product = await Product.findOne({ where: { id, tenantId } });
      
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      // Prevent direct stock update (use adjustment endpoint)
      delete updates.stockQuantity;
      
      await product.update(updates);
      
      await product.reload({
        include: [
          { model: ProductCategory, as: 'category' },
          { model: Location, as: 'location' }
        ]
      });
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, message: 'Error updating product' });
    }
  }
  
  // POST /api/v1/pos/products/:id/adjust-stock
  async adjustStock(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { quantity, movementType, notes } = req.body;
      const tenantId = req.user.tenantId;
      
      const product = await Product.findOne({
        where: { id, tenantId },
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      
      const previousQuantity = product.stockQuantity;
      let newQuantity;
      
      if (movementType === 'in') {
        newQuantity = previousQuantity + quantity;
      } else if (movementType === 'out') {
        newQuantity = previousQuantity - quantity;
        if (newQuantity < 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock'
          });
        }
      } else {
        // adjustment - set absolute value
        newQuantity = quantity;
      }
      
      await product.update({ stockQuantity: newQuantity }, { transaction });
      
      await StockMovement.create({
        tenantId,
        productId: product.id,
        locationId: product.locationId,
        movementType: movementType || 'adjustment',
        quantity: movementType === 'out' ? -quantity : quantity,
        previousQuantity,
        newQuantity,
        referenceType: 'manual',
        notes,
        performedBy: req.user.id
      }, { transaction });
      
      await transaction.commit();
      
      res.json({
        success: true,
        data: {
          productId: product.id,
          previousQuantity,
          newQuantity,
          movement: movementType
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Adjust stock error:', error);
      res.status(500).json({ success: false, message: 'Error adjusting stock' });
    }
  }
  
  // GET /api/v1/pos/products/low-stock
  async getLowStockProducts(req, res) {
    try {
      const tenantId = req.user.tenantId;
      
      const products = await Product.findAll({
        where: {
          tenantId,
          trackInventory: true,
          stockQuantity: {
            [Op.lte]: sequelize.col('minStockLevel')
          }
        },
        include: [
          { model: ProductCategory, as: 'category' },
          { model: Location, as: 'location' }
        ],
        order: [['stockQuantity', 'ASC']]
      });
      
      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      console.error('Get low stock products error:', error);
      res.status(500).json({ success: false, message: 'Error fetching low stock products' });
    }
  }
}

module.exports = new ProductController();
```

### 2. Restaurant Table Controller (NEW)

```javascript
// controllers/restaurantTableController.js
const { RestaurantTable, Location, Transaction } = require('../models');
const { Op } = require('sequelize');

class RestaurantTableController {
  // GET /api/v1/restaurant/tables
  async getAllTables(req, res) {
    try {
      const { locationId, status } = req.query;
      const tenantId = req.user.tenantId;
      
      const where = { tenantId };
      if (locationId) where.locationId = locationId;
      if (status) where.status = status;
      
      const tables = await RestaurantTable.findAll({
        where,
        include: [
          { model: Location, as: 'location' },
          { 
            model: Transaction, 
            as: 'currentOrder',
            required: false 
          }
        ],
        order: [['tableNumber', 'ASC']]
      });
      
      res.json({
        success: true,
        data: tables
      });
    } catch (error) {
      console.error('Get tables error:', error);
      res.status(500).json({ success: false, message: 'Error fetching tables' });
    }
  }
  
  // POST /api/v1/restaurant/tables
  async createTable(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const tableData = req.body;
      
      const table = await RestaurantTable.create({
        ...tableData,
        tenantId
      });
      
      await table.reload({
        include: [{ model: Location, as: 'location' }]
      });
      
      res.status(201).json({
        success: true,
        data: table
      });
    } catch (error) {
      console.error('Create table error:', error);
      res.status(500).json({ success: false, message: 'Error creating table' });
    }
  }
  
  // PUT /api/v1/restaurant/tables/:id/status
  async updateTableStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, occupiedBy, currentOrderId } = req.body;
      const tenantId = req.user.tenantId;
      
      const table = await RestaurantTable.findOne({ where: { id, tenantId } });
      
      if (!table) {
        return res.status(404).json({ success: false, message: 'Table not found' });
      }
      
      const updates = { status };
      
      if (status === 'occupied') {
        updates.occupiedAt = new Date();
        updates.occupiedBy = occupiedBy;
        updates.currentOrderId = currentOrderId;
      } else if (status === 'available') {
        updates.occupiedAt = null;
        updates.occupiedBy = null;
        updates.currentOrderId = null;
      }
      
      await table.update(updates);
      
      res.json({
        success: true,
        data: table
      });
    } catch (error) {
      console.error('Update table status error:', error);
      res.status(500).json({ success: false, message: 'Error updating table status' });
    }
  }
}

module.exports = new RestaurantTableController();
```

---

## 🛣️ Routes

### 1. POS Routes (NEW)

```javascript
// routes/v1/posRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireModule, enforceLimit } = require('../../middlewares/featureGateMiddleware');
const caslMiddleware = require('../../middlewares/caslMiddleware');
const { Product } = require('../../models');

// All routes require authentication and 'pos' module access
router.use(authMiddleware.authenticate);
router.use(requireModule('pos'));

// Products
router.get('/products', 
  caslMiddleware.authorize('read', 'products'),
  productController.getAllProducts
);

router.post('/products',
  caslMiddleware.authorize('create', 'products'),
  enforceLimit('maxProducts', async (tenantId) => {
    return await Product.count({ where: { tenantId } });
  }),
  productController.createProduct
);

router.get('/products/low-stock',
  caslMiddleware.authorize('read', 'products'),
  productController.getLowStockProducts
);

router.put('/products/:id',
  caslMiddleware.authorize('update', 'products'),
  productController.updateProduct
);

router.post('/products/:id/adjust-stock',
  caslMiddleware.authorize('update', 'products'),
  productController.adjustStock
);

// Categories (implement categoryController)
router.get('/categories', /* categoryController.getAll */);
router.post('/categories', /* categoryController.create */);

module.exports = router;
```

### 2. Restaurant Routes (NEW)

```javascript
// routes/v1/restaurantRoutes.js
const express = require('express');
const router = express.Router();
const restaurantTableController = require('../../controllers/restaurantTableController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireModule, enforceLimit } = require('../../middlewares/featureGateMiddleware');
const caslMiddleware = require('../../middlewares/caslMiddleware');
const { RestaurantTable } = require('../../models');

// All routes require authentication and 'restaurant' module access
router.use(authMiddleware.authenticate);
router.use(requireModule('restaurant'));

// Tables
router.get('/tables',
  caslMiddleware.authorize('read', 'tables'),
  restaurantTableController.getAllTables
);

router.post('/tables',
  caslMiddleware.authorize('create', 'tables'),
  enforceLimit('maxTables', async (tenantId) => {
    return await RestaurantTable.count({ where: { tenantId } });
  }),
  restaurantTableController.createTable
);

router.put('/tables/:id/status',
  caslMiddleware.authorize('update', 'tables'),
  restaurantTableController.updateTableStatus
);

module.exports = router;
```

### 3. Register Routes in app.js

```javascript
// src/app.js (ADD)
const posRoutes = require('./routes/v1/posRoutes');
const restaurantRoutes = require('./routes/v1/restaurantRoutes');

// ...existing routes...

app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/restaurant', restaurantRoutes);
```

---

## 📝 Implementation Checklist

### Week 1: Database & Models

- [ ] **Day 1-2: Database Migrations**
  - [ ] Create migration untuk extend `Product` model
  - [ ] Create migration untuk `ProductCategory` model
  - [ ] Create migration untuk `Location` model
  - [ ] Create migration untuk `RestaurantTable` model
  - [ ] Create migration untuk `StockMovement` model
  - [ ] Test migrations up/down

- [ ] **Day 3: Model Definitions**
  - [ ] Update `product.js` model
  - [ ] Create `productCategory.js` model
  - [ ] Create `location.js` model
  - [ ] Create `restaurantTable.js` model
  - [ ] Create `stockMovement.js` model
  - [ ] Setup associations di `models/index.js`

- [ ] **Day 4-5: Seeders**
  - [ ] Seed default product categories
  - [ ] Seed sample products untuk testing
  - [ ] Seed sample locations
  - [ ] Seed sample restaurant tables
  - [ ] Test data integrity

### Week 2: Controllers & Routes

- [ ] **Day 6-7: Product Controller**
  - [ ] Implement getAllProducts dengan filters
  - [ ] Implement createProduct dengan SKU generation
  - [ ] Implement updateProduct
  - [ ] Implement adjustStock dengan StockMovement
  - [ ] Implement getLowStockProducts
  - [ ] Unit tests untuk product controller

- [ ] **Day 8: Category & Location Controllers**
  - [ ] Implement categoryController (CRUD)
  - [ ] Implement locationController (CRUD)
  - [ ] Unit tests

- [ ] **Day 9-10: Restaurant Table Controller**
  - [ ] Implement getAllTables
  - [ ] Implement createTable
  - [ ] Implement updateTableStatus
  - [ ] Implement table occupancy logic
  - [ ] Unit tests

### Week 3: Integration & Testing

- [ ] **Day 11-12: Routes Setup**
  - [ ] Create posRoutes.js dengan feature gates
  - [ ] Create restaurantRoutes.js dengan feature gates
  - [ ] Register routes di app.js
  - [ ] Test route permissions dengan different plans

- [ ] **Day 13-14: Transaction Integration**
  - [ ] Update transactionController untuk handle product items
  - [ ] Implement stock deduction on transaction
  - [ ] Test combined transactions (existing functionality)

- [ ] **Day 15: Final Testing & Documentation**
  - [ ] Integration tests untuk complete POS flow
  - [ ] Integration tests untuk restaurant flow
  - [ ] Update API documentation
  - [ ] Update Postman collection
  - [ ] Deploy ke staging

---

## 🧪 Testing Examples

### Product Management Test

```javascript
describe('Product Controller', () => {
  it('should create product with auto-generated SKU', async () => {
    const response = await request(app)
      .post('/api/v1/pos/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Protein Shake',
        price: 50000,
        categoryId: categoryId,
        stockQuantity: 100
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.sku).toMatch(/^PRD-\d{8}-\d{4}$/);
  });
  
  it('should deduct stock on sale', async () => {
    // Create transaction with product
    // Check stock decreased
    // Check stock movement created
  });
});
```

---

## 📊 Success Metrics

- Product CRUD operations < 100ms response time
- Stock adjustment dengan zero race conditions
- Low stock alerts berfungsi real-time
- Table status update < 50ms

---

**Status**: Ready for implementation ✅  
**Next**: [PHASE-03-THERMAL-PRINTING.md](./PHASE-03-THERMAL-PRINTING.md)
