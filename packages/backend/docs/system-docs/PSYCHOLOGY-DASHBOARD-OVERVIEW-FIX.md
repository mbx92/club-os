# Psychology Dashboard Overview - Bug Fix & Enhancement

## 🐛 Bug yang Diperbaiki

### Masalah Sebelumnya:
Dashboard overview psychology memiliki **inkonsistensi filter tanggal**:

```javascript
// SEBELUM (INCONSISTENT):
✓ Revenue     → Filter bulan ini (reset tiap bulan)
✗ Orders      → ALL TIME (tidak reset)
✗ Sessions    → ALL TIME (tidak reset)
✗ Patients    → ALL TIME (tidak reset)
```

Ini menyebabkan data dashboard **misleading**:
- Revenue menunjukkan bulan ini
- Tapi total orders/sessions menunjukkan sepanjang masa
- Data tidak comparable

### Solusi:
**SEMUA data sekarang konsisten menggunakan filter yang sama:**

```javascript
// SESUDAH (CONSISTENT):
✓ Revenue     → Current month (default) atau custom date range
✓ Orders      → Current month (default) atau custom date range
✓ Sessions    → Current month (default) atau custom date range
✓ Patients    → Current month (default) atau custom date range
```

---

## 📊 Endpoint

```
GET /api/v1/psychology/dashboard/overview
```

### Query Parameters:
- `startDate` (optional): Filter dari tanggal (YYYY-MM-DD)
- `endDate` (optional): Filter sampai tanggal (YYYY-MM-DD)
- `tenantId` (optional): Filter tenant (super admin only)

**Default:** Jika tidak ada `startDate` dan `endDate`, otomatis gunakan **bulan berjalan** (first day of month sampai hari ini).

---

## 📝 Response Structure (Updated)

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-01-15",
      "isCurrentMonth": true
    },
    "orders": {
      "total": 45,
      "pending": 5,
      "completed": 38,
      "cancelled": 2
    },
    "revenue": {
      "total": 22500000,
      "completed": 19000000,
      "outstanding": 3500000
    },
    "patients": {
      "total": 38
    },
    "sessions": {
      "total": 142,
      "completed": 135,
      "completionRate": 95.1
    }
  }
}
```

### ✨ New Field: `period`
Menunjukkan periode data yang ditampilkan:
- `startDate`: Tanggal mulai filter
- `endDate`: Tanggal akhir filter
- `isCurrentMonth`: `true` jika menggunakan default (current month), `false` jika custom range

---

## 🔍 Detail Perubahan

### 1. Date Filter Logic
```javascript
// Default to current month if no date filter specified
const now = new Date();
const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

// Apply default current month filter if no date range specified
if (!startDate && !endDate) {
  where.createdAt = {
    [Op.gte]: firstDayOfMonth
  };
}
```

### 2. Patients Count (Fixed)
**Sebelum:**
```javascript
// Count ALL patients (no date filter)
Patient.count({ 
  where: { tenantId }
})
```

**Sesudah:**
```javascript
// Count unique patients WHO HAVE ORDERS in this period
Patient.count({
  distinct: true,
  include: [{
    model: PsychologyOrder,
    as: 'orders',
    where: { ...where },  // Include date filter
    required: true,
    attributes: []
  }]
})
```

### 3. Sessions Count (Fixed)
**Sebelum:**
```javascript
// Count ALL sessions (no date filter)
PsychologySession.count({
  include: [{
    model: PsychologyOrder,
    as: 'order',
    where: { tenantId },  // Only tenant filter
    required: true
  }]
})
```

**Sesudah:**
```javascript
// Count sessions FROM ORDERS in this period
PsychologySession.count({
  include: [{
    model: PsychologyOrder,
    as: 'order',
    where: {
      tenantId,
      createdAt: dateFilter  // Include date filter
    },
    required: true,
    attributes: []
  }]
})
```

---

## 📅 Use Cases

### 1. Default - Current Month Overview
```bash
GET /api/v1/psychology/dashboard/overview
```

**Response:**
```json
{
  "data": {
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-01-15",
      "isCurrentMonth": true
    },
    "orders": { "total": 45 },
    // ... all data for January 2026
  }
}
```

### 2. Custom Date Range
```bash
GET /api/v1/psychology/dashboard/overview?startDate=2025-12-01&endDate=2025-12-31
```

**Response:**
```json
{
  "data": {
    "period": {
      "startDate": "2025-12-01",
      "endDate": "2025-12-31",
      "isCurrentMonth": false
    },
    "orders": { "total": 62 },
    // ... all data for December 2025
  }
}
```

### 3. Year-to-Date
```bash
GET /api/v1/psychology/dashboard/overview?startDate=2026-01-01
```

**Response:**
```json
{
  "data": {
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-01-15",
      "isCurrentMonth": false
    },
    // ... all data from Jan 1 to today
  }
}
```

---

## ⚠️ Breaking Changes

### Field Addition (Non-breaking)
Added `period` object to response. Existing frontend code will still work, but should update to show period information.

### Data Behavior Change (Potentially Breaking)
**BEFORE:** 
- Default call returned ALL TIME data for orders/sessions/patients
- Only revenue was monthly

**AFTER:**
- Default call returns CURRENT MONTH data for all metrics
- Consistent behavior across all metrics

**Migration for Frontend:**
```javascript
// If your dashboard expects ALL TIME data by default:
// OLD CODE:
fetch('/api/v1/psychology/dashboard/overview')

