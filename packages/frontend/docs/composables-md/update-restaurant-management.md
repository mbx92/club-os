Update Table Status - Mark as Reserved
Post: {{baseUrl}}/restaurant/tables/{{tableId}}/reserve
Payload: 
{
  "status": "reserved",
  "occupiedBy": "Reserved for John Doe"
}
Resp: 
{
    "success": true,
    "message": "Table reserved successfully",
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
        "status": "reserved",
        "currentOrderId": null,
        "occupiedAt": null,
        "occupiedBy": null,
        "qrCode": "9CC4516EF80191A2",
        "isActive": true,
        "createdAt": "2025-11-30T10:11:07.683Z",
        "updatedAt": "2025-12-01T02:30:34.217Z",
        "deletedAt": null
    }
}
Update Table Status - Mark as Available
Post: {{baseUrl}}/restaurant/tables/{{tableId}}/release
Payload: 
{
  "status": "available"
}

Update Table status ke occupied tidak ada. Hanya lewat create order aja


Orders & Transactions
Create Order
Post: {{baseUrl}}/restaurant/orders
Payload: 
{
  "tableId": "{{tableId}}",
  "orderType": "dine-in",
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 2,
      "price": 35000,
      "variants": {
        "Level": "Pedas"
      },
      "notes": "Extra sambal"
    }
  ],
  "customerInfo": {
    "name": "John Doe",
    "phone": "+62812345678"
  },
  "notes": "Order untuk meja VIP",
  "paymentMethod": "cash"
}
Resp:
{
    "success": true,
    "message": "Order created successfully",
    "data": {
        "id": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "transactionNumber": "ORD-202512-0001",
        "transactionDate": "2025-12-01T02:37:03.479Z",
        "transactionType": "restaurant",
        "orderType": "dine-in",
        "tableId": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
        "locationId": null,
        "customerId": null,
        "customerType": "non-member",
        "customerName": null,
        "customerPhone": null,
        "subtotal": "76000.00",
        "tax": "0.00",
        "voucherId": null,
        "voucherDiscount": "0.00",
        "totalAmount": "76000.00",
        "paidAmount": "0.00",
        "changeAmount": "0.00",
        "status": "pending",
        "completedAt": null,
        "cancelledAt": null,
        "cancelledBy": null,
        "notes": "Order untuk meja VIP",
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "version": 0,
        "createdAt": "2025-12-01T02:37:03.479Z",
        "updatedAt": "2025-12-01T02:37:03.479Z",
        "deletedAt": null,
        "items": [
            {
                "id": "91a9a431-96c5-4473-93ad-303f155166cd",
                "transactionId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
                "itemType": "product",
                "itemId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "itemName": "Nasi Goreng Special Updated",
                "quantity": 2,
                "unitPrice": "38000.00",
                "subtotal": "76000.00",
                "total": "76000.00",
                "notes": "Extra sambal",
                "itemDetails": {
                    "modifiers": [],
                    "productCategory": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9"
                },
                "createdAt": "2025-12-01T02:37:03.482Z",
                "updatedAt": "2025-12-01T02:37:03.482Z",
                "deletedAt": null,
                "product": {
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
                    "deletedAt": null
                }
            }
        ],
        "table": {
            "id": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tableNumber": "T02",
            "tableName": "Meja VIP 1",
            "capacity": 4,
            "positionX": 100,
            "positionY": 200,
            "width": 80,
            "height": 80,
            "shape": "rectangle",
            "status": "occupied",
            "currentOrderId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
            "occupiedAt": null,
            "occupiedBy": null,
            "qrCode": "1639452E7B1A397C",
            "isActive": true,
            "createdAt": "2025-12-01T02:36:31.299Z",
            "updatedAt": "2025-12-01T02:37:03.483Z",
            "deletedAt": null
        },
        "location": null,
        "createdByUser": {
            "id": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "firstName": "Admin",
            "lastName": "User",
            "email": "admin@tenant-a.com"
        }
    },
    "print": {
        "kitchenTicket": {
            "success": false,
            "message": "No kitchen printer configured",
            "skipped": true
        }
    }
}

