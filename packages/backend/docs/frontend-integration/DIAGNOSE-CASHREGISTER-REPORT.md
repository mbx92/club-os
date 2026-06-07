# Frontend Integration — Diagnose & Fix Cash Register Report

## Masalah

Ada **dua penyebab** Q_totalCash report bisa tidak sesuai dengan uang di laci kas:

### Penyebab 1 — Transaksi `split`/`merged`
Transaksi restaurant/POS yang di-split bill memiliki status `split` atau `merged`. Pembayaran tunainya sudah masuk kas dan dihitung oleh `getCashSummary` saat close shift, tetapi **tidak dihitung di Q_totalCash** report karena logic lama hanya menghitung status `completed/paid/served`.

### Penyebab 2 — Transaksi gym bayar cash
Pembayaran membership gym (cash) yang terjadi selama window shift dihitung oleh `getCashSummary` (karena uangnya masuk laci kas), tetapi **tidak muncul di Q_totalCash** report cashier karena report cashier hanya menghitung transaksi `restaurant` dan `pos`.

Akibat keduanya:
- `Selisih` di rekonsiliasi kas tampak **minus besar**
- `closingBalance` di DB tidak akurat

---

## Endpoint

### `POST /api/v1/gym/cash-register/:id/diagnose-report`

Mendiagnosa dan (opsional) memperbaiki nilai `difference` & `closingBalance` pada sesi shift.

**Auth:** Bearer token (admin / manajer)  
**Permission:** `update` → `CashRegisterSession`

### Query Parameters

| Param | Default | Keterangan |
|---|---|---|
| `dryRun` | `true` | `true` = preview saja, `false` = apply fix ke DB |

---

## Contoh Request & Response

### 1. Preview (Dry Run)

```http
POST /api/v1/gym/cash-register/916d3ab5-af38-44e3-93c3-20f3b57e356b/diagnose-report?dryRun=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mode": "dry_run",
  "data": {
    "session": {
      "id": "916d3ab5-af38-44e3-93c3-20f3b57e356b",
      "shiftName": "Siang",
      "shiftDate": "2026-02-21",
      "status": "closed",
      "openedAt": "2026-02-21T06:17:57.919Z",
      "closedAt": "2026-02-21T14:09:19.135Z",
      "openingBalance": 450000,
      "actualCash": 804780
    },
    "diagnosis": {
      "hasDiscrepancy": true,
      "splitMergedCount": 1,
      "splitMergedTransactions": [
        {
          "id": "4542e51d-...",
          "transactionNumber": "ORD-202602-0033",
          "transactionType": "restaurant",
          "cause": "split_merged_status",
          "status": "split",
          "totalAmount": 267120,
          "payments": [
            { "paymentMethod": "cash", "amount": 278000 }
          ]
        }
      ],
      "gymCashCount": 0,
      "gymCashTotal": 0,
      "gymCashTransactions": [],
      "allCauses": [ ... ]
    },
    "stored": {
      "difference": -643220,
      "closingBalance": 1448000
    },
    "corrected": {
      "difference": -578020,
      "closingBalance": 1382800,
      "Q_totalCash": 932800
    },
    "metricsOld": {
      "penjualan": 1440000,
      "discount": 399000,
      "netSales": 1041000,
      "serviceCharge": 62460,
      "tax": 0,
      "rounding": 0,
      "grandTotal": 1103460,
      "nonCash": 437780,
      "cashExpenses": 0,
      "Q_totalCash": 665680,
      "transactionCount": 12
    },
    "metricsNew": {
      "penjualan": 1800000,
      "discount": 507000,
      "netSales": 1293000,
      "serviceCharge": 77580,
      "tax": 0,
      "rounding": 0,
      "grandTotal": 1370580,
      "nonCash": 437780,
      "cashExpenses": 0,
      "Q_totalCash": 932800,
      "transactionCount": 13
    },
    "cashSummary": {
      "cashIn": 932800,
      "cashExpenseOut": 0,
      "expectedCash": 1382800
    },
    "fixed": false
  }
}
```

### 2. Apply Fix

```http
POST /api/v1/gym/cash-register/916d3ab5-af38-44e3-93c3-20f3b57e356b/diagnose-report?dryRun=false
Authorization: Bearer <token>
```

**Response:** sama dengan preview, tapi `fixed: true` dan `mode: "applied"`.

### 3. Tidak ada masalah

```json
{
  "success": true,
  "mode": "dry_run",
  "data": {
    "diagnosis": {
      "hasDiscrepancy": false,
      "splitMergedCount": 0,
      "splitMergedTransactions": []
    },
    "stored": { "difference": 0, "closingBalance": 757400 },
    "corrected": { "difference": 0, "closingBalance": 757400, "Q_totalCash": 0 },
    "fixed": false
  }
}
```

