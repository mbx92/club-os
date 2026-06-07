# Restaurant Management - Implementation Plan

**Created:** November 30, 2025  
**Module:** Restaurant POS & Management System  
**Reference:** Gym Module Structure  
**Style Guide:** DaisyUI Components  

---

## 📋 Overview

Implementasi sistem Restaurant Management yang comprehensive dengan mengikuti pola yang sama seperti Gym Module. Sistem ini akan mencakup Product Management, Location Management, Table Management, Stock Management, POS (Point of Sale), Orders, Kitchen Display, dan Analytics.

---

## 🎯 Implementation Phases

### **Phase 1: Product & Inventory Management** ✅ (Composables Ready)
- ✅ Composables: useRestaurantProducts, useRestaurantLocations, useRestaurantTables, useRestaurantStock
- 🔲 Pages & Components (To be built)

### **Phase 2: Orders & Transactions (Week 3-4)** ✅ *(Backend API Ready - Updated Dec 1, 2025)*

**Backend API Status:** ✅ **READY FOR IMPLEMENTATION**

**Available Endpoints:**
- ✅ `POST /restaurant/orders` - Create order
- ✅ `GET /restaurant/orders` - Get all orders with filters
- ✅ `GET /restaurant/orders/:id` - Get order detail
- ✅ `PUT /restaurant/orders/:id/status` - Update order status
- ✅ `POST /restaurant/orders/:id/items` - Add item to order
- ✅ `POST /restaurant/orders/:id/complete` - Complete order with payment
- ✅ `POST /restaurant/tables/:id/reserve` - Reserve table
- ✅ `POST /restaurant/tables/:id/release` - Release table

**Key API Changes:**
- Order statuses: `pending`, `preparing`, `ready`, `completed`, `cancelled`
- Table auto-occupied when order created (no manual update to occupied)
- Table auto-released when order completed
- Payment integrated in complete order endpoint
- Order response includes: items, table, location, createdByUser, payments array
- Kitchen printer integration (optional)

### **Phase 3: Kitchen & Operations** (Backend in progress)
- 🔲 Kitchen Display System (KDS)
- 🔲 Order Queue Management
- 🔲 Table Status Management

### **Phase 4: Reports & Analytics** (Backend in progress)
- 🔲 Sales Reports
- 🔲 Product Performance
- 🔲 Stock Reports
- 🔲 Daily/Monthly Reports

---

## 📁 File Structure Plan

```
src/
├── pages/
│   └── restaurant/
│       ├── index.vue                    # Dashboard (Phase 1) 📊
│       ├── products/
│       │   ├── index.vue               # Product List (Phase 1)
│       │   └── categories.vue          # Category Management (Phase 1)
│       ├── locations/
│       │   └── index.vue               # Location Management (Phase 1)
│       ├── tables/
│       │   ├── index.vue               # Table List (Phase 1)
│       │   └── floor-plan.vue          # Visual Floor Plan (Phase 1) 🎨
│       ├── stock/
│       │   ├── index.vue               # Stock Overview (Phase 1)
│       │   ├── movements.vue           # Stock Movements (Phase 1)
│       │   └── alerts.vue              # Low Stock Alerts (Phase 1)
│       ├── pos/
│       │   └── index.vue               # Point of Sale (Phase 2) 💰
│       ├── orders/
│       │   ├── index.vue               # Order List (Phase 2)
│       │   └── [id].vue                # Order Detail (Phase 2)
│       ├── kitchen/
│       │   ├── display.vue             # Kitchen Display System (Phase 3) 👨‍🍳
│       │   └── queue.vue               # Order Queue (Phase 3)
│       ├── transactions/
│       │   └── index.vue               # Transaction History (Phase 2)
│       └── reports/
│           ├── index.vue               # Reports Dashboard (Phase 4)
│           ├── sales.vue               # Sales Reports (Phase 4)
│           ├── products.vue            # Product Performance (Phase 4)
│           └── stock.vue               # Stock Reports (Phase 4)
│
├── components/
│   └── restaurant/
│       ├── products/
│       │   ├── ProductListView.vue           # Reusable product list
│       │   ├── ProductFormModal.vue          # Create/Edit product
│       │   ├── ProductCard.vue               # Product display card
│       │   ├── CategoryFormModal.vue         # Category management
│       │   └── StockAdjustmentModal.vue      # Stock adjustment
│       ├── locations/
│       │   ├── LocationListView.vue          # Reusable location list
│       │   └── LocationFormModal.vue         # Create/Edit location
│       ├── tables/
│       │   ├── TableListView.vue             # Table list/grid view
│       │   ├── TableFormModal.vue            # Create/Edit table
│       │   ├── TableCard.vue                 # Single table card
│       │   ├── FloorPlanCanvas.vue           # Interactive floor plan 🎨
│       │   └── TableStatusBadge.vue          # Status indicator
│       ├── stock/
│       │   ├── StockOverviewCard.vue         # Stock summary card
│       │   ├── StockMovementList.vue         # Movement history
│       │   ├── LowStockAlert.vue             # Alert component
│       │   └── StockReportTable.vue          # Report display
│       ├── pos/
│       │   ├── POSCart.vue                   # Shopping cart 🛒
│       │   ├── POSProductGrid.vue            # Product selection
│       │   ├── POSPaymentModal.vue           # Payment processing
│       │   ├── POSReceiptModal.vue           # Receipt display
│       │   └── POSQuickActions.vue           # Quick action buttons
│       ├── orders/
│       │   ├── OrderCard.vue                 # Order summary card
│       │   ├── OrderStatusBadge.vue          # Status indicator
│       │   ├── OrderItemsList.vue            # Order items
│       │   └── OrderTimelineView.vue         # Order status timeline
│       ├── kitchen/
│       │   ├── KitchenOrderCard.vue          # Kitchen display card
│       │   ├── KitchenQueue.vue              # Queue management
│       │   └── OrderTimer.vue                # Preparation timer ⏱️
│       ├── analytics/
│       │   ├── SalesChart.vue                # Sales visualization
│       │   ├── RevenueCard.vue               # Revenue statistics
│       │   ├── TopProductsChart.vue          # Best sellers
│       │   └── StockLevelChart.vue           # Stock trends
│       └── shared/
│           ├── RestaurantStatCard.vue        # Reusable stat card
│           ├── DateRangeFilter.vue           # Date range picker
│           └── ExportButton.vue              # Export functionality
│
└── composables/
    └── restaurant/                      ✅ COMPLETED
        ├── useRestaurantProducts.js     ✅
        ├── useRestaurantLocations.js    ✅
        ├── useRestaurantTables.js       ✅
        ├── useRestaurantStock.js        ✅
        ├── useRestaurantOrders.js       🔲 (Phase 2)
        ├── useRestaurantTransactions.js 🔲 (Phase 2)
        ├── useRestaurantKitchen.js      🔲 (Phase 3)
        └── useRestaurantReports.js      🔲 (Phase 4)
```

---

## ✅ **DETAILED TASKS PER PAGE**

---

### **Phase 1: Core Management (Week 1-2)** ✅ Composables Ready

---

#### **1) Dashboard (pages/restaurant/index.vue)**

**Composables Used:**
```javascript
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'

const { getLowStockProducts } = useRestaurantProducts()
const { getTableStats } = useRestaurantTables()
const { getStockReport } = useRestaurantStock()
```

**Tasks:**
- [ ] Create 4 stat cards component (`RestaurantStatCard.vue`)
  - Today's Sales (mock data for now)
  - Active Orders (mock data)
  - Tables Overview → `getTableStats(locationId)`
  - Low Stock Items → `getLowStockProducts()` count
- [ ] Create sales chart component (`SalesChart.vue`) - mock data
- [ ] Recent orders list (top 5 mock)
- [ ] Low stock alert section → link to `/restaurant/stock/alerts`
- [ ] Quick action buttons: [Go to POS] [View Orders] [Kitchen Display]

**API Calls:**
```javascript
// On mounted
const lowStock = await getLowStockProducts()
const tableStats = await getTableStats(selectedLocationId.value)
```

**Components to Create:**
- `components/restaurant/shared/RestaurantStatCard.vue`
- `components/restaurant/analytics/SalesChart.vue`

---

#### **2) Products List (pages/restaurant/products/index.vue)**