Get All Orders
{{baseUrl}}/restaurant/orders?status=pending&tableId={{tableId}}&date=today&page=1&limit=20
Filter by status (pending, preparing, ready, completed, cancelled)
Filter by date (today, yesterday, week, month, custom)
{
    "success": true,
    "data": [
        {
            "id": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "transactionNumber": "ORD-202512-0001",
            "transactionDate": "2025-12-01T02:37:03.479Z",
            "transactionType": "restaurant",
            "orderType": "dine-in",
            "tableId": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
            "locationId": null,
            "customerId": null,
            "customerType": "non-member",
            "customerName": null,
            "customerPhone": null,
            "subtotal": "76000.00",
            "tax": "0.00",
            "voucherId": null,
            "voucherDiscount": "0.00",
            "totalAmount": "76000.00",
            "paidAmount": "0.00",
            "changeAmount": "0.00",
            "status": "pending",
            "completedAt": null,
            "cancelledAt": null,
            "cancelledBy": null,
            "notes": "Order untuk meja VIP",
            "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "version": 0,
            "createdAt": "2025-12-01T02:37:03.479Z",
            "updatedAt": "2025-12-01T02:37:03.479Z",
            "deletedAt": null,
            "items": [
                {
                    "id": "91a9a431-96c5-4473-93ad-303f155166cd",
                    "transactionId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
                    "itemType": "product",
                    "itemId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                    "itemName": "Nasi Goreng Special Updated",
                    "quantity": 2,
                    "unitPrice": "38000.00",
                    "subtotal": "76000.00",
                    "total": "76000.00",
                    "notes": "Extra sambal",
                    "itemDetails": {
                        "modifiers": [],
                        "productCategory": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9"
                    },
                    "createdAt": "2025-12-01T02:37:03.482Z",
                    "updatedAt": "2025-12-01T02:37:03.482Z",
                    "deletedAt": null,
                    "product": {
                        "id": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                        "name": "Nasi Goreng Special Updated",
                        "sku": "00000"
                    }
                }
            ],
            "table": {
                "id": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
                "tableNumber": "T02",
                "capacity": 4
            },
            "location": null,
            "createdByUser": {
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
        "limit": 20,
        "totalPages": 1
    }
}

Get Order By ID
{{baseUrl}}/restaurant/orders/{{orderId}}
{
    "success": true,
    "data": {
        "id": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "transactionNumber": "ORD-202512-0001",
        "transactionDate": "2025-12-01T02:37:03.479Z",
        "transactionType": "restaurant",
        "orderType": "dine-in",
        "tableId": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
        "locationId": null,
        "customerId": null,
        "customerType": "non-member",
        "customerName": null,
        "customerPhone": null,
        "subtotal": "76000.00",
        "tax": "0.00",
        "voucherId": null,
        "voucherDiscount": "0.00",
        "totalAmount": "76000.00",
        "paidAmount": "0.00",
        "changeAmount": "0.00",
        "status": "pending",
        "completedAt": null,
        "cancelledAt": null,
        "cancelledBy": null,
        "notes": "Order untuk meja VIP",
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "version": 0,
        "createdAt": "2025-12-01T02:37:03.479Z",
        "updatedAt": "2025-12-01T02:37:03.479Z",
        "deletedAt": null,
        "items": [
            {
                "id": "91a9a431-96c5-4473-93ad-303f155166cd",
                "transactionId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
                "itemType": "product",
                "itemId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "itemName": "Nasi Goreng Special Updated",
                "quantity": 2,
                "unitPrice": "38000.00",
                "subtotal": "76000.00",
                "total": "76000.00",
                "notes": "Extra sambal",
                "itemDetails": {
                    "modifiers": [],
                    "productCategory": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9"
                },
                "createdAt": "2025-12-01T02:37:03.482Z",
                "updatedAt": "2025-12-01T02:37:03.482Z",
                "deletedAt": null,
                "product": {
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
                    "deletedAt": null
                }
            }
        ],
        "payments": [],
        "table": {
            "id": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tableNumber": "T02",
            "tableName": "Meja VIP 1",
            "capacity": 4,
            "positionX": 100,
            "positionY": 200,
            "width": 80,
            "height": 80,
            "shape": "rectangle",
            "status": "occupied",
            "currentOrderId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
            "occupiedAt": null,
            "occupiedBy": null,
            "qrCode": "1639452E7B1A397C",
            "isActive": true,
            "createdAt": "2025-12-01T02:36:31.299Z",
            "updatedAt": "2025-12-01T02:37:03.483Z",
            "deletedAt": null
        },
        "location": null,
        "createdByUser": {
            "id": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "firstName": "Admin",
            "lastName": "User",
            "email": "admin@tenant-a.com"
        }
    }
}

Update Order Status
Put: {{baseUrl}}/restaurant/orders/{{orderId}}/status
{
  "status": "preparing",
  "notes": "Order sedang disiapkan"
}

{
    "success": true,
    "message": "Order status updated to preparing",
    "data": {
        "id": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
        "transactionNumber": "ORD-202512-0001",
        "previousStatus": "pending",
        "status": "preparing"
    }
}

Add Item to Order
Post: {{baseUrl}}/restaurant/orders/{{orderId}}/items
{
  "productId": "{{productId2}}",
  "quantity": 2,
  "price": 15000,
  "notes": "Tambah order"
}


Complete Order
Post: {{baseUrl}}/restaurant/orders/{{orderId}}/complete
Payload:
{
  "paymentMethod": "cash",
  "paymentAmount": 85000,
  "notes": "Pembayaran tunai"
}

Resp:
{
    "success": true,
    "message": "Order berhasil diselesaikan",
    "data": {
        "id": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
        "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
        "transactionNumber": "ORD-202512-0001",
        "transactionDate": "2025-12-01T02:37:03.479Z",
        "transactionType": "restaurant",
        "orderType": "dine-in",
        "tableId": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
        "locationId": null,
        "customerId": null,
        "customerType": "non-member",
        "customerName": null,
        "customerPhone": null,
        "subtotal": "76000.00",
        "tax": "0.00",
        "voucherId": null,
        "voucherDiscount": "0.00",
        "totalAmount": "76000.00",
        "paidAmount": "0.00",
        "changeAmount": "0.00",
        "status": "completed",
        "completedAt": "2025-12-01T02:42:49.481Z",
        "cancelledAt": null,
        "cancelledBy": null,
        "notes": "Order untuk meja VIP\nPembayaran tunai",
        "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
        "version": 2,
        "createdAt": "2025-12-01T02:37:03.479Z",
        "updatedAt": "2025-12-01T02:42:49.482Z",
        "deletedAt": null,
        "items": [
            {
                "id": "91a9a431-96c5-4473-93ad-303f155166cd",
                "transactionId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
                "itemType": "product",
                "itemId": "6073baf9-fe1e-4f5f-951c-17ee63c664e0",
                "itemName": "Nasi Goreng Special Updated",
                "quantity": 2,
                "unitPrice": "38000.00",
                "subtotal": "76000.00",
                "total": "76000.00",
                "notes": "Extra sambal",
                "itemDetails": {
                    "modifiers": [],
                    "productCategory": "619ac0ee-e20f-4cf4-ae38-b0034c7270b9"
                },
                "createdAt": "2025-12-01T02:37:03.482Z",
                "updatedAt": "2025-12-01T02:37:03.482Z",
                "deletedAt": null,
                "product": {
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
                    "deletedAt": null
                }
            }
        ],
        "payments": [
            {
                "id": "301abecf-307a-46e7-a4ea-3f3ffa4802aa",
                "transactionId": "8fc82125-0db4-4f3d-bd11-0abd8a729b16",
                "paymentMethod": "cash",
                "amount": "85000.00",
                "currency": "IDR",
                "paymentDate": "2025-12-01T02:42:49.476Z",
                "status": "completed",
                "receiptNumber": "RCP-202512-0001",
                "notes": null,
                "paymentDetails": {},
                "createdBy": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
                "createdAt": "2025-12-01T02:42:49.476Z",
                "updatedAt": "2025-12-01T02:42:49.476Z",
                "deletedAt": null
            }
        ],
        "table": {
            "id": "925da7d3-a0b4-4713-b9b4-b5fec507a34a",
            "tenantId": "873c4d62-e219-4c07-905b-8eec40bca1be",
            "locationId": "6db501ec-0fa8-4614-a1a1-77a1e6f455d2",
            "tableNumber": "T02",
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
            "qrCode": "1639452E7B1A397C",
            "isActive": true,
            "createdAt": "2025-12-01T02:36:31.299Z",
            "updatedAt": "2025-12-01T02:42:49.485Z",
            "deletedAt": null
        },
        "voucher": null,
        "createdByUser": {
            "id": "a60ace69-28e6-447f-9a4f-aca05d1b00bd",
            "firstName": "Admin",
            "lastName": "User",
            "email": "admin@tenant-a.com"
        }
    },
    "print": {
        "receipt": {
            "success": false,
            "message": "No receipt printer configured",
            "skipped": true
        }
    }
}



