# Main Dashboard API

## Endpoint Unified Dashboard untuk Semua Modul

### Endpoint: `GET /api/v1/dashboard/main`

Endpoint all-in-one yang menggabungkan data dari **gym**, **restaurant**, dan **financial** modules dalam satu request. Perfect untuk main dashboard screen yang menampilkan overview seluruh bisnis.

---

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| locationId | UUID | No | Filter berdasarkan lokasi tertentu |

---

## Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "revenue": {
        "today": {
          "total": 42250000,
          "transactions": 87,
          "change": 14.2,
          "byModule": [
            {
              "module": "gym",
              "total": 25500000,
              "subtotal": 23181818.18,
              "tax": 2318181.82,
              "discount": 500000,
              "transactions": 42
            },
            {
              "module": "restaurant",
              "total": 16750000,
              "subtotal": 15227272.73,
              "tax": 1522727.27,
              "discount": 250000,
              "transactions": 45
            }
          ]
        },
        "thisMonth": {
          "total": 410000000,
          "change": 10.5
        }
      },
      "payments": [
        { "method": "cash", "transactions": 38, "total": 18500000 },
        { "method": "credit_card", "transactions": 32, "total": 15800000 },
        { "method": "debit_card", "transactions": 12, "total": 5950000 },
        { "method": "transfer", "transactions": 5, "total": 2000000 }
      ]
    },
    "modules": {
      "gym": {
        "members": {
          "total": 1250,
          "active": 987,
          "newToday": 3
        },
        "attendance": {
          "today": 156,
          "unique": 142
        },
        "services": {
          "active": 1045,
          "expiringSoon": 12
        }
      },
      "restaurant": {
        "orders": {
          "active": 8,
          "todayCompleted": 45,
          "avgPerHour": 3.2
        },
        "tables": {
          "total": 23,
          "occupied": 12,
          "available": 8,
          "occupancyRate": 52.2
        },
        "inventory": {
          "lowStock": 5,
          "outOfStock": 2
        }
      }
    },
    "recentActivity": [
      {
        "id": "uuid",
        "transactionNumber": "TRX-RST-2025-001234",
        "module": "restaurant",
        "amount": 350000,
        "status": "completed",
        "createdAt": "2025-12-22T15:45:00.000Z"
      },
      {
        "id": "uuid",
        "transactionNumber": "TRX-GYM-2025-005678",
        "module": "gym",
        "amount": 850000,
        "status": "completed",
        "createdAt": "2025-12-22T15:30:00.000Z"
      }
    ],
    "alerts": {
      "critical": [
        {
          "type": "OUT_OF_STOCK",
          "message": "2 product(s) are out of stock",
          "count": 2
        }
      ],
      "warning": [
        {
          "type": "EXPIRING_SERVICES",
          "message": "12 service(s) expiring in 7 days",
          "count": 12
        },
        {
          "type": "LOW_STOCK",
          "message": "5 product(s) are low on stock",
          "count": 5
        }
      ],
      "info": [
        {
          "type": "NEW_MEMBERS",
          "message": "3 new member(s) registered today",
          "count": 3
        }
      ]
    }
  }
}