# Restaurant Module - Complete API Documentation

## Overview

Restaurant Module adalah modul lengkap untuk manajemen restoran/cafe dalam sistem Gym Membership Multi-Tenant SaaS. Modul ini mencakup:

- **Product Catalog**: Manajemen produk dengan JSONB variants & options
- **Category Management**: Kategori hierarkis untuk produk
- **Table Management**: Manajemen meja dengan floor plan visual
- **Location Management**: Multi-lokasi/cabang
- **Stock Management**: Tracking inventory & stock movements
- **Order Management**: Order lifecycle lengkap dengan split payment
- **Split Bill**: Bagi tagihan secara equal atau per item
- **Merge Bills**: Gabungkan beberapa order menjadi satu tagihan
- **Direct Order**: Quick sale untuk takeaway/counter
- **Combined Billing**: Gabungkan membership + produk dalam satu transaksi
- **Voucher Integration**: Diskon menggunakan voucher global

## Authentication

Semua endpoint memerlukan JWT token. Gunakan endpoint login terlebih dahulu:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@tenant.com",
  "password": "password123"
}
```

Response akan memberikan `token` yang harus disertakan di header:

```
Authorization: Bearer <token>
```

## Feature Gating

Modul ini di-gate berdasarkan subscription plan tenant:

| Feature | Basic | Professional | Enterprise |
|---------|-------|--------------|------------|
| Restaurant Module | ❌ | ✅ | ✅ |
| Combined Billing | ❌ | ❌ | ✅ |
| Split Bill | ❌ | ✅ | ✅ |
| Multi-Location | ❌ | ✅ | ✅ |

## API Endpoints

### 1. Product Categories

#### Get All Categories
```http
GET /api/v1/restaurant/categories
Query Parameters:
  - tree: boolean (return as tree structure)
  - includeCount: boolean (include product count)
  - includeInactive: boolean
  - parentId: UUID (filter by parent)
```

#### Get Category Tree
```http
GET /api/v1/restaurant/categories/tree
```

#### Get Category by ID
```http
GET /api/v1/restaurant/categories/:id
```

#### Create Category
```http
POST /api/v1/restaurant/categories
Content-Type: application/json

{
  "name": "Beverages",
  "description": "All drinks",
  "parentId": null,
  "displayOrder": 1,
  "color": "#2196F3",
  "icon": "local_cafe",
  "isActive": true
}
```

#### Update Category
```http
PUT /api/v1/restaurant/categories/:id
```

#### Delete Category
```http
DELETE /api/v1/restaurant/categories/:id
```

#### Reorder Categories
```http
POST /api/v1/restaurant/categories/reorder
Content-Type: application/json

{
  "categories": [
    { "id": "uuid-1", "displayOrder": 1 },
    { "id": "uuid-2", "displayOrder": 2 }
  ]
}
```

---

### 2. Products

#### Get All Products
```http
GET /api/v1/restaurant/products
Query Parameters:
  - page: number
  - limit: number
  - search: string (name, SKU, barcode)
  - categoryId: UUID
  - locationId: UUID
  - isActive: boolean
  - trackInventory: boolean
  - lowStock: boolean
  - productType: string (from JSONB)
```

#### Get Low Stock Products
```http
GET /api/v1/restaurant/products/low-stock
```

#### Get Product by ID
```http
GET /api/v1/restaurant/products/:id
```

#### Create Product with Variants
```http
POST /api/v1/restaurant/products
Content-Type: application/json

{
  "name": "Coffee",
  "sku": "BEV-COFFEE-001",
  "price": 25000,
  "categoryId": "uuid",
  "locationId": "uuid",
  "trackInventory": true,
  "stockQuantity": 100,
  "minStockLevel": 10,
  "productDetails": {
    "productType": "beverage",
    "hasVariants": true,
    "variants": [
      { "name": "Small", "sku": "BEV-COFFEE-001-S", "price": 20000, "isAvailable": true },
      { "name": "Large", "sku": "BEV-COFFEE-001-L", "price": 25000, "isAvailable": true }
    ],
    "options": [
      { "name": "Sugar Level", "values": ["No Sugar", "Less", "Normal"] },
      { "name": "Ice Level", "values": ["No Ice", "Less Ice", "Normal"] }
    ],
    "allergens": ["Milk", "Caffeine"]
  },
  "isActive": true
}
```

#### Update Product
```http
PUT /api/v1/restaurant/products/:id
```

#### Delete Product
```http
DELETE /api/v1/restaurant/products/:id
```

#### Adjust Stock
```http
POST /api/v1/restaurant/products/:id/adjust-stock
Content-Type: application/json

