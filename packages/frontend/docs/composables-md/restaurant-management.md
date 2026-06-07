Restaurant POS API

Product Management
Get All Products
{{baseUrl}}/restaurant/products
{
    "success": true,
    "data": [
        {
            "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Nasi Goreng Special",
            "description": "Nasi goreng dengan telur, ayam, dan sayuran",
            "sku": "00000",
            "barcode": null,
            "category": null,
            "price": "35000.00",
            "cost": "20000.00",
            "taxRate": "10.00",
            "stockQuantity": 100,
            "minStockLevel": 10,
            "unit": "pcs",
            "isActive": true,
            "trackInventory": true,
            "image": null,
            "productDetails": {},
            "categoryId": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "taxable": true,
            "version": 0,
            "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "updatedBy": null,
            "createdAt": "2025-11-30T07:20:09.796Z",
            "updatedAt": "2025-11-30T07:20:09.796Z",
            "deletedAt": null,
            "productCategory": {
                "id": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
                "name": "Makanan Utama",
                "color": "#FF5722"
            },
            "location": {
                "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                "name": "Restoran Utama",
                "code": "MAIN-001"
            }
        }
    ],
    "pagination": {
        "total": 1,
        "page": 1,
        "limit": 50,
        "totalPages": 1
    }
}

Search Products
Get: {{baseUrl}}/restaurant/products?search={{searchTerm}}&page=1&limit=20
{
    "success": true,
    "data": [
        {
            "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Nasi Goreng Special",
            "description": "Nasi goreng dengan telur, ayam, dan sayuran",
            "sku": "00000",
            "barcode": null,
            "category": null,
            "price": "35000.00",
            "cost": "20000.00",
            "taxRate": "10.00",
            "stockQuantity": 100,
            "minStockLevel": 10,
            "unit": "pcs",
            "isActive": true,
            "trackInventory": true,
            "image": null,
            "productDetails": {},
            "categoryId": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "taxable": true,
            "version": 0,
            "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "updatedBy": null,
            "createdAt": "2025-11-30T07:20:09.796Z",
            "updatedAt": "2025-11-30T07:20:09.796Z",
            "deletedAt": null,
            "productCategory": {
                "id": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
                "name": "Makanan Utama",
                "color": "#FF5722"
            },
            "location": {
                "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                "name": "Restoran Utama",
                "code": "MAIN-001"
            }
        }
    ],
    "pagination": {
        "total": 1,
        "page": 1,
        "limit": 20,
        "totalPages": 1
    }
}

Get Product By ID
{{baseUrl}}/restaurant/products/{{productId}}
{
    "success": true,
    "data": {
        "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "name": "Nasi Goreng Special",
        "description": "Nasi goreng dengan telur, ayam, dan sayuran",
        "sku": "00000",
        "barcode": null,
        "category": null,
        "price": "35000.00",
        "cost": "20000.00",
        "taxRate": "10.00",
        "stockQuantity": 100,
        "minStockLevel": 10,
        "unit": "pcs",
        "isActive": true,
        "trackInventory": true,
        "image": null,
        "productDetails": {},
        "categoryId": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
        "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "taxable": true,
        "version": 0,
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "updatedBy": null,
        "createdAt": "2025-11-30T07:20:09.796Z",
        "updatedAt": "2025-11-30T07:20:09.796Z",
        "deletedAt": null,
        "productCategory": {
            "id": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Makanan Utama",
            "description": "Menu makanan utama restoran",
            "parentId": null,
            "color": "#FF5722",
            "icon": "restaurant",
            "sortOrder": 1,
            "isActive": true,
            "createdAt": "2025-11-30T05:48:41.016Z",
            "updatedAt": "2025-11-30T05:48:41.016Z",
            "deletedAt": null
        },
        "location": {
            "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Restoran Utama",
            "code": "MAIN-001",
            "address": "Jl. Sudirman No. 123",
            "city": "Jakarta",
            "province": "DKI Jakarta",
            "postalCode": "12345",
            "country": "Indonesia",
            "phone": "+62812345678",
            "email": "main@restaurant.com",
            "locationType": "main",
            "latitude": "-6.20880000",
            "longitude": "106.84560000",
            "isActive": true,
            "createdAt": "2025-11-30T06:43:36.882Z",
            "updatedAt": "2025-11-30T06:43:36.882Z",
            "deletedAt": null
        },
        "stockMovements": [
            {
                "id": "98bedb09-0f95-4fb2-95c1-6250b87da64b",
                "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
                "productId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                "movementType": "in",
                "quantity": 100,
                "previousQuantity": 0,
                "newQuantity": 100,
                "referenceType": "initial_stock",
                "referenceId": null,
                "notes": "Initial stock entry",
                "performedBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
                "createdAt": "2025-11-30T07:20:09.804Z"
            }
        ]
    }
}

