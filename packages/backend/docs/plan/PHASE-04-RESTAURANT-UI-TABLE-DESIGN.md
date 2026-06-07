# FASE 4: RESTAURANT UI & TABLE DESIGN
## Backend untuk Touchscreen UI dan Desain Table Layout Custom

**Status**: 📋 Planning  
**Prioritas**: 🟡 Medium  
**Estimasi**: 2 minggu  
**Dependencies**: Fase 2 (POS & Restaurant Module)

---

## 🎯 Tujuan Fase Ini

Membangun backend API untuk mendukung:

1. **Touchscreen-friendly UI** - API yang optimized untuk touchscreen interactions
2. **Custom table layout** - Tenant bisa design layout meja sesuai floor plan mereka
3. **Real-time table status** - WebSocket/polling untuk update status meja real-time
4. **Drag-and-drop table positioning** - JSON schema untuk posisi, ukuran, bentuk meja
5. **Multi-floor support** - Dukungan untuk multiple lantai/area restoran

---

## 📊 Database Schema

### 1. Model `TableLayout` (NEW)

```javascript
// models/tableLayout.js
TableLayout.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  locationId: { type: DataTypes.UUID },
  
  // Layout Info
  name: { type: DataTypes.STRING, allowNull: false },  // e.g., "Main Floor", "VIP Area", "Outdoor"
  floor: { type: DataTypes.INTEGER, defaultValue: 1 },
  
  // Canvas Settings
  canvasWidth: { type: DataTypes.INTEGER, defaultValue: 1920 },   // pixels
  canvasHeight: { type: DataTypes.INTEGER, defaultValue: 1080 },  // pixels
  gridSize: { type: DataTypes.INTEGER, defaultValue: 20 },        // snap to grid
  
  // Background
  backgroundImage: DataTypes.STRING,  // URL atau base64
  backgroundColor: { type: DataTypes.STRING, defaultValue: '#f5f5f5' },
  
  // Layout Configuration (JSON)
  layoutConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  /* Example layoutConfig:
  {
    "tables": [
      {
        "id": "table-uuid-1",
        "tableNumber": "A1",
        "x": 100,
        "y": 150,
        "width": 80,
        "height": 80,
        "shape": "circle",
        "rotation": 0,
        "capacity": 4,
        "color": "#4CAF50",
        "label": "VIP 1"
      },
      {
        "id": "table-uuid-2",
        "tableNumber": "A2",
        "x": 250,
        "y": 150,
        "width": 120,
        "height": 60,
        "shape": "rectangle",
        "rotation": 0,
        "capacity": 6,
        "color": "#2196F3",
        "label": "Regular"
      }
    ],
    "walls": [
      { "x1": 0, "y1": 0, "x2": 1920, "y2": 0, "color": "#333" },
      { "x1": 0, "y1": 0, "x2": 0, "y2": 1080, "color": "#333" }
    ],
    "decorations": [
      {
        "type": "text",
        "x": 960,
        "y": 50,
        "text": "Main Dining Area",
        "fontSize": 24,
        "color": "#000"
      },
      {
        "type": "image",
        "x": 100,
        "y": 100,
        "width": 50,
        "height": 50,
        "url": "/assets/plant.png"
      }
    ]
  }
  */
  
  // Status
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Audit
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
  deletedAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'TableLayout',
  tableName: 'TableLayouts',
  paranoid: true,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['locationId'] },
    { fields: ['floor'] },
    { fields: ['isDefault'] }
  ]
});
```

### 2. Extend `RestaurantTable` Model (FROM FASE 2)

Sudah ada field positioning di Fase 2, tapi perlu tambahan:

```javascript
// models/restaurantTable.js (ADD FIELDS)
RestaurantTable.init({
  // ... existing fields from Fase 2 ...
  
  // Layout Reference
  layoutId: { type: DataTypes.UUID },  // FK ke TableLayout
  
  // Color & Style
  color: { type: DataTypes.STRING, defaultValue: '#4CAF50' },
  icon: DataTypes.STRING,
  
  // Rotation (degrees)
  rotation: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  // Custom Label
  customLabel: DataTypes.STRING,
  
  // ... rest of existing fields ...
});
```