{
  "quantity": 50,  // positive = add, negative = reduce
  "notes": "Stock replenishment"
}
```

---

### 3. Restaurant Tables

#### Get All Tables
```http
GET /api/v1/restaurant/tables
Query Parameters:
  - locationId: UUID
  - status: string (available, occupied, reserved, cleaning)
  - section: string
```

#### Get Table Statistics
```http
GET /api/v1/restaurant/tables/statistics
```

#### Get Table Layout (for Floor Plan)
```http
GET /api/v1/restaurant/tables/layout/:locationId
```

#### Get Table by ID
```http
GET /api/v1/restaurant/tables/:id
```

#### Create Table
```http
POST /api/v1/restaurant/tables
Content-Type: application/json

{
  "tableNumber": "T01",
  "capacity": 4,
  "locationId": "uuid",
  "positionX": 100,
  "positionY": 200,
  "width": 80,
  "height": 80,
  "shape": "rectangle",
  "section": "Main Hall",
  "isActive": true
}
```

#### Update Table
```http
PUT /api/v1/restaurant/tables/:id
```

#### Delete Table
```http
DELETE /api/v1/restaurant/tables/:id
```

#### Occupy Table
```http
POST /api/v1/restaurant/tables/:id/occupy
Content-Type: application/json

{
  "numberOfGuests": 4,
  "orderId": "uuid"
}
```

#### Release Table
```http
POST /api/v1/restaurant/tables/:id/release
Content-Type: application/json

{
  "notes": "Table cleaned and ready"
}
```

#### Reserve Table
```http
POST /api/v1/restaurant/tables/:id/reserve
Content-Type: application/json

{
  "reservedFor": "John Doe",
  "reservationTime": "2025-11-30T20:00:00Z",
  "numberOfGuests": 4,
  "notes": "Birthday celebration"
}
```

#### Set Table Cleaning
```http
POST /api/v1/restaurant/tables/:id/cleaning
```

---

### 4. Locations

#### Get All Locations
```http
GET /api/v1/restaurant/locations
```

#### Get Location by ID
```http
GET /api/v1/restaurant/locations/:id
```

#### Create Location
```http
POST /api/v1/restaurant/locations
Content-Type: application/json

{
  "name": "Main Restaurant",
  "code": "BRA-001",
  "type": "main",
  "address": "Jl. Sudirman No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "12345",
  "country": "Indonesia",
  "phone": "+62812345678",
  "email": "main@restaurant.com",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "isActive": true
}
```

#### Update Location
```http
PUT /api/v1/restaurant/locations/:id
```

#### Delete Location
```http
DELETE /api/v1/restaurant/locations/:id
```

---

### 5. Stock Movements

#### Get Stock Movements
```http
GET /api/v1/restaurant/stock-movements
Query Parameters:
  - page: number
  - limit: number
  - productId: UUID
  - locationId: UUID
  - movementType: string (in, out, adjustment, transfer)
  - startDate: date
  - endDate: date
```

#### Get Stock Summary
```http
GET /api/v1/restaurant/stock-movements/summary
```

#### Get Most Moved Products
```http
GET /api/v1/restaurant/stock-movements/most-moved
Query Parameters:
  - limit: number (default: 10)
  - locationId: UUID
```

---

### 6. Orders

#### Get All Orders
```http
GET /api/v1/restaurant/orders
Query Parameters:
  - page: number
  - limit: number
  - status: string (pending, confirmed, preparing, ready, served, completed, cancelled, split, merged, paid)
  - orderType: string (dine-in, takeaway, delivery)
  - tableId: UUID
  - locationId: UUID
  - startDate: date
  - endDate: date
```

#### Get Kitchen Orders
```http
GET /api/v1/restaurant/orders/kitchen
```
Returns orders with status `confirmed` or `preparing` for kitchen display.

#### Get Orders by Table
```http
GET /api/v1/restaurant/orders/table/:tableId
```

#### Get Order by ID
```http
GET /api/v1/restaurant/orders/:id
```

#### Create Order
```http
POST /api/v1/restaurant/orders
Content-Type: application/json