**Composables Used:**
```javascript
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'

const { 
  products, 
  loading, 
  fetchProducts, 
  deleteProduct, 
  adjustStock,
  getLowStockProducts 
} = useRestaurantProducts()
```

**Tasks:**
- [ ] Create `ProductListView.vue` component
  - Statistics cards: Total Products, Active Products, Low Stock, Categories Count
  - Search bar (debounce 300ms)
  - Filters: Category dropdown, Location dropdown, Status dropdown (active/inactive)
  - View toggle: Grid (mobile) / Table (desktop)
  - Pagination controls
- [ ] Create `ProductCard.vue` component (for grid view)
  - Image thumbnail, name, price, stock quantity
  - Badge: low stock warning if `stockQuantity <= minStockLevel`
  - Actions: [View] [Edit] [Adjust Stock]
- [ ] Create `StockAdjustmentModal.vue` component
  - Fields: quantity (number), movementType (in/out), notes (textarea)
  - On submit: `adjustStock(productId, { quantity, movementType, notes })`
- [ ] Create `ProductFormModal.vue` component (for quick add)
- [ ] Implement delete confirmation: `window.confirm()` → `deleteProduct(id)`

**API Calls:**
```javascript
// Search & Filter
const handleSearch = debounce(async (searchTerm) => {
  await fetchProducts({ 
    search: searchTerm, 
    page: currentPage.value,
    limit: itemsPerPage.value,
    categoryId: selectedCategory.value,
    locationId: selectedLocation.value,
    isActive: statusFilter.value
  })
}, 300)

// Adjust Stock
const handleAdjustStock = async (productId, data) => {
  await adjustStock(productId, data)
  await fetchProducts() // refresh list
}

// Delete
const handleDelete = async (productId) => {
  if (confirm('Delete this product?')) {
    await deleteProduct(productId)
    await fetchProducts() // refresh
  }
}
```

**Components to Create:**
- `components/restaurant/products/ProductListView.vue`
- `components/restaurant/products/ProductCard.vue`
- `components/restaurant/products/StockAdjustmentModal.vue`
- `components/restaurant/products/ProductFormModal.vue`

---

#### **3) Product Detail (pages/restaurant/products/[id].vue)**

**Composables Used:**
```javascript
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'

const { getProductById, deleteProduct } = useRestaurantProducts()
const { getStockMovements } = useRestaurantStock()
```

**Tasks:**
- [ ] Fetch product detail: `getProductById(route.params.id)`
- [ ] Display product info (tabs):
  - **Info Tab:** Name, description, SKU, category, location, price, cost, tax, stock level, variants
  - **Stock Movements Tab:** Call `getStockMovements({ productId: route.params.id })`, display table with columns: Date, Type, Quantity, Previous → New, Notes, Performed By
  - **Variants Tab:** Display variant options (if any)
- [ ] Action buttons:
  - [Edit] → route to `/restaurant/products/${id}/edit`
  - [Adjust Stock] → open `StockAdjustmentModal`
  - [Delete] → confirm → `deleteProduct(id)` → redirect to products list
- [ ] Badge: Active/Inactive status
- [ ] Calculate & display:
  - Margin: `(price - cost) / price * 100`
  - Stock value: `stockQuantity * cost`

**API Calls:**
```javascript
// On mounted
const product = await getProductById(productId)
const movements = await getStockMovements({ productId, limit: 50 })
```

**Components to Create:**
- `components/restaurant/stock/StockMovementList.vue`

---

#### **4) Product Create/Edit (pages/restaurant/products/create.vue & [id]/edit.vue)**

**Composables Used:**
```javascript
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'

const { createProduct, updateProduct, getProductById } = useRestaurantProducts()
```

**Tasks:**
- [ ] Form fields:
  - **Basic Info:** name (required), description, SKU (auto-generate option), barcode
  - **Category & Location:** categoryId (dropdown), locationId (dropdown)
  - **Pricing:** price (required), cost, taxRate, taxable (checkbox)
  - **Stock:** stockQuantity, minStockLevel, unit, trackInventory (toggle)
  - **Product Type:** productType (dropdown: food/beverage/other)
  - **Availability:** isAvailable (toggle), preparationTime (minutes)
  - **Images:** imageUrl, thumbnailUrl (file upload or URL input)
  - **Variants:** Dynamic array (name, values[])
- [ ] Real-time calculations:
  - Margin: `(price - cost) / price * 100` (display percentage)
  - Stock value: `stockQuantity * cost`
- [ ] For edit mode:
  - Fetch: `getProductById(id)` on mounted
  - Populate form with existing data
- [ ] On submit:
  - Create: `await createProduct(formData)`
  - Update: `await updateProduct(productId, formData)`
  - Show success toast
  - Redirect to `/restaurant/products`

**API Calls:**
```javascript
// Create
const handleCreate = async () => {
  await createProduct({
    name: form.name,
    description: form.description,
    categoryId: form.categoryId,
    locationId: form.locationId,
    price: form.price,
    cost: form.cost,
    stockQuantity: form.stockQuantity,
    minStockLevel: form.minStockLevel,
    trackInventory: form.trackInventory,
    productType: form.productType,
    preparationTime: form.preparationTime,
    isAvailable: form.isAvailable,
    sku: form.sku,
    taxable: form.taxable,
    taxRate: form.taxRate,
    imageUrl: form.imageUrl,
    variants: form.variants
  })
  router.push('/restaurant/products')
}

// Update
const handleUpdate = async () => {
  await updateProduct(productId, formData)
  router.push('/restaurant/products')
}
```

---

#### **5) Locations (pages/restaurant/locations/index.vue)**

**Composables Used:**
```javascript
import { useRestaurantLocations } from '@/composables/restaurant/useRestaurantLocations'

const { 
  locations, 
  loading,
  fetchLocations, 
  getLocationById,
  createLocation, 
  updateLocation, 
  deleteLocation 
} = useRestaurantLocations()
```

**Tasks:**
- [ ] Create `LocationListView.vue` component
  - Statistics: Total Locations, Active Locations
  - Table columns: Code, Name, Type, City, Phone, Status, Actions
  - Actions per row: [View Detail] [Edit] [Delete]
- [ ] Create `LocationFormModal.vue` component
  - Fields: name, code, address, city, province, postalCode, country, phone, email, locationType (dropdown: main/branch/warehouse), latitude, longitude, isActive (toggle)
  - On submit: `createLocation(data)` or `updateLocation(id, data)`
- [ ] Location detail page (pages/restaurant/locations/[id].vue):
  - Call `getLocationById(locationId)`
  - Display location info
  - **Tables section:** List all tables for this location (from response)
  - **Products section:** List all products for this location (from response)
  - Actions: [Edit] [Delete] [Add Table] [Add Product]

**API Calls:**
```javascript
// Fetch all
await fetchLocations({ page, limit })

// Get detail
const location = await getLocationById(locationId)

// Create/Update
await createLocation(formData)
await updateLocation(locationId, formData)

// Delete
if (confirm('Delete location?')) {
  await deleteLocation(locationId)
  await fetchLocations() // refresh
}
```

**Components to Create:**
- `components/restaurant/locations/LocationListView.vue`
- `components/restaurant/locations/LocationFormModal.vue`

---

#### **6) Tables & Floor Plan (pages/restaurant/tables/index.vue & floor-plan.vue)**

**Backend API:** ✅ **UPDATED** with reserve/release endpoints

**Composables Used:**
```javascript
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'

const { 
  tables,
  tableStats,
  fetchTables, 
  getTableById,
  createTable, 
  updateTable, 
  reserveTable,    // NEW: POST /restaurant/tables/:id/reserve
  releaseTable,    // NEW: POST /restaurant/tables/:id/release
  deleteTable,
  getTableStats
} = useRestaurantTables()
```

**Important Notes:**
- ⚠️ **Table status `occupied` cannot be set manually** - only through `createOrder()`
- ✅ Use `reserveTable()` to mark table as reserved
- ✅ Use `releaseTable()` to mark table as available
- ✅ Table auto-releases when order completed

**Tasks - Table List (index.vue):**
- [ ] Create `TableListView.vue` component
  - Filter: Location dropdown, Status dropdown (available/occupied/reserved/cleaning)
  - Statistics from `getTableStats()`: Total, Available, Occupied, Reserved, Cleaning, Total Capacity
  - Table columns: Table Number, Name, Capacity, Status (badge), Location, Current Order, Actions
  - Actions: [View Detail] [Edit] [Reserve] [Release] [Delete]
