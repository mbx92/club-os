# Standardized Error Handling

## Overview

Backend sekarang menggunakan **standardized error codes** yang selaras dengan frontend `ERROR_MESSAGES`. Setiap error dikembalikan dengan format konsisten:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Error message in Bahasa Indonesia"
}
```

## Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "code": "TENANT_INACTIVE",
  "message": "Akun organisasi tidak aktif"
}
```

### Error with Additional Data
```json
{
  "success": false,
  "code": "MODULE_NOT_AVAILABLE",
  "message": "Modul tidak tersedia di paket langganan Anda",
  "data": {
    "requiredModule": "pos",
    "currentPlan": "Basic"
  }
}
```

### Validation Error
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Email is required, Password must be at least 8 characters",
  "errors": [
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

## Available Error Codes

### Authentication Errors
- `INVALID_CREDENTIALS` - Email atau password salah (401)
- `TENANT_INACTIVE` - Akun organisasi tidak aktif (403)
- `USER_INACTIVE` - Akun pengguna tidak aktif (403)
- `ACCOUNT_LOCKED` - Akun terkunci (423)
- `TOKEN_EXPIRED` - Token kedaluwarsa (401)
- `INVALID_TOKEN` - Token tidak valid (401)
- `NO_TOKEN` - Token tidak ditemukan (401)
- `INVALID_TOKEN_FORMAT` - Format token salah (401)
- `USER_NOT_FOUND` - User tidak ditemukan (401)

### Subscription Errors
- `SUBSCRIPTION_REQUIRED` - Langganan diperlukan (402)
- `SUBSCRIPTION_EXPIRED` - Langganan berakhir (402)
- `SUBSCRIPTION_SUSPENDED` - Langganan ditangguhkan (402)
- `TRIAL_EXPIRED` - Trial berakhir (402)

### Permission Errors
- `UNAUTHORIZED` - Tidak memiliki izin (401)
- `FORBIDDEN` - Akses ditolak (403)
- `MODULE_NOT_AVAILABLE` - Modul tidak tersedia (403)
- `FEATURE_NOT_AVAILABLE` - Fitur tidak tersedia (403)
- `LIMIT_REACHED` - Batas maksimum tercapai (403)

### Validation Errors
- `VALIDATION_ERROR` - Validasi gagal (400)
- `DUPLICATE_ENTRY` - Data duplikat (409)
- `INVALID_INPUT` - Input tidak valid (400)

### Resource Errors
- `NOT_FOUND` - Data tidak ditemukan (404)
- `ALREADY_EXISTS` - Resource sudah ada (409)
- `RESOURCE_LOCKED` - Resource terkunci (423)

### Payment Errors
- `PAYMENT_REQUIRED` - Pembayaran diperlukan (402)
- `PAYMENT_FAILED` - Pembayaran gagal (402)
- `INSUFFICIENT_BALANCE` - Saldo tidak cukup (402)

### Server Errors
- `INTERNAL_ERROR` - Kesalahan server (500)
- `SERVICE_UNAVAILABLE` - Layanan tidak tersedia (503)
- `MAINTENANCE` - Sistem maintenance (503)
- `NETWORK_ERROR` - Kesalahan jaringan (500)
- `TIMEOUT` - Request timeout (408)

## Usage in Controllers

### Using createError Utility

```javascript
const { createError } = require('../utils/errorCodes');

async function myController(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      throw createError('NOT_FOUND');
    }
    
    if (user.isLocked) {
      throw createError('ACCOUNT_LOCKED');
    }
    
    // With custom message
    throw createError('VALIDATION_ERROR', 'Email format tidak valid');
    
    // With additional data
    throw createError('MODULE_NOT_AVAILABLE', null, {
      requiredModule: 'pos',
      currentPlan: 'Basic'
    });
    
    res.json(user);
  } catch (err) {
    next(err); // Pass to error handler middleware
  }
}
```

### Direct Response (Not Recommended)

```javascript
// ❌ Don't do this (inconsistent)
return res.status(403).json({
  message: 'Access denied'
});

// ✅ Do this instead
throw createError('FORBIDDEN');
```

## Frontend Integration

Frontend sudah memiliki `ERROR_MESSAGES` object yang map ke error codes ini:

```javascript
// Frontend akan otomatis handle
const response = await api.post('/login', credentials);

// Jika error terjadi, frontend akan display:
// Title: "Akun Tidak Aktif"
// Message: "Akun organisasi Anda tidak aktif..."
// Type: "error"
```

## Middleware Usage

### Authentication Middleware
```javascript
// Automatically uses standardized errors
router.get('/protected', authenticate, controller);

// Possible errors:
// - NO_TOKEN
// - INVALID_TOKEN_FORMAT
// - TOKEN_EXPIRED
// - USER_NOT_FOUND
// - TENANT_INACTIVE
```

### Feature Gate Middleware
```javascript
// Automatically uses standardized errors
router.get('/pos/products', 
  authenticate,
  requireModule('pos'),  // Throws MODULE_NOT_AVAILABLE
  controller
);
```

## Error Handler Middleware

Error handler middleware (`src/middlewares/errorHandler.js`) otomatis:
1. ✅ Menangkap semua errors
2. ✅ Format response sesuai standard
3. ✅ Handle Sequelize errors (validation, unique constraint, etc.)
4. ✅ Handle JWT errors (expired, invalid)
5. ✅ Log errors untuk monitoring
6. ✅ Add stack trace di development mode

## Best Practices

1. **Always use `createError()`** untuk consistency
2. **Always use `next(err)`** untuk pass error ke middleware
3. **Never use `res.status().json()`** untuk error responses
4. **Use appropriate error codes** sesuai konteks
5. **Add custom message** jika diperlukan
6. **Add data object** untuk informasi tambahan

## Testing Error Responses

```bash
# Test invalid credentials
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrong"}'

# Response:
{
  "success": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Email atau password salah"
}

# Test inactive tenant
# (Login with user from inactive tenant)
{
  "success": false,
  "code": "TENANT_INACTIVE",
  "message": "Akun organisasi tidak aktif"
}

# Test module not available
curl -X GET http://localhost:8000/api/v1/modules/pos/products \
  -H "Authorization: Bearer <token_basic_plan>"

# Response:
{
  "success": false,
  "code": "MODULE_NOT_AVAILABLE",
  "message": "Modul tidak tersedia di paket langganan Anda",
  "data": {
    "requiredModule": "pos",
    "currentPlan": "Basic"
  }
}
```

## Migration dari Old Code

Ubah kode lama yang menggunakan direct response:

```javascript
// ❌ Old Way
if (!user) {
  return res.status(404).json({
    message: 'User not found'
  });
}

// ✅ New Way
if (!user) {
  throw createError('NOT_FOUND');
}
```

```javascript
// ❌ Old Way
if (!subscription) {
  return res.status(402).json({
    success: false,
    message: 'Subscription required',
    code: 'SUBSCRIPTION_REQUIRED'
  });
}

// ✅ New Way
if (!subscription) {
  throw createError('SUBSCRIPTION_REQUIRED');
}
```
