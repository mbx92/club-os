# Panduan Validasi Subscription untuk Pembuatan User

## Ringkasan

Tenant harus memiliki **subscription aktif atau trial** untuk membuat user baru, **KECUALI** untuk admin pertama yang dibuat oleh SuperAdmin.

## Aturan Bisnis

### ✅ Boleh Membuat User Jika:
1. **Tenant sedang trial** (trial belum expired)
2. **Tenant punya subscription aktif** (status: active, dalam periode valid)
3. **SuperAdmin buat admin pertama** (user pertama untuk tenant baru)

### ❌ Tidak Boleh Membuat User Jika:
1. Tenant tidak punya subscription
2. Trial sudah expired
3. Subscription sudah expired atau inactive
4. Bukan user pertama (admin) oleh SuperAdmin

## Exception: Admin Pertama oleh SuperAdmin

SuperAdmin **TETAP BOLEH** membuat 1 admin pertama untuk tenant meskipun **BELUM ada subscription**.

### Syarat Exception:
1. ✅ Yang membuat adalah **SuperAdmin** (`isSuperAdmin: true`)
2. ✅ Role yang dibuat adalah **"admin"**
3. ✅ Tenant **belum punya user sama sekali** (count = 0)

Jika ketiga syarat terpenuhi → **ALLOWED tanpa cek subscription**

## Flow Validasi

```
┌─────────────────────────┐
│  Request Buat User      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Apakah SuperAdmin buat admin       │
│  pertama untuk tenant ini?          │
└────────┬────────────────────────────┘
         │
    ┌────┴─────┐
    │          │
   YA         TIDAK
    │          │
    ▼          ▼
┌────────┐  ┌──────────────────────┐
│ BOLEH  │  │ Cek: Tenant punya    │
│ SKIP   │  │ trial/subscription?  │
└────────┘  └─────────┬────────────┘
                      │
               ┌──────┴──────┐
               │             │
              YA            TIDAK
               │             │
               ▼             ▼
          ┌────────┐    ┌──────────┐
          │ BOLEH  │    │  TOLAK   │
          │ BUAT   │    │  403     │
          └────────┘    └──────────┘
```

## Contoh Skenario

### Skenario 1: SuperAdmin Buat Admin Pertama ✅
```json
// Request
POST /api/v1/users
Authorization: Bearer {superadmin_token}

{
  "email": "admin@newgym.com",
  "password": "password123",
  "roleId": "{admin_role_id}",
  "tenantId": "{tenant_baru_id}"
}

// Response: 201 Created ✅
// Meskipun tenant belum punya subscription
```

### Skenario 2: Admin Buat User Kedua (Tanpa Subscription) ❌
```json
// Request
POST /api/v1/users
Authorization: Bearer {admin_token}

{
  "email": "user2@gym.com",
  "password": "password123",
  "roleId": "{user_role_id}"
}

// Response: 403 Forbidden ❌
{
  "message": "Access denied. Tenant must have an active subscription or trial to create users.",
  "code": "NO_ACTIVE_SUBSCRIPTION",
  "details": "Please activate a subscription plan to add more users to your organization."
}
```

### Skenario 3: Admin Buat User (Dengan Trial Aktif) ✅
```json
// Tenant: isOnTrial=true, trialEndDate=2025-12-31
// Request
POST /api/v1/users
Authorization: Bearer {admin_token}

{
  "email": "staff@gym.com",
  "password": "password123",
  "roleId": "{user_role_id}"
}

// Response: 201 Created ✅
// Trial masih aktif
```

### Skenario 4: Admin Buat User (Dengan Subscription) ✅
```json
// Tenant punya subscription status='active'
// Request
POST /api/v1/users
Authorization: Bearer {admin_token}

{
  "email": "manager@gym.com",
  "password": "password123",
  "roleId": "{manager_role_id}"
}

// Response: 201 Created ✅
// Subscription aktif
```

## Tabel Keputusan

| Creator | Role Target | Jumlah User | Trial/Sub | Hasil |
|---------|-------------|-------------|-----------|-------|
| SuperAdmin | admin | 0 | ❌ Tidak ada | ✅ **BOLEH** |
| SuperAdmin | admin | 1+ | ❌ Tidak ada | ❌ TOLAK |
| SuperAdmin | user | Berapapun | ❌ Tidak ada | ❌ TOLAK |
| Admin | Apapun | Berapapun | ✅ Trial aktif | ✅ **BOLEH** |
| Admin | Apapun | Berapapun | ✅ Sub aktif | ✅ **BOLEH** |
| Admin | Apapun | Berapapun | ❌ Tidak ada | ❌ TOLAK |
| Manager | Apapun | Berapapun | ❌ Tidak ada | ❌ TOLAK |

## Error Code

### `NO_ACTIVE_SUBSCRIPTION` (403)

**Penyebab:**
- Tenant tidak punya subscription
- Trial sudah expired
- Subscription sudah expired