- [ ] Create `TableFormModal.vue` component
  - Fields: tableNumber, tableName, capacity, locationId, positionX, positionY, width, height, shape (dropdown: rectangle/circle/oval), qrCode (auto-generate), isActive
  - ⚠️ **Remove status field** - managed by API
  - On submit: `createTable(data)` or `updateTable(id, data)`
- [ ] Create `TableCard.vue` component (for grid view alternative)
- [ ] Create `TableReserveModal.vue` component:
  - Field: occupiedBy (string) - e.g., "Reserved for John Doe"
  - On submit: `reserveTable(tableId, { status: 'reserved', occupiedBy })`
- [ ] Quick status actions:
  - [Mark as Available] → `releaseTable(tableId, { status: 'available' })`
  - [Mark as Reserved] → Open `TableReserveModal`
  - Occupied status: Display current order link, no manual change

**Tasks - Floor Plan (floor-plan.vue):**
- [ ] Create `FloorPlanCanvas.vue` component
  - Canvas area: render each table as absolutely positioned div
    - Use `table.positionX`, `table.positionY`, `table.width`, `table.height`
    - Color-code by status: Green=available, Red=occupied, Yellow=reserved, Gray=cleaning
    - Display table number inside div
  - Drag & drop functionality:
    - Use Vue.Draggable or native drag events
    - On drop: get new x, y coordinates
    - Call `updateTable(tableId, { positionX: newX, positionY: newY })`
  - Sidebar:
    - Table stats summary
    - Selected table info (click to select)
    - Actions: [Change Status] [Edit Table] [View Orders]
    - Quick actions: [+ Add Table] [Reset Layout] [Export Layout]
  - Edit mode toggle: enable/disable drag & drop
  - Zoom controls: zoom in/out canvas

**API Calls:**
```javascript
// Fetch tables for location
await fetchTables({ locationId: selectedLocation.value, status: statusFilter.value })

// Get stats
const stats = await getTableStats(selectedLocation.value)

// Reserve table
await reserveTable(tableId, { 
  status: 'reserved', 
  occupiedBy: 'Reserved for John Doe'
})

// Release table
await releaseTable(tableId, { status: 'available' })

// Update position (floor plan)
await updateTable(tableId, { positionX: newX, positionY: newY })

// Create/Delete
await createTable(formData)
await deleteTable(tableId)
```

**Components to Create:**
- `components/restaurant/tables/TableListView.vue`
- `components/restaurant/tables/TableFormModal.vue`
- `components/restaurant/tables/TableCard.vue`
- `components/restaurant/tables/FloorPlanCanvas.vue`
- `components/restaurant/tables/TableStatusBadge.vue`
- `components/restaurant/tables/TableReserveModal.vue`

---

#### **7) Stock Management (pages/restaurant/stock/index.vue, movements.vue, alerts.vue)**

**Composables Used:**
```javascript
import { useRestaurantStock } from '@/composables/restaurant/useRestaurantStock'
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'

const { getStockMovements, createStockMovement, getStockReport } = useRestaurantStock()
const { getLowStockProducts } = useRestaurantProducts()
```

**Tasks - Stock Overview (index.vue):**
- [ ] Create `StockOverviewCard.vue` component
  - Statistics: Total Products, Low Stock Count, Today's Movements, Total Stock Value
  - Stock level visualization: progress bars for each product showing `stockQuantity / (minStockLevel * 3) * 100`
  - Color coding: Green (>80%), Yellow (30-80%), Red (<30%)
  - Quick action: [Adjust Stock] button per product
- [ ] Recent movements section:
  - Call `getStockMovements({ limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' })`
  - Display: Type (IN/OUT/ADJ badge), Product name, Quantity, Previous → New, Notes, Time ago
  - Link to [View All Movements]

**Tasks - Stock Movements (movements.vue):**
- [ ] Create `StockMovementList.vue` component
  - Filters: Product dropdown, Location dropdown, Movement Type (in/out/adjustment/transfer), Date range
  - Table columns: Date/Time, Product, Location, Type (badge), Quantity, Previous Qty, New Qty, Reference, Notes, Performed By
  - Pagination
  - Export CSV button (client-side generation)
- [ ] Create `CreateMovementModal.vue` component
  - Fields: productId (dropdown), locationId (dropdown), movementType (dropdown), quantity, previousQuantity (auto-fill from product), newQuantity (auto-calculate), referenceType, referenceId, notes
  - On submit: `createStockMovement(data)`

**Tasks - Low Stock Alerts (alerts.vue):**
- [ ] Create `LowStockAlert.vue` component
  - Call `getLowStockProducts()`
  - Display alert cards: Product name, Current stock, Min level, Location, [Adjust Stock] button
  - Sort by urgency: products with stockQuantity = 0 first
  - Bulk adjust option

**API Calls:**
```javascript
// Get movements
await getStockMovements({ 
  productId, 
  locationId, 
  type, 
  page, 
  limit,
  startDate,
  endDate
})

// Create movement
await createStockMovement({
  productId,
  locationId,
  movementType: 'in', // or 'out', 'adjustment', 'transfer'
  quantity: 100,
  referenceType: 'purchase',
  referenceId: purchaseOrderId,
  notes: 'Stock dari supplier'
})

// Get report
const report = await getStockReport({ 
  locationId,
  categoryId,
  lowStock: true
})

// Get low stock
const lowStock = await getLowStockProducts()
```

**Components to Create:**
- `components/restaurant/stock/StockOverviewCard.vue`
- `components/restaurant/stock/StockMovementList.vue`
- `components/restaurant/stock/LowStockAlert.vue`
- `components/restaurant/stock/StockReportTable.vue`

---

### **Phase 2: POS & Orders (Week 3-4)** ✅ *(Backend API Ready - Updated Dec 1, 2025)*

**Backend API Status:** ✅ **READY FOR IMPLEMENTATION**

---

#### **8) POS Screen (pages/restaurant/pos/index.vue)**

**Backend API:** ✅ **READY**

**Composables Used:**
```javascript
import { useRestaurantProducts } from '@/composables/restaurant/useRestaurantProducts'
import { useRestaurantOrders } from '@/composables/restaurant/useRestaurantOrders' // TO BE CREATED
import { useRestaurantTables } from '@/composables/restaurant/useRestaurantTables'

const { fetchProducts } = useRestaurantProducts()
const { createOrder } = useRestaurantOrders()
const { fetchTables } = useRestaurantTables()
```

**Important Notes:**
- ⚠️ **No need to manually update table status** - `createOrder()` auto-occupies table
- ✅ Order creation returns `print.kitchenTicket` status (can be used for printer integration)
- ✅ Stock adjustment handled separately (optional - based on trackInventory flag)

**Tasks:**
- [ ] Split screen layout:
  - **Left panel (60%):** Product grid
  - **Right panel (40%):** Cart + Checkout
- [ ] Create `POSProductGrid.vue` component
  - Fetch products: `fetchProducts({ locationId, isActive: true, limit: 100 })`
  - Search bar (real-time filter by name/SKU)
  - Category filter tabs (from product.category)
  - Large touch-friendly tiles: Image, Name, Price, Stock indicator
  - Click to add to cart
- [ ] Create `POSCart.vue` component
  - Local state: `cartItems = [{ product, quantity, variants, notes, subtotal }]`
  - Each item row: Name, Qty (+ / -), Price, Subtotal, [Remove] button
  - Add notes per item (text input)
  - Variants support: Display variant selection if product has variants
  - Totals section: Subtotal, Tax (calculate based on `product.taxRate`), Total
  - Actions: [Hold Order] [Clear Cart] [Checkout]
