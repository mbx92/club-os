# Plan: Cashier In-Charge pada Opening Shift

## Latar Belakang

Saat ini, transaksi (`Transaction.createdBy`) selalu menggunakan `req.user.id` — yaitu user yang sedang login dan membuat order. Tidak ada konsep "kasir yang bertanggung jawab selama shift".

**Kebutuhan:** Saat opening cashier, bisa pilih kasir yang in-charge. Nama kasir ini akan muncul di semua transaksi selama shift tersebut, menggantikan `createdBy` dari user yang login.

---

## Perubahan yang Diperlukan

### 1. Database (Model + Migration)

**CashRegisterSession** — tambah kolom:

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `cashierUserId` | UUID, nullable, FK → Users | User yang dipilih sebagai kasir in-charge |

```sql
ALTER TABLE "CashRegisterSessions" ADD COLUMN "cashierUserId" UUID REFERENCES "Users"("id");
```

**Transaction** — tambah kolom:

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `cashierId` | UUID, nullable, FK → Users | Kasir in-charge saat transaksi dibuat |

```sql
ALTER TABLE "Transactions" ADD COLUMN "cashierId" UUID REFERENCES "Users"("id");
```

> `createdBy` tetap dipertahankan sebagai audit trail (siapa yang benar-benar menekan tombol). `cashierId` adalah kasir yang bertanggung jawab secara operasional.

---

### 2. Backend - Model Changes

**File:** `src/models/cashRegisterSession.js`
- Tambah field `cashierUserId` (UUID, nullable)
- Tambah association `belongsTo User as 'cashier'`

**File:** `src/models/transaction.js`
- Tambah field `cashierId` (UUID, nullable)
- Tambah association `belongsTo User as 'cashier'`

---

### 3. Backend - Controller Changes

**File:** `src/controllers/gym/cashRegister/cashRegisterController.js`

`openShift`:
```diff
  const {
    shiftName,
    openingBalance = 0,
    locationId = null,
    openingNotes = null,
+   cashierUserId = null,    // ID user yang dipilih sebagai kasir
  } = req.body;

  // Validasi cashierUserId jika diberikan
+ if (cashierUserId) {
+   const cashierUser = await User.findOne({ where: { id: cashierUserId, tenantId } });
+   if (!cashierUser) return res.status(404).json({ message: 'Kasir tidak ditemukan' });
+ }

  const session = await CashRegisterSession.create({
    ...
+   cashierUserId: cashierUserId || req.user.id,  // Default ke user yang buka shift
  });
```

**File:** `src/modules/restaurant/controllers/orderController.js`

`createOrder` dan `createDirectOrder`:
```diff
  // Ambil cashier dari sesi shift aktif
+ const activeSession = await CashRegisterSession.findOne({
+   where: { tenantId, status: 'open', deletedAt: null }
+ });
+ const cashierId = activeSession?.cashierUserId || req.user.id;

  const order = await Transaction.create({
    ...
    createdBy: req.user.id,      // Tetap user yang login (audit)
+   cashierId,                    // Kasir in-charge dari shift
  });
```

---

### 4. Backend - Response Changes

Semua endpoint yang return transaksi perlu include cashier:

```javascript
include: [
  { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] },
  { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName'] },
]
```

**Endpoint yang perlu diupdate:**
- `GET /restaurant/orders` (getAllOrders)
- `GET /restaurant/orders/:id` (getOrderById)
- `POST /restaurant/orders` (createOrder)
- `POST /restaurant/orders/direct` (createDirectOrder)
- `GET /gym/cash-register/:id/report` (getShiftReport)
- Receipt printing (nama kasir di struk)

---

### 5. Frontend Changes

**Opening Cashier Dialog:**
- Tambah dropdown/select untuk pilih kasir (dari daftar user tenant)
- Kirim `cashierUserId` di body POST `/gym/cash-register/open`

**Order List / Detail:**
- Tampilkan nama kasir (`cashier.firstName`) bukan `createdByUser`
- Atau tampilkan keduanya: "Kasir: Andi | Dibuat oleh: Budi"

**Receipt / Struk:**
- Ganti nama yang muncul dari `createdByUser` ke `cashier`

---

## Migration File

```javascript
// migrations/YYYYMMDD-add-cashier-to-sessions-and-transactions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CashRegisterSessions', 'cashierUserId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('Transactions', 'cashierId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Transactions', 'cashierId');
    await queryInterface.removeColumn('CashRegisterSessions', 'cashierUserId');
  }
};
```

---

## File yang Terdampak

| File | Perubahan |
|------|-----------|
| `src/models/cashRegisterSession.js` | + field `cashierUserId`, + association |
| `src/models/transaction.js` | + field `cashierId`, + association |
| `src/controllers/gym/cashRegister/cashRegisterController.js` | openShift: terima `cashierUserId` |
| `src/modules/restaurant/controllers/orderController.js` | createOrder, createDirectOrder: set `cashierId` dari session |
| `src/migrations/YYYYMMDD-xxx.js` | Migration baru |
| Frontend: Opening cashier dialog | + dropdown pilih kasir |
| Frontend: Order list/detail | Tampilkan nama kasir |
| Frontend: Receipt template | Nama kasir di struk |

---

## Estimasi Effort

| Area | Estimasi |
|------|----------|
| Backend (migration + model + controller) | ~1-2 jam |
| Frontend (dialog + display + receipt) | ~2-3 jam |
| Testing | ~1 jam |
| **Total** | **~4-6 jam** |

---

## Keputusan yang Perlu Diambil

1. **Apakah `cashierUserId` wajib diisi saat opening?** Atau boleh kosong (default ke user yang buka)?
2. **Apakah kasir bisa diganti di tengah shift?** Atau hanya saat opening?
3. **Tampilan di struk:** Tampilkan kasir saja, atau kasir + user yang input?
4. **Data lama:** Backfill `cashierId` dari `createdBy` untuk transaksi yang sudah ada, atau biarkan null?