Create Product
Post: {{baseUrl}}/restaurant/products
Payload:
{
  "name": "Nasi Goreng Special",
  "description": "Nasi goreng dengan telur, ayam, dan sayuran",
  "categoryId": "{{categoryId}}",
  "price": 35000,
  "cost": 20000,
  "stockQuantity": 100,
  "minStockLevel": 10,
  "trackInventory": true,
  "productType": "food",
  "preparationTime": 15,
  "isAvailable": true,
  "locationId": "{{locationId}}",
  "sku": "00000",
  "taxable": true,
  "taxRate": 10.00,
  "imageUrl": "https://example.com/images/nasi-goreng.jpg",
  "thumbnailUrl": "https://example.com/images/nasi-goreng-thumb.jpg",
  "variants": [
    {
      "name": "Level",
      "values": ["Normal", "Pedas", "Extra Pedas"]
    }
  ],
  "isActive": true
}

Resp:
{
    "success": true,
    "message": "Product created successfully",
    "data": {
        "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "name": "Nasi Goreng Special",
        "description": "Nasi goreng dengan telur, ayam, dan sayuran",
        "sku": "00000",
        "barcode": null,
        "category": null,
        "price": "35000.00",
        "cost": "20000.00",
        "taxRate": "10.00",
        "stockQuantity": 100,
        "minStockLevel": 10,
        "unit": "pcs",
        "isActive": true,
        "trackInventory": true,
        "image": null,
        "productDetails": {},
        "categoryId": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
        "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "taxable": true,
        "version": 0,
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "updatedBy": null,
        "createdAt": "2025-11-30T07:20:09.796Z",
        "updatedAt": "2025-11-30T07:20:09.796Z",
        "deletedAt": null,
        "productCategory": {
            "id": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Makanan Utama",
            "description": "Menu makanan utama restoran",
            "parentId": null,
            "color": "#FF5722",
            "icon": "restaurant",
            "sortOrder": 1,
            "isActive": true,
            "createdAt": "2025-11-30T05:48:41.016Z",
            "updatedAt": "2025-11-30T05:48:41.016Z",
            "deletedAt": null
        },
        "location": {
            "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Restoran Utama",
            "code": "MAIN-001",
            "address": "Jl. Sudirman No. 123",
            "city": "Jakarta",
            "province": "DKI Jakarta",
            "postalCode": "12345",
            "country": "Indonesia",
            "phone": "+62812345678",
            "email": "main@restaurant.com",
            "locationType": "main",
            "latitude": "-6.20880000",
            "longitude": "106.84560000",
            "isActive": true,
            "createdAt": "2025-11-30T06:43:36.882Z",
            "updatedAt": "2025-11-30T06:43:36.882Z",
            "deletedAt": null
        }
    }
}

Update Product
put:{{baseUrl}}/restaurant/products/{{productId}}
Payload:{
  "name": "Nasi Goreng Special Updated",
  "description": "Nasi goreng dengan telur, ayam premium, dan sayuran organik",
  "price": 38000,
  "preparationTime": 12,
  "isAvailable": true
}