- [ ] Create `POSPaymentModal.vue` component
  - Select table: dropdown (call `fetchTables({ status: 'available' })`)
  - Order type: radio buttons (dine-in/takeaway/delivery)
  - Payment method: Cash / Card / E-Wallet (radio buttons)
  - Amount paid (if cash): input field, calculate change
  - Customer info (optional): name, phone
  - Notes for order (optional)
  - On submit:
    ```javascript
    // Map cart items to API format
    const items = cartItems.value.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      variants: item.variants || {}, // e.g., { "Level": "Pedas" }
      notes: item.notes || ''
    }))

    // Create order (table auto-occupied by API)
    const order = await createOrder({
      tableId: selectedTable.value,
      orderType: selectedOrderType.value, // 'dine-in', 'takeaway', 'delivery'
      items: items,
      customerInfo: {
        name: customerName.value || null,
        phone: customerPhone.value || null
      },
      notes: orderNotes.value,
      paymentMethod: selectedPayment.value // 'cash', 'card', 'ewallet'
    })

    // Check kitchen printer status (optional)
    if (order.print?.kitchenTicket?.success) {
      showSuccess('Order created and sent to kitchen')
    } else {
      showWarning('Order created but kitchen printer unavailable')
    }

    // Optional: Stock adjustment for products with trackInventory = true
    for (const item of cartItems.value) {
      if (item.product.trackInventory) {
        await adjustStock(item.product.id, {
          quantity: -item.quantity, // negative for sale
          movementType: 'out',
          notes: `POS sale - Order #${order.data.transactionNumber}`
        })
      }
    }

    // Clear cart and show success
    cartItems.value = []
    showSuccess('Order created successfully')
    
    // Optional: Navigate to order detail
    router.push(`/restaurant/orders/${order.data.id}`)
    ```
- [ ] Create `POSReceiptModal.vue` component (optional)
  - Display order summary with transactionNumber, table, items, totals
  - Print button using browser print API

**API Calls:**
```javascript
// Fetch products for POS (active products only)
await fetchProducts({ 
  locationId, 
  isActive: true, 
  limit: 100 
})

// Fetch available tables
const tables = await fetchTables({ 
  locationId, 
  status: 'available' 
})

// Create order (simplified - table status handled by API)
const orderResponse = await createOrder({
  tableId: selectedTable.value,
  orderType: 'dine-in',
  items: [
    {
      productId: 'uuid',
      quantity: 2,
      price: 35000,
      variants: { "Level": "Pedas" },
      notes: 'Extra sambal'
    }
  ],
  customerInfo: {
    name: 'John Doe',
    phone: '+62812345678'
  },
  notes: 'Order untuk meja VIP',
  paymentMethod: 'cash'
})

// orderResponse.data.table.status === 'occupied' (auto-updated)
// orderResponse.print.kitchenTicket.success === false (if no printer)
```

**Components to Create:**
- `components/restaurant/pos/POSProductGrid.vue`
- `components/restaurant/pos/POSCart.vue`
- `components/restaurant/pos/POSPaymentModal.vue`
- `components/restaurant/pos/POSReceiptModal.vue`
- `components/restaurant/pos/POSQuickActions.vue`

---

#### **9) Orders Management (pages/restaurant/orders/index.vue & [id].vue)**

**Backend API:** ✅ **READY**

**Composables to Create:**
```javascript
// composables/restaurant/useRestaurantOrders.js
export function useRestaurantOrders() {
  const orders = ref([])
  const order = ref(null)
  const loading = ref(false)

  const fetchOrders = async (params) => {
    // GET /restaurant/orders
    // params: page, limit, status, tableId, date (today/yesterday/week/month/custom)
    // Response includes: items[], table{}, location, createdByUser, payments[]
  }

  const getOrderById = async (orderId) => {
    // GET /restaurant/orders/:id
    // Full order with items, products, table, location, payments
  }

  const createOrder = async (orderData) => {
    // POST /restaurant/orders
    // Payload: { tableId, orderType, items[], customerInfo?, notes, paymentMethod }
    // Auto-occupies table, returns print.kitchenTicket status
  }

  const updateOrderStatus = async (orderId, statusData) => {
    // PUT /restaurant/orders/:id/status
    // Payload: { status: 'preparing'|'ready'|'completed'|'cancelled', notes? }
    // Returns previousStatus and new status
  }

  const addItemToOrder = async (orderId, itemData) => {
    // POST /restaurant/orders/:id/items
    // Payload: { productId, quantity, price, notes }
  }

  const completeOrder = async (orderId, paymentData) => {
    // POST /restaurant/orders/:id/complete
    // Payload: { paymentMethod, paymentAmount, notes }
    // Auto-releases table, creates payment record, returns print.receipt status
  }

  return { 
    orders, 
    order, 
    loading,
    fetchOrders, 
    getOrderById, 
    createOrder, 
    updateOrderStatus,
    addItemToOrder,
    completeOrder
  }
}
```

**Tasks - Orders List (index.vue):**
- [ ] Create `OrderCard.vue` component
  - Display: transactionNumber, table.tableNumber, status badge, items count, totalAmount, createdAt
  - Actions: [View Detail] [Update Status] [Complete]
- [ ] Filters: 
  - Status dropdown: pending, preparing, ready, completed, cancelled
  - Date filter: today, yesterday, week, month, custom range
  - Table filter (optional)
- [ ] Table view: columns: Order #, Table, Customer, Items Count, Total, Status, Created, Actions
- [ ] Status badges with colors:
  - pending: yellow/warning
  - preparing: blue/info
  - ready: green/success
  - completed: gray/ghost
  - cancelled: red/error

**Tasks - Order Detail ([id].vue):**
- [ ] Create `OrderItemsList.vue` component
  - Display each item: product.name, quantity, unitPrice, subtotal, notes
  - Show itemDetails.modifiers if exists
- [ ] Order info section:
  - Transaction #, Order Type (dine-in/takeaway/delivery)
  - Table info: tableNumber, capacity
  - Customer: customerName, customerPhone (if provided)
  - Notes, Created by user
- [ ] Totals section:
  - Subtotal, Tax, Voucher Discount (if any), Total Amount
  - Paid Amount, Change Amount
- [ ] Payments section (if completed):
  - Display payments array: paymentMethod, amount, receiptNumber, paymentDate
- [ ] Actions:
  - [Update Status] → Modal with status dropdown + notes
  - [Add Item] → Modal to add more items (only if not completed)
  - [Complete Order] → Payment modal (only if not completed)
  - [Print Receipt] → Open receipt in new window/modal
  - Status-specific actions based on current status

**API Calls:**
```javascript
// Fetch orders with filters
await fetchOrders({ 
  page: 1, 
  limit: 20, 
  status: 'pending', 
  date: 'today' 
})

// Get detail
const orderDetail = await getOrderById(orderId)
// Response includes: items with product details, table, payments[], createdByUser

// Update status
await updateOrderStatus(orderId, { 
  status: 'preparing', 
  notes: 'Order sedang disiapkan' 
})

// Add item
await addItemToOrder(orderId, {
  productId: 'uuid',
  quantity: 1,
  price: 15000,
  notes: 'Extra'
})

