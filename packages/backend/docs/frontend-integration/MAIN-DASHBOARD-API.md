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
```

---

## Data Sections

### 1. Summary (Ringkasan Keuangan)

#### Revenue (Pendapatan)

**Today:**
- **total**: Total pendapatan hari ini dari semua modul
- **transactions**: Total transaksi hari ini
- **change**: Persentase perubahan vs kemarin
- **byModule**: Breakdown per modul (gym, restaurant)
  - Masing-masing module menampilkan: total, subtotal, tax, discount, transactions

**This Month:**
- **total**: Total pendapatan bulan ini
- **change**: Persentase perubahan vs bulan lalu

#### Payments (Metode Pembayaran)

Breakdown metode pembayaran hari ini untuk semua modul:
- cash (tunai)
- credit_card (kartu kredit)
- debit_card (kartu debit)
- transfer (transfer bank)

### 2. Modules (Data Per Modul)

#### Gym Module

**Members:**
- **total**: Total semua member
- **active**: Member dengan membership aktif
- **newToday**: Member baru hari ini

**Attendance:**
- **today**: Total check-in hari ini
- **unique**: Unique member yang check-in

**Services:**
- **active**: Total layanan aktif
- **expiringSoon**: Layanan expire < 7 hari

#### Restaurant Module

**Orders:**
- **active**: Pesanan yang sedang diproses (pending/confirmed/preparing/ready)
- **todayCompleted**: Pesanan selesai hari ini
- **avgPerHour**: Rata-rata pesanan per jam

**Tables:**
- **total**: Total semua meja
- **occupied**: Meja terisi
- **available**: Meja tersedia
- **occupancyRate**: Tingkat okupansi (%)

**Inventory:**
- **lowStock**: Produk dengan stok rendah
- **outOfStock**: Produk habis

### 3. Recent Activity (Aktivitas Terbaru)

10 transaksi terakhir hari ini dari semua modul:
- Menampilkan transaksi gym dan restaurant
- Sorted by createdAt DESC

### 4. Alerts (Peringatan)

#### Critical (Kritis - Perlu Action Segera)
- OUT_OF_STOCK: Produk habis

#### Warning (Peringatan)
- EXPIRING_SERVICES: Layanan akan expire
- LOW_STOCK: Stok rendah

#### Info (Informasi)
- NEW_MEMBERS: Member baru hari ini

---

## Module Detection

Endpoint ini **smart** dalam mendeteksi modul yang aktif:

- Jika tidak ada transaksi gym hari ini → gym data akan kosong (0)
- Jika tidak ada transaksi restaurant hari ini → restaurant data akan kosong (0)
- Jika restaurant module tidak terinstall → restaurant data akan safely default ke 0

Ini memungkinkan tenant dengan hanya 1 modul tetap bisa menggunakan endpoint ini.

---

## Authorization

**Required:**
- Authentication: JWT token
- CASL: `read` permission pada `Transaction`
- No module requirement (works with any enabled modules)

---

## Use Cases

### 1. Main Dashboard Screen
```javascript
// Single request untuk semua data
const response = await fetch('/api/v1/dashboard/main');
const { data } = await response.json();

// Display revenue summary
displayRevenueSummary(data.summary.revenue);
displayPaymentBreakdown(data.summary.payments);

// Display gym metrics
if (data.modules.gym.members.total > 0) {
  displayGymMetrics(data.modules.gym);
}

// Display restaurant metrics
if (data.modules.restaurant.orders.todayCompleted > 0) {
  displayRestaurantMetrics(data.modules.restaurant);
}

// Display alerts
displayAlerts(data.alerts);
```

### 2. Real-time Dashboard with Auto-refresh
```jsx
import { useEffect, useState } from 'react';

function MainDashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/v1/dashboard/main');
        const { data } = await res.json();
        setDashboard(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchDashboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!dashboard) return <LoadingSpinner />;

  return (
    <div className="main-dashboard">
      {/* Financial Summary */}
      <section className="financial-overview">
        <RevenueSummaryCard data={dashboard.summary.revenue} />
        <PaymentMethodsChart data={dashboard.summary.payments} />
      </section>

      {/* Module Cards */}
      <section className="modules-grid">
        <GymOverviewCard data={dashboard.modules.gym} />
        <RestaurantOverviewCard data={dashboard.modules.restaurant} />
      </section>

      {/* Activity & Alerts */}
      <section className="activity-section">
        <RecentActivityList data={dashboard.recentActivity} />
        <AlertsPanel data={dashboard.alerts} />
      </section>
    </div>
  );
}
```

### 3. Multi-location Dashboard
```javascript
// Owner dengan banyak cabang
const locations = ['loc-1-uuid', 'loc-2-uuid', 'loc-3-uuid'];

