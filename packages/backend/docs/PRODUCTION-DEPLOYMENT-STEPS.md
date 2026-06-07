# Production Deployment Steps

## 1. Migrate Database

```bash
NODE_ENV=production npx sequelize-cli db:migrate
```

Migration yang akan dijalankan:
- `20260221100001-add-splitFromId-to-transactions.js` — Menambahkan kolom `splitFromId` ke tabel Transactions

---

## 2. Cleanup Old Transactions & Shifts

### Preview (Dry-Run)

```bash
NODE_ENV=production node scripts/cleanup-old-transactions.js
```

### Execute

```bash
# Hapus semua transaksi & shift sebelum tanggal 21 Feb + reset table stuck
NODE_ENV=production node scripts/cleanup-old-transactions.js --execute

# Atau dengan cutoff date custom
NODE_ENV=production node scripts/cleanup-old-transactions.js --execute --date 2026-02-21

# Hapus transaksi spesifik (by transaction number)
NODE_ENV=production node scripts/cleanup-old-transactions.js --execute --txn ORD-202602-0018,TRX-202602-0007

# Filter tenant tertentu saja
NODE_ENV=production node scripts/cleanup-old-transactions.js --execute --tenant <tenantId>
```

Script ini akan:
- Hapus transaksi + semua child records (items, payments, cashflows, voucher usages)
- Hapus shift (CashRegisterSession) sebelum cutoff date
- Reset table stuck (`occupied` → `available`)
- Clear `tableId` pada order split/merged yang masih mengikat table

---

## 3. Fix Existing Split Orders

```bash
NODE_ENV=production node scripts/fix-split-completedAt.js
```

Mengisi `completedAt` pada order yang sudah status `split` tapi `completedAt` masih null (data lama sebelum fix).

---

## 4. Migrate Product Extras (Per Tenant)

Pindahkan extras dari JSONB `productDetails.extras` ke tabel `ProductExtras` agar bisa di-edit/delete secara individual.

### Via API (Recommended)

Login sebagai admin tenant, lalu panggil:

```bash
# Migrate semua produk sekaligus untuk tenant yang sedang login
# (productId di URL bisa pakai ID produk apapun, endpoint memproses SEMUA produk tenant)
POST /api/v1/restaurant/products/<any-product-uuid>/extras/migrate-all

# Atau migrate per produk
POST /api/v1/restaurant/products/<product-uuid>/extras/migrate
```

### Via Script (tanpa login)

```bash
NODE_ENV=production node -e "
require('dotenv').config({path:'.env.production'});
const http = require('http');
// Gunakan endpoint migrate-all setelah login sebagai admin tenant
"
```

### Verifikasi

Setelah migrate, cek extras sudah pindah:

```bash
# Cek via API
GET /api/v1/restaurant/products/<product-uuid>/extras
```

---

## Urutan Eksekusi

| # | Step | Command | Keterangan |
|---|------|---------|------------|
| 1 | Migrate DB | `npx sequelize-cli db:migrate` | Tambah kolom `splitFromId` |
| 2 | Cleanup | `node scripts/cleanup-old-transactions.js --execute` | Hapus data test/lama |
| 3 | Fix split | `node scripts/fix-split-completedAt.js` | Fix data split lama |
| 4 | Migrate extras | `POST /restaurant/products/:id/extras/migrate-all` | Per tenant, via API |

> **Catatan:** Semua command harus dijalankan dengan `NODE_ENV=production` atau menggunakan file `.env.production` yang sesuai.