// Complete order
await completeOrder(orderId, {
  paymentMethod: 'cash',
  paymentAmount: 100000,
  notes: 'Pembayaran tunai'
})
// This will auto-release table and create payment record
```

**Components to Create:**
- `components/restaurant/orders/OrderCard.vue`
- `components/restaurant/orders/OrderStatusBadge.vue`
- `components/restaurant/orders/OrderItemsList.vue`
- `components/restaurant/orders/OrderStatusUpdateModal.vue`
- `components/restaurant/orders/AddItemModal.vue`
- `components/restaurant/orders/CompleteOrderModal.vue`
- `components/restaurant/orders/OrderTimelineView.vue`

---

#### **10) Transactions History (pages/restaurant/transactions/index.vue)**

**Composables to Create:**
```javascript
// composables/restaurant/useRestaurantTransactions.js
export function useRestaurantTransactions() {
  const transactions = ref([])
  const transaction = ref(null)
  const loading = ref(false)

  const fetchTransactions = async (params) => {
    // GET /restaurant/transactions
    // params: page, limit, paymentMethod, startDate, endDate
  }

  const getTransactionById = async (transactionId) => {
    // GET /restaurant/transactions/:id
  }

  const refundTransaction = async (transactionId, reason) => {
    // POST /restaurant/transactions/:id/refund
  }

  return { 
    transactions, 
    transaction, 
    loading,
    fetchTransactions, 
    getTransactionById, 
    refundTransaction
  }
}
```

**Tasks:**
- [ ] Filters: Payment method, Date range, Status (paid/refunded)
- [ ] Table columns: Transaction #, Order #, Table, Payment Method, Amount, Tax, Total, Date, Status, Actions
- [ ] Actions: [View Receipt] [Refund] [Export]
- [ ] Statistics: Total revenue, Total transactions, Average transaction, Revenue by payment method
- [ ] Export to CSV/PDF

**Components to Create:**
- `components/restaurant/shared/DateRangeFilter.vue`
- `components/restaurant/shared/ExportButton.vue`

---

### **Phase 3: Kitchen Display (Week 5)** 🔲 *(Backend API + WebSocket Required)*

---

#### **11) Kitchen Display System (pages/restaurant/kitchen/display.vue)**

**Composables to Create:**
```javascript
// composables/restaurant/useRestaurantKitchen.js
export function useRestaurantKitchen() {
  const orders = ref([])
  const stats = ref({})
  const loading = ref(false)

  const fetchKitchenOrders = async () => {
    // GET /restaurant/kitchen/orders
    // Returns orders grouped by status
  }

  const updateKitchenOrderStatus = async (orderId, status) => {
    // PATCH /restaurant/kitchen/orders/:id/status
    // status: 'cooking', 'ready'
  }

  const subscribeToKitchen = (callback) => {
    // WebSocket subscription
    // Listen for new orders, status updates
  }

  return { 
    orders, 
    stats, 
    loading,
    fetchKitchenOrders, 
    updateKitchenOrderStatus,
    subscribeToKitchen
  }
}
```

**Tasks:**
- [ ] Create `KitchenOrderCard.vue` component
  - Display: Order #, Table, Items list, Preparation time, Timer (elapsed time)
  - Color coding: Normal (green), Warning (yellow >10min), Delayed (red >15min)
  - Actions: [Start Cooking] [Mark Ready]
- [ ] Create `KitchenQueue.vue` component (optional alternative view)
  - Queue list sorted by priority/time
- [ ] Create `OrderTimer.vue` component
  - Real-time timer counting up from order created time
  - Highlight if elapsed time exceeds preparationTime threshold
- [ ] Layout: 4 columns (Kanban board style)
  - **New Orders (pending):** Orders waiting to start
  - **Cooking:** Orders in progress
  - **Ready:** Orders ready for serving
  - **Served:** Completed (read-only, auto-hide after 5 min)
- [ ] Drag & drop functionality (optional):
  - Drag order card from "New" → "Cooking" → "Ready"
  - On drop: call `updateKitchenOrderStatus(orderId, newStatus)`
- [ ] WebSocket integration:
  - On component mount: `subscribeToKitchen((event) => { /* handle new order, status change */ })`
  - Play sound alert on new order
  - Flash notification for delayed orders
- [ ] Fullscreen mode toggle
- [ ] Station filter (optional): Grill, Drinks, Dessert, etc.
- [ ] Statistics sidebar: Avg prep time, Pending count, Delayed count

**API Calls:**
```javascript
// Fetch kitchen orders
const kitchenData = await fetchKitchenOrders()
orders.value = {
  pending: kitchenData.pending,
  cooking: kitchenData.cooking,
  ready: kitchenData.ready
}

// Update status
await updateKitchenOrderStatus(orderId, 'cooking')

// WebSocket
subscribeToKitchen((event) => {
  if (event.type === 'new_order') {
    orders.value.pending.unshift(event.order)
    playSound()
  }
  if (event.type === 'status_change') {
    // Move order between columns
  }
})
```

**Components to Create:**
- `components/restaurant/kitchen/KitchenOrderCard.vue`
- `components/restaurant/kitchen/KitchenQueue.vue`
- `components/restaurant/kitchen/OrderTimer.vue`

---

### **Phase 4: Reports & Analytics (Week 6)** 🔲 *(Backend API Required)*

---

#### **12) Reports Dashboard (pages/restaurant/reports/index.vue)**

**Composables to Create:**
```javascript
// composables/restaurant/useRestaurantReports.js
export function useRestaurantReports() {
  const salesReport = ref({})
  const productReport = ref({})
  const stockReport = ref({})
  const loading = ref(false)

  const getSalesReport = async (params) => {
    // GET /restaurant/reports/sales
    // params: startDate, endDate, groupBy (day/week/month)
  }

  const getProductPerformance = async (params) => {
    // GET /restaurant/reports/products
  }

  const getStockReport = async (params) => {
    // GET /restaurant/reports/stock
  }

  const exportReport = async (reportType, format) => {
    // GET /restaurant/reports/export?type=sales&format=pdf
  }

  return { 
    salesReport, 
    productReport, 
    stockReport,
    loading,
    getSalesReport, 
    getProductPerformance, 
    getStockReport,
    exportReport
  }
}
```

**Tasks:**
- [ ] Create `RevenueCard.vue` component
  - Total revenue, Total transactions, Average transaction, Growth %
- [ ] Create `SalesChart.vue` component
  - Line/Bar chart for revenue trend (use Chart.js or ApexCharts)
  - Toggle: Daily / Weekly / Monthly view
- [ ] Create `TopProductsChart.vue` component
  - Bar chart or list: Top 10 products by revenue
  - Click to view product detail
- [ ] Create `StockLevelChart.vue` component (optional)
  - Stock trend over time
- [ ] Date range filter (default: this month)
- [ ] Quick report buttons: [Sales] [Products] [Stock] [Export PDF] [Export Excel]
- [ ] Payment method breakdown: Pie chart

**API Calls:**
```javascript
// Get sales report
const sales = await getSalesReport({ 
  startDate: dateRange.value.start,
  endDate: dateRange.value.end,
  groupBy: 'day'
})

// Get product performance
const products = await getProductPerformance({
  startDate,
  endDate,
  limit: 10,
  sortBy: 'totalRevenue'
})

// Export
await exportReport('sales', 'pdf')
```

**Components to Create:**
- `components/restaurant/analytics/SalesChart.vue`
- `components/restaurant/analytics/RevenueCard.vue`
- `components/restaurant/analytics/TopProductsChart.vue`
- `components/restaurant/analytics/StockLevelChart.vue`

---

## 🎨 UI/UX Flow Design (Visual References)

### **1. Dashboard (index.vue)**
**Layout:** 4-column stats + Charts + Recent activity

```
┌─────────────────────────────────────────────────────────────┐
│  Restaurant Dashboard                    [Date Range Filter] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Today's  │  │  Active  │  │  Total   │  │   Low    │   │
│  │  Sales   │  │  Orders  │  │  Tables  │  │  Stock   │   │
│  │ Rp 5.2M  │  │    12    │  │  25/30   │  │    8     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌─────────────────────────┐   │
│  │   Sales Chart          │  │  Top Products Today     │   │
│  │   (Line/Bar Chart)     │  │  1. Nasi Goreng (45x)  │   │
│  │                        │  │  2. Es Teh (38x)       │   │
│  └────────────────────────┘  └─────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Recent Orders                                   [View All] │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ #ORD-001 | Table 5 | Rp 125K | Cooking | 5 mins ago  │ │
│  │ #ORD-002 | Table 3 | Rp 85K  | Served  | 12 mins ago │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time updates (WebSocket/Polling)
- Quick access to critical functions
- Visual charts for sales trends
- Recent activity feed

---

### **2. Products Management (products/index.vue)**
**Layout:** Statistics + Filters + Grid/List View

```
┌─────────────────────────────────────────────────────────────┐
│  Products                                 [+ Add Product]    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Total   │  │  Active  │  │   Low    │  │Categories│   │
│  │Products  │  │ Products │  │  Stock   │  │   Count  │   │
│  │   150    │  │   142    │  │    8     │  │    12    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [Search...] [Category ▼] [Location ▼] [Status ▼] [Grid/List]│
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │  │ [IMG]  │           │
│  │ Nasi   │  │ Mie    │  │ Es Teh │  │ Kopi   │           │
│  │ Goreng │  │ Ayam   │  │ Manis  │  │ Hitam  │           │
│  │Rp 35K  │  │Rp 25K  │  │Rp 8K   │  │Rp 15K  │           │
│  │Stock:50│  │Stock:30│  │Stock:80│  │Stock:40│           │
│  │[Edit]  │  │[Edit]  │  │[Edit]  │  │[Edit]  │  LOW STOCK│
│  └────────┘  └────────┘  └────────┘  └────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Grid/List toggle view
- Image thumbnails
- Stock level indicators
- Quick edit actions
- Category filtering
- Low stock highlighting

---

### **3. Floor Plan (tables/floor-plan.vue)** 🎨
**Layout:** Interactive Canvas + Sidebar Controls

```
┌─────────────────────────────────────────────────────────────┐
│  Floor Plan - Restoran Utama              [Edit Mode: OFF]  │
├──────────────────────────────┬──────────────────────────────┤
│                              │  Table Status                │
│         [MAIN DINING]        │  ┌────────────────────────┐ │
│                              │  │ ● Available (12)       │ │
│   ╔═════╗      ╔═════╗      │  │ ● Occupied (8)         │ │
│   ║ T01 ║      ║ T02 ║      │  │ ● Reserved (3)         │ │
│   ║  4  ║      ║  4  ║      │  │ ● Cleaning (2)         │ │
│   ╚═════╝      ╚═════╝      │  └────────────────────────┘ │
│     🟢          🔴           │                              │
│                              │  Selected: Table T01        │
│   ╔═════╗      ╔═════╗      │  Capacity: 4 persons        │
│   ║ T03 ║      ║ T04 ║      │  Status: Available          │
│   ║  2  ║      ║  6  ║      │  Location: (100, 200)       │
│   ╚═════╝      ╚═════╝      │                              │
│     🟢          🟡           │  [Change Status]            │
│                              │  [Edit Table]               │
│     [VIP SECTION]            │  [View Orders]              │
│   ╔═══════╗                  │                              │
│   ║  T10  ║                  │  Quick Actions:             │
│   ║   8   ║                  │  [+ Add Table]              │
│   ╚═══════╝                  │  [Reset Layout]             │
│     🔴                       │  [Export Layout]            │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

