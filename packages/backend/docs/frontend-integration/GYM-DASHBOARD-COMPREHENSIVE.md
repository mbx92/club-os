# Gym Comprehensive Dashboard API

## Endpoint: `GET /api/v1/gym/dashboard/comprehensive`

Endpoint all-in-one untuk mendapatkan semua data yang diperlukan untuk gym dashboard dalam satu request.

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
    "revenue": {
      "today": {
        "total": 25500000,
        "subtotal": 23181818.18,
        "tax": 2318181.82,
        "discount": 500000,
        "transactions": 42,
        "change": 15.5,
        "avgOrderValue": 607142.86
      },
      "thisMonth": {
        "total": 285000000,
        "transactions": 456,
        "change": 12.3
      }
    },
    "members": {
      "total": 1250,
      "active": 987,
      "newThisMonth": 45,
      "growth": 8.5,
      "expiringMemberships": 12
    },
    "attendance": {
      "today": {
        "total": 156,
        "unique": 142,
        "change": 5.2
      },
      "peakHours": [
        { "hour": 18, "checkIns": 45 },
        { "hour": 7, "checkIns": 38 },
        { "hour": 19, "checkIns": 32 }
      ]
    },
    "services": {
      "active": {
        "total": 1045,
        "breakdown": [
          { "type": "membership", "count": 987 },
          { "type": "personal-training", "count": 45 },
          { "type": "class", "count": 13 }
        ]
      },
      "lowSessionAlerts": 8
    },
    "payments": {
      "methods": [
        { "method": "cash", "transactions": 18, "total": 10800000 },
        { "method": "credit_card", "transactions": 15, "total": 9000000 },
        { "method": "debit_card", "transactions": 9, "total": 5700000 }
      ]
    },
    "recentTransactions": [
      {
        "id": "uuid",
        "transactionNumber": "TRX-GYM-2025-001234",
        "amount": 850000,
        "status": "completed",
        "createdAt": "2025-12-22T15:30:00.000Z"
      }
    ],
    "alerts": {
      "expiringMemberships": 12,
      "lowSessionServices": 8,
      "newMembersToday": 3
    }
  }
}
```

---

## Data Sections

### 1. Revenue (Pendapatan Gym)

#### Today
- **total**: Total pendapatan gym hari ini
- **subtotal**: Subtotal sebelum pajak
- **tax**: Total pajak
- **discount**: Total diskon dari voucher
- **transactions**: Jumlah transaksi
- **change**: Persentase perubahan vs kemarin
- **avgOrderValue**: Rata-rata nilai per transaksi

#### This Month
- **total**: Total pendapatan bulan ini
- **transactions**: Jumlah transaksi bulan ini
- **change**: Persentase perubahan vs bulan lalu

### 2. Members (Data Member)

- **total**: Total semua member (lifetime)
- **active**: Member dengan membership aktif
- **newThisMonth**: Member baru bulan ini
- **growth**: Persentase pertumbuhan member vs bulan lalu
- **expiringMemberships**: Membership yang akan expire dalam 7 hari

### 3. Attendance (Kehadiran)

#### Today
- **total**: Total check-in hari ini
- **unique**: Unique member yang check-in hari ini
- **change**: Persentase perubahan vs kemarin

#### Peak Hours
- **hour**: Jam (0-23)
- **checkIns**: Jumlah check-in pada jam tersebut
- Top 5 jam tersibuk hari ini

### 4. Services (Layanan Aktif)

#### Active Services
- **total**: Total semua layanan aktif
- **breakdown**: Breakdown berdasarkan tipe layanan
  - membership
  - personal-training
  - class
  - dll

#### Alerts
- **lowSessionAlerts**: Layanan dengan sisa sesi ≤ 3

### 5. Payments (Metode Pembayaran)

Breakdown metode pembayaran hari ini:
- **method**: Metode pembayaran (cash, credit_card, debit_card, transfer)
- **transactions**: Jumlah transaksi
- **total**: Total nilai transaksi

### 6. Recent Transactions

5 transaksi gym terakhir hari ini

### 7. Alerts (Peringatan)

- **expiringMemberships**: Membership yang expire < 7 hari
- **lowSessionServices**: Service dengan sisa sesi ≤ 3
- **newMembersToday**: Member baru hari ini

---

## Authorization

**Required:**
- Authentication: JWT token
- Module: `gym` enabled
- CASL: `read` permission on `Transaction`

---

## Use Cases

### React Dashboard Component
```jsx
import { useEffect, useState } from 'react';

function GymDashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await fetch('/api/v1/gym/dashboard/comprehensive');
      const { data } = await res.json();
      setDashboard(data);
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="gym-dashboard">
      <RevenueCard data={dashboard?.revenue} />
      <MembersCard data={dashboard?.members} />
      <AttendanceCard data={dashboard?.attendance} />
      <ServicesCard data={dashboard?.services} />
      <PaymentsChart data={dashboard?.payments} />
      <AlertsWidget data={dashboard?.alerts} />
    </div>
  );
}
```

---

## Related Endpoints

- `GET /gym/dashboard/overview` - Overview sederhana
- `GET /gym/dashboard/stats` - Quick stats
- `GET /gym/reports/revenue` - Detailed revenue report
- `GET /gym/reports/attendance` - Detailed attendance report

---

**Last Updated**: December 22, 2025  
**API Version**: v1  
**Module**: Gym