Resp:
{
    "success": true,
    "message": "Product updated successfully",
    "data": {
        "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "name": "Nasi Goreng Special Updated",
        "description": "Nasi goreng dengan telur, ayam premium, dan sayuran organik",
        "sku": "00000",
        "barcode": null,
        "category": null,
        "price": "38000.00",
        "cost": "20000.00",
        "taxRate": "10.00",
        "stockQuantity": 100,
        "minStockLevel": 10,
        "unit": "pcs",
        "isActive": true,
        "trackInventory": true,
        "image": null,
        "productDetails": {},
        "categoryId": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
        "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "taxable": true,
        "version": 1,
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "updatedBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "createdAt": "2025-11-30T07:20:09.796Z",
        "updatedAt": "2025-11-30T08:18:54.719Z",
        "deletedAt": null,
        "productCategory": {
            "id": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Makanan Utama",
            "description": "Menu makanan utama restoran",
            "parentId": null,
            "color": "#FF5722",
            "icon": "restaurant",
            "sortOrder": 1,
            "isActive": true,
            "createdAt": "2025-11-30T05:48:41.016Z",
            "updatedAt": "2025-11-30T05:48:41.016Z",
            "deletedAt": null
        },
        "location": {
            "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Restoran Utama",
            "code": "MAIN-001",
            "address": "Jl. Sudirman No. 123",
            "city": "Jakarta",
            "province": "DKI Jakarta",
            "postalCode": "12345",
            "country": "Indonesia",
            "phone": "+62812345678",
            "email": "main@restaurant.com",
            "locationType": "main",
            "latitude": "-6.20880000",
            "longitude": "106.84560000",
            "isActive": true,
            "createdAt": "2025-11-30T06:43:36.882Z",
            "updatedAt": "2025-11-30T06:43:36.882Z",
            "deletedAt": null
        }
    }
}

Adjust Stock - Add
Post: {{baseUrl}}/restaurant/products/{{productId}}/adjust-stock
Payload:
{
  "quantity": 50,
  "movementType": "in",
  "notes": "Stock tambahan dari supplier"
}

Adjust Stock - Remove
Post: {{baseUrl}}/restaurant/products/{{productId}}/adjust-stock
Payload:
{
  "quantity": 10,
  "movementType": "out",
  "notes": "Stock terjual hari ini"
}

Get Low Stock Products
{{baseUrl}}/restaurant/products/low-stock
{
    "success": true,
    "data": [],
    "count": 0
}

Location Management

Get All Locations
{{baseUrl}}/restaurant/locations
{
    "success": true,
    "data": [
        {
            "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Restoran Utama",
            "code": "MAIN-001",
            "address": "Jl. Sudirman No. 123",
            "city": "Jakarta",
            "province": "DKI Jakarta",
            "postalCode": "12345",
            "country": "Indonesia",
            "phone": "+62812345678",
            "email": "main@restaurant.com",
            "locationType": "main",
            "latitude": "-6.20880000",
            "longitude": "106.84560000",
            "isActive": true,
            "createdAt": "2025-11-30T06:43:36.882Z",
            "updatedAt": "2025-11-30T06:43:36.882Z",
            "deletedAt": null
        }
    ],
    "pagination": {
        "total": 1,
        "page": 1,
        "limit": 50,
        "totalPages": 1
    }
}

Create Location
Post :{{baseUrl}}/restaurant/locations
Payload: 
{
  "name": "Restoran Utama",
  "code": "MAIN-001",
  "address": "Jl. Sudirman No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "12345",
  "country": "Indonesia",
  "phone": "+62812345678",
  "email": "main@restaurant.com",
  "locationType": "main",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "isActive": true
}

Resp:
{
    "success": true,
    "message": "Location created successfully",
    "data": {
        "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "name": "Restoran Utama",
        "code": "MAIN-001",
        "address": "Jl. Sudirman No. 123",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "postalCode": "12345",
        "country": "Indonesia",
        "phone": "+62812345678",
        "email": "main@restaurant.com",
        "locationType": "main",
        "latitude": "-6.20880000",
        "longitude": "106.84560000",
        "isActive": true,
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "updatedAt": "2025-11-30T06:43:36.882Z",
        "createdAt": "2025-11-30T06:43:36.882Z",
        "deletedAt": null
    }
}

