# Service Purchase API - Example Requests

## 1. Purchase Service (Membership)

### Request
```http
POST /api/v1/services/purchase
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "memberId": "uuid-member-id",
  "servicePlanId": "uuid-serviceplan-id",
  "startDate": "2025-11-24",
  "paymentMethods": [
    {
      "method": "cash",
      "amount": 500000
    }
  ],
  "voucherCode": "PROMO10",
  "notes": "First time purchase"
}
```

### Response Success (201)
```json
{
  "success": true,
  "message": "Service berhasil dibeli",
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionNumber": "TRX-20251124-0001",
      "transactionDate": "2025-11-24T14:30:00.000Z",
      "totalAmount": "450000.00",
      "status": "completed"
    },
    "activeService": {
      "id": "uuid",
      "serviceType": "membership",
      "startDate": "2025-11-24",
      "endDate": "2025-12-24",
      "totalSessions": null,
      "remainingSessions": null,
      "status": "active"
    },
    "receipt": {
      "transaction": {
        "id": "uuid",
        "transactionNumber": "TRX-20251124-0001",
        "transactionDate": "2025-11-24T14:30:00.000Z",
        "status": "completed"
      },
      "customer": {
        "id": "uuid",
        "name": "John Doe",
        "memberNumber": "M-001",
        "phone": "+62812345678",
        "email": "john@example.com"
      },
      "items": [
        {
          "name": "30 Days Membership",
          "type": "membership",
          "durationType": "time_based",
          "duration": 30,
          "sessions": null,
          "startDate": "2025-11-24",
          "endDate": "2025-12-24",
          "price": 500000,
          "discount": 50000,
          "total": 450000
        }
      ],
      "payment": {
        "subtotal": 500000,
        "discount": 50000,
        "tax": 0,
        "total": 450000,
        "paymentMethods": [
          {
            "method": "cash",
            "amount": 450000
          }
        ]
      },
      "activeService": {
        "id": "uuid",
        "status": "active",
        "validFrom": "2025-11-24",
        "validUntil": "2025-12-24",
        "totalSessions": null,
        "remainingSessions": null
      },
      "gym": {
        "name": "Fitness Center",
        "address": "Jl. Sudirman No. 123",
        "phone": "+62211234567",
        "email": "info@gym.com"
      }
    }
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "memberId dan servicePlanId harus diisi"
}
```

### Response Error (403)
```json
{
  "success": false,
  "message": "Anda hanya dapat membeli service untuk diri sendiri"
}
```

### Response Error (409) - Business Rule Violation
```json
{
  "success": false,
  "message": "Member sudah memiliki membership aktif. Tunggu hingga membership saat ini berakhir."
}
```

## 2. Purchase Service (Class Package with Sessions)

### Request
```http
POST /api/v1/services/purchase
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "memberId": "uuid-member-id",
  "servicePlanId": "uuid-yoga-package-id",
  "startDate": "2025-11-24",
  "paymentMethods": [
    {
      "method": "cash",
      "amount": 800000
    }
  ],
  "notes": "12x Yoga Class Package"
}
```

### Response Success (201)
```json
{
  "success": true,
  "message": "Service berhasil dibeli",
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionNumber": "TRX-20251124-0002",
      "transactionDate": "2025-11-24T15:00:00.000Z",
      "totalAmount": "800000.00",
      "status": "completed"
    },
    "activeService": {
      "id": "uuid",
      "serviceType": "class_package",
      "startDate": "2025-11-24",
      "endDate": "2026-01-23",
      "totalSessions": 12,
      "remainingSessions": 12,
      "status": "active"
    },
    "receipt": {
      "transaction": { ... },
      "customer": { ... },
      "items": [
        {
          "name": "12x Yoga Class Package",
          "type": "class_package",
          "durationType": "session_based",
          "duration": null,
          "sessions": 12,
          "startDate": "2025-11-24",
          "endDate": "2026-01-23",
          "price": 800000,
          "discount": 0,
          "total": 800000
        }
      ],
      "payment": {
        "subtotal": 800000,
        "discount": 0,
        "tax": 0,
        "total": 800000,
        "paymentMethods": [
          {
            "method": "cash",
            "amount": 800000
          }
        ]
      },
      "activeService": {
        "id": "uuid",
        "status": "active",
        "validFrom": "2025-11-24",
        "validUntil": "2026-01-23",
        "totalSessions": 12,
        "remainingSessions": 12
      },
      "gym": { ... }
    }
  }
}
```

## 3. Get Active Services

### Request
```http
GET /api/v1/services/active?memberId=uuid&serviceType=all&status=active
Authorization: Bearer <jwt_token>
```