**Key Features:**
- Drag & drop table positioning (edit mode)
- Color-coded status (Green=Available, Red=Occupied, Yellow=Reserved, Gray=Cleaning)
- Real-time status updates
- Click to view/edit table details
- Zoom in/out controls
- Save layout configuration
- QR code generation per table

---

### **4. POS System (pos/index.vue)** 💰
**Layout:** Split screen - Products | Cart

```
┌─────────────────────────────────────────────────────────────┐
│  Point of Sale                          Table: [Select ▼]   │
├────────────────────────────┬────────────────────────────────┤
│  Products                  │  Current Order (#ORD-123)      │
│                            │                                │
│  [Search...] [Category ▼]  │  Customer: Walk-in / Table 5   │
│                            │  Cashier: Admin User           │
│  ┌─────┐ ┌─────┐ ┌─────┐  │  ┌──────────────────────────┐ │
│  │ 🍚  │ │ 🍜  │ │ ☕  │  │  │ 2x Nasi Goreng  Rp 70K  │ │
│  │Nasi │ │ Mie │ │Kopi │  │  │ 1x Es Teh       Rp 8K   │ │
│  │35K  │ │25K  │ │15K  │  │  │ 1x Kopi Hitam   Rp 15K  │ │
│  └─────┘ └─────┘ └─────┘  │  └──────────────────────────┘ │
│  ┌─────┐ ┌─────┐ ┌─────┐  │                                │
│  │ 🍗  │ │ 🥗  │ │ 🧃  │  │  Subtotal:      Rp   93,000   │
│  │Ayam │ │Salad│ │Juice│  │  Tax (10%):     Rp    9,300   │
│  │30K  │ │20K  │ │12K  │  │  ──────────────────────────   │
│  └─────┘ └─────┘ └─────┘  │  TOTAL:         Rp  102,300   │
│                            │                                │
│  [Load More...]            │  [💾 Hold] [🗑️ Clear]         │
│                            │  [💳 CHECKOUT]                │
└────────────────────────────┴────────────────────────────────┘
```

**Key Features:**
- Quick product search
- Visual product grid with images
- Real-time cart updates
- Tax calculation
- Order hold/resume functionality
- Multiple payment methods
- Split bill support
- Print receipt
- Table selection for dine-in

---

### **5. Kitchen Display (kitchen/display.vue)** 👨‍🍳
**Layout:** Queue Board - Columns by Status

```
┌─────────────────────────────────────────────────────────────┐
│  Kitchen Display System               🔄 Auto-refresh: ON   │
├────────────┬────────────┬────────────┬────────────────────┤
│ NEW ORDERS │  COOKING   │  READY     │  SERVED           │
│    (5)     │    (8)     │    (3)     │  (Today: 45)      │
├────────────┼────────────┼────────────┼────────────────────┤
│┌──────────┐│┌──────────┐│┌──────────┐│ Statistics:       │
││#ORD-045  ││││#ORD-042  ││││#ORD-039  ││                   │
││Table: 12 ││││Table: 5  ││││Table: 3  ││ Avg Prep: 12 min │
││⏱️ 2 min  ││││⏱️ 8 min  ││││⏱️ 1 min  ││ Pending: 13      │
││          ││││          ││││          ││ Delayed: 2       │
││2x Nasi   ││││1x Mie    ││││3x Kopi   ││                   │
││  Goreng  ││││  Ayam    ││││  Hitam   ││ [View Reports]   │
││1x Es Teh ││││2x Juice  ││││          ││ [Settings]       │
││          ││││          ││││          ││                   │
││[START ▶️]││││[DONE ✅] ││││[SERVE 🍽️]││                   │
│└──────────┘││└──────────┘││└──────────┘│                   │
│            ││            ││            │                   │
│┌──────────┐││┌──────────┐││            │                   │
││#ORD-046  ││││#ORD-043  ││││            │                   │
││Table: 8  ││││Table: 15 ││││            │                   │
││⏱️ 1 min  ││││⏱️ 15 min ││││            │  🔴 DELAYED      │
└────────────┴────────────┴────────────┴────────────────────┘
```

**Key Features:**
- Real-time order updates (WebSocket)
- Drag & drop status change
- Order timer (highlight delayed)
- Sound/visual alerts for new orders
- Priority marking
- Order notes display
- Quick status buttons
- Fullscreen mode
- Station-specific filtering (Grill, Drinks, etc.)

---

### **6. Stock Management (stock/index.vue)**
**Layout:** Overview + Movements + Alerts

```
┌─────────────────────────────────────────────────────────────┐
│  Stock Management                      [+ Stock Movement]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Total   │  │   Low    │  │ Movement │  │  Value   │   │
│  │ Products │  │  Stock   │  │  Today   │  │  Total   │   │
│  │   150    │  │    8     │  │    25    │  │ Rp 15M   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│  📊 Stock Level Overview                                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Nasi (Beras)    ████████░░ 80%  [Adjust Stock]       │ │
│  │ Minyak Goreng   ███░░░░░░░ 30%  [Adjust Stock] ⚠️    │ │
│  │ Ayam Potong     █████████░ 90%  [Adjust Stock]       │ │
│  │ Es Batu         ██░░░░░░░░ 20%  [Adjust Stock] 🔴    │ │
│  └───────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  📋 Recent Stock Movements        [View All] [Export CSV]  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ IN  | Nasi (Beras)  | +50kg | Pembelian | 2 hrs ago  │ │
│  │ OUT | Minyak Goreng | -5L   | Pemakaian | 3 hrs ago  │ │
│  │ ADJ | Es Batu       | +20kg | Adjustment| 4 hrs ago  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Visual stock level indicators
- Low stock alerts with threshold
- Movement history log
- Quick stock adjustment
- Multiple movement types (IN, OUT, ADJUSTMENT, TRANSFER)
- Location-based stock tracking
- Export capabilities

---

### **7. Reports & Analytics (reports/index.vue)**
**Layout:** Dashboard with various report widgets

```
┌─────────────────────────────────────────────────────────────┐
│  Reports & Analytics              [Date Range: This Month]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ Sales Summary       │  │  Revenue Trend               │ │
│  │ Total: Rp 45.2M    │  │  ┌────────────────────────┐  │ │
│  │ Transactions: 1,250│  │  │     📈 Chart           │  │ │
│  │ Avg: Rp 36K        │  │  └────────────────────────┘  │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ Top Products        │  │  Payment Methods             │ │
│  │ 1. Nasi Goreng     │  │  💰 Cash:    65%             │ │
│  │ 2. Mie Ayam        │  │  💳 Card:    25%             │ │
│  │ 3. Es Teh          │  │  📱 E-Wallet: 10%            │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Quick Reports:                                             │
│  [📊 Sales Report] [📦 Stock Report] [💳 Payment Report]   │
│  [📈 Daily Report] [📉 Product Performance] [Export PDF]   │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Date range filtering
- Multiple chart types
- Export to PDF/Excel
- Pre-built report templates
- Custom report builder
- Comparison with previous periods
- Real-time data updates

---

## 🎨 DaisyUI Component Usage

