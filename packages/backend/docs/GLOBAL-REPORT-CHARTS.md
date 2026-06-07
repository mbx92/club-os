# Global Report — Panduan Infografis

Endpoint: **`GET /api/v1/dashboard/global-report`**

Menyediakan semua data agregat cross-modul (gym, restaurant, finance) dalam format chart-ready untuk membangun dashboard infografis.

---

## Query Parameters

| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `period` | string | `30d` | Rentang cepat: `7d` \| `30d` \| `90d` \| `1y` |
| `startDate` | ISO date | — | Override start, contoh `2026-01-01` |
| `endDate` | ISO date | — | Override end, contoh `2026-03-01` |

> `startDate` + `endDate` akan menimpa `period` jika keduanya diberikan.

**Contoh request:**
```
GET /api/v1/dashboard/global-report?period=30d
GET /api/v1/dashboard/global-report?startDate=2026-01-01&endDate=2026-03-01
```

---

## Response Shape

```jsonc
{
  "success": true,
  "data": {
    "kpis": { ... },         // KPI ringkasan seluruh periode
    "charts": { ... }        // 12 dataset siap-pakai untuk chart
  }
}
```

---

## KPIs

```jsonc
"kpis": {
  "period": {
    "startDate": "2026-02-01",
    "endDate":   "2026-03-01",
    "days": 29
  },
  "revenue": {
    "total": 15200000,
    "avgPerDay": 524137.93,
    "transactions": 312
  },
  "members": {
    "total": 120,
    "active": 8,            // active membership & belum expired
    "newInPeriod": 14
  },
  "attendance": {
    "totalCheckIns": 540,
    "avgPerDay": 18.6
  },
  "restaurant": {
    "orders": 210,
    "avgOrdersPerDay": 7.2
  },
  "finance": {
    "totalRevenue": 15200000,
    "totalExpense": 3400000,
    "netProfit": 11800000,
    "profitMargin": 77.6     // persen
  },
  "expiring": {
    "next7Days":  3,
    "next14Days": 5,
    "next30Days": 11
  }
}
```

---

## Charts

### 1. `revenueTimeSeries` — Line / Area Chart

Revenue harian dipecah per modul. Cocok untuk **multi-line area chart**.

```jsonc
[
  { "date": "2026-02-01", "gym": 800000, "restaurant": 320000, "pos": 150000, "total": 1270000, "transactions": 18 },
  { "date": "2026-02-02", "gym": 0,      "restaurant": 410000, "pos": 90000,  "total": 500000,  "transactions": 9  }
]
```

| Field | Chart role |
|---|---|
| `date` | X-axis |
| `gym` / `restaurant` / `pos` | Series terpisah |
| `total` | Summary line |
| `transactions` | Secondary Y-axis opsional |

---

### 2. `revenueByModule` — Pie / Donut Chart

Proporsi revenue per modul sepanjang periode.

```jsonc
[
  { "module": "gym",        "revenue": 9500000, "transactions": 180 },
  { "module": "restaurant", "revenue": 4200000, "transactions": 98  },
  { "module": "pos",        "revenue": 1500000, "transactions": 34  }
]
```

---

### 3. `memberGrowth` — Area Chart (kumulatif)

Pertumbuhan member harian dengan baseline kumulatif dari sebelum periode.

```jsonc
[
  { "date": "2026-02-01", "newMembers": 3,  "cumulative": 106 },
  { "date": "2026-02-02", "newMembers": 0,  "cumulative": 106 },
  { "date": "2026-02-03", "newMembers": 2,  "cumulative": 108 }
]
```

| Field | Chart role |
|---|---|
| `date` | X-axis |
| `newMembers` | Bar (secondary) |
| `cumulative` | Area/line (primary) |

---

### 4. `attendanceTrend` — Bar Chart

Check-in gym harian.

```jsonc
[
  { "date": "2026-02-01", "checkIns": 24, "uniqueMembers": 19 },
  { "date": "2026-02-02", "checkIns": 18, "uniqueMembers": 15 }
]
```

| Field | Chart role |
|---|---|
| `checkIns` | Bar batang |
| `uniqueMembers` | Line overlay |

---

### 5. `attendanceByHour` — Heatmap / Bar Chart (distribusi jam)

Distribusi jam check-in untuk seluruh periode (0–23).

```jsonc
[
  { "hour": 0,  "label": "00:00", "checkIns": 0  },
  { "hour": 6,  "label": "06:00", "checkIns": 12 },
  { "hour": 7,  "label": "07:00", "checkIns": 45 },
  { "hour": 8,  "label": "08:00", "checkIns": 80 },
  ...
  { "hour": 21, "label": "21:00", "checkIns": 30 }
]
```