### Query Parameters
- `memberId` (required for staff, auto for member): Member UUID
- `serviceType` (optional): all, membership, class_package, pt_package, spa_package, custom
- `status` (optional): all, active, expired, depleted, cancelled, suspended

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "activeServices": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "memberId": "uuid",
        "servicePlanId": "uuid",
        "serviceType": "membership",
        "startDate": "2025-11-24",
        "endDate": "2025-12-24",
        "totalSessions": null,
        "remainingSessions": null,
        "status": "active",
        "autoRenew": false,
        "purchaseDate": "2025-11-24T14:30:00.000Z",
        "pricePaid": "450000.00",
        "currency": "IDR",
        "createdAt": "2025-11-24T14:30:00.000Z",
        "servicePlan": {
          "id": "uuid",
          "name": "30 Days Membership",
          "description": "Full gym access for 30 days",
          "serviceType": "membership",
          "price": "500000.00"
        },
        "purchaseTransaction": {
          "transactionNumber": "TRX-20251124-0001",
          "transactionDate": "2025-11-24T14:30:00.000Z"
        }
      },
      {
        "id": "uuid",
        "serviceType": "class_package",
        "startDate": "2025-11-24",
        "endDate": "2026-01-23",
        "totalSessions": 12,
        "remainingSessions": 12,
        "status": "active",
        "pricePaid": "800000.00",
        "servicePlan": {
          "name": "12x Yoga Class Package"
        },
        "purchaseTransaction": {
          "transactionNumber": "TRX-20251124-0002"
        }
      }
    ],
    "count": 2
  }
}
```

## 4. Get Purchase History

### Request
```http
GET /api/v1/services/history?memberId=uuid&page=1&limit=10
Authorization: Bearer <jwt_token>
```

### Query Parameters
- `memberId` (required for staff, auto for member): Member UUID
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "transactionNumber": "TRX-20251124-0002",
        "transactionDate": "2025-11-24T15:00:00.000Z",
        "customerId": "uuid",
        "customerType": "member",
        "subtotal": "800000.00",
        "discount": "0.00",
        "totalAmount": "800000.00",
        "status": "completed",
        "transactionItems": [
          {
            "itemType": "service_plan",
            "itemName": "12x Yoga Class Package",
            "quantity": 1,
            "total": "800000.00",
            "servicePlan": {
              "id": "uuid",
              "name": "12x Yoga Class Package",
              "serviceType": "class_package"
            }
          }
        ],
        "payments": [
          {
            "paymentMethod": "cash",
            "amount": "800000.00",
            "status": "completed"
          }
        ]
      },
      {
        "id": "uuid",
        "transactionNumber": "TRX-20251124-0001",
        "transactionDate": "2025-11-24T14:30:00.000Z",
        "totalAmount": "450000.00",
        "status": "completed",
        "transactionItems": [ ... ],
        "payments": [ ... ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

## 5. Get Receipt

### Request
```http
GET /api/v1/services/receipt/uuid-transaction-id
Authorization: Bearer <jwt_token>
```

### Response Success (200)
```json
{
  "success": true,
  "data": {
    "receipt": {
      "transaction": {
        "id": "uuid",
        "transactionNumber": "TRX-20251124-0001",
        "transactionDate": "2025-11-24T14:30:00.000Z",
        "status": "completed"
      },
      "customer": {
        "id": "uuid",
        "name": "John Doe",
        "memberNumber": "M-001",
        "phone": "+62812345678",
        "email": "john@example.com"
      },
      "items": [
        {
          "name": "30 Days Membership",
          "type": "membership",
          "durationType": "time_based",
          "duration": 30,
          "sessions": null,
          "startDate": "2025-11-24",
          "endDate": "2025-12-24",
          "price": 500000,
          "discount": 50000,
          "total": 450000
        }
      ],
      "payment": {
        "subtotal": 500000,
        "discount": 50000,
        "tax": 0,
        "total": 450000,
        "paymentMethods": [
          {
            "method": "cash",
            "amount": 450000
          }
        ]
      },
      "activeService": {
        "id": "uuid",
        "status": "active",
        "validFrom": "2025-11-24",
        "validUntil": "2025-12-24",
        "totalSessions": null,
        "remainingSessions": null
      },
      "gym": {
        "name": "Fitness Center",
        "address": "Jl. Sudirman No. 123",
        "phone": "+62211234567",
        "email": "info@gym.com"
      }
    }
  }
}
```

## 6. Split Payment Example

### Request
```http
POST /api/v1/services/purchase
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "memberId": "uuid-member-id",
  "servicePlanId": "uuid-serviceplan-id",
  "startDate": "2025-11-24",
  "paymentMethods": [
    {
      "method": "cash",
      "amount": 300000
    },
    {
      "method": "bank_transfer",
      "amount": 200000,
      "referenceNumber": "TRF123456",
      "notes": "Transfer via BCA"
    }
  ],
  "notes": "Split payment"
}
```

## Error Responses

### Invalid Payment Amount
```json
{
  "success": false,
  "message": "Total pembayaran (450000) tidak sesuai dengan total tagihan (500000)"
}
```

### Service Limit Exceeded
```json
{
  "success": false,
  "message": "Member sudah mencapai batas maksimal 2 service aktif. Upgrade subscription plan untuk menambah limit."
}
```

### Voucher Exhausted (Race Condition Handled)
```json
{
  "success": false,
  "message": "Voucher sudah mencapai batas penggunaan maksimal"
}
```

### Conflicting Service
```json
{
  "success": false,
  "message": "Member sudah memiliki membership aktif. Tunggu hingga membership saat ini berakhir."
}
```

## Testing Race Conditions

### Concurrent Voucher Usage Test
Run these requests simultaneously (use tools like Apache Bench or k6):

```bash
# Voucher with maxUsage = 10
# Run 20 concurrent requests
# Expected: 10 succeed, 10 fail with "Voucher sudah mencapai batas penggunaan maksimal"