Get Location By ID
{{baseUrl}}/restaurant/locations/{{locationId}}
{
    "success": true,
    "data": {
        "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "name": "Restoran Utama",
        "code": "MAIN-001",
        "address": "Jl. Sudirman No. 123",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "postalCode": "12345",
        "country": "Indonesia",
        "phone": "+62812345678",
        "email": "main@restaurant.com",
        "locationType": "main",
        "latitude": "-6.20880000",
        "longitude": "106.84560000",
        "isActive": true,
        "createdAt": "2025-11-30T06:43:36.882Z",
        "updatedAt": "2025-11-30T06:43:36.882Z",
        "deletedAt": null,
        "tables": [],
        "products": [
            {
                "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "name": "Nasi Goreng Special Updated",
                "sku": "00000",
                "stockQuantity": 100,
                "isActive": true
            }
        ]
    }
}

Update Location
Put : {{baseUrl}}/restaurant/locations/{{locationId}}
Payload: {
  "name": "Restoran Utama Updated",
  "phone": "+62812345679",
  "email": "main-updated@restaurant.com"
}

Resp:
 {
    "success": true,
    "message": "Location updated successfully",
    "data": {
        "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "name": "Restoran Utama Updated",
        "code": "MAIN-001",
        "address": "Jl. Sudirman No. 123",
        "city": "Jakarta",
        "province": "DKI Jakarta",
        "postalCode": "12345",
        "country": "Indonesia",
        "phone": "+62812345679",
        "email": "main-updated@restaurant.com",
        "locationType": "main",
        "latitude": "-6.20880000",
        "longitude": "106.84560000",
        "isActive": true,
        "createdAt": "2025-11-30T06:43:36.882Z",
        "updatedAt": "2025-11-30T08:24:43.262Z",
        "deletedAt": null
    }
}

Delete location
{{baseUrl}}/restaurant/locations/{{locationId}}

Restaurant Tables
Get All Tables
{{baseUrl}}/restaurant/tables?locationId={{locationId}}&status=available
Filter by status (available, occupied, reserved, cleaning)
{
    "success": true,
    "data": [
        {
            "id": "5d437c18-5905-46b1-9c7f-55067603a431",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tableNumber": "T01",
            "tableName": "Meja VIP 1",
            "capacity": 4,
            "positionX": 100,
            "positionY": 200,
            "width": 80,
            "height": 80,
            "shape": "rectangle",
            "status": "available",
            "currentOrderId": null,
            "occupiedAt": null,
            "occupiedBy": null,
            "qrCode": "9CC4516EF80191A2",
            "isActive": true,
            "createdAt": "2025-11-30T10:11:07.683Z",
            "updatedAt": "2025-11-30T10:11:07.683Z",
            "deletedAt": null,
            "location": {
                "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                "name": "Restoran Utama Updated",
                "code": "MAIN-001",
                "locationType": "main"
            },
            "currentOrder": null
        }
    ],
    "stats": {
        "total": 1,
        "available": 1,
        "occupied": 0,
        "reserved": 0,
        "cleaning": 0,
        "totalCapacity": 4
    }
}

Create Table
Post: {{baseUrl}}/restaurant/tables.
Payload: {
  "tableNumber": "T01",
  "tableName": "Meja VIP 1",
  "capacity": 4,
  "locationId": "{{locationId}}",
  "positionX": 100,
  "positionY": 200,
  "width": 80,
  "height": 80,
  "shape": "rectangle",
  "status": "available",
  "qrCode": "QR-T01-MAIN",
  "isActive": true
}

Resp:
{
    "success": true,
    "message": "Table created successfully",
    "data": {
        "id": "5d437c18-5905-46b1-9c7f-55067603a431",
        "status": "available",
        "isActive": true,
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "tableNumber": "T01",
        "tableName": "Meja VIP 1",
        "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "capacity": 4,
        "positionX": 100,
        "positionY": 200,
        "width": 80,
        "height": 80,
        "shape": "rectangle",
        "updatedAt": "2025-11-30T10:11:07.683Z",
        "createdAt": "2025-11-30T10:11:07.683Z",
        "qrCode": "9CC4516EF80191A2",
        "currentOrderId": null,
        "occupiedAt": null,
        "occupiedBy": null,
        "deletedAt": null
    }
}