### 3. Model `TableStatusHistory` (NEW - Optional)

Untuk tracking perubahan status meja (analytics):

```javascript
// models/tableStatusHistory.js
TableStatusHistory.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  tableId: { type: DataTypes.UUID, allowNull: false },
  
  // Status Change
  fromStatus: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'),
  toStatus: DataTypes.ENUM('available', 'occupied', 'reserved', 'cleaning'),
  
  // Duration (calculated)
  duration: DataTypes.INTEGER,  // seconds
  
  // Order Info
  orderId: { type: DataTypes.UUID },  // FK ke Transaction
  totalAmount: DataTypes.DECIMAL(10, 2),
  
  // Timing
  startedAt: DataTypes.DATE,
  endedAt: DataTypes.DATE,
  
  // Audit
  createdAt: DataTypes.DATE
}, {
  sequelize,
  modelName: 'TableStatusHistory',
  tableName: 'TableStatusHistory',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['tenantId'] },
    { fields: ['tableId'] },
    { fields: ['startedAt'] },
    { fields: ['endedAt'] }
  ]
});
```

### 4. Associations

```javascript
// models/index.js (ADD)
TableLayout.belongsTo(Tenant, { foreignKey: 'tenantId' });
TableLayout.belongsTo(Location, { as: 'location', foreignKey: 'locationId' });
TableLayout.hasMany(RestaurantTable, { as: 'tables', foreignKey: 'layoutId' });

RestaurantTable.belongsTo(TableLayout, { as: 'layout', foreignKey: 'layoutId' });

TableStatusHistory.belongsTo(Tenant, { foreignKey: 'tenantId' });
TableStatusHistory.belongsTo(RestaurantTable, { as: 'table', foreignKey: 'tableId' });
TableStatusHistory.belongsTo(Transaction, { as: 'order', foreignKey: 'orderId' });
```

---

## 🏗️ Controllers

### 1. Table Layout Controller (NEW)

