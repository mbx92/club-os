# HDSales Postman Collection

Postman collection untuk testing HDSales Module API endpoints.

## 📦 Files

- **HDSales.postman_collection.json** - Collection dengan 50 endpoints
- **HDSales.postman_environment.json** - Environment template

---

## 🚀 Setup

### 1. Import Collection

1. Buka Postman
2. Click **Import** button
3. Pilih file `HDSales.postman_collection.json`
4. Collection akan muncul di sidebar

### 2. Import Environment

1. Click **Environments** (icon ⚙️ di kiri atas)
2. Click **Import**
3. Pilih file `HDSales.postman_environment.json`
4. Environment "HDSales - Development" akan tersedia

### 3. Configure Environment

Set environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `token` | JWT token dari login | `eyJhbGciOiJIUzI1Ni...` |
| `tenantId` | Your tenant ID | `uuid-here` |

**Cara get token:**
1. Login via Auth endpoint: `POST /api/v1/auth/login`
2. Copy token dari response
3. Paste ke environment variable `token`

---

## 📚 Collection Structure

Collection berisi **50 endpoints** dalam 6 folders:

### 1. Categories (8 endpoints)
- Get All Categories
- Get Category by ID
- Create Category
- Update Category
- Delete Category
- Get Products by Category
- Get Category Statistics
- Validate Product Details

### 2. Products (10 endpoints)
- Get All Products
- Get Product by ID
- Create Product
- Update Product
- Delete Product
- Adjust Stock
- Search by Details
- Get Low Stock Products
- Get Product Statistics
- Bulk Import Products

### 3. Purchases (9 endpoints)
- Get All Purchases
- Get Purchase by ID
- Create Purchase Order
- Update Purchase Order
- Confirm Purchase
- Receive Purchase
- Cancel Purchase
- Delete Purchase
- Get Purchase Statistics

### 4. Sales (9 endpoints)
- Get All Sales
- Get Sale by ID
- Create Sale
- Update Sale
- Complete Sale
- Cancel Sale
- Add Payment
- Delete Sale
- Get Sales Statistics

### 5. Inventory (9 endpoints)
- Get All Movements
- Get Product Movements
- Get Inventory Summary
- Get Inventory Valuation
- Get Low Stock Alerts
- Get Inventory Turnover
- Get Movement Analytics
- Get Dead Stock
- Export Inventory Data

### 6. Dashboard (5 endpoints)
- Get Dashboard Overview
- Get Sales Trends
- Get Top Products
- Get Profit Analysis
- Get Alerts Summary

---

## 🔐 Authentication

Collection menggunakan **Bearer Token** authentication.

**Header otomatis:**
```
Authorization: Bearer {{token}}
```

Token diambil dari environment variable `{{token}}`.

---

## 🧪 Testing Workflow

### Quick Start Flow

1. **Login** (outside collection)
   ```
   POST /api/v1/auth/login
   Body: { "email": "admin@example.com", "password": "password" }
   ```
   Save token ke environment.

2. **Create Category**
   ```
   POST /api/v1/hdsales/categories
   ```
   ID akan auto-save ke `{{categoryId}}`

3. **Create Product**
   ```
   POST /api/v1/hdsales/products
   ```
   ID akan auto-save ke `{{productId}}`

4. **Create Purchase Order**
   ```
   POST /api/v1/hdsales/purchases
   ```
   ID akan auto-save ke `{{purchaseId}}`

5. **Confirm → Receive Purchase**
   ```
   POST /api/v1/hdsales/purchases/:purchaseId/confirm
   POST /api/v1/hdsales/purchases/:purchaseId/receive
   ```

6. **Create Sale**
   ```
   POST /api/v1/hdsales/sales
   ```
   ID akan auto-save ke `{{saleId}}`

7. **Add Payment → Complete Sale**
   ```
   POST /api/v1/hdsales/sales/:saleId/payments
   POST /api/v1/hdsales/sales/:saleId/complete
   ```

8. **View Dashboard**
   ```
   GET /api/v1/hdsales/dashboard/overview
   ```

---

## 🎯 Auto-Save IDs

Collection memiliki **Test Scripts** yang otomatis save IDs dari response:

```javascript
// Otomatis dijalankan setelah request sukses
if (response.code === 200 || 201) {
  if (response.data.id) {
    // Auto-save ke environment
    pm.environment.set('categoryId', data.id);
    pm.environment.set('productId', data.id);
    pm.environment.set('purchaseId', data.id);
    pm.environment.set('saleId', data.id);
  }
}
```

Tidak perlu manual copy-paste IDs!