### **Color Coding Standards**
```javascript
// Status Colors
- Available/Active:  btn-success, badge-success, text-success
- Occupied/In Use:   btn-error, badge-error, text-error
- Reserved/Pending:  btn-warning, badge-warning, text-warning
- Cleaning/Processing: btn-info, badge-info, text-info
- Disabled/Inactive: btn-ghost, badge-ghost, opacity-50

// Action Buttons
- Primary Action:    btn-primary
- Secondary Action:  btn-secondary
- Delete/Refund:     btn-error
- View/Info:         btn-info
- Create/New:        btn-success
```

### **Common Components**
- **Cards:** `card bg-base-100 shadow-xl`
- **Stats:** `stats shadow` with `stat` children
- **Tables:** `table table-zebra` with hover states
- **Modals:** `modal modal-open` with `modal-box`
- **Forms:** `form-control` with `label` and `input`
- **Badges:** `badge badge-primary badge-sm`
- **Alerts:** `alert alert-info/success/warning/error`
- **Loading:** `loading loading-spinner loading-lg`

---

## 🔄 Data Flow Patterns

### **1. Product Purchase Flow (POS)**
```
User Action → POSProductGrid (select) 
           → POSCart (add item) 
           → POSPaymentModal (checkout)
           → useRestaurantOrders.createOrder()
           → API: POST /restaurant/orders
           → Success: Print receipt, update stock
```

### **2. Kitchen Order Flow**
```
Order Created → WebSocket broadcast 
             → KitchenDisplay (new order notification)
             → Chef clicks "Start Cooking"
             → useRestaurantKitchen.updateOrderStatus()
             → API: PATCH /restaurant/orders/{id}/status
             → Real-time update across all connected displays
```

### **3. Stock Adjustment Flow**
```
Low Stock Alert → StockAdjustmentModal (open)
                → User inputs quantity & reason
                → useRestaurantStock.createStockMovement()
                → API: POST /restaurant/stock-movements
                → Update product stockQuantity
                → Refresh stock displays
```

---

## 📊 Component Reusability Matrix

| Component | Used In | Purpose |
|-----------|---------|---------|
| **ProductCard** | Products page, POS, Reports | Display product info |
| **TableCard** | Tables page, Floor Plan | Show table status |
| **RestaurantStatCard** | All dashboards | Statistics display |
| **OrderStatusBadge** | Orders, Kitchen, Transactions | Visual status |
| **DateRangeFilter** | Reports, Transactions, Orders | Date filtering |
| **ExportButton** | Reports, Stock, Transactions | Export data |
| **POSCart** | POS only | Shopping cart management |
| **KitchenOrderCard** | Kitchen Display only | Order visualization |
| **FloorPlanCanvas** | Floor Plan only | Interactive table layout |

---

## 🔐 Permission & Access Control

### **CASL Subjects (to add in navigation.js)**
```javascript
// Restaurant Module Permissions
{
  module: 'restaurant',
  subjects: [
    'RestaurantProduct',    // CRUD products
    'RestaurantLocation',   // CRUD locations
    'RestaurantTable',      // CRUD tables, update status
    'RestaurantStock',      // View stock, create movements
    'RestaurantOrder',      // Create, view, update orders
    'RestaurantTransaction',// View transactions, refunds
    'RestaurantKitchen',    // Kitchen display access
    'RestaurantReport',     // View reports, export
    'RestaurantPOS'         // POS access
  ],
  actions: ['create', 'read', 'update', 'delete', 'manage']
}
```

### **Role Examples**
```javascript
// Cashier Role
- RestaurantPOS: create, read
- RestaurantOrder: create, read
- RestaurantProduct: read (view only)

// Kitchen Staff Role
- RestaurantKitchen: read, update (status only)
- RestaurantOrder: read, update (status only)

// Manager Role
- All Restaurant subjects: manage (full access)
- RestaurantReport: read, export
```

---

## 📝 Navigation Menu Structure

```javascript
// Add to src/navigation/navigation.js
{
  label: "Restaurant",
  icon: "tools-kitchen-2", // or "chef-hat"
  action: "read",
  subject: "RestaurantDashboard",
  requireModule: "restaurant",
  children: [
    {
      label: "Dashboard",
      to: "/restaurant",
      icon: "dashboard",
      action: "read",
      subject: "RestaurantDashboard"
    },
    {
      label: "Point of Sale",
      to: "/restaurant/pos",
      icon: "cash-register", // or "device-pos"
      action: "create",
      subject: "RestaurantPOS"
    },
    {
      label: "Products",
      icon: "package",
      children: [
        {
          label: "Product List",
          to: "/restaurant/products",
          icon: "list",
          action: "read",
          subject: "RestaurantProduct"
        },
        {
          label: "Categories",
          to: "/restaurant/products/categories",
          icon: "category",
          action: "read",
          subject: "RestaurantProduct"
        }
      ]
    },
    {
      label: "Tables",
      icon: "armchair",
      children: [
        {
          label: "Table List",
          to: "/restaurant/tables",
          icon: "list",
          action: "read",
          subject: "RestaurantTable"
        },
        {
          label: "Floor Plan",
          to: "/restaurant/tables/floor-plan",
          icon: "layout",
          action: "read",
          subject: "RestaurantTable"
        }
      ]
    },
    {
      label: "Stock",
      icon: "box",
      children: [
        {
          label: "Stock Overview",
          to: "/restaurant/stock",
          icon: "list",
          action: "read",
          subject: "RestaurantStock"
        },
        {
          label: "Stock Movements",
          to: "/restaurant/stock/movements",
          icon: "arrows-exchange",
          action: "read",
          subject: "RestaurantStock"
        },
        {
          label: "Low Stock Alerts",
          to: "/restaurant/stock/alerts",
          icon: "alert-triangle",
          action: "read",
          subject: "RestaurantStock"
        }
      ]
    },
    {
      label: "Orders",
      to: "/restaurant/orders",
      icon: "shopping-cart",
      action: "read",
      subject: "RestaurantOrder"
    },
    {
      label: "Kitchen Display",
      to: "/restaurant/kitchen/display",
      icon: "chef-hat",
      action: "read",
      subject: "RestaurantKitchen"
    },
    {
      label: "Transactions",
      to: "/restaurant/transactions",
      icon: "credit-card",
      action: "read",
      subject: "RestaurantTransaction"
    },
    {
      label: "Locations",
      to: "/restaurant/locations",
      icon: "map-pin",
      action: "read",
      subject: "RestaurantLocation"
    },
    {
      label: "Reports",
      icon: "chart-bar",
      children: [
        {
          label: "Dashboard",
          to: "/restaurant/reports",
          icon: "dashboard",
          action: "read",
          subject: "RestaurantReport"
        },
        {
          label: "Sales Report",
          to: "/restaurant/reports/sales",
          icon: "cash",
          action: "read",
          subject: "RestaurantReport"
        },
        {
          label: "Product Performance",
          to: "/restaurant/reports/products",
          icon: "chart-line",
          action: "read",
          subject: "RestaurantReport"
        },
        {
          label: "Stock Report",
          to: "/restaurant/reports/stock",
          icon: "box",
          action: "read",
          subject: "RestaurantReport"
        }
      ]
    }
  ]
}
```

---

## 🚀 Implementation Priority & Effort Estimation

### **Phase 1: Core Setup & Product Management** (Week 1-2)
**Effort: ~40 hours**

1. **Dashboard (4 hours)**
   - Create `pages/restaurant/index.vue`
   - Stats cards component
   - Basic charts integration

2. **Products (12 hours)**
   - `pages/restaurant/products/index.vue`
   - `ProductListView.vue` component
   - `ProductFormModal.vue` component
   - `ProductCard.vue` component
   - Category management page

3. **Locations (6 hours)**
   - `pages/restaurant/locations/index.vue`
   - `LocationListView.vue` component
   - `LocationFormModal.vue` component

4. **Tables (10 hours)**
   - `pages/restaurant/tables/index.vue`
   - `TableListView.vue` component
   - `TableFormModal.vue` component
   - `TableCard.vue` component
   - Status management

5. **Stock (8 hours)**
   - `pages/restaurant/stock/index.vue`
   - `StockOverviewCard.vue` component
   - `StockMovementList.vue` component
   - `LowStockAlert.vue` component
   - Movement modal

