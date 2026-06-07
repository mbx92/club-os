# Operator PIN Login System

## Konsep

Sistem dua lapis autentikasi untuk perangkat kasir/POS bersama:

1. **System Login** — JWT standar (email + password). Digunakan oleh perangkat/app. Session panjang.
2. **Operator PIN Login** — Staff masuk dengan nama + PIN 4-6 digit di atas system session. Digunakan untuk otorisasi aksi sensitif.

```
┌─────────────────────────────────────────┐
│           PERANGKAT / APP               │
│                                         │
│  [System Login: email + password]       │  ← JWT token (panjang)
│  ┌─────────────────────────────────┐    │
│  │  Operator: Budi  [Ganti]        │    │  ← sesi singkat per shift/aksi
│  └─────────────────────────────────┘    │
│                                         │
│  Fitur terkunci → minta PIN operator    │
└─────────────────────────────────────────┘
```

---

## Alur Kerja

### Login Operator
```
Staff menekan [Mulai Shift / Login Operator]
    → Muncul modal: nama dropdown + input PIN
    → POST /api/v1/auth/operator/verify
    → Response: { operatorToken, name, permissions }
    → Frontend simpan operatorToken di memori (bukan localStorage)
```

### Aksi Sensitif (contoh: Void Transaksi)
```
Kasir klik [Void]
    → Jika operatorToken ada & belum expired → lanjut
    → Jika tidak ada → muncul PIN modal dulu
    → Request dikirim dengan header:  X-Operator-Token: <token>
    → Middleware requireOperatorPermission('void') validasi token
```

---

## Struktur Data

### Tabel `Operators` (terpisah dari `Users`)

Operator **bukan** user sistem — mereka hanya punya nama dan PIN, tidak bisa login ke dashboard admin.

