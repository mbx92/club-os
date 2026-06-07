# Perbaikan Data Cash Register — 21 & 22 Februari 2026

Panduan ini menjelaskan **permasalahan, penyebab, dan langkah perbaikan** data sesi kasir tanggal 21–22 Februari 2026 pada database **production**.

---

## Daftar Isi

1. [Ringkasan Masalah](#ringkasan-masalah)
2. [Sesi yang Terdampak](#sesi-yang-terdampak)
3. [Penyebab Root](#penyebab-root)
4. [Pra-syarat](#pra-syarat)
5. [Langkah Perbaikan](#langkah-perbaikan)
6. [Verifikasi Sesudah Fix](#verifikasi-sesudah-fix)
7. [Detail Teknis](#detail-teknis)

---

## Ringkasan Masalah

Tiga sesi shift menampilkan **selisih kas negatif yang tidak akurat** karena dua bug:

| Bug | Dampak |
|-----|--------|
| Order dibatalkan (cancelled) tapi `TransactionPayment.status` masih `completed` | Cash summary menghitung pembayaran yang seharusnya tidak ada |
| Transaksi `split` gaya lama (dengan payment langsung di parent) tidak masuk kalkulasi report | `Q_totalCash` tampak lebih kecil dari `actualCash` |

---

## Sesi yang Terdampak

| Sesi | Tanggal | Nama Shift | Session ID |
|------|---------|------------|------------|
| Siang 21 Feb | 2026-02-21 | Siang | `1c944e71-f19a-4b59-a310-ca30695f62f2` |
| Morning 22 Feb | 2026-02-22 | Morning | `e3a29f73-936e-4699-bd39-6615441f50a5` |
| Evening 22 Feb | 2026-02-22 | Evening | `a2c9c7b3-fcce-4f8c-9221-de6e21ec7dc0` |

### Order bermasalah yang sudah diidentifikasi

| Order | Sesi | Masalah | Payment salah |
|-------|------|---------|---------------|
| `ORD-202602-0020` | Siang 21 Feb | Cancelled + payment completed | Cash Rp 48.000 |
| `ORD-202602-0023` | Siang 21 Feb | Cancelled + payment completed | Cash Rp 112.000 |
| `RST-20260222-0001` | Morning 22 Feb | Cancelled + payment completed (double!) | Cash Rp 119.000 × 2 |
| `RST-20260222-0002` | Morning 22 Feb | Cancelled + payment completed | Cash Rp 141.000 |

### Split bill double payment (parent + children)

| Order | Status | Payment | Keterangan |
|-------|--------|---------|------------|
| `ORD-202602-0033` | split (parent) | Cash 278.000 ✗ | **Harus di-void** — children sudah bayar sendiri |
| `RST-20260221-0001` | completed (child 1) | Cash 119.000 ✓ | Valid, bayar setelah split |
| `RST-20260221-0002` | completed (child 2) | Cash 149.000 ✓ | Valid, bayar setelah split |

> Parent 278k harus di-void karena sesuai alur post-fix, hanya children yang memegang payment. Cash sebenarnya di laci = 119k + 149k = **268k**, bukan 546k.

---

## Penyebab Root

### Bug 1 — Cancelled order dengan completed payment

Saat order dibatalkan, sistem tidak selalu membalik status `TransactionPayment` dari `completed` ke `failed`. Akibatnya `getCashSummary()` tetap menjumlahkan pembayaran tersebut sebagai kas masuk.

### Bug 2 — Split bill gaya lama → double payment (parent + children)

`ORD-202602-0033` adalah transaksi tipe `split` yang dibuat **sebelum** fix split bill.

**Alur sebelum fix:**
1. Customer pesan → kasir proses pembayaran **278k cash di parent**
2. Bill di-split menjadi `RST-20260221-0001` (119k) dan `RST-20260221-0002` (149k)
3. Masing-masing child **juga dibayar cash** oleh tiap orang
4. Total tercatat di kas: 278k + 119k + 149k = **546k** (padahal order cuma 267k)

**Alur sesudah fix (kode baru `splitBillByItem`):**
1. Bill di-split → children dibuat dengan `status: 'pending'` (belum bayar)
2. Kasir terima bayar per child → payment hanya ada di children
3. Parent hanya marker `split`, **tanpa payment aktif**

Jadi parent payment 278k harus di-**void** (`failed`) karena uang sebenarnya masuk via children.

**Catatan:** `splitFromId` pada children bernilai `null` (gaya lama). Link ke parent hanya lewat field `notes` (`"Split 1/2 dari transaksi #ORD-202602-0033"`).

**Status:**
- [x] Controller `splitBillByItem` sudah dipatch — tidak generate payment duplikat lagi
- [x] Filter di `getShiftReport` sudah dipatch untuk memasukkan `split` bergaya lama
- [ ] Data lama perlu diperbaiki → void parent payment via `fixSplitBillPayments.js`

---

## Pra-syarat

1. Akses SSH ke server production
2. Node.js tersedia di server dan project sudah ter-deploy
3. Pastikan backup database sudah ada sebelum menjalankan `--fix`

```bash
# Buat backup dulu sebelum apply fix
pg_dump -U postgres gym_db > backup_sebelum_fix_$(date +%Y%m%d%H%M).sql
```

---

## Langkah Perbaikan

> ℹ️ Semua command di bawah dijalankan langsung di server production. Tidak diperlukan flag environment tambahan karena server hanya menggunakan konfigurasi production.

### Langkah 1 — Fix Split Bill Double Payment

Void parent payment pada ORD-0033 yang terhitung ganda karena children sudah bayar sendiri.

**Preview dulu (tidak mengubah data):**
```bash
node scripts/fixSplitBillPayments.js --dates=2026-02-21
```

**Apply fix:**
```bash
node scripts/fixSplitBillPayments.js --dates=2026-02-21 --fix
```

Script ini akan:
1. Cari semua parent `split` yang punya payment `completed` DAN punya children yang juga sudah dibayar
2. Set parent payment status → `failed`
3. Reset `paidAmount` & `changeAmount` di parent → 0
4. Recalculate `closingBalance` & `difference` via `getCashSummary()`

> Children dideteksi via `splitFromId` (gaya baru) dan via `notes` pattern `"Split X/Y dari transaksi #..."` (gaya lama).

---

### Langkah 2 — Preview Fix Cancelled Payments

Jalankan script **tanpa flag `--fix`** dulu untuk melihat payment mana yang akan diubah:

```bash
# Dry-run — tidak ada yang berubah di DB
node scripts/fixCancelledPayments.js
```

Output akan menampilkan daftar order `cancelled` yang masih punya payment `completed`, beserta jumlah kas yang akan dikoreksi.

Untuk mengecek sesi tertentu saja:

```bash
node scripts/fixCancelledPayments.js \
  --sessions=1c944e71-f19a-4b59-a310-ca30695f62f2,e3a29f73-936e-4699-bd39-6615441f50a5,a2c9c7b3-fcce-4f8c-9221-de6e21ec7dc0
```

---

### Langkah 3 — Apply Fix Cancelled Payments

Jika output langkah 2 sesuai ekspektasi, apply fix:

```bash
node scripts/fixCancelledPayments.js --fix
```

Atau via npm script:

```bash
npm run fix:cancelled-payments:prod
```

Script ini akan:
1. Menemukan semua `TransactionPayment` dengan `status = 'completed'` pada order `cancelled`
2. Mengubah status payment tersebut menjadi `failed`
3. Memanggil `getCashSummary()` untuk menghitung ulang `closingBalance` dan `difference` pada setiap sesi

---

### Langkah 4 — Verifikasi dengan Diagnose

Setelah langkah 1–3 selesai, jalankan diagnose untuk memastikan semua angka sudah benar:

```bash
node scripts/diagnoseCashRegisterReport.js --dates=2026-02-21,2026-02-22
```

Jika `Difference (DB)` sudah sesuai, selesai. Jika masih perlu adjustment:

```bash
node scripts/diagnoseCashRegisterReport.js --dates=2026-02-21,2026-02-22 --fix
```

---

## Verifikasi Sesudah Fix

### 1. Jalankan diagnose ulang

```bash
node scripts/diagnoseCashRegisterReport.js --dates=2026-02-21,2026-02-22
```

Nilai `Difference (DB)` seharusnya berubah ke nilai yang lebih akurat.

### 2. Cek via API (diagnose endpoint)

```http
POST /api/v1/gym/cash-register/{sessionId}/diagnose-report
Authorization: Bearer <token>
```

Lihat bagian `recalculate`:
- `recalcDifference` = angka selisih yang benar
- `paymentMismatchTransactions` = harus kosong (`[]`) setelah fix

### 3. Cek di frontend

Buka halaman **Laporan Kasir** → pilih tanggal 21 atau 22 Februari 2026 → verifikasi angka selisih sudah sesuai kondisi kas aktual.

---

## Detail Teknis

### Apa yang berubah di database

| Tabel | Kolom | Perubahan |
|-------|-------|-----------|
| `TransactionPayments` | `status` | `completed` → `failed` untuk payment dari order cancelled |
| `CashRegisterSessions` | `closingBalance` | Dihitung ulang via `getCashSummary()` |
| `CashRegisterSessions` | `difference` | Dihitung ulang: `actualCash - expectedCash` |

### Hasil diagnose (dev DB — sebelum fix di production)

Output dari `node scripts/diagnoseCashRegisterReport.js --dates=2026-02-21,2026-02-22` (dev DB):

| Sesi | DB Saat Ini | Penyebab |
|------|-------------|----------|
| Siang 21 Feb | −578.020 | Cancelled payments 160k + split double payment 278k |
| Morning 22 Feb | 0 | ✅ Sudah benar |
| Evening 22 Feb | −400 | Gym cash 140k (TRX-0009 + TRX-0010) — **normal** |

### Nilai yang diharapkan setelah semua fix di production

| Sesi | DB Sekarang | Setelah Fix | Keterangan |
|------|-------------|-------------|------------|
| Siang 21 Feb | −578.020 | **≈ −41k → −0** | Void parent 278k + void cancelled 160k → cash sekarang match |
| Morning 22 Feb | 0 | **0** | Tidak perlu fix |
| Evening 22 Feb | −400 | **−400** | Bukan bug, cashier kurang hitung Rp 400 |

> **Detail perhitungan Siang 21 Feb:**
> - `actualCash` = 804.780
> - Sebelum fix: `expectedCash` = 450k (opening) + 932.800 (cashIn all) = 1.382.800 → diff = −578k
> - Setelah void parent 278k: cashIn turun 267.120 (net = 278k - 10.880 change)
> - Setelah void cancelled 160k: cashIn turun 160k
> - New cashIn = 932.800 - 267.120 - 160.000 = 505.680
> - New expectedCash = 450k + 505.680 = 955.680
> - New difference = 804.780 - 955.680 ≈ −151k
>
> *(Angka pasti akan dihitung ulang oleh getCashSummary saat script dijalankan)*
>
> **Catatan Evening 22 Feb:** Selisih −400 adalah kekurangan kas riil, bukan bug.

### Kode yang sudah dipatch (tidak perlu rollback)

| File | Perubahan |
|------|-----------|
| `src/controllers/gym/cashRegister/cashRegisterController.js` | Filter `getShiftReport` memasukkan `split` gaya lama (ada payments) |
| `src/controllers/gym/cashRegister/cashRegisterController.js` | `diagnoseReport` dengan section `recalculate` |
| `src/controllers/gym/cashRegister/cashRegisterController.js` | Endpoint `correctPayment` (`PATCH /:id/correct-payment`) |

---

*Dokumen ini dibuat: 26 Februari 2026*