---

## Field Penting di Response

| Field | Keterangan |
|---|---|
| `diagnosis.hasDiscrepancy` | `true` jika ada perbedaan antara stored & corrected difference |
| `diagnosis.splitMergedCount` | Jumlah transaksi split/merged yang tidak masuk hitungan lama |
| `diagnosis.splitMergedTransactions` | Detail transaksi — penyebab 1 |
| `diagnosis.gymCashCount` | Jumlah transaksi gym yang bayar cash dalam window shift |
| `diagnosis.gymCashTotal` | Total cash gym yang masuk kas tapi tidak masuk Q_totalCash |
| `diagnosis.gymCashTransactions` | Detail transaksi gym cash — penyebab 2 |
| `diagnosis.allCauses` | Gabungan semua penyebab (split/merged + gym cash) |
| `stored.difference` | Nilai selisih yang tersimpan di DB saat close shift |
| `corrected.difference` | Nilai selisih yang benar (actualCash − expectedCash) |
| `corrected.Q_totalCash` | Total cash cashier yang seharusnya tampil di report |
| `cashSummary.expectedCash` | Modal awal + cashIn − cashOut (sumber kebenaran) |
| `fixed` | `true` jika sudah di-apply ke DB (`dryRun=false`) |

---

## Alur UI yang Direkomendasikan

### Di Halaman Report Shift

Tampilkan tombol **"🔍 Diagnose Selisih"** hanya jika `session.difference < 0`:

```
┌──────────────────────────────────────────────────────────────────┐
│  Rekonsiliasi Kas                                                │
│                                                                  │
│  Modal Awal    Kas Aktual    Selisih                             │
│  Rp 450.000    Rp 804.780   -Rp 643.220  ⚠  [🔍 Diagnose]     │
└──────────────────────────────────────────────────────────────────┘
```

### Flow Klik [🔍 Diagnose]

```
1. Klik [🔍 Diagnose]
   → POST /diagnose-report?dryRun=true

2. Jika hasDiscrepancy = true → tampilkan modal:

   ┌─────────────────────────────────────────────────────────┐
   │  ⚠ Selisih Ditemukan                                   │
   │                                                         │
   │  Penyebab 1 — Transaksi Split/Merged (1 transaksi)    │
   │  ┌───────────────────────────────────────────────────┐  │
   │  │ ORD-202602-0033 (split) — Rp 267.120             │  │
   │  │ Pembayaran: Cash Rp 278.000                       │  │
   │  └───────────────────────────────────────────────────┘  │
   │                                                         │
   │  Penyebab 2 — Transaksi Gym Bayar Cash (1 transaksi)  │
   │  ┌───────────────────────────────────────────────────┐  │
   │  │ GYM-20260222-0005 (completed) — Rp 140.000       │  │
   │  │ Pembayaran: Cash Rp 140.000                       │  │
   │  └───────────────────────────────────────────────────┘  │
   │                                                         │
   │  Selisih tersimpan :  -Rp 643.220                      │
   │  Selisih koreksi   :  -Rp 578.020                      │
   │  Q_totalCash koreksi: Rp 932.800                       │
   │                                                         │
   │  [Batal]              [Apply Koreksi]                   │
   └─────────────────────────────────────────────────────────┘

3. Klik [Apply Koreksi]
   → POST /diagnose-report?dryRun=false

4. Refresh report → tampilkan selisih yang sudah terkoreksi
```

### Flow `hasDiscrepancy = false`

```
→ Tampilkan toast: "✅ Data report sudah benar, tidak ada selisih."
```

---

## Catatan Penting

- **Hanya sesi `closed`** yang bisa di-fix. Sesi `open` atau `pending` akan di-skip.
- Fix ini **tidak mengubah data transaksi** — hanya update `difference` dan `closingBalance` di tabel `CashRegisterSessions`.
- Setelah fix, **refresh halaman report** untuk melihat Q_totalCash yang sudah terupdate (karena report dihitung ulang dari transaksi saat GET).
- `difference` yang dikoreksi **mungkin masih bernilai minus** jika `actualCash` yang diinput kasir saat close shift memang lebih kecil dari `expectedCash`. Fix ini hanya memastikan `expectedCash` dihitung secara akurat (termasuk transaksi split/merged), bukan memaksa selisih menjadi nol.
- Jika `difference` tetap minus besar setelah fix, kemungkinan ada penyebab lain: pengeluaran kas tidak dicatat, atau `actualCash` diisi terlalu kecil saat close shift.