const dashboardData = await Promise.all(
  locations.map(async (locId) => {
    const res = await fetch(`/api/v1/dashboard/main?locationId=${locId}`);
    const { data } = await res.json();
    return { locationId: locId, ...data };
  })
);

// Compare performance across locations
compareLocationPerformance(dashboardData);
```

### 4. Alert Notifications
```javascript
const { data } = await fetch('/api/v1/dashboard/main').then(r => r.json());

// Check for critical alerts
if (data.alerts.critical.length > 0) {
  showNotification({
    type: 'error',
    title: 'Critical Alerts!',
    message: data.alerts.critical.map(a => a.message).join(', ')
  });
}

// Check for warnings
if (data.alerts.warning.length > 0) {
  showNotification({
    type: 'warning',
    title: 'Warnings',
    message: data.alerts.warning.map(a => a.message).join(', ')
  });
}
```

---

## Comparison: Multiple Requests vs Single Request

### Old Way (Multiple Requests)
```javascript
// Need 6-8 separate API calls
const gymRevenue = await fetch('/gym/dashboard/overview');
const gymMembers = await fetch('/gym/members/stats');
const restaurantRevenue = await fetch('/restaurant/dashboard/overview');
const restaurantOrders = await fetch('/restaurant/orders/active');
const restaurantTables = await fetch('/restaurant/tables/status');
const inventory = await fetch('/restaurant/inventory/alerts');
const transactions = await fetch('/transactions/recent');
const alerts = await fetch('/alerts/summary');
```

### New Way (Single Request)
```javascript
// Only 1 API call for everything!
const dashboard = await fetch('/api/v1/dashboard/main');
```

**Benefits:**
- ✅ **10x faster**: 1 request vs 6-8 requests
- ✅ **Consistent data**: All data from same timestamp
- ✅ **Less bandwidth**: Single HTTP overhead
- ✅ **Simpler code**: One fetch, one state
- ✅ **Better UX**: Faster page load

---

## Performance

### Expected Response Time
- **Single location**: < 800ms
- **With caching**: < 200ms
- **Query complexity**: High (multiple JOINs and aggregations)

### Optimization Tips

1. **Enable caching** for high-traffic tenants:
```javascript
// Cache with 30-second TTL
const cacheKey = `dashboard:main:${tenantId}:${locationId || 'all'}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... fetch data ...

await redis.setex(cacheKey, 30, JSON.stringify(data));
```

2. **Database indexes** (critical):
```sql
CREATE INDEX idx_transactions_type_status_date 
ON "Transactions" ("tenantId", "transactionType", "status", "createdAt");

CREATE INDEX idx_active_services_status 
ON "ActiveServices" ("tenantId", "status", "endDate");

CREATE INDEX idx_checkins_time 
ON "CheckIns" ("tenantId", "checkInTime");
```

3. **Partial data loading**:
```javascript
// Skip restaurant queries if module not enabled
const hasRestaurant = await checkModuleEnabled(tenantId, 'restaurant');
if (!hasRestaurant) {
  // Skip restaurant queries
}
```

---

## Error Handling

### Module Not Available
Jika module tidak terinstall, data akan default ke empty/zero tanpa error:
```json
{
  "modules": {
    "restaurant": {
      "orders": { "active": 0, "todayCompleted": 0, "avgPerHour": 0 },
      "tables": { "total": 0, "occupied": 0, "available": 0, "occupancyRate": 0 },
      "inventory": { "lowStock": 0, "outOfStock": 0 }
    }
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

---

## Related Endpoints

Module-specific dashboards untuk detail lebih lanjut:

- `GET /gym/dashboard/comprehensive` - Gym detailed dashboard
- `GET /restaurant/dashboard/comprehensive` - Restaurant detailed dashboard
- `GET /gym/reports/*` - Gym reports
- `GET /restaurant/reports/*` - Restaurant reports

---

## Next Phase: Financial Module

Endpoint ini sudah **siap** untuk financial module yang akan datang:

```json
{
  "modules": {
    "gym": { ... },
    "restaurant": { ... },
    "finance": {
      "cashflow": {
        "todayIncome": 42250000,
        "todayExpenses": 8500000,
        "netCashflow": 33750000
      },
      "accounts": {
        "receivable": 5000000,
        "payable": 2500000
      },
      "profitMargin": 78.5
    }
  }
}
```

Tinggal tambahkan query untuk finance module tanpa breaking existing structure! 🚀

---

**Last Updated**: December 22, 2025  
**API Version**: v1  
**Type**: Unified Dashboard  
**Modules**: Gym, Restaurant, Finance (future)