```javascript
// controllers/tableLayoutController.js
const { TableLayout, RestaurantTable, Location } = require('../models');
const { sequelize } = require('../models');

class TableLayoutController {
  // GET /api/v1/restaurant/layouts
  async getAllLayouts(req, res) {
    try {
      const { locationId } = req.query;
      const tenantId = req.user.tenantId;
      
      const where = { tenantId };
      if (locationId) where.locationId = locationId;
      
      const layouts = await TableLayout.findAll({
        where,
        include: [
          { model: Location, as: 'location' },
          { 
            model: RestaurantTable, 
            as: 'tables',
            include: [{ model: Transaction, as: 'currentOrder', required: false }]
          }
        ],
        order: [['floor', 'ASC'], ['name', 'ASC']]
      });
      
      res.json({
        success: true,
        data: layouts
      });
    } catch (error) {
      console.error('Get layouts error:', error);
      res.status(500).json({ success: false, message: 'Error fetching layouts' });
    }
  }
  
  // GET /api/v1/restaurant/layouts/:id
  async getLayout(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const layout = await TableLayout.findOne({
        where: { id, tenantId },
        include: [
          { model: Location, as: 'location' },
          {
            model: RestaurantTable,
            as: 'tables',
            include: [{ model: Transaction, as: 'currentOrder', required: false }]
          }
        ]
      });
      
      if (!layout) {
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
      
      res.json({
        success: true,
        data: layout
      });
    } catch (error) {
      console.error('Get layout error:', error);
      res.status(500).json({ success: false, message: 'Error fetching layout' });
    }
  }
  
  // POST /api/v1/restaurant/layouts
  async createLayout(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const tenantId = req.user.tenantId;
      const layoutData = req.body;
      
      // Create layout
      const layout = await TableLayout.create({
        ...layoutData,
        tenantId
      }, { transaction });
      
      // If layout has tables in layoutConfig, create actual RestaurantTable records
      if (layoutData.layoutConfig?.tables) {
        for (const tableConfig of layoutData.layoutConfig.tables) {
          await RestaurantTable.create({
            tenantId,
            locationId: layout.locationId,
            layoutId: layout.id,
            tableNumber: tableConfig.tableNumber,
            tableName: tableConfig.label || tableConfig.tableNumber,
            capacity: tableConfig.capacity,
            positionX: tableConfig.x,
            positionY: tableConfig.y,
            width: tableConfig.width,
            height: tableConfig.height,
            shape: tableConfig.shape,
            rotation: tableConfig.rotation || 0,
            color: tableConfig.color,
            status: 'available'
          }, { transaction });
        }
      }
      
      await transaction.commit();
      
      // Reload dengan associations
      await layout.reload({
        include: [
          { model: Location, as: 'location' },
          { model: RestaurantTable, as: 'tables' }
        ]
      });
      
      res.status(201).json({
        success: true,
        data: layout
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create layout error:', error);
      res.status(500).json({ success: false, message: 'Error creating layout' });
    }
  }
  
  // PUT /api/v1/restaurant/layouts/:id
  async updateLayout(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const updates = req.body;
      
      const layout = await TableLayout.findOne({
        where: { id, tenantId },
        transaction
      });
      
      if (!layout) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
      
      // Update layout
      await layout.update(updates, { transaction });
      
      // Sync tables jika ada perubahan di layoutConfig.tables
      if (updates.layoutConfig?.tables) {
        // Get existing tables
        const existingTables = await RestaurantTable.findAll({
          where: { layoutId: layout.id, tenantId },
          transaction
        });
        
        const configTableNumbers = updates.layoutConfig.tables.map(t => t.tableNumber);
        
        // Delete tables yang tidak ada di config baru
        for (const table of existingTables) {
          if (!configTableNumbers.includes(table.tableNumber)) {
            await table.destroy({ transaction });
          }
        }
        
        // Update atau create tables
        for (const tableConfig of updates.layoutConfig.tables) {
          const existingTable = existingTables.find(t => t.tableNumber === tableConfig.tableNumber);
          
          if (existingTable) {
            // Update
            await existingTable.update({
              tableName: tableConfig.label || tableConfig.tableNumber,
              capacity: tableConfig.capacity,
              positionX: tableConfig.x,
              positionY: tableConfig.y,
              width: tableConfig.width,
              height: tableConfig.height,
              shape: tableConfig.shape,
              rotation: tableConfig.rotation || 0,
              color: tableConfig.color
            }, { transaction });
          } else {
            // Create
            await RestaurantTable.create({
              tenantId,
              locationId: layout.locationId,
              layoutId: layout.id,
              tableNumber: tableConfig.tableNumber,
              tableName: tableConfig.label || tableConfig.tableNumber,
              capacity: tableConfig.capacity,
              positionX: tableConfig.x,
              positionY: tableConfig.y,
              width: tableConfig.width,
              height: tableConfig.height,
              shape: tableConfig.shape,
              rotation: tableConfig.rotation || 0,
              color: tableConfig.color,
              status: 'available'
            }, { transaction });
          }
        }
      }
      
      await transaction.commit();
      
      // Reload
      await layout.reload({
        include: [
          { model: Location, as: 'location' },
          { model: RestaurantTable, as: 'tables' }
        ]
      });
      
      res.json({
        success: true,
        data: layout
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update layout error:', error);
      res.status(500).json({ success: false, message: 'Error updating layout' });
    }
  }
  
  // DELETE /api/v1/restaurant/layouts/:id
  async deleteLayout(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const layout = await TableLayout.findOne({
        where: { id, tenantId },
        transaction
      });
      
      if (!layout) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
      
      // Check if layout has occupied tables
      const occupiedTables = await RestaurantTable.count({
        where: {
          layoutId: layout.id,
          status: 'occupied'
        },
        transaction
      });
      
      if (occupiedTables > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot delete layout with occupied tables'
        });
      }
      
      // Delete associated tables
      await RestaurantTable.destroy({
        where: { layoutId: layout.id },
        transaction
      });
      
      // Delete layout
      await layout.destroy({ transaction });
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Layout deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Delete layout error:', error);
      res.status(500).json({ success: false, message: 'Error deleting layout' });
    }
  }
  
  // GET /api/v1/restaurant/layouts/:id/table-status
  // Real-time table status untuk layout tertentu
  async getTableStatus(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      
      const layout = await TableLayout.findOne({
        where: { id, tenantId }
      });
      
      if (!layout) {
        return res.status(404).json({ success: false, message: 'Layout not found' });
      }
      
      const tables = await RestaurantTable.findAll({
        where: { layoutId: layout.id },
        include: [
          {
            model: Transaction,
            as: 'currentOrder',
            required: false,
            include: [
              { model: TransactionItem, as: 'items' }
            ]
          }
        ]
      });
      
      // Format response untuk touchscreen UI
      const tableStatus = tables.map(table => ({
        id: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        status: table.status,
        capacity: table.capacity,
        position: {
          x: table.positionX,
          y: table.positionY,
          width: table.width,
          height: table.height,
          shape: table.shape,
          rotation: table.rotation
        },
        color: table.color,
        occupiedAt: table.occupiedAt,
        occupiedBy: table.occupiedBy,
        currentOrder: table.currentOrder ? {
          id: table.currentOrder.id,
          transactionNumber: table.currentOrder.transactionNumber,
          totalAmount: table.currentOrder.totalAmount,
          itemCount: table.currentOrder.items?.length || 0
        } : null
      }));
      
      res.json({
        success: true,
        data: {
          layoutId: layout.id,
          layoutName: layout.name,
          floor: layout.floor,
          tables: tableStatus,
          summary: {
            total: tables.length,
            available: tables.filter(t => t.status === 'available').length,
            occupied: tables.filter(t => t.status === 'occupied').length,
            reserved: tables.filter(t => t.status === 'reserved').length,
            cleaning: tables.filter(t => t.status === 'cleaning').length
          }
        }
      });
    } catch (error) {
      console.error('Get table status error:', error);
      res.status(500).json({ success: false, message: 'Error fetching table status' });
    }
  }
}

module.exports = new TableLayoutController();
```