**Solusi:**
1. Aktifkan subscription plan
2. Perpanjang subscription jika expired
3. Cek status trial: `GET /api/v1/subscription/current`

## Integrasi dengan Fitur Lain

### 1. Auto-Admin Creation
Ketika SuperAdmin buat tenant baru:
```
1. Tenant dibuat (tanpa subscription) ✅
2. Admin auto-generated (exception berlaku) ✅
3. User tambahan? Butuh subscription! ⚠️
```

### 2. Trial Period
```
- Trial aktif → Boleh buat user ✅
- Trial expired → Butuh subscription ⚠️
```

### 3. Subscription Management
```
- Subscribe → Langsung bisa buat user ✅
- Unsubscribe → Tidak bisa buat user lagi ❌
```

## Implementasi Teknis

**File:** `src/controllers/user/userController.js`  
**Function:** `createUser()`

### Logic Kunci:
```javascript
// Cek exception
const isFirstAdminBySuper = 
  isSuperAdminCreating && 
  isCreatingAdmin && 
  existingUserCount === 0;

if (!isFirstAdminBySuper) {
  // Validasi subscription/trial
  if (!tenant.hasActiveTrial && !tenant.hasActiveSubscription) {
    return res.status(403).json({
      code: 'NO_ACTIVE_SUBSCRIPTION'
    });
  }
}
```

## Testing Checklist

- [ ] SuperAdmin buat admin pertama tanpa subscription → ✅ Sukses
- [ ] SuperAdmin buat user kedua tanpa subscription → ❌ Ditolak
- [ ] Admin buat user dengan trial aktif → ✅ Sukses
- [ ] Admin buat user dengan subscription aktif → ✅ Sukses
- [ ] Admin buat user tanpa trial/subscription → ❌ Ditolak
- [ ] Admin buat user setelah trial expired → ❌ Ditolak

## Best Practice

### Untuk SuperAdmin:
1. ✅ Buat admin pertama saat setup tenant baru
2. ✅ Instruksikan tenant untuk aktivasi subscription
3. ✅ Monitor status subscription semua tenant

### Untuk Tenant Admin:
1. ✅ Pastikan subscription aktif sebelum tambah user
2. ✅ Monitor tanggal expiry trial
3. ✅ Upgrade plan jika perlu tambah user lebih banyak

### Untuk Developer:
1. ✅ Handle error `NO_ACTIVE_SUBSCRIPTION` dengan baik
2. ✅ Tampilkan pesan error yang jelas ke user
3. ✅ Berikan link ke halaman subscription management

## Troubleshooting

### Error: "NO_ACTIVE_SUBSCRIPTION"

**Cek:**
1. Status trial: `tenant.isOnTrial` dan `tenant.trialEndDate`
2. Subscription aktif: `GET /api/v1/subscription/current`
3. Jumlah user existing: `User.count({ where: { tenantId } })`

**Solusi:**
1. Aktifkan subscription via billing
2. Extend trial period (SuperAdmin)
3. Contact support

### Tidak Bisa Buat User Sama Sekali

**Cek:**
1. Apakah ini user pertama? (count = 0)
2. Apakah role = admin?
3. Apakah creator = SuperAdmin?
4. Apakah tenantId benar?

**Debug:**
```bash
# Cek jumlah user
SELECT COUNT(*) FROM "Users" WHERE "tenantId" = '{id}';

# Cek subscription
SELECT * FROM "Subscriptions" 
WHERE "tenantId" = '{id}' AND status = 'active';

# Cek trial
SELECT "isOnTrial", "trialEndDate" FROM "Tenants" WHERE id = '{id}';
```

## Files yang Dimodifikasi

1. **`src/controllers/user/userController.js`**
   - Tambah import Subscription, SubscriptionPlan
   - Tambah validasi subscription di `createUser()`
   - Tambah exception untuk first admin by SuperAdmin

2. **`docs/USER-CREATION-SUBSCRIPTION-VALIDATION.md`** (BARU)
   - Dokumentasi lengkap dalam English

3. **`docs/USER-CREATION-SUBSCRIPTION-VALIDATION-ID.md`** (BARU)
   - Quick reference dalam Bahasa Indonesia

## Related Docs

- [AUTO-ADMIN-CREATION-ID.md](./AUTO-ADMIN-CREATION-ID.md) - Auto-generate admin
- [SAAS-APPLICATION-FLOW.md](./SAAS-APPLICATION-FLOW.md) - Flow aplikasi SaaS
- [SUBSCRIPTION-FEATURE-STATUS.md](./SUBSCRIPTION-FEATURE-STATUS.md) - Status fitur subscription

## Status

✅ **IMPLEMENTED**  
📅 **Tanggal:** 23 November 2025  
🔧 **Version:** 1.0.0  
🚀 **Status:** Production Ready

---

**Catatan Penting:**  
Fitur ini memastikan bahwa hanya tenant dengan subscription/trial aktif yang bisa menambah user, sambil tetap memberikan fleksibilitas kepada SuperAdmin untuk setup tenant baru.