{
  "tableId": "uuid",
  "locationId": "uuid",
  "orderType": "dine-in",  // dine-in, takeaway, delivery
  "numberOfGuests": 4,
  "customerName": "John Doe",
  "customerPhone": "+62812345678",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "notes": "Less ice"
    }
  ],
  "notes": "VIP customer"
}
```

#### Update Order Status
```http
PATCH /api/v1/restaurant/orders/:id/status
Content-Type: application/json

{
  "status": "preparing",
  "notes": "Started preparing"
}
```

**Valid Status Transitions:**
- `pending` → `confirmed` → `preparing` → `ready` → `served` → `completed`
- Any status → `cancelled`

#### Add Items to Order
```http
POST /api/v1/restaurant/orders/:id/items
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 1,
      "notes": "Extra hot"
    }
  ]
}
```

#### Validate Voucher
```http
POST /api/v1/restaurant/orders/validate-voucher
Content-Type: application/json

{
  "code": "DISCOUNT20",
  "amount": 100000
}
```

Response:
```json
{
  "valid": true,
  "voucher": {
    "id": "uuid",
    "code": "DISCOUNT20",
    "discountType": "percentage",
    "discountValue": 20
  },
  "discountAmount": 20000,
  "finalAmount": 80000
}
```

---

### 7. Order Payment & Checkout

#### Complete Order - Single Payment
```http
POST /api/v1/restaurant/orders/:id/complete
Content-Type: application/json

{
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 100000
    }
  ],
  "customerName": "John Doe",
  "customerPhone": "+62812345678",
  "notes": "Thank you"
}
```

#### Complete Order - Split Payment
```http
POST /api/v1/restaurant/orders/:id/complete
Content-Type: application/json

{
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 50000
    },
    {
      "paymentMethod": "e_wallet",
      "amount": 30000,
      "reference": "GOPAY-123456"
    },
    {
      "paymentMethod": "credit_card",
      "amount": 20000,
      "reference": "VISA-**** 4242"
    }
  ],
  "voucherCode": "DISCOUNT10",
  "customerName": "John Doe"
}
```

**Supported Payment Methods:**
- `cash`
- `credit_card`
- `debit_card`
- `bank_transfer`
- `e_wallet`
- `qris`
- `other`

---

### 8. Split Bill

#### Equal Split
```http
POST /api/v1/restaurant/orders/:id/split
Content-Type: application/json

{
  "splitType": "equal",
  "splits": 3
}
```

Membagi order menjadi 3 tagihan dengan jumlah sama.

#### Split by Items
```http
POST /api/v1/restaurant/orders/:id/split
Content-Type: application/json

{
  "splitType": "by_items",
  "splits": [
    {
      "itemIds": ["item-uuid-1", "item-uuid-2"],
      "customerName": "Customer A"
    },
    {
      "itemIds": ["item-uuid-3"],
      "customerName": "Customer B"
    }
  ]
}
```

Membagi order berdasarkan item tertentu.

**Response:**
```json
{
  "success": true,
  "message": "Order berhasil di-split menjadi 3 bagian",
  "data": {
    "originalOrder": { ... },
    "splitOrders": [
      { "id": "uuid", "transactionNumber": "ORD-202511-0001", "totalAmount": 50000 },
      { "id": "uuid", "transactionNumber": "ORD-202511-0002", "totalAmount": 50000 }
    ]
  }
}
```

---

### 9. Merge Bills

```http
POST /api/v1/restaurant/orders/merge
Content-Type: application/json

{
  "orderIds": ["uuid-1", "uuid-2"]
}
```

Menggabungkan beberapa order menjadi satu tagihan.

**Response:**
```json
{
  "success": true,
  "message": "2 order berhasil digabungkan",
  "data": {
    "mergedOrder": {
      "id": "uuid",
      "transactionNumber": "ORD-202511-0010",
      "totalAmount": 200000,
      "itemCount": 5
    },
    "mergedOrderIds": ["uuid-1", "uuid-2"]
  }
}
```

---

### 10. Direct Order (Quick Sale)

```http
POST /api/v1/restaurant/orders/direct
Content-Type: application/json