ab -n 20 -c 20 -T 'application/json' -p purchase.json \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/services/purchase
```

### Concurrent Transaction Number Test
```bash
# Run multiple purchases simultaneously
# Expected: All get unique transaction numbers (no duplicates)

ab -n 50 -c 10 -T 'application/json' -p purchase.json \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/services/purchase
```

## Frontend Integration Examples

### React/Vue Component Example
```javascript
// Purchase Service
async function purchaseService(data) {
  try {
    const response = await api.post('/api/v1/services/purchase', {
      memberId: data.memberId,
      servicePlanId: data.servicePlanId,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      paymentMethods: data.paymentMethods,
      voucherCode: data.voucherCode,
      notes: data.notes
    });
    
    // Show success message
    alert(`Service berhasil dibeli! Nomor transaksi: ${response.data.transaction.transactionNumber}`);
    
    // Print receipt or navigate to receipt page
    printReceipt(response.data.receipt);
    
    return response.data;
  } catch (error) {
    // Handle error
    alert(error.response?.data?.message || 'Terjadi kesalahan');
    throw error;
  }
}

// Get Active Services
async function getActiveServices(memberId) {
  const response = await api.get(`/api/v1/services/active?memberId=${memberId}`);
  return response.data.activeServices;
}

// Print Receipt
function printReceipt(receipt) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(generateReceiptHTML(receipt));
  printWindow.document.close();
  printWindow.print();
}

function generateReceiptHTML(receipt) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receipt.transaction.transactionNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .items { margin: 20px 0; }
        .total { border-top: 2px solid #000; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${receipt.gym.name}</h2>
        <p>${receipt.gym.address}</p>
        <p>${receipt.gym.phone}</p>
      </div>
      
      <div class="info">
        <p>Nomor: ${receipt.transaction.transactionNumber}</p>
        <p>Tanggal: ${new Date(receipt.transaction.transactionDate).toLocaleString('id-ID')}</p>
        <p>Member: ${receipt.customer.name} (${receipt.customer.memberNumber})</p>
      </div>
      
      <div class="items">
        <h3>Items:</h3>
        ${receipt.items.map(item => `
          <p>
            ${item.name}<br>
            ${item.durationType === 'time_based' ? `Durasi: ${item.duration} hari` : `Sesi: ${item.sessions}x`}<br>
            Berlaku: ${item.startDate} - ${item.endDate}<br>
            Harga: Rp ${item.price.toLocaleString('id-ID')}<br>
            Diskon: Rp ${item.discount.toLocaleString('id-ID')}<br>
            <strong>Total: Rp ${item.total.toLocaleString('id-ID')}</strong>
          </p>
        `).join('')}
      </div>
      
      <div class="total">
        <p>Subtotal: Rp ${receipt.payment.subtotal.toLocaleString('id-ID')}</p>
        <p>Diskon: Rp ${receipt.payment.discount.toLocaleString('id-ID')}</p>
        <p>Pajak: Rp ${receipt.payment.tax.toLocaleString('id-ID')}</p>
        <h3>TOTAL: Rp ${receipt.payment.total.toLocaleString('id-ID')}</h3>
      </div>
      
      <div class="service-info">
        <h3>Service Aktif:</h3>
        <p>Status: ${receipt.activeService.status}</p>
        <p>Berlaku: ${receipt.activeService.validFrom} - ${receipt.activeService.validUntil}</p>
        ${receipt.activeService.totalSessions ? `<p>Sesi Tersisa: ${receipt.activeService.remainingSessions}/${receipt.activeService.totalSessions}</p>` : ''}
      </div>
      
      <div class="footer" style="text-align: center; margin-top: 30px;">
        <p>Terima kasih atas kepercayaan Anda!</p>
      </div>
    </body>
    </html>
  `;
}
```