---

## 🛣️ Routes

```javascript
// routes/v1/restaurantRoutes.js (UPDATE - ADD)
const tableLayoutController = require('../../controllers/tableLayoutController');

// ... existing table routes from Fase 2 ...

// Layout Management
router.get('/layouts',
  caslMiddleware.authorize('read', 'tables'),
  tableLayoutController.getAllLayouts
);

router.get('/layouts/:id',
  caslMiddleware.authorize('read', 'tables'),
  tableLayoutController.getLayout
);

router.post('/layouts',
  caslMiddleware.authorize('create', 'tables'),
  requireFeature('restaurant', 'customTableLayout'),  // Feature gate
  tableLayoutController.createLayout
);

router.put('/layouts/:id',
  caslMiddleware.authorize('update', 'tables'),
  requireFeature('restaurant', 'customTableLayout'),
  tableLayoutController.updateLayout
);

router.delete('/layouts/:id',
  caslMiddleware.authorize('delete', 'tables'),
  tableLayoutController.deleteLayout
);

// Real-time table status
router.get('/layouts/:id/table-status',
  caslMiddleware.authorize('read', 'tables'),
  tableLayoutController.getTableStatus
);
```

---

## 📱 Frontend Integration Guide

### API Response Format untuk Touchscreen UI

```json
{
  "success": true,
  "data": {
    "layoutId": "uuid",
    "layoutName": "Main Floor",
    "floor": 1,
    "tables": [
      {
        "id": "table-uuid-1",
        "tableNumber": "A1",
        "tableName": "VIP 1",
        "status": "available",
        "capacity": 4,
        "position": {
          "x": 100,
          "y": 150,
          "width": 80,
          "height": 80,
          "shape": "circle",
          "rotation": 0
        },
        "color": "#4CAF50",
        "occupiedAt": null,
        "occupiedBy": null,
        "currentOrder": null
      },
      {
        "id": "table-uuid-2",
        "tableNumber": "A2",
        "tableName": "Regular",
        "status": "occupied",
        "capacity": 6,
        "position": {
          "x": 250,
          "y": 150,
          "width": 120,
          "height": 60,
          "shape": "rectangle",
          "rotation": 0
        },
        "color": "#2196F3",
        "occupiedAt": "2025-11-21T10:30:00Z",
        "occupiedBy": "John Doe",
        "currentOrder": {
          "id": "order-uuid",
          "transactionNumber": "TRX-20251121-0001",
          "totalAmount": 150000,
          "itemCount": 5
        }
      }
    ],
    "summary": {
      "total": 20,
      "available": 15,
      "occupied": 3,
      "reserved": 1,
      "cleaning": 1
    }
  }
}
```

