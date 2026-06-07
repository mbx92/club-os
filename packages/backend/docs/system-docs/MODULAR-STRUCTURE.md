# Struktur Modular - Controllers & Routes

Struktur controllers dan routes telah diorganisir berdasarkan modul bisnis untuk memudahkan maintenance dan scalability.

## Struktur Direktori

```
src/
├── controllers/
│   ├── auth/               # Authentication module
│   │   ├── authController.js
│   │   └── index.js
│   ├── user/               # User management module
│   │   ├── userController.js
│   │   └── index.js
│   ├── tenant/             # Tenant management module
│   │   ├── tenantController.js
│   │   └── index.js
│   ├── system/             # System administration module
│   │   ├── permissionController.js
│   │   ├── featureSyncController.js
│   │   └── index.js
│   ├── subscription/       # Subscription & billing module
│   │   ├── subscriptionController.js
│   │   ├── paymentController.js
│   │   ├── membershipPaymentController.js
│   │   └── index.js
│   ├── transaction/        # Transaction module
│   │   ├── transactionController.js
│   │   └── index.js
│   ├── voucher/            # Voucher module
│   │   ├── voucherController.js
│   │   └── index.js
│   └── gym/                # Gym features module (future)
│       └── index.js
│
└── routes/
    ├── auth/               # Authentication routes
    │   ├── auth.routes.js
    │   └── index.js
    ├── user/               # User routes
    │   ├── user.routes.js
    │   └── index.js
    ├── tenant/             # Tenant routes
    │   ├── tenant.routes.js
    │   └── index.js
    ├── system/             # System routes
    │   ├── permission.routes.js
    │   ├── feature-sync.routes.js
    │   └── index.js
    ├── subscription/       # Subscription routes
    │   ├── billing.routes.js
    │   ├── membership-payment.routes.js
    │   └── index.js
    ├── transaction/        # Transaction routes
    │   ├── transaction.routes.js
    │   └── index.js
    ├── voucher/            # Voucher routes
    │   ├── voucher.routes.js
    │   └── index.js
    ├── gym/                # Gym features routes
    │   ├── pos.routes.js
    │   ├── restaurant.routes.js
    │   └── index.js
    ├── metricsRoutes.js
    └── index.js
```

## Modul-Modul Utama

### 1. **Auth Module** (`controllers/auth`, `routes/auth`)
Mengelola autentikasi dan otorisasi:
- User registration
- Login/Logout
- Refresh token
- User profile

### 2. **User Module** (`controllers/user`, `routes/user`)
Manajemen pengguna:
- CRUD operations untuk user
- User list dengan filtering
- Role assignment

### 3. **Tenant Module** (`controllers/tenant`, `routes/tenant`)
Manajemen tenant (multi-tenancy):
- CRUD operations untuk tenant
- Tenant settings & preferences
- Theme configuration

### 4. **System Module** (`controllers/system`, `routes/system`)
Administrasi sistem:
- Permission management
- Role management
- Feature synchronization
- Routes metadata

### 5. **Subscription Module** (`controllers/subscription`, `routes/subscription`)
Billing dan subscription:
- Subscription plans management
- Subscription lifecycle
- Invoice management
- Payment processing
- Membership payments

### 6. **Transaction Module** (`controllers/transaction`, `routes/transaction`)
Transaksi bisnis:
- Transaction CRUD
- Transaction statistics
- Feature-gated transactions (combined billing, installments, refunds, split payment)

### 7. **Voucher Module** (`controllers/voucher`, `routes/voucher`)
Manajemen voucher dan promo:
- Voucher CRUD
- Voucher validation
- Usage tracking
- Statistics

### 8. **Gym Module** (`controllers/gym`, `routes/gym`)
Fitur-fitur gym (POS, Restaurant, dll):
- POS system (placeholder - Fase 2)
- Restaurant management (placeholder - Fase 2)
- Future gym-specific features

## Cara Menggunakan

### Menambah Controller Baru

1. Buat file controller di folder modul yang sesuai:
```javascript
// src/controllers/gym/memberController.js
const { Member } = require('../../models');

exports.getMembers = async (req, res) => {
  // implementation
};
```

2. Export dari index.js modul:
```javascript
// src/controllers/gym/index.js
const memberController = require('./memberController');

module.exports = {
  posRoutes,
  restaurantRoutes,
  memberController  // tambahkan export baru
};
```

### Menambah Route Baru

1. Buat file route di folder modul yang sesuai:
```javascript
// src/routes/gym/member.routes.js
const express = require('express');
const router = express.Router();
const memberController = require('../../controllers/gym/memberController');
const { authenticate } = require('../../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', memberController.getMembers);
router.post('/', memberController.createMember);

module.exports = router;
```

2. Export dari index.js modul:
```javascript
// src/routes/gym/index.js
const posRoutes = require('./pos.routes');
const restaurantRoutes = require('./restaurant.routes');
const memberRoutes = require('./member.routes');

module.exports = {
  posRoutes,
  restaurantRoutes,
  memberRoutes  // tambahkan export baru
};
```

3. Daftarkan di routes/index.js:
```javascript
// src/routes/index.js
const { posRoutes, restaurantRoutes, memberRoutes } = require('./gym');

// ...
router.use('/modules/gym/members', memberRoutes);
```

## Import Paths

Karena struktur nested, path import harus disesuaikan:

```javascript
// Di controller (depth 2: controllers/module/file.js)
const { Model } = require('../../models');
const service = require('../../services/someService');
const logger = require('../../utils/logger');

// Di route (depth 2: routes/module/file.js)
const controller = require('../../controllers/module/someController');
const middleware = require('../../middlewares/someMiddleware');
```

## Keuntungan Struktur Ini

1. **Modular**: Setiap modul bisnis terpisah dan independen
2. **Scalable**: Mudah menambah fitur baru tanpa mengganggu yang lama
3. **Maintainable**: Mudah menemukan dan memperbaiki kode
4. **Clear Dependencies**: Import path yang jelas menunjukkan hubungan antar modul
5. **Future-proof**: Struktur siap untuk penambahan modul gym, POS, restaurant, dll

## Migration dari Struktur Lama

Semua file telah dipindahkan ke struktur baru dengan perubahan:

1. Controllers: `src/controllers/XController.js` → `src/controllers/module/XController.js`
2. Routes: `src/routes/XRoutes.js` → `src/routes/module/X.routes.js`
3. Import paths: `../models` → `../../models`
4. Export: Individual exports → Index-based exports

Struktur lama sudah tidak digunakan dan file-file lama telah dihapus.