> Gunakan sebagai **heatmap jam** atau **bar chart horizontal** untuk menampilkan jam ramai.

---

### 6. `servicePlanDistribution` — Pie / Bar Chart

Distribusi paket layanan yang dibeli dalam periode.

```jsonc
[
  { "planName": "Monthly Membership", "serviceType": "membership",    "price": 300000, "activeCount": 45, "validCount": 30 },
  { "planName": "12x PT Package",     "serviceType": "pt_package",    "price": 900000, "activeCount": 18, "validCount": 12 },
  { "planName": "Yoga 10x",           "serviceType": "class_package", "price": 500000, "activeCount": 10, "validCount": 8  }
]
```

| Field | Chart role |
|---|---|
| `planName` | Label |
| `activeCount` | Total terjual di periode |
| `validCount` | Masih aktif & belum expired |

---

### 7. `expiringBands` — Stacked Bar / Gauge

Member dengan layanan hampir expired, dikelompokkan per band waktu.

```jsonc
[
  { "band": "0–7 hari",   "days": 7,  "count": 3  },
  { "band": "8–14 hari",  "days": 14, "count": 5  },
  { "band": "15–30 hari", "days": 30, "count": 11 }
]
```

> Cocok untuk **urgency bar** atau **traffic-light gauge** di dashboard retention.

---

### 8. `restaurantTrend` — Line Chart

Performa restoran harian.

```jsonc
[
  { "date": "2026-02-01", "orders": 15, "revenue": 750000, "avgOrderValue": 50000 },
  { "date": "2026-02-02", "orders": 0,  "revenue": 0,      "avgOrderValue": 0     }
]
```

| Field | Chart role |
|---|---|
| `orders` | Bar |
| `revenue` | Line primary |
| `avgOrderValue` | Line secondary (right axis) |

---

### 9. `topProducts` — Horizontal Bar Chart

10 produk restoran terlaris berdasarkan revenue.

```jsonc
[
  { "productName": "Nasi Goreng Spesial", "qty": 120, "revenue": 3600000 },
  { "productName": "Es Teh Manis",        "qty": 200, "revenue": 1000000 }
]
```

---

### 10. `financeBalanceTrend` — Grouped Bar / Area Chart

Revenue vs pengeluaran vs net profit harian.

```jsonc
[
  { "date": "2026-02-01", "revenue": 1270000, "expense": 400000, "net": 870000  },
  { "date": "2026-02-02", "revenue": 500000,  "expense": 150000, "net": 350000  }
]
```

| Field | Warna rekomendasi |
|---|---|
| `revenue` | Hijau / biru |
| `expense` | Merah / oranye |
| `net` | Ungu / teal (area di bawah) |

---

### 11. `paymentMethods` — Pie / Donut Chart

Proporsi metode pembayaran seluruh periode.

```jsonc
[
  { "method": "cash",          "transactions": 180, "total": 9000000 },
  { "method": "credit_card",   "transactions": 80,  "total": 4800000 },
  { "method": "bank_transfer", "transactions": 52,  "total": 1400000 }
]
```

---

### 12. `serviceTypeRevenue` — Bar Chart

Revenue per tipe item transaksi (membership, produk POS, dll).

```jsonc
[
  { "serviceType": "service_plan", "revenue": 8500000, "sold": 63 },
  { "serviceType": "product",      "revenue": 4200000, "sold": 210 },
  { "serviceType": "custom",       "revenue": 2500000, "sold": 39  }
]
```

---

## Catatan Teknis

- Semua time-series sudah **zero-filled** — tanggal tanpa data tetap muncul dengan nilai `0` sehingga grafik tidak ada gap.
- `active` members hanya menghitung yang `status = 'active'` **DAN** `endDate >= sekarang`.
- Finance balance trend hanya tersedia jika modul `Expense` aktif di tenant.
- Semua nilai angka sudah dibulatkan 2 desimal.

---

## Rekomendasi Chart Library

| Library | Cocok untuk |
|---|---|
| [Recharts](https://recharts.org) | React, semua chart types |
| [Chart.js](https://chartjs.org) | Universal, ringan |
| [Apache ECharts](https://echarts.apache.org) | Dashboard complex, heatmap |
| [Tremor](https://tremor.so) | React + Tailwind, siap pakai |
| [Victory](https://formidable.com/open-source/victory) | React Native |