// NEW CODE - Get all time data:
const allTimeStart = '2020-01-01'; // Your app start date
fetch(`/api/v1/psychology/dashboard/overview?startDate=${allTimeStart}`)
```

---

## 🧪 Testing

### Test Case 1: Default Current Month
```javascript
// Request
GET /api/v1/psychology/dashboard/overview

// Verify
- period.isCurrentMonth === true
- period.startDate === first day of current month
- All metrics (orders, revenue, sessions, patients) for current month only
```

### Test Case 2: Custom Range
```javascript
// Request
GET /api/v1/psychology/dashboard/overview?startDate=2025-12-01&endDate=2025-12-31

// Verify
- period.isCurrentMonth === false
- period.startDate === "2025-12-01"
- period.endDate === "2025-12-31"
- All metrics match the custom range
```

### Test Case 3: Consistency Check
```javascript
// All these should return data for the same period:
const overview = await getOverview();
const orders = overview.data.orders.total;
const revenue = overview.data.revenue.total;
const sessions = overview.data.sessions.total;

// Verify: If you drill down to individual orders in the same period,
// the count should match overview.data.orders.total
```

---

## 📊 Impact on Existing Dashboards

### Before Fix:
```
Dashboard showing:
📊 Total Orders: 1,245 (all time)
💰 Revenue: Rp 15,000,000 (this month)
👥 Patients: 456 (all time)
📝 Sessions: 3,890 (all time)
```
❌ **Confusing!** Revenue is monthly but everything else is all-time.

### After Fix:
```
Dashboard showing (January 2026):
📊 Total Orders: 45 (this month)
💰 Revenue: Rp 15,000,000 (this month)
👥 Patients: 38 (this month)
📝 Sessions: 142 (this month)

Period: Jan 1 - Jan 15, 2026
```
✅ **Consistent!** All metrics for the same period.

---

## 🎨 Frontend Update Recommendation

### Show Period Information
```javascript
function DashboardOverview() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  if (!overview) return <Loading />;

  return (
    <div className="dashboard">
      {/* ADD: Period indicator */}
      <div className="period-badge">
        {overview.data.period.isCurrentMonth ? (
          <span>📅 Current Month ({overview.data.period.startDate} to {overview.data.period.endDate})</span>
        ) : (
          <span>📅 Custom Range: {overview.data.period.startDate} to {overview.data.period.endDate}</span>
        )}
      </div>

      {/* Existing stats cards */}
      <StatsCard title="Total Orders" value={overview.data.orders.total} />
      <StatsCard title="Revenue" value={formatCurrency(overview.data.revenue.total)} />
      {/* ... */}
    </div>
  );
}
```

### Add Date Range Picker
```javascript
function DashboardWithDateFilter() {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  const fetchData = async () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append('startDate', dateRange.start);
    if (dateRange.end) params.append('endDate', dateRange.end);
    
    const response = await fetch(`/api/v1/psychology/dashboard/overview?${params}`);
    // ...
  };

  return (
    <div>
      <DateRangePicker 
        onChange={(start, end) => setDateRange({ start, end })}
        onClear={() => setDateRange({ start: null, end: null })}
      />
      {/* Dashboard content */}
    </div>
  );
}
```

---

## 🔧 Related Files

- **Controller:** `src/modules/psychology/controllers/dashboardController.js` (function: `getOverview`)
- **Route:** `src/modules/psychology/routes/index.js`
- **Endpoint:** `GET /api/v1/psychology/dashboard/overview`

---

## 📝 Summary

### What Changed:
1. ✅ **Default behavior:** All metrics now use current month filter (consistent with revenue)
2. ✅ **Patients count:** Now counts unique patients with orders in the period (not all-time)
3. ✅ **Sessions count:** Now counts sessions from orders in the period (not all-time)
4. ✅ **Added period info:** Response includes `period` object showing date range used
5. ✅ **Custom date range:** Works consistently across all metrics

### Benefits:
- ✅ Consistent dashboard data
- ✅ Meaningful comparisons between metrics
- ✅ Clear period indication
- ✅ Monthly reset behavior (expected for dashboard)
- ✅ Flexible date filtering

### Migration Notes:
- Frontend should add period indicator UI
- If ALL TIME data needed, explicitly pass `startDate` from app start date
- No breaking changes to API structure, only data behavior

---

**Fix Date:** January 1, 2026  
**Version:** 1.1.0  
**Status:** ✅ Fixed & Tested