### Real-time Updates

#### Option 1: Polling (Simple)

```javascript
// Frontend polling every 3 seconds
setInterval(async () => {
  const response = await fetch('/api/v1/restaurant/layouts/{id}/table-status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  updateTableUI(data.data.tables);
}, 3000);
```

#### Option 2: WebSocket (Advanced - Future Enhancement)

```javascript
// Bisa ditambahkan di fase selanjutnya
const ws = new WebSocket('ws://localhost:3000/ws/table-status');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateTableUI(data.tables);
};
```

### Drag-and-Drop Layout Editor

Frontend perlu mengirim `layoutConfig` JSON seperti ini saat save layout:

```json
{
  "name": "Main Floor",
  "floor": 1,
  "canvasWidth": 1920,
  "canvasHeight": 1080,
  "gridSize": 20,
  "backgroundColor": "#f5f5f5",
  "layoutConfig": {
    "tables": [
      {
        "tableNumber": "A1",
        "x": 100,
        "y": 150,
        "width": 80,
        "height": 80,
        "shape": "circle",
        "rotation": 0,
        "capacity": 4,
        "color": "#4CAF50",
        "label": "VIP 1"
      }
    ],
    "walls": [],
    "decorations": []
  }
}
```

---

## 📝 Implementation Checklist

### Week 1: Database & Backend

- [ ] **Day 1-2: Database**
  - [ ] Migration untuk TableLayout model
  - [ ] Migration untuk extend RestaurantTable (add layoutId, color, rotation)
  - [ ] Migration untuk TableStatusHistory (optional)
  - [ ] Test migrations

- [ ] **Day 3-4: Controllers**
  - [ ] Implement tableLayoutController (CRUD)
  - [ ] Implement getTableStatus endpoint
  - [ ] Implement sync logic (layoutConfig → RestaurantTable records)
  - [ ] Unit tests

- [ ] **Day 5: Routes & Integration**
  - [ ] Add layout routes dengan feature gates
  - [ ] Test dengan Postman
  - [ ] Integration tests

### Week 2: Frontend Coordination & Testing

- [ ] **Day 6-7: Frontend API Contract**
  - [ ] Dokumentasi API response format
  - [ ] Contoh request/response untuk layout editor
  - [ ] Contoh real-time status updates

- [ ] **Day 8-9: Performance Optimization**
  - [ ] Optimize table status query (indexing)
  - [ ] Caching strategy untuk layout config
  - [ ] Load testing untuk real-time endpoints

- [ ] **Day 10: Documentation & Deployment**
  - [ ] Update API documentation
  - [ ] Postman collection
  - [ ] Deploy ke staging

---

## 🎨 UI/UX Considerations (untuk Frontend Team)

### Touchscreen Optimization
- Minimum touch target: 44x44 pixels
- Spacing between tables: minimum 20px
- Large, clear status indicators
- Swipe gestures untuk navigasi antar lantai

### Color Scheme untuk Table Status
- **Available**: Green (#4CAF50)
- **Occupied**: Red (#F44336)
- **Reserved**: Orange (#FF9800)
- **Cleaning**: Gray (#9E9E9E)

### Performance
- Render max 100 tables per layout
- Use canvas/SVG untuk banyak tables
- Debounce drag updates (save after 500ms idle)

---

**Status**: Ready for implementation ✅  
**Next**: [PHASE-05-TRANSACTION-SEQUENCES.md](./PHASE-05-TRANSACTION-SEQUENCES.md)