{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "notes": "No sugar"
    }
  ],
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 50000
    }
  ],
  "voucherCode": "",
  "orderType": "takeaway",
  "locationId": "uuid",
  "customerName": "Walk-in Customer"
}
```

Membuat dan menyelesaikan order dalam satu langkah. Ideal untuk quick sale / counter.

---

### 11. Combined Billing

Menggabungkan transaksi membership + produk dalam satu tagihan. **Requires 'combinedBilling' feature.**

#### Create Combined Transaction
```http
POST /api/v1/restaurant/billing/combined
Content-Type: application/json

{
  "customerId": "member-uuid",
  "customerType": "member",
  "customerName": "John Doe",
  "customerPhone": "+62812345678",
  "tableId": "table-uuid",
  "locationId": "location-uuid",
  "orderType": "dine-in",
  "items": [
    {
      "type": "product",
      "productId": "uuid",
      "quantity": 2,
      "notes": "Less ice"
    },
    {
      "type": "membership",
      "membershipTypeId": "uuid",
      "startDate": "2025-12-01"
    }
  ],
  "payments": [
    {
      "method": "credit_card",
      "amount": 500000,
      "reference": "VISA-**** 4242"
    },
    {
      "method": "e_wallet",
      "amount": 150000,
      "reference": "GOPAY-123456"
    }
  ],
  "voucherCode": "COMBO10",
  "notes": "Combined membership + cafe"
}
```

#### Get Transaction Receipt
```http
GET /api/v1/restaurant/billing/receipt/:id
```

Returns receipt data with printer settings for thermal printing.

#### Validate Voucher for Combined
```http
POST /api/v1/restaurant/billing/validate-voucher
Content-Type: application/json

{
  "code": "COMBO10",
  "subtotal": 650000,
  "customerId": "member-uuid"
}
```

---

## Transaction Number Format

Nomor transaksi menggunakan format dari tenant settings:

```
tenant.settings.transaction.invoice = {
  orderPrefix: "ORD",        // Untuk restaurant orders
  transactionPrefix: "TRX",  // Untuk combined transactions
  invoicePrefix: "INV",      // Untuk invoice/billing
  dateFormat: "YYYYMM",
  numberPadLength: 4,
  prefixSeparator: "-",
  numberingFormat: "PREFIX-DATE-NUMBER"
}
```

**Contoh Output:**
- Order: `ORD-202511-0001`
- Combined Transaction: `TRX-202511-0001`

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least one item is required"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found"
  }
}
```

### Feature Not Available (403)
```json
{
  "success": false,
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "Combined billing feature is not available in your subscription plan"
  }
}
```

### Insufficient Payment (400)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PAYMENT",
    "message": "Total pembayaran kurang. Diperlukan: 100000, Dibayar: 80000"
  }
}
```

---

## CASL Permissions

| Action | Subject | Description |
|--------|---------|-------------|
| read | Transaction | View orders |
| create | Transaction | Create orders |
| update | Transaction | Update order status, complete, split, merge |
| read | Product | View products |
| create | Product | Create products |
| update | Product | Update products |
| delete | Product | Delete products |
| read | ProductCategory | View categories |
| manage | ProductCategory | Full access to categories |
| read | RestaurantTable | View tables |
| manage | RestaurantTable | Full access to tables |
| read | Location | View locations |
| manage | Location | Full access to locations |
| read | Voucher | Validate vouchers |

---

## Postman Collection

Import file berikut ke Postman:
- **Collection**: `docs/postman/restaurant-complete.postman_collection.json`
- **Environment**: `docs/postman/restaurant-complete.postman_environment.json`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `baseUrl` | API base URL (default: http://localhost:8000) |
| `restaurantUserEmail` | Login email |
| `restaurantUserPassword` | Login password |
| `jwt_token` | JWT token (auto-filled) |
| `tenantId` | Tenant ID (auto-filled) |
| `categoryId` | Product category ID |
| `productId` | Product ID |
| `tableId` | Table ID |
| `locationId` | Location ID |
| `orderId` | Order/Transaction ID |
| `memberId` | Member ID (for combined billing) |
| `membershipTypeId` | Membership type ID |

---

## Related Documentation

- [Transaction Architecture](../TRANSACTION-ARCHITECTURE.md)
- [Race Condition Prevention](../RACE-CONDITION-PREVENTION.md)
- [Voucher Service](../VOUCHER-SERVICE.md)
- [Combined Billing Endpoints](../COMBINED-BILLING-ENDPOINTS.md)
- [Feature Sync System](../FEATURE-SYNC-SYSTEM.md)