**Deliverables:**
- ✅ Full CRUD for Products, Locations, Tables
- ✅ Stock monitoring and movements
- ✅ Basic dashboard with statistics
- ✅ Responsive design with DaisyUI

---

### **Phase 2: POS & Orders** (Week 3-4)
**Effort: ~50 hours** (Backend API required)

1. **Composables (8 hours)**
   - Create `useRestaurantOrders.js`
   - Create `useRestaurantTransactions.js`

2. **POS System (20 hours)**
   - `pages/restaurant/pos/index.vue`
   - `POSProductGrid.vue` component
   - `POSCart.vue` component
   - `POSPaymentModal.vue` component
   - `POSReceiptModal.vue` component
   - Payment processing logic
   - Receipt printing integration

3. **Orders Management (12 hours)**
   - `pages/restaurant/orders/index.vue`
   - `pages/restaurant/orders/[id].vue`
   - `OrderCard.vue` component
   - `OrderItemsList.vue` component
   - `OrderStatusBadge.vue` component

4. **Transactions (10 hours)**
   - `pages/restaurant/transactions/index.vue`
   - Transaction history view
   - Refund functionality
   - Payment breakdown display

**Deliverables:**
- ✅ Full POS system for dine-in/takeaway
- ✅ Order management with status tracking
- ✅ Transaction history and refunds
- ✅ Receipt generation

---

### **Phase 3: Kitchen Display System** (Week 5)
**Effort: ~30 hours** (Backend API required)

1. **Composables (6 hours)**
   - Create `useRestaurantKitchen.js`
   - WebSocket integration for real-time updates

2. **Kitchen Display (16 hours)**
   - `pages/restaurant/kitchen/display.vue`
   - `KitchenOrderCard.vue` component
   - `KitchenQueue.vue` component
   - `OrderTimer.vue` component
   - Drag & drop functionality
   - Sound notifications
   - Fullscreen mode

3. **Queue Management (8 hours)**
   - `pages/restaurant/kitchen/queue.vue`
   - Priority management
   - Station filtering
   - Performance metrics

**Deliverables:**
- ✅ Real-time kitchen display
- ✅ Order queue management
- ✅ Status workflow automation
- ✅ Alert system for delays

---

### **Phase 4: Reports & Analytics** (Week 6)
**Effort: ~35 hours** (Backend API required)

1. **Composables (5 hours)**
   - Create `useRestaurantReports.js`
   - Chart data formatting utilities

2. **Reports Dashboard (10 hours)**
   - `pages/restaurant/reports/index.vue`
   - `SalesChart.vue` component
   - `RevenueCard.vue` component
   - `TopProductsChart.vue` component

3. **Specific Reports (20 hours)**
   - `pages/restaurant/reports/sales.vue`
   - `pages/restaurant/reports/products.vue`
   - `pages/restaurant/reports/stock.vue`
   - Export functionality (PDF/Excel)
   - Custom date range filters
   - Comparison tools

**Deliverables:**
- ✅ Comprehensive reporting system
- ✅ Visual analytics with charts
- ✅ Export capabilities
- ✅ Performance insights

---

### **Phase 5: Advanced Features** (Week 7-8)
**Effort: ~40 hours**

1. **Floor Plan Editor (16 hours)**
   - `pages/restaurant/tables/floor-plan.vue`
   - `FloorPlanCanvas.vue` component
   - Drag & drop table positioning
   - Save/load layouts
   - QR code generation

2. **Inventory Automation (12 hours)**
   - Auto stock deduction on order
   - Reorder point alerts
   - Supplier integration hooks

3. **Customer Display (12 hours)**
   - Customer-facing screen for orders
   - QR-based menu ordering
   - Order status tracking for customers

**Deliverables:**
- ✅ Visual floor plan management
- ✅ Automated inventory tracking
- ✅ Enhanced customer experience

---

## 💡 Additional Suggestions

### **1. Real-time Features**
- **WebSocket Integration:** For live order updates in Kitchen Display
- **Server-Sent Events (SSE):** Alternative for real-time updates
- **Polling Fallback:** For browsers without WebSocket support

### **2. Mobile Responsiveness**
- **Waiter App:** Mobile-optimized POS for table-side ordering
- **Kitchen App:** Tablet-optimized kitchen display
- **Manager App:** Mobile dashboard for quick insights

### **3. Integration Points**
- **Payment Gateways:** Stripe, Midtrans for card payments
- **Printer Integration:** Receipt printers, kitchen printers
- **Accounting Software:** Export data to accounting systems
- **Delivery Apps:** Integration with GoFood, GrabFood APIs

### **4. Performance Optimization**
- **Lazy Loading:** For product images and components
- **Virtual Scrolling:** For large product lists
- **Caching Strategy:** IndexedDB for offline POS capability
- **Image Optimization:** WebP format, lazy loading, thumbnails

### **5. UX Enhancements**
- **Keyboard Shortcuts:** Quick navigation in POS
- **Barcode Scanning:** Fast product lookup
- **Voice Commands:** Hands-free kitchen operations
- **Multi-language:** I18n support for menu items

### **6. Testing Strategy**
- **Unit Tests:** For composables and utility functions
- **Component Tests:** For reusable components
- **E2E Tests:** For critical flows (POS, Kitchen workflow)
- **Load Testing:** For concurrent order handling

### **7. Documentation Needs**
- **User Manual:** For staff training
- **API Documentation:** For backend integration
- **Component Library:** Storybook for UI components
- **Deployment Guide:** Setup and configuration

---

## 🎯 Success Metrics

### **KPIs to Track:**
1. **Order Processing Time:** Average time from order to serve
2. **Kitchen Efficiency:** Preparation time per dish
3. **Stock Accuracy:** Inventory variance percentage
4. **Sales Performance:** Daily/monthly revenue trends
5. **Customer Satisfaction:** Through order completion rate
6. **System Uptime:** Availability of POS and Kitchen Display

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API delays | High | Use mock data, implement frontend first |
| Real-time connection issues | Medium | Polling fallback, offline queue |
| Printer connectivity | Medium | Browser print API fallback |
| Concurrent stock updates | High | Optimistic locking, transaction handling |
| Kitchen Display lag | High | Optimize WebSocket, use CDN for assets |
| Mobile compatibility | Medium | Progressive Web App (PWA) approach |

---

## 📋 Checklist Before Starting

- [ ] Backend API endpoints documented
- [ ] Design mockups reviewed and approved
- [ ] Icon library confirmed (Tabler Icons)
- [ ] Permission structure defined in CASL
- [ ] Database schema for orders/transactions ready
- [ ] WebSocket server setup (if needed)
- [ ] Printer integration requirements clarified
- [ ] Payment gateway credentials obtained
- [ ] Testing environment prepared
- [ ] Staging server configured

---

## 🔄 Iteration Plan

### **Sprint 1 (2 weeks):** Phase 1 - Core Setup
- Focus: Dashboard, Products, Locations, Tables, Stock
- Goal: Complete product & inventory management

### **Sprint 2 (2 weeks):** Phase 2 - POS & Orders
- Focus: POS system, order management, transactions
- Goal: Fully functional point of sale

### **Sprint 3 (1 week):** Phase 3 - Kitchen Display
- Focus: Kitchen display system, real-time updates
- Goal: Streamlined kitchen operations

### **Sprint 4 (1 week):** Phase 4 - Reports
- Focus: Analytics, reporting, insights
- Goal: Business intelligence tools

### **Sprint 5 (2 weeks):** Phase 5 - Advanced Features
- Focus: Floor plan, automation, enhancements
- Goal: Premium features and optimizations

---

## 📞 Next Steps

1. **Review this plan** with the team
2. **Confirm backend API priorities** (which endpoints first?)
3. **Start with Phase 1** (composables already ready ✅)
4. **Create first page:** `pages/restaurant/index.vue` (Dashboard)
5. **Iterate based on feedback**

---

**Questions for Discussion:**
1. Should we prioritize POS before Kitchen Display, or vice versa?
2. Do we need offline POS capability (service workers)?
3. What payment methods are required initially?
4. Should floor plan be drag & drop or just coordinates input?
5. Any specific reporting requirements from stakeholders?
6. Mobile-first or desktop-first approach for POS?
7. Do we need multi-currency support?
8. Table reservation system required?

---

**Plan Status:** ✅ **READY FOR REVIEW**  
**Created by:** GitHub Copilot  
**Date:** November 30, 2025  
**Version:** 1.0
