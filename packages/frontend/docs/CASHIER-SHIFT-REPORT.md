# Frontend Integration: Cashier Shift Report

> Dokumentasi endpoint **Shift Report** pada sistem kasir (open/close register).
> Menghasilkan laporan otomatis setara Report Cashier & Report Gym yang biasanya ditulis manual.

---

## Daftar Isi

1. [Overview](#overview)
2. [Cash Register Endpoints](#cash-register-endpoints)
3. [Shift Report Endpoint](#shift-report-endpoint)
4. [Report Cashier (Restaurant/POS)](#report-cashier-restaurantpos)
5. [Report Gym](#report-gym)
6. [Contoh Halaman Frontend](#contoh-halaman-frontend)
7. [Flow Lengkap](#flow-lengkap)

---

## Overview

Sistem report otomatis menggantikan form kertas yang diisi manual:

```
┌─────────────────────┐     ┌─────────────────────┐
│   REPORT CASHIER    │     │     REPORT GYM      │
│   (Kertas Manual)   │     │   (Kertas Manual)   │
│                     │     │                     │
│  A. Penjualan       │     │  Daily    : 14 org  │
│  B. Cake Delivery   │     │  Weekly   : 1 org   │
│  C. Discount        │     │  1 Month  : -       │
│  ...                │     │  ...                │
│  Q. Total Cash      │     │  Grand Total        │
└─────────────────────┘     └─────────────────────┘
          │                           │
          ▼                           ▼
┌───────────────────────────────────────────────────┐
│       GET /gym/cash-register/:id/report           │
│       (Otomatis dari data transaksi)              │
└───────────────────────────────────────────────────┘
```

---

## Cash Register Endpoints

**Base path**: `/api/v1/gym/cash-register`

| Method | Endpoint             | Deskripsi                              |
|--------|----------------------|----------------------------------------|
| GET    | `/`                  | List semua sesi shift                  |
| GET    | `/current`           | Sesi shift yang sedang buka            |
| GET    | `/:id`               | Detail sesi shift + summary            |
| GET    | `/:id/report`        | **⭐ Laporan lengkap shift**           |
| POST   | `/open`              | Buka shift baru                        |
| POST   | `/:id/close`         | Tutup shift                            |

### Open Shift

```http
POST /api/v1/gym/cash-register/open
```

```json
{
  "shiftName": "Morning",
  "openingBalance": 500000,
  "locationId": "uuid-location-1",
  "openingNotes": "Petty cash dari shift sebelumnya"
}
```

| Field          | Type   | Required | Description                       |
|----------------|--------|----------|-----------------------------------|
| shiftName      | string | ✅       | Nama shift (e.g. Morning, Evening)|
| openingBalance | number | No       | Saldo awal / petty cash (default: 0) |
| locationId     | UUID   | No       | Lokasi (untuk multi-outlet)       |
| openingNotes   | string | No       | Catatan pembukaan                 |

### Close Shift

```http
POST /api/v1/gym/cash-register/:id/close
```

```json
{
  "actualCash": 980000,
  "closingNotes": "Total cash Rp 981.000 / 39 pax"
}
```

| Field        | Type   | Required | Description                         |
|--------------|--------|----------|-------------------------------------|
| actualCash   | number | ✅       | Jumlah uang tunai aktual di kasir   |
| closingNotes | string | No       | Catatan penutupan                   |

**Response:**

```json
{
  "success": true,
  "message": "Shift berhasil ditutup",
  "data": {
    "session": { ... },
    "summary": {
      "openingBalance": 500000,
      "cashIn": 550000,
      "cashOut": 0,
      "expectedCash": 1050000,
      "actualCash": 980000,
      "difference": -70000,
      "status": "deficit"
    }
  }
}
```

---

## Shift Report Endpoint

```http
GET /api/v1/gym/cash-register/:id/report
```

**Query Parameters:**

| Param | Type   | Default | Description                              |
|-------|--------|---------|------------------------------------------|
| type  | string | `all`   | `all` / `cashier` / `gym` — bagian report mana yang dikembalikan |

> ⚡ Bisa dipanggil untuk shift yang **sedang buka** (live report) maupun shift yang **sudah ditutup**.

---

## Report Cashier (Restaurant/POS)

Response di `data.reportCashier` — sesuai form kertas Report Cashier:

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid-session",
      "shiftName": "Morning",
      "shiftDate": "2026-02-12",
      "shiftNumber": 1,
      "openedAt": "2026-02-12T00:30:00.000Z",
      "closedAt": "2026-02-12T08:30:00.000Z",
      "status": "closed",
      "openedBy": "Widya A.",
      "closedBy": "Manager",
      "location": "Main Outlet",
      "openingBalance": 500000,
      "actualCash": 980000,
      "difference": -70000
    },
    "reportCashier": {
      "A_penjualan": 3847000,
      "B_delivery": 900000,
      "C_discount": 78200,
      "D_totalPenjMinusDelivery": 2947000,
      "E_netSales": 3768800,
      "F_serviceCharge": 158628,
      "G_tax": 272200,
      "H_rounding": 372,
      "I_tipping": 11000,
      "J_grandTotal": 4211000,
      "K_pengeluaran": 540000,
      "paymentMethods": {
        "cash": { "amount": 980900, "count": 15 },
        "qris": { "amount": 1801900, "count": 12 },
        "bni": { "amount": 203500, "count": 3 },
        "bca": { "amount": 480300, "count": 5 },
        "mandiri": { "amount": 209400, "count": 2 },
        "gojek": { "amount": 0, "count": 0 }
      },
      "Q_totalCash": 980900,
      "transactionCount": 42,
      "deliveryCount": 8,
      "pax": 42
    },
    "reportGym": { ... },
    "expenseDetail": [
      {
        "id": "uuid-expense-1",
        "title": "Beli plastik",
        "amount": 50000,
        "paymentMethod": "cash",
        "category": "Operational",
        "expenseDate": "2026-02-12T04:00:00.000Z"
      }
    ],
    "totalExpenses": 540000,
    "totalTransactions": 56
  }
}
```

### Mapping Report Cashier → Response Fields

| Baris Kertas              | Field Response                | Keterangan                               |
|---------------------------|-------------------------------|------------------------------------------|
| A. PENJUALAN              | `A_penjualan`                 | Total subtotal semua transaksi           |
| B. CAKE DELIVERY          | `B_delivery`                  | Subtotal order tipe `delivery`           |
| C. DISCOUNT               | `C_discount`                  | Total voucher discount                   |
| D. TOTAL PENJ - CAKE (A-B)| `D_totalPenjMinusDelivery`    | Penjualan minus delivery                 |
| E. TOTAL PENJ - DISC (A-C)| `E_netSales`                  | Net sales setelah diskon                 |
| F. SERVICE 6%             | `F_serviceCharge`             | Total service charge                     |
| G. TAX 10%                | `G_tax`                       | Total pajak                              |
| H. ROUNDING               | `H_rounding`                  | Pembulatan (selisih kalkulasi)           |
| I. TIPPING                | `I_tipping`                   | Tips (dari paymentDetails jika ada)      |
| J. GRAND TOTAL (E+F+G+H+I)| `J_grandTotal`               | Grand total penjualan                    |
| K. PENGELUARAN            | `K_pengeluaran`               | Total pengeluaran tunai selama shift     |
| L. TOTAL QRIS LPD         | `paymentMethods.qris.amount`  | Total pembayaran QRIS                    |
| M. SETTLEMENT BNI         | `paymentMethods.bni.amount`   | Total pembayaran BNI                     |
| N. SETTLEMENT BCA         | `paymentMethods.bca.amount`   | Total pembayaran BCA                     |
| O. SETTLEMENT MANDIRI     | `paymentMethods.mandiri.amount`| Total pembayaran Mandiri                |
| P. PENDAPATAN GOJEK       | `paymentMethods.gojek.amount` | Total pembayaran via Gojek               |
| Q. TOTAL CASH             | `Q_totalCash`                 | J - K - L - M - N - O - P               |

---

## Report Gym

Response di `data.reportGym` — sesuai form kertas Report Gym:

```json
{
  "reportGym": {
    "memberships": {
      "daily": {
        "label": "Daily",
        "count": 14,
        "amount": 1400000
      },
      "weekly": {
        "label": "Weekly Member",
        "count": 1,
        "amount": 450000
      },
      "1month": {
        "label": "1 Month Member",
        "count": 0,
        "amount": 0
      },
      "3month": {
        "label": "3 Month Member",
        "count": 0,
        "amount": 0
      },
      "6month": {
        "label": "6 Month Member",
        "count": 0,
        "amount": 0
      },
      "12month": {
        "label": "12 Month Member",
        "count": 0,
        "amount": 0
      }
    },
    "otherItems": {
      "Bath Towel": { "count": 3, "amount": 15000 }
    },
    "paymentMethods": {
      "cash": { "amount": 400000, "count": 8 },
      "qris": { "amount": 300000, "count": 2 },
      "mandiri": { "amount": 1150000, "count": 5 }
    },
    "pengeluaran": 82000,
    "paymentCash": 400000,
    "totalCash": 318000,
    "totalCard": 1450000,
    "grandTotal": 1768000,
    "transactionCount": 15
  }
}
```

### Mapping Report Gym → Response Fields

| Baris Kertas                     | Field Response                       | Keterangan                          |
|----------------------------------|--------------------------------------|-------------------------------------|
| DAILY                            | `memberships.daily.count / .amount`  | Member harian (1 hari)              |
| WEEKLY MEMBER                    | `memberships.weekly.count / .amount` | Member mingguan (7 hari)            |
| 1 MONTH MEMBER                   | `memberships.1month.count / .amount` | Member 1 bulan (28-31 hari)         |
| 3 MONTH MEMBER                   | `memberships.3month.count / .amount` | Member 3 bulan                      |
| 6 MONTH MEMBER                   | `memberships.6month.count / .amount` | Member 6 bulan                      |
| 12 MONTH MEMBER                  | `memberships.12month.count / .amount`| Member 12 bulan                     |
| BATH TOWEL                       | `otherItems["Bath Towel"]`           | Item non-membership                 |
| QRIS                             | `paymentMethods.qris.amount`         | Total bayar QRIS                    |
| MANDIRI                          | `paymentMethods.mandiri.amount`      | Total bayar Mandiri                 |
| PENGELUARAN                      | `pengeluaran`                        | Pengeluaran tunai                   |
| PAYMENT CASH                     | `paymentCash`                        | Total pembayaran tunai              |
| TOTAL (CASH - PENGELUARAN)       | `totalCash`                          | Cash bersih setelah pengeluaran     |
| TOTAL CARD (QRIS + MANDIRI)      | `totalCard`                          | Total semua non-cash                |
| GRAND TOTAL (CARD + CASH)        | `grandTotal`                         | Grand total keseluruhan             |

---

## Contoh Halaman Frontend

### Halaman: Shift Report

**Trigger**: Setelah close shift, atau klik "Lihat Report" di daftar sesi

```
┌─────────────────────────────────────────────────────────────────┐
│                      REPORT CASHIER                             │
│ Tanggal: 12/02/2026    Shift: Morning    Cashier: Widya A.      │
├─────────────────────────────────────────────────────────────────┤
│ A  PENJUALAN                                      3.847.000    │
│ B  DELIVERY                                         900.000    │
│ C  DISCOUNT                                          78.200    │
│ D  TOTAL PENJ. - DELIVERY (A-B)                   2.947.000    │
│ E  TOTAL PENJ. - DISC (A-C)                       3.768.800    │
│ F  SERVICE 6%                                       158.628    │
│ G  TAX 10%                                          272.200    │
│ H  ROUNDING                                             372    │
│ I  TIPPING                                           11.000    │
│                                                                 │
│    GRAND TOTAL PENJUALAN (E+F+G+H+I)              4.211.000    │
│                                                                 │
│ K  PENGELUARAN                                      540.000    │
│ L  TOTAL QRIS LPD                                1.801.900    │
│ M  SETTLEMENT BNI                                   203.500    │
│ N  SETTLEMENT BCA                                   480.300    │
│ O  SETTLEMENT MANDIRI                               209.400    │
│ P  PENDAPATAN GOJEK                                       -    │
│                                                                 │
│    TOTAL CASH (J-K-L-M-N-O-P)                      980.900    │
│    Total cash: Rp 980.900 / 42 pax                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       REPORT GYM                                │
│ Tanggal: 12/02/2026    Cashier: Lisna Erna                      │
├─────────────────────────────────────────────────────────────────┤
│ DAILY                        14 orang              1.400.000    │
│ WEEKLY MEMBER                 1 orang                450.000    │
│ 1 MONTH MEMBER                     -                      -    │
│ 3 MONTH MEMBER                     -                      -    │
│ 6 MONTH MEMBER                     -                      -    │
│ 12 MONTH MEMBER                    -                      -    │
│ BATH TOWEL                    3                       15.000    │
│                                                                 │
│ QRIS                                                300.000    │
│ MANDIRI                                           1.150.000    │
│ PENGELUARAN                                          82.000    │
│ PAYMENT CASH                                        400.000    │
│                                                                 │
│ TOTAL (CASH - PENGELUARAN)                          318.000    │
│ TOTAL CARD (QRIS + MANDIRI)                       1.450.000    │
│ GRAND TOTAL (CARD + CASH)                         1.768.000    │
└─────────────────────────────────────────────────────────────────┘
```

### React Implementation (Pseudo-code)

```jsx
function ShiftReport({ sessionId }) {
  const { data } = useFetch(`/api/v1/gym/cash-register/${sessionId}/report`);
  
  if (!data) return <Loading />;
  
  const { session, reportCashier, reportGym, expenseDetail } = data;

  return (
    <div>
      {/* Session Header */}
      <h2>Shift: {session.shiftName} — {session.shiftDate}</h2>
      <p>Cashier: {session.openedBy}</p>
      
      {/* Report Cashier Table */}
      {reportCashier && (
        <table>
          <tr><td>A</td><td>PENJUALAN</td><td>{fmt(reportCashier.A_penjualan)}</td></tr>
          <tr><td>B</td><td>DELIVERY</td><td>{fmt(reportCashier.B_delivery)}</td></tr>
          <tr><td>C</td><td>DISCOUNT</td><td>{fmt(reportCashier.C_discount)}</td></tr>
          <tr><td>D</td><td>TOTAL PENJ. - DELIVERY (A-B)</td><td>{fmt(reportCashier.D_totalPenjMinusDelivery)}</td></tr>
          <tr><td>E</td><td>TOTAL PENJ. - DISC (A-C)</td><td>{fmt(reportCashier.E_netSales)}</td></tr>
          <tr><td>F</td><td>SERVICE</td><td>{fmt(reportCashier.F_serviceCharge)}</td></tr>
          <tr><td>G</td><td>TAX</td><td>{fmt(reportCashier.G_tax)}</td></tr>
          <tr><td>H</td><td>ROUNDING</td><td>{fmt(reportCashier.H_rounding)}</td></tr>
          <tr><td>I</td><td>TIPPING</td><td>{fmt(reportCashier.I_tipping)}</td></tr>
          <tr className="bold">
            <td>J</td><td>GRAND TOTAL (E+F+G+H+I)</td>
            <td>{fmt(reportCashier.J_grandTotal)}</td>
          </tr>
          <tr><td>K</td><td>PENGELUARAN</td><td>{fmt(reportCashier.K_pengeluaran)}</td></tr>
          
          {/* Dynamic payment methods */}
          {Object.entries(reportCashier.paymentMethods)
            .filter(([method]) => method !== 'cash')
            .map(([method, val]) => (
              <tr key={method}>
                <td></td>
                <td>{method.toUpperCase()}</td>
                <td>{fmt(val.amount)}</td>
              </tr>
            ))}
          
          <tr className="bold">
            <td>Q</td><td>TOTAL CASH</td>
            <td>{fmt(reportCashier.Q_totalCash)}</td>
          </tr>
          <tr><td></td><td colSpan={2}>/ {reportCashier.pax} pax</td></tr>
        </table>
      )}

      {/* Report Gym Table */}
      {reportGym && (
        <table>
          {Object.entries(reportGym.memberships).map(([key, m]) => (
            <tr key={key}>
              <td>{m.label}</td>
              <td>{m.count > 0 ? `${m.count} orang` : '-'}</td>
              <td>{m.count > 0 ? fmt(m.amount) : '-'}</td>
            </tr>
          ))}
          {Object.entries(reportGym.otherItems).map(([name, item]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{item.count}</td>
              <td>{fmt(item.amount)}</td>
            </tr>
          ))}
          <tr className="bold">
            <td colSpan={2}>PENGELUARAN</td>
            <td>{fmt(reportGym.pengeluaran)}</td>
          </tr>
          <tr>
            <td colSpan={2}>PAYMENT CASH</td>
            <td>{fmt(reportGym.paymentCash)}</td>
          </tr>
          <tr>
            <td colSpan={2}>TOTAL (CASH - PENGELUARAN)</td>
            <td>{fmt(reportGym.totalCash)}</td>
          </tr>
          <tr>
            <td colSpan={2}>TOTAL CARD</td>
            <td>{fmt(reportGym.totalCard)}</td>
          </tr>
          <tr className="bold">
            <td colSpan={2}>GRAND TOTAL</td>
            <td>{fmt(reportGym.grandTotal)}</td>
          </tr>
        </table>
      )}

      {/* Expense Detail */}
      {expenseDetail.length > 0 && (
        <div>
          <h3>Detail Pengeluaran</h3>
          {expenseDetail.map(e => (
            <div key={e.id}>{e.title}: {fmt(e.amount)} ({e.paymentMethod})</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Flow Lengkap

```
1. BUKA SHIFT
   POST /gym/cash-register/open
   { shiftName: "Morning", openingBalance: 500000 }
         │
         ▼
2. TRANSAKSI BERJALAN (otomatis tercatat)
   - Restaurant orders → Transaction (type: restaurant)
   - POS sales → Transaction (type: pos)
   - Gym membership → Transaction (type: gym)
   - Expenses → Expense (dibuat via /finance/expenses)
         │
         ▼
3. CEK REPORT (LIVE - shift masih buka)
   GET /gym/cash-register/:id/report
   → Report Cashier + Report Gym real-time
         │
         ▼
4. TUTUP SHIFT
   POST /gym/cash-register/:id/close
   { actualCash: 980000 }
         │
         ▼
5. LIHAT REPORT FINAL
   GET /gym/cash-register/:id/report
   → Report lengkap dengan selisih kas
```

### Payment Method yang Dikenali

Sistem otomatis mengelompokkan `TransactionPayment.paymentMethod` (free-form string) ke kategori:

| Input di paymentMethod       | Dikelompokkan ke | Label di Report |
|------------------------------|-------------------|-----------------|
| `cash`, `tunai`              | `cash`            | Cash / Tunai    |
| `qris`, `QRIS LPD`          | `qris`            | QRIS            |
| `bni`, `BNI VA`              | `bni`             | BNI             |
| `bca`, `BCA VA`              | `bca`             | BCA             |
| `mandiri`, `Mandiri Bill`    | `mandiri`         | Mandiri         |
| `gojek`, `gopay`             | `gojek`           | Gojek           |
| `credit_card`, `debit_card`  | `card`            | Card            |
| `e_wallet`, `e-wallet`       | `e_wallet`        | E-Wallet        |
| `bank_transfer`              | `bank_transfer`   | Bank Transfer   |

> Jika frontend memasukkan payment method baru (misalnya `"dana"`, `"shopeepay"`), sistem akan menampilkan apa adanya di `paymentMethods` breakdown.

### Membership Duration Mapping

Sistem otomatis mengelompokkan `ServicePlan.duration` (dalam hari) ke bucket:

| Duration (hari) | Bucket     | Label            |
|------------------|-----------|------------------|
| 1                | `daily`   | Daily            |
| 2 – 7           | `weekly`  | Weekly Member    |
| 8 – 31          | `1month`  | 1 Month Member   |
| 32 – 92         | `3month`  | 3 Month Member   |
| 93 – 184        | `6month`  | 6 Month Member   |
| 185+             | `12month` | 12 Month Member  |

---

## Notes

- **Tipping**: Saat ini tidak ada field `tipping` di model Transaction. Jika ingin track tipping, bisa ditambahkan di `TransactionPayment.paymentDetails.tipping` (JSON field). Sistem report sudah otomatis membacanya.
- **Rounding**: Dihitung otomatis dari selisih `totalAmount` vs `(netSales + service + tax)`.
- **Expenses**: Hanya expense dengan status `approved` atau `paid` yang masuk report. Expense yang masih `draft` atau `pending` tidak dihitung.
- **Multi-location**: Jika sesi punya `locationId`, expenses difilter by location juga.