Get Table By ID
{{baseUrl}}/restaurant/tables/{{tableId}}
{
    "success": true,
    "data": {
        "id": "5d437c18-5905-46b1-9c7f-55067603a431",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
        "tableNumber": "T01",
        "tableName": "Meja VIP 1",
        "capacity": 4,
        "positionX": 100,
        "positionY": 200,
        "width": 80,
        "height": 80,
        "shape": "rectangle",
        "status": "available",
        "currentOrderId": null,
        "occupiedAt": null,
        "occupiedBy": null,
        "qrCode": "9CC4516EF80191A2",
        "isActive": true,
        "createdAt": "2025-11-30T10:11:07.683Z",
        "updatedAt": "2025-11-30T10:11:07.683Z",
        "deletedAt": null,
        "location": {
            "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "name": "Restoran Utama Updated",
            "code": "MAIN-001",
            "address": "Jl. Sudirman No. 123",
            "city": "Jakarta",
            "province": "DKI Jakarta",
            "postalCode": "12345",
            "country": "Indonesia",
            "phone": "+62812345679",
            "email": "main-updated@restaurant.com",
            "locationType": "main",
            "latitude": "-6.20880000",
            "longitude": "106.84560000",
            "isActive": true,
            "createdAt": "2025-11-30T06:43:36.882Z",
            "updatedAt": "2025-11-30T08:24:43.262Z",
            "deletedAt": null
        },
        "currentOrder": null,
        "occupationDuration": null
    }
}


Update Table Status - Mark as Occupied
Put
{{baseUrl}}/api/v1/restaurant/tables/{{tableId}}/status
Payload: {
  "status": "occupied",
  "occupiedBy": "Customer Name",
  "currentOrderId": "{{orderId}}"
}
Update Table Status - Mark as Available
{
  "status": "available"
}
Update Table Status - Mark as Reserved
{
  "status": "reserved",
  "occupiedBy": "Reserved for John Doe"
}

Stock Management
Get Stock Movements
{{baseUrl}}/restaurant/stock-movements?productId={{productId}}&locationId={{locationId}}&movementType=in&page=1&limit=50
Filter by movement type (in, out, adjustment, transfer)
{
    "success": true,
    "data": [
        {
            "id": "98bedb09-0f95-4fb2-95c1-6250b87da64b",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "productId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "movementType": "in",
            "quantity": 100,
            "previousQuantity": 0,
            "newQuantity": 100,
            "referenceType": "initial_stock",
            "referenceId": null,
            "notes": "Initial stock entry",
            "performedBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "createdAt": "2025-11-30T07:20:09.804Z",
            "product": {
                "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "name": "Nasi Goreng Special Updated",
                "sku": "00000",
                "stockQuantity": 100
            },
            "location": {
                "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                "name": "Restoran Utama Updated",
                "code": "MAIN-001"
            },
            "performer": {
                "id": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            }
        }
    ],
    "pagination": {
        "total": 1,
        "page": 1,
        "limit": 50,
        "totalPages": 1
    }
}

Create Stock Movement
Post: {{baseUrl}}/restaurant/stock-movements
Payload: {
  "productId": "{{productId}}",
  "locationId": "{{locationId}}",
  "movementType": "in",
  "quantity": 100,
  "previousQuantity": 50,
  "newQuantity": 150,
  "referenceType": "purchase",
  "referenceId": "{{purchaseOrderId}}",
  "notes": "Stok masuk dari supplier PT. Food Corp",
  "performedBy": "{{userId}}"
}

Get Stock Report
{{baseUrl}}/restaurant/stock-report?locationId={{locationId}}&reportType=current
Report type: current, movements, low-stock
{
    "success": true,
    "data": {
        "reportType": "current",
        "products": [
            {
                "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "name": "Nasi Goreng Special Updated",
                "sku": "00000",
                "stockQuantity": 100,
                "minStockLevel": 10,
                "unit": "pcs",
                "status": "in-stock",
                "location": {
                    "id": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
                    "name": "Restoran Utama Updated",
                    "code": "MAIN-001"
                }
            }
        ],
        "pagination": {
            "total": 1,
            "page": 1,
            "limit": 50,
            "totalPages": 1
        }
    }
}