---

## 📝 Request Examples

### Create Category
```json
POST /api/v1/hdsales/categories

{
  "name": "Sportster",
  "code": "SPT",
  "description": "Iconic American motorcycle series",
  "productDetailsSchema": {
    "engine": {"type": "string", "required": true},
    "transmission": {"type": "string", "required": true},
    "color": {"type": "string", "required": true},
    "vin": {"type": "string", "required": true}
  },
  "isActive": true
}
```

### Create Product
```json
POST /api/v1/hdsales/products

{
  "categoryId": "{{categoryId}}",
  "name": "Sportster S",
  "sku": "HD-SPT-S-2024-001",
  "motorcycleDetails": {
    "engine": "Revolution Max 1250T",
    "transmission": "6-Speed",
    "color": "Vivid Black",
    "vin": "1HD1LEV19RB123456"
  },
  "costPrice": 450000000,
  "sellingPrice": 550000000,
  "currentStock": 5
}
```

### Create Purchase Order
```json
POST /api/v1/hdsales/purchases

{
  "supplierName": "PT Harley-Davidson Indonesia",
  "supplierContact": "John Doe",
  "supplierPhone": "08123456789",
  "expectedDeliveryDate": "2025-01-15",
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 3,
      "costPrice": 450000000
    }
  ]
}
```

### Create Sale
```json
POST /api/v1/hdsales/sales

{
  "customerName": "Budi Santoso",
  "customerPhone": "08123456789",
  "customerEmail": "budi@example.com",
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 1,
      "sellingPrice": 550000000,
      "discount": 5000000
    }
  ]
}
```

### Add Payment
```json
POST /api/v1/hdsales/sales/:saleId/payments

{
  "amount": 100000000,
  "paymentMethod": "cash",
  "paymentDate": "2025-01-10",
  "notes": "Down payment"
}
```

---

## 🔍 Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?status=pending
?categoryId={{categoryId}}
?type=sale
```

### Date Range
```
?startDate=2025-01-01&endDate=2025-12-31
```

### Sorting
```
?sortBy=createdAt&sortOrder=desc
```

---

## ⚙️ Environment Variables

### Required
- `baseUrl` - API base URL
- `token` - JWT authentication token

### Auto-populated
- `categoryId` - Last created category ID
- `productId` - Last created product ID
- `purchaseId` - Last created purchase ID
- `saleId` - Last created sale ID

### Optional
- `tenantId` - Your tenant ID
- `userId` - Your user ID
- `tokenExpiry` - Token expiration timestamp

---

## 🚨 Common Issues

### 1. "Feature 'hdsales' is not available"
**Solution**: Pastikan subscription plan adalah **Enterprise**

### 2. "Unauthorized"
**Solution**: 
- Check token sudah di-set di environment
- Token mungkin expired, login ulang
- Format: `Bearer <token>`

### 3. "Permission denied"
**Solution**: User memerlukan CASL permissions:
- `read:HDCategory`, `create:HDProduct`, dll
- Check dengan admin untuk setup permissions

### 4. "Validation error"
**Solution**: Check request body format sesuai dengan schema

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "uuid",
    "name": "...",
    ...
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

---

## 🎓 Tips & Tricks

### 1. Use Folders
Test endpoints secara berurutan dalam folder:
- Categories → Products → Purchases → Sales

### 2. Collection Runner
Run entire collection atau folder dengan **Collection Runner**:
- Select folder/collection
- Click **Run**
- Test semua endpoints sekaligus

### 3. Environment Switching
Buat multiple environments:
- HDSales - Development
- HDSales - Staging
- HDSales - Production

Switch dengan dropdown di top-right.

### 4. Pre-request Scripts
Collection sudah include auto-refresh token (jika token expired).

### 5. Test Scripts
Auto-save IDs dari response untuk request berikutnya.

---

## 📚 Related Documentation

- **API Documentation**: `docs/HDSales-Modules-Implementation/03-API-Endpoints.md`
- **Business Logic**: `docs/HDSales-Modules-Implementation/04-Business-Logic.md`
- **Implementation Guide**: `docs/HDSales-Modules-Implementation/IMPLEMENTATION-COMPLETE.md`

---

## 🤝 Support

Jika ada issue atau pertanyaan:
1. Check documentation di `docs/HDSales-Modules-Implementation/`
2. Verify subscription plan (Enterprise required)
3. Check CASL permissions
4. Review logs di `logs/` directory

---

**Version**: 1.0.0  
**Last Updated**: December 9, 2025  
**Total Endpoints**: 50  
**Status**: ✅ Ready for Use