```sql
CREATE TABLE "Operators" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId"  UUID NOT NULL REFERENCES "Tenants"(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,     -- Nama yang tampil di layar kasir
  pin         VARCHAR NOT NULL,     -- Bcrypt-hashed PIN 4-6 digit
  "isActive"  BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}',   -- { discount, void, refund, ... }
  notes       VARCHAR,              -- Jabatan, keterangan opsional
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

| Field | Type | Keterangan |
|---|---|---|
| `name` | string | Nama operator (misal: "Budi", "Kasir 1") |
| `pin` | string (bcrypt) | PIN 4-6 digit, di-hash saat disimpan |
| `isActive` | boolean | Nonaktifkan tanpa hapus data |
| `permissions` | JSONB | Map permission per operator |
| `notes` | string | Jabatan / keterangan opsional |

### `operatorPermissions` Schema

```json
{
  "discount": true,
  "void": true,
  "refund": false,
  "openShift": true,
  "closeShift": true,
  "settings": false,
  "financialReport": false
}
```

---

## Fitur yang Dikunci

| Permission Key | Deskripsi | Endpoint yang dijaga |
|---|---|---|
| `discount` | Terapkan diskon / voucher | `POST /transactions/apply-voucher` |
| `void` | Void / cancel transaksi | `PATCH /transactions/:id/cancel` |
| `refund` | Refund pembayaran | `POST /transactions/:id/refund` |
| `openShift` | Buka shift kasir | `POST /cash-register/open` |
| `closeShift` | Tutup shift kasir | `POST /cash-register/close` |
| `settings` | Akses menu settings | `*` `/settings/**` |
| `financialReport` | Laporan keuangan | `GET /reports/finance/**` |

---

## API Endpoints

### PIN Modal (semua user yang sudah login)
```
GET  /api/v1/auth/operator/list     ← daftar nama operator aktif (untuk dropdown)
POST /api/v1/auth/operator/verify   ← input PIN → dapat operatorToken
```

### Manajemen Operator (admin/owner only)
```
GET    /api/v1/auth/operator/manage         ← semua operator (termasuk nonaktif)
POST   /api/v1/auth/operator/manage         ← buat operator baru
PUT    /api/v1/auth/operator/manage/:id     ← update nama/PIN/permissions
DELETE /api/v1/auth/operator/manage/:id     ← nonaktifkan operator
```

---

## Implementasi Backend

### 1. Migration

```
migrations/YYYYMMDD-add-operator-pin-to-users.js
```

```javascript
up: async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Users', 'operatorPin', {
    type: Sequelize.STRING,
    allowNull: true
  });
  await queryInterface.addColumn('Users', 'isOperator', {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false
  });
  await queryInterface.addColumn('Users', 'operatorPermissions', {
    type: Sequelize.JSONB,
    defaultValue: {}
  });
}
```

### 2. Update User Model (`src/models/user.js`)

```javascript
operatorPin: {
  type: DataTypes.STRING,
  allowNull: true,
  set(value) {
    if (value) this.setDataValue('operatorPin', bcrypt.hashSync(value, 10));
  }
},
isOperator: {
  type: DataTypes.BOOLEAN,
  defaultValue: false,
},
operatorPermissions: {
  type: DataTypes.JSONB,
  defaultValue: {},
},
```

Instance method:
```javascript
async validatePin(pin) {
  if (!this.operatorPin) return false;
  return await bcrypt.compare(String(pin), this.operatorPin);
}
```

### 3. Operator Auth Controller (`src/controllers/auth/operatorAuthController.js`)

```javascript
// POST /auth/operator/verify
async verifyOperatorPin(req, res, next) {
  try {
    const { pin } = req.body;
    const tenantId = req.user.tenantId;

    // Cari semua operator aktif di tenant
    const operators = await User.findAll({
      where: { tenantId, isOperator: true },
      attributes: ['id', 'firstName', 'lastName', 'operatorPin', 'operatorPermissions']
    });

    // Cek PIN ke semua operator (mirip "who's logged in")
    let matchedOperator = null;
    for (const op of operators) {
      if (await op.validatePin(pin)) {
        matchedOperator = op;
        break;
      }
    }

    if (!matchedOperator) {
      return res.status(401).json({ message: 'PIN salah atau tidak dikenal' });
    }

    // Generate short-lived operator token (8 jam)
    const operatorToken = generateOperatorToken({
      operatorId: matchedOperator.id,
      tenantId,
      permissions: matchedOperator.operatorPermissions
    });

    res.json({
      success: true,
      operatorToken,
      operator: {
        id: matchedOperator.id,
        name: `${matchedOperator.firstName} ${matchedOperator.lastName}`.trim(),
        permissions: matchedOperator.operatorPermissions
      }
    });
  } catch (err) {
    next(err);
  }
}
```

### 4. Middleware (`src/middlewares/operatorPinMiddleware.js`)

```javascript
const requireOperatorPermission = (permission) => async (req, res, next) => {
  const token = req.headers['x-operator-token'];

  if (!token) {
    return res.status(403).json({
      message: 'Aksi ini memerlukan otorisasi operator',
      requireOperatorPin: true,
      permission
    });
  }

  try {
    const payload = verifyOperatorToken(token);
    
    if (payload.tenantId !== req.user.tenantId) {
      return res.status(403).json({ message: 'Operator token tidak valid untuk tenant ini' });
    }

    if (permission && !payload.permissions?.[permission]) {
      return res.status(403).json({
        message: `Operator tidak memiliki izin: ${permission}`,
        requireOperatorPin: true,
        permission
      });
    }

    req.operator = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Operator token tidak valid atau kadaluarsa',
      requireOperatorPin: true,
      permission
    });
  }
};
```

### 5. Contoh Penggunaan di Route

```javascript
const { requireOperatorPermission } = require('../../middlewares/operatorPinMiddleware');

// Void transaksi butuh permission 'void'
router.patch('/:id/cancel',
  authenticate,
  requireOperatorPermission('void'),
  transactionController.cancelTransaction
);

// Apply diskon butuh permission 'discount'
router.post('/apply-voucher',
  authenticate,
  requireOperatorPermission('discount'),
  transactionController.applyVoucher
);
```

---

## Token Operator

Operator token adalah **JWT terpisah** dengan secret berbeda:

```javascript
// src/utils/jwt.js (tambahan)
const OPERATOR_SECRET = process.env.OPERATOR_JWT_SECRET || process.env.JWT_SECRET + '_operator';

function generateOperatorToken(payload) {
  return jwt.sign(payload, OPERATOR_SECRET, { expiresIn: '8h' });
}

function verifyOperatorToken(token) {
  return jwt.verify(token, OPERATOR_SECRET);
}
```

---

## Frontend Flow

### Response 403 dengan `requireOperatorPin: true`
Frontend intercept response ini dan tampilkan PIN modal:

```
HTTP 403 {
  "requireOperatorPin": true,
  "permission": "void"
}
→ Tampilkan modal: [Masukkan PIN Operator]
→ User input PIN
→ POST /auth/operator/verify → dapat operatorToken
→ Retry request original dengan header X-Operator-Token
```

### Penyimpanan operatorToken
- Simpan di **memori (state/store)** — bukan localStorage atau cookie
- Auto-expire setelah 8 jam, atau saat browser/tab ditutup
- Tersedia di seluruh app untuk request berikutnya

---

## TODO Implementasi

- [x] Migration: tabel `Operators` baru (`20260224000002-create-operators-table.js`)
- [x] Buat `src/models/operator.js` dengan `validatePin()` method
- [x] Buat `src/utils/jwt.js` — export `generateOperatorToken`, `verifyOperatorToken`
- [x] Buat `src/controllers/core/auth/operatorAuthController.js`
- [x] Buat `src/middlewares/operatorPinMiddleware.js`
- [x] Buat `src/routes/core/auth/operator.routes.js`
- [x] Pasang `/operator` sub-route di `auth.routes.js`
- [ ] Pasang `requireOperatorPermission` ke endpoint sensitif (void, diskon, shift, dll)
- [ ] Tambah `OPERATOR_JWT_SECRET` ke `.env.production`
- [ ] Test: create operator, verify PIN, expired token, wrong permission
