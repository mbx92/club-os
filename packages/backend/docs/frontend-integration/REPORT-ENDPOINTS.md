# Report Module — Frontend API Reference

> **Commit**: `51bf10d` — feat: add comprehensive reporting module  
> **Base URL**: `/api/v1`  
> **Authentication**: Semua endpoint memerlukan header `Authorization: Bearer <token>`

---

## Daftar Isi
1. [Gym Reports](#1-gym-reports)
2. [Member Reports](#2-member-reports)
3. [Service Reports](#3-service-reports)
4. [Finance Reports](#4-finance-reports)
5. [Product Reports](#5-product-reports)
6. [Restaurant Reports](#6-restaurant-reports)
7. [Staff Reports](#7-staff-reports)
8. [Commission Reports](#8-commission-reports)
9. [Forecasting Reports](#9-forecasting-reports)
10. [Tipe Data Umum](#10-tipe-data-umum)

---

## 1. Gym Reports

**Mount path**: `/api/v1/reports/gym`  
**Permission**: `read Member` / `read CheckIn` / `read ActiveService`

### `GET /reports/gym/overview`
Overview statistik gym secara real-time.

**Response**
```json
{
  "success": true,
  "data": {
    "members": {
      "total": 320,
      "active": 285,
      "inactiveRate": 10.94
    },
    "checkIns": {
      "today": 42,
      "thisWeek": 210,
      "thisMonth": 890
    },
    "activeServices": {
      "breakdown": [
        { "serviceType": "gym", "count": "200" },
        { "serviceType": "personal_training", "count": "45" }
      ],
      "total": 245,
      "expiringSoon": 12
    }
  }
}
```

---

### `GET /reports/gym/checkin-trends`
Tren check-in dari waktu ke waktu, dilengkapi forecasting 3 periode ke depan.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `daily` | Granularitas data |

**Response**
```json
{
  "success": true,
  "data": {
    "trends": [
      { "period": "2026-02-01T00:00:00.000Z", "count": "135", "uniqueMembers": "98" }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 142, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

### `GET /reports/gym/membership-stats`
Statistik distribusi paket layanan aktif.

**Response**
```json
{
  "success": true,
  "data": {
    "byPlan": [
      {
        "servicePlanId": 1,
        "count": "85",
        "totalRevenue": "12750000",
        "servicePlan": { "name": "Gold Monthly", "serviceType": "gym", "price": 150000 }
      }
    ],
    "statusDistribution": [
      { "status": "active", "count": "245" },
      { "status": "expired", "count": "60" },
      { "status": "frozen", "count": "8" }
    ],
    "newSubscriptionsThisMonth": 34
  }
}
```

---

## 2. Member Reports

**Mount path**: `/api/v1/reports/members`  
**Permission**: `read Member`

### `GET /reports/members/active`
Daftar member aktif beserta layanan yang dimiliki.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `search` | `string` | — | Cari berdasarkan nama, email, atau telepon |
| `gender` | `male` \| `female` | — | Filter jenis kelamin |
| `membershipStatus` | `string` | — | Filter status keanggotaan |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActive": 285,
      "withActiveService": 245,
      "withoutActiveService": 40,
      "genderBreakdown": { "male": 170, "female": 115 }
    },
    "statusBreakdown": [
      { "membershipStatus": "active", "isActive": true, "count": "285" }
    ],
    "members": [
      {
        "id": 1,
        "firstName": "Budi",
        "lastName": "Santoso",
        "email": "budi@example.com",
        "phone": "08123456789",
        "gender": "male",
        "joinDate": "2025-06-01",
        "isActive": true,
        "membershipStatus": "active",
        "activeServices": [
          {
            "id": 10,
            "serviceType": "gym",
            "startDate": "2026-02-01",
            "endDate": "2026-03-01",
            "remainingSessions": null,
            "status": "active",
            "pricePaid": "150000",
            "servicePlan": { "name": "Gold Monthly", "serviceType": "gym", "price": 150000 }
          }
        ]
      }
    ]
  },
  "filters": { "search": null, "gender": null, "membershipStatus": null }
}
```

---

### `GET /reports/members/growth`
Tren pertumbuhan member per periode, dilengkapi forecasting.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` \| `yearly` | `monthly` | Granularitas |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActive": 285,
      "totalInactive": 35,
      "totalMembers": 320,
      "retentionRate": 89.06
    },
    "growthByPeriod": [
      { "period": "2026-01-01T00:00:00.000Z", "newMembers": "28", "cumulativeMembers": 292 }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 31, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

### `GET /reports/members/retention`
Analisis retensi & churn member per cohort bulanan.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `months` | `number` | `6` | Jumlah bulan ke belakang untuk analisis cohort |

**Response**
```json
{
  "success": true,
  "data": {
    "cohorts": [
      {
        "period": "2025-09",
        "joined": 30,
        "stillActive": 26,
        "churned": 4,
        "retentionRate": 86.67
      }
    ],
    "checkInFrequency": {
      "last30Days": {
        "0": 15,
        "1-3": 40,
        "4-8": 110,
        "9-15": 85,
        "16+": 35
      },
      "totalActiveCheckingIn": 270,
      "avgCheckInsPerMember": 8.4
    }
  },
  "filters": { "months": "6" }
}
```

---

## 3. Service Reports

**Mount path**: `/api/v1/reports/services`  
**Permission**: `read Transaction` / `read ActiveService`

### `GET /reports/services/performance`
Performa penjualan paket layanan per periode.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `monthly` | Granularitas |
| `serviceType` | `string` | — | Filter tipe layanan |

**Response**
```json
{
  "success": true,
  "data": {
    "salesByPeriod": [
      { "period": "2026-01-01T00:00:00.000Z", "totalRevenue": "4500000", "totalSold": "30" }
    ],
    "byServiceType": [
      { "serviceType": "gym", "totalRevenue": "3000000", "totalSold": "20" }
    ],
    "topPlans": [
      { "planName": "Gold Monthly", "totalRevenue": "2250000", "totalSold": "15" }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 5100000, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly", "serviceType": null }
}
```

---

### `GET /reports/services/active`
Ringkasan layanan aktif dan yang akan segera kadaluarsa.

**Response**
```json
{
  "success": true,
  "data": {
    "statusDistribution": [
      { "status": "active", "count": "245" },
      { "status": "expired", "count": "60" }
    ],
    "byServiceType": [
      { "serviceType": "gym", "count": "200" }
    ],
    "expiringSoon": {
      "within7Days": 12,
      "within30DaysCount": 38
    },
    "autoRenewEnabled": 85
  }
}
```

---

## 4. Finance Reports

**Mount path**: `/api/v1/reports/finance`  
**Permission**: `read Transaction` / `read CashFlow`

### `GET /reports/finance/revenue`
Laporan pendapatan komprehensif dengan breakdown per modul/tipe.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` \| `yearly` | `monthly` | Granularitas |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 45000000,
      "totalTransactions": 320,
      "avgTransactionValue": 140625
    },
    "revenueByPeriod": [
      { "period": "2026-01-01T00:00:00.000Z", "revenue": "22000000", "count": "155" }
    ],
    "revenueByType": [
      { "transactionType": "membership", "revenue": "30000000" },
      { "transactionType": "pos", "revenue": "10000000" }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 23500000, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

### `GET /reports/finance/profit-loss`
Laporan Laba Rugi per periode.

**Query Parameters**: sama dengan `/revenue`

**Response**
```json
{
  "success": true,
  "data": {
    "byPeriod": [
      {
        "period": "2026-01-01T00:00:00.000Z",
        "totalRevenue": "22000000",
        "totalExpenses": "8500000",
        "netProfit": 13500000,
        "profitMargin": 61.36
      }
    ],
    "summary": {
      "totalRevenue": 45000000,
      "totalExpenses": 17000000,
      "netProfit": 28000000,
      "profitMargin": 62.22
    }
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

### `GET /reports/finance/cash-flow`
Ringkasan arus kas (Cash Flow).

**Query Parameters**: sama dengan `/revenue`

**Response**
```json
{
  "success": true,
  "data": {
    "byPeriod": [
      {
        "period": "2026-01-01T00:00:00.000Z",
        "totalInflow": "22500000",
        "totalOutflow": "8500000",
        "netFlow": 14000000
      }
    ],
    "summary": {
      "totalInflow": 46000000,
      "totalOutflow": 17500000,
      "netCashFlow": 28500000
    }
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

## 5. Product Reports

**Mount path**: `/api/v1/reports/products`  
**Permission**: `read Transaction`

### `GET /reports/products/performance`
Performa penjualan produk per periode.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `monthly` | Granularitas |
| `categoryId` | `number` | — | Filter kategori produk |
| `productType` | `string` | — | Filter tipe produk |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalQuantitySold": 1540,
      "totalRevenue": 18500000,
      "uniqueProducts": 48,
      "totalTransactions": 320
    },
    "salesByPeriod": [
      { "period": "2026-01-01T00:00:00.000Z", "revenue": "9000000", "quantitySold": "750" }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 9800000, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly", "categoryId": null, "productType": null }
}
```

---

### `GET /reports/products/top-selling`
Ranking produk terlaris.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `limit` | `number` | `20` | Jumlah produk yang ditampilkan |
| `sortBy` | `revenue` \| `quantity` | `revenue` | Urutan ranking |

**Response**
```json
{
  "success": true,
  "data": {
    "topProducts": [
      {
        "productId": 5,
        "productName": "Protein Shake",
        "category": "Supplement",
        "totalRevenue": 3200000,
        "totalQuantitySold": 160,
        "rank": 1
      }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "limit": "20", "sortBy": "revenue" }
}
```

---

### `GET /reports/products/by-category`
Penjualan produk dikelompokkan per kategori.

**Query Parameters**: `startDate`, `endDate`

**Response**
```json
{
  "success": true,
  "data": {
    "byCategory": [
      {
        "categoryId": 1,
        "categoryName": "Supplement",
        "totalRevenue": "5400000",
        "totalQuantitySold": "270",
        "productCount": 8
      }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28" }
}
```

---

## 6. Restaurant Reports

**Mount path**: `/api/v1/reports/restaurant`  
**Permission**: `read Transaction` + **modul `restaurant` harus aktif di subscription**

> ⚠️ Endpoint ini akan mengembalikan `403 Forbidden` jika paket subscription tenant tidak mengaktifkan modul `restaurant`.

### `GET /reports/restaurant/sales`
Laporan penjualan restoran per periode.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `daily` | Granularitas |
| `locationId` | `number` | — | Filter lokasi |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 12500000,
      "totalOrders": 480,
      "avgOrderValue": 26041.67
    },
    "salesByPeriod": [
      { "period": "2026-02-01T00:00:00.000Z", "revenue": "6200000", "orders": "240" }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "groupBy": "daily", "locationId": null }
}
```

---

### `GET /reports/restaurant/table-utilization`
Utilisasi meja restoran.

**Query Parameters**: `startDate`, `endDate`, `locationId`

**Response**
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "tableId": 1,
        "tableName": "Table 1",
        "totalOrders": 85,
        "avgSessionMinutes": 42,
        "utilizationRate": 70.8
      }
    ],
    "summary": {
      "avgUtilizationRate": 65.4,
      "mostUsedTable": "Table 1"
    }
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "locationId": null }
}
```

---

### `GET /reports/restaurant/top-items`
Menu terlaris di restoran.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `limit` | `number` | `10` | Jumlah item |

**Response**
```json
{
  "success": true,
  "data": {
    "topItems": [
      {
        "menuItemId": 3,
        "itemName": "Nasi Goreng Spesial",
        "totalRevenue": 1800000,
        "totalOrdered": 180,
        "rank": 1
      }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "limit": "10" }
}
```

---

## 7. Staff Reports

**Mount path**: `/api/v1/reports/staff`  
**Permission**: `read StaffAttendance` / `read EmployeeSchedule`

### `GET /reports/staff/attendance`
Laporan absensi karyawan dengan statistik ringkasan.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `userId` | `number` | — | Filter per karyawan |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `daily` | Granularitas |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 180,
      "uniqueStaff": 12,
      "totalCheckIns": 180,
      "totalCheckOuts": 175
    },
    "attendanceByPeriod": [
      { "period": "2026-02-01T00:00:00.000Z", "checkIns": "12", "checkOuts": "11" }
    ],
    "perStaff": [
      {
        "userId": 5,
        "staffName": "Adi Trainer",
        "totalCheckIns": 22,
        "totalCheckOuts": 22,
        "avgWorkHours": 8.1
      }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "userId": null, "groupBy": "daily" }
}
```

---

### `GET /reports/staff/daily-composition`
Komposisi staf per hari berdasarkan jadwal.

> ⚠️ `startDate` dan `endDate` **wajib** diisi. Akan error 400 jika tidak ada.

**Query Parameters**
| Parameter | Tipe | Wajib | Keterangan |
|-----------|------|-------|------------|
| `startDate` | `YYYY-MM-DD` | ✅ | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | ✅ | Tanggal akhir |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDays": 28,
      "avgStaffPerDay": 8.5,
      "totalScheduleEntries": 238,
      "offDayEntries": 14
    },
    "composition": [
      {
        "date": "2026-02-01",
        "totalStaff": 9,
        "staff": [
          { "userId": 5, "name": "Adi Trainer", "shiftName": "Morning", "role": "trainer" }
        ]
      }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28" }
}
```

---

### `GET /reports/staff/shift-summary`
Distribusi shift karyawan.

**Query Parameters**: `startDate`, `endDate`

**Response**
```json
{
  "success": true,
  "data": {
    "shiftDistribution": [
      { "shiftId": 1, "shiftName": "Morning (06:00-14:00)", "count": "85" },
      { "shiftId": 2, "shiftName": "Afternoon (14:00-22:00)", "count": "72" }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28" }
}
```

---

## 8. Commission Reports

**Mount path**: `/api/v1/reports/commissions`  
**Permission**: `read TrainerCommission`

### `GET /reports/commissions/summary`
Ringkasan komisi trainer dengan breakdown per trainer.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `status` | `pending` \| `paid` \| `cancelled` | — | Filter status komisi |

**Response**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCommission": 8500000,
      "totalPaid": 6000000,
      "totalPending": 2500000,
      "trainerCount": 8
    },
    "byTrainer": [
      {
        "trainerId": 3,
        "trainerName": "Rio Fitness",
        "totalCommission": 1800000,
        "paidCommission": 1200000,
        "pendingCommission": 600000,
        "sessionCount": 36
      }
    ]
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "status": null }
}
```

---

### `GET /reports/commissions/trends`
Tren komisi dari waktu ke waktu.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `groupBy` | `daily` \| `weekly` \| `monthly` | `monthly` | Granularitas |

**Response**
```json
{
  "success": true,
  "data": {
    "trends": [
      { "period": "2026-01-01T00:00:00.000Z", "totalCommission": "4200000", "sessionCount": "85" }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 4600000, "type": "forecast" }
    ]
  },
  "filters": { "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "monthly" }
}
```

---

### `GET /reports/commissions/by-trainer/:trainerId`
Detail komisi untuk satu trainer tertentu.

**URL Params**: `trainerId` — ID trainer

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `startDate` | `YYYY-MM-DD` | — | Tanggal mulai |
| `endDate` | `YYYY-MM-DD` | — | Tanggal akhir |
| `status` | `pending` \| `paid` \| `cancelled` | — | Filter status |
| `page` | `number` | `1` | Halaman |
| `limit` | `number` | `20` | Jumlah per halaman |

**Response**
```json
{
  "success": true,
  "data": {
    "trainer": {
      "id": 3,
      "name": "Rio Fitness",
      "commissionType": "percentage",
      "commissionValue": 20.0
    },
    "summary": {
      "totalCommission": 1800000,
      "paidCommission": 1200000,
      "pendingCommission": 600000,
      "sessionCount": 36
    },
    "commissions": [
      {
        "id": 101,
        "sessionId": 55,
        "amount": 50000,
        "status": "paid",
        "date": "2026-02-15",
        "memberName": "Budi Santoso"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 36,
      "totalPages": 2
    }
  },
  "filters": { "startDate": "2026-02-01", "endDate": "2026-02-28", "status": null, "page": 1, "limit": 20 }
}
```

---

## 9. Forecasting Reports

**Mount path**: `/api/v1/reports/forecasting`  
**Algoritma**: Linear Regression + Moving Average

### `GET /reports/forecasting/revenue`
Prediksi pendapatan ke depan.

**Query Parameters**
| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `months` | `number` | `6` | Jumlah bulan data historis yang dianalisis |
| `periodsAhead` | `number` | `3` | Jumlah periode prediksi ke depan |
| `transactionType` | `string` | — | Filter tipe transaksi |

**Permission**: `read Transaction`

---

### `GET /reports/forecasting/members`
Prediksi pertumbuhan member.

**Query Parameters**: `months` (default `12`), `periodsAhead` (default `3`)  
**Permission**: `read Member`

---

### `GET /reports/forecasting/attendance`
Prediksi tren check-in kehadiran.

**Query Parameters**: `months` (default `6`), `periodsAhead` (default `3`)  
**Permission**: `read CheckIn`

---

### `GET /reports/forecasting/expenses`
Prediksi tren pengeluaran.

**Query Parameters**: `months` (default `6`), `periodsAhead` (default `3`)  
**Permission**: `read Expense`

---

### `GET /reports/forecasting/comprehensive`
Prediksi kombinasi semua metrik (revenue, member, attendance, expenses) sekaligus.

**Query Parameters**: `months` (default `6`), `periodsAhead` (default `3`)  
**Permission**: `read Transaction`

**Response (semua forecasting endpoints)**
```json
{
  "success": true,
  "data": {
    "historical": [
      { "period": "2025-09-01T00:00:00.000Z", "value": 38000000 }
    ],
    "forecast": [
      { "period": "2026-03-01T00:00:00.000Z", "value": 48200000, "type": "forecast", "confidence": 0.87 }
    ],
    "trend": "upward",
    "growthRate": 4.2
  }
}
```

**Response khusus `/forecasting/comprehensive`**
```json
{
  "success": true,
  "data": {
    "revenue": { "historical": [...], "forecast": [...] },
    "members": { "historical": [...], "forecast": [...] },
    "attendance": { "historical": [...], "forecast": [...] },
    "expenses": { "historical": [...], "forecast": [...] }
  }
}
```

---

## 10. Tipe Data Umum

### Format Tanggal
- Input query: `YYYY-MM-DD` (contoh: `2026-02-01`)
- Output timestamp: ISO 8601 (contoh: `2026-02-01T00:00:00.000Z`)

### Format Angka
- Nilai uang (`revenue`, `totalRevenue`, dll.) dapat berupa `string` numerik dari database — selalu lakukan `parseFloat()` di frontend
- Nilai persentase sudah dalam format desimal (contoh: `86.67` berarti 86,67%)

### Respons Error
```json
{
  "success": false,
  "message": "Start date and end date are required",
  "code": "VALIDATION_ERROR"
}
```

| HTTP Code | Keterangan |
|-----------|------------|
| `400` | Parameter wajib tidak disertakan atau tidak valid |
| `401` | Token tidak valid / tidak ada |
| `403` | Tidak punya permission atau modul tidak aktif di subscription |
| `500` | Server error |

### Struktur Forecast Object
```typescript
interface ForecastPoint {
  period: string;      // ISO timestamp
  value: number;       // Nilai prediksi
  type: "forecast";    // Selalu "forecast"
  confidence?: number; // 0–1, tidak selalu ada
}
```
