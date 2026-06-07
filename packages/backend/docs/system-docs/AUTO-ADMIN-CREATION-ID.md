# Panduan Cepat: Auto-Generate Admin Tenant

## Ringkasan Fitur

Ketika SuperAdmin membuat tenant baru, sistem otomatis membuat akun Admin untuk tenant tersebut dengan:
- **Email**: `admin@{domain}`
- **Password**: `password123` (konfigurasi di `.env`)

## Konfigurasi Environment (.env.development)

```env
# Password default untuk admin tenant baru
DEFAULT_ADMIN_PASSWORD=password123

# Aktifkan auto-generate password (butuh SMTP)
ENABLE_AUTO_PASSWORD_GENERATE=false

# Pengaturan kompleksitas password (untuk nanti)
PASSWORD_LENGTH=16
PASSWORD_INCLUDE_UPPERCASE=true
PASSWORD_INCLUDE_LOWERCASE=true
PASSWORD_INCLUDE_NUMBERS=true
PASSWORD_INCLUDE_SYMBOLS=true
```

## Cara Kerja

### 1. SuperAdmin Membuat Tenant

**Request:**
```http
POST /api/v1/tenants
Authorization: Bearer {superadmin_token}
Content-Type: application/json

{
  "name": "Fitness XYZ Gym",
  "domain": "gymxyz.com",
  "address": "Jl. Sudirman No. 123, Jakarta",
  "phone": "+6281234567890",
  "email": "contact@gymxyz.com"
}
```

### 2. Sistem Otomatis Membuat Admin

Sistem akan:
1. ✅ Buat tenant baru
2. ✅ Cari role "admin" di database
3. ✅ Buat user dengan:
   - Email: `admin@gymxyz.com`
   - Password: `password123`
   - Role: admin
   - Tenant: gymxyz.com

### 3. Response API

```json
{
  "tenant": {
    "id": "uuid-tenant-id",
    "name": "Fitness XYZ Gym",
    "domain": "gymxyz.com",
    ...
  },
  "admin": {
    "email": "admin@gymxyz.com",
    "password": "password123",
    "message": "Admin account created with default password. User should change password after first login."
  }
}
```

### 4. Admin Login

Admin tenant bisa langsung login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@gymxyz.com",
  "password": "password123"
}
```

## Format Email Admin

| Domain Tenant | Email Admin yang Dibuat |
|---------------|------------------------|
| `gymxyz.com` | `admin@gymxyz.com` |
| `fitnesscenter.id` | `admin@fitnesscenter.id` |
| `sportclub.net` | `admin@sportclub.net` |

## Mode Password

### Mode Saat Ini (SMTP Belum Ada)

```env
ENABLE_AUTO_PASSWORD_GENERATE=false
DEFAULT_ADMIN_PASSWORD=password123
```

- ✅ Semua admin baru pakai password: `password123`
- ⚠️ SuperAdmin harus share password ke tenant admin
- ⚠️ Admin harus ganti password setelah login pertama

### Mode Future (Ketika SMTP Sudah Ada)

```env
ENABLE_AUTO_PASSWORD_GENERATE=true
```

- ✅ Password unik & aman di-generate otomatis
- ✅ Password dikirim via email ke admin
- ✅ Tidak perlu share password manual

## Keamanan Data

### Transaction Safety
- Semua operasi dalam database transaction
- Jika gagal buat tenant → admin tidak dibuat
- Jika gagal buat admin → tenant di-rollback
- ✅ Tidak ada data orphan

### Audit Log
- Setiap pembuatan tenant di-log
- Termasuk email admin yang dibuat
- Untuk keperluan audit & tracking

## Testing

### Manual Test

1. Login sebagai SuperAdmin
2. Buat tenant baru dengan domain `testgym.com`
3. Catat email & password admin dari response
4. Logout
5. Login dengan `admin@testgym.com` dan password yang didapat
6. ✅ Berhasil login

### Run Unit Tests

```bash
npm test -- tests/utils/passwordGenerator.test.js
```

## Troubleshooting

### Error: "Admin role not found"

**Solusi:**
```bash
npm run db:dev:reset
```

### Error: "Domain is required"

**Penyebab:** Field `domain` tidak diisi

**Solusi:** Pastikan `domain` ada di request body

### Password Tidak Cocok

**Checklist:**
1. ✅ Cek `DEFAULT_ADMIN_PASSWORD` di `.env.development`
2. ✅ Pastikan pakai email: `admin@{domain}`
3. ✅ Cek apakah password sudah diganti setelah dibuat

## Files yang Dimodifikasi

1. **`.env.development`** - Tambah konfigurasi password
2. **`src/utils/passwordGenerator.js`** - Utility generate password (BARU)
3. **`src/controllers/tenant/tenantController.js`** - Logic create admin
4. **`docs/AUTO-ADMIN-CREATION.md`** - Dokumentasi lengkap (BARU)
5. **`tests/utils/passwordGenerator.test.js`** - Unit tests (BARU)

## Penggunaan Password Generator

### Contoh 1: Generate Password dengan Pengaturan Default

```javascript
const { generatePassword } = require('./src/utils/passwordGenerator');

const password = generatePassword();
console.log(password); // "aB3!dEf9@GhI2#jK"
```

### Contoh 2: Generate Password Tanpa Symbol

```javascript
const password = generatePassword({
  length: 12,
  includeSymbols: false
});
console.log(password); // "aB3dEf9GhI2j"
```

### Contoh 3: Password Hanya Angka

```javascript
const password = generatePassword({
  length: 8,
  includeUppercase: false,
  includeLowercase: false,
  includeNumbers: true,
  includeSymbols: false
});
console.log(password); // "12345678"
```

## Best Practices

### Untuk SuperAdmin:
1. ✅ Share kredensial admin ke contact person tenant dengan aman
2. ✅ Instruksikan tenant admin untuk ganti password
3. ✅ Monitor login pertama admin baru

### Untuk Tenant Admin:
1. ✅ Ganti password setelah login pertama
2. ✅ Setup profile lengkap
3. ✅ Buat user tambahan jika diperlukan

## Roadmap

### Fase 1: Saat Ini ✅
- [x] Auto-create admin dengan default password
- [x] Format email `admin@{domain}`
- [x] Password dari environment variable
- [x] Support untuk auto-generate (preparation)

### Fase 2: Ketika SMTP Ready 🔜
- [ ] Setup NodeMailer
- [ ] Buat email template
- [ ] Kirim password via email
- [ ] Aktifkan `ENABLE_AUTO_PASSWORD_GENERATE=true`
- [ ] Hapus password dari API response

### Fase 3: Enhancement 🔮
- [ ] Password reset flow
- [ ] Two-factor authentication
- [ ] Password expiry policy
- [ ] Email verification

## Kontak & Support

Untuk pertanyaan atau issue, silakan buat ticket di:
- Repository Issues
- Internal Support Channel

---

**Last Updated:** November 23, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
