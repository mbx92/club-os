# Dynamic Error Handling System

Sistem error handling yang dinamis dan scalable untuk menangani berbagai error code dari backend.

## File Structure

```
src/
├── utils/
│   ├── errors.js              # Error classes
│   └── errorMessages.js       # Error message mapping
└── composables/
    ├── useNotification.js     # Toast notifications
    └── useErrorHandler.js     # Error handling composable
```

## 1. Error Messages Mapping (`errorMessages.js`)

File ini berisi mapping error code ke konfigurasi error (title, message, type).

### Menambah Error Code Baru

```javascript
export const ERROR_MESSAGES = {
  YOUR_ERROR_CODE: {
    title: 'Title Error',
    message: 'Pesan error yang akan ditampilkan',
    type: 'error' // 'error', 'warning', 'info'
  }
}
```

### Contoh Error Codes yang Sudah Ada

- **Authentication**: `INVALID_CREDENTIALS`, `TENANT_INACTIVE`, `USER_INACTIVE`, `ACCOUNT_LOCKED`
- **Subscription**: `SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_EXPIRED`, `TRIAL_EXPIRED`
- **Permission**: `UNAUTHORIZED`, `FORBIDDEN`, `MODULE_NOT_AVAILABLE`, `FEATURE_NOT_AVAILABLE`
- **Validation**: `VALIDATION_ERROR`, `DUPLICATE_ENTRY`, `INVALID_INPUT`
- **Resource**: `NOT_FOUND`, `ALREADY_EXISTS`, `RESOURCE_LOCKED`
- **Payment**: `PAYMENT_REQUIRED`, `PAYMENT_FAILED`, `INSUFFICIENT_BALANCE`
- **Server**: `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `MAINTENANCE`

## 2. Using Error Handler Composable

### Basic Usage

```vue
<script setup>
import { useErrorHandler } from '@/composables/useErrorHandler'

const { errorTitle, errorMessage, errorType, handleError, clearError } = useErrorHandler()

const doSomething = async () => {
  try {
    await someApiCall()
  } catch (error) {
    handleError(error)
  }
}
</script>

<template>
  <div v-if="errorMessage" class="alert" :class="`alert-${errorType}`">
    <h4>{{ errorTitle }}</h4>
    <p>{{ errorMessage }}</p>
    <button @click="clearError">Close</button>
  </div>
</template>
```

### With Custom Fallback

```javascript
const doSomething = async () => {
  try {
    await someApiCall()
  } catch (error) {
    handleError(error, 'Terjadi kesalahan saat memproses permintaan')
  }
}
```

## 3. Using parseErrorConfig in Components

```vue
<script setup>
import { useNotification } from '@/composables/useNotification'

const { parseErrorConfig } = useNotification()

const handleSubmit = async () => {
  try {
    await api.post('/endpoint', data)
  } catch (error) {
    const errorConfig = parseErrorConfig(error)
    // errorConfig: { title, message, type }
    setError(errorConfig.title, errorConfig.message)
  }
}
</script>
```

## 4. Backend Error Response Format

Backend harus mengirim error dengan format:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Error message yang akan ditampilkan (optional)",
  "data": {}
}
```

### Contoh Response dari Backend

```json
{
  "success": false,
  "code": "TENANT_INACTIVE",
  "message": "Your organization account is not active. Please contact support."
}
```

Jika `message` tidak disediakan, sistem akan menggunakan default message dari `errorMessages.js`.

## 5. API Plugin Integration

API plugin sudah terintegrasi untuk throw error dengan code:

```javascript
// api.js
onResponseError: async ({ response }) => {
  const data = response._data
  
  // Error akan di-throw dengan code dan message
  if (data?.code === 'TENANT_INACTIVE') {
    throw new TenantInactiveError(data)
  }
  
  // Generic error handling
  throw new AppError({
    code: data?.code,
    message: data?.message,
    statusCode: response.status
  })
}
```

## 6. Auth Store Integration

Auth store mengembalikan error dengan code:

```javascript
const login = async (credentials) => {
  try {
    // ... login logic
  } catch (error) {
    return {
      success: false,
      code: error.code || 'LOGIN_FAILED',
      message: error.message,
      error: error.message
    }
  }
}
```

## 7. Adding New Error Types

### Step 1: Add to errorMessages.js

```javascript
export const ERROR_MESSAGES = {
  // ... existing errors
  
  NEW_ERROR_CODE: {
    title: 'Error Title',
    message: 'Error message that will be shown to user',
    type: 'error' // or 'warning', 'info'
  }
}
```

### Step 2: Backend sends error with code

```javascript
// Backend response
{
  "success": false,
  "code": "NEW_ERROR_CODE",
  "message": "Optional custom message" // Will override default
}
```

### Step 3: Frontend automatically handles it

No code changes needed! The system will automatically:
1. Extract error code
2. Look up configuration in errorMessages.js
3. Display appropriate title and message
4. Apply correct styling (error/warning/info)

## 8. Benefits

✅ **Centralized**: Semua error messages di satu tempat  
✅ **Dynamic**: Tidak perlu if/else untuk setiap error code  
✅ **Scalable**: Mudah menambah error code baru  
✅ **Maintainable**: Mudah update message tanpa ubah logic  
✅ **Internationalization Ready**: Mudah ditranslate ke bahasa lain  
✅ **Type Safe**: Support untuk error types (error/warning/info)  
✅ **Fallback**: Tetap menampilkan error meski code tidak dikenal

## 9. Example: Login with Multiple Error Types

```vue
<script setup>
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth'

const { parseErrorConfig } = useNotification()
const authStore = useAuthStore()

const handleLogin = async () => {
  try {
    const result = await authStore.login(credentials)
    
    if (!result.success) {
      // Automatically handles:
      // - TENANT_INACTIVE
      // - USER_INACTIVE
      // - ACCOUNT_LOCKED
      // - INVALID_CREDENTIALS
      // - And any future error codes!
      const errorConfig = parseErrorConfig(result)
      setError(errorConfig.title, errorConfig.message)
    }
  } catch (error) {
    const errorConfig = parseErrorConfig(error)
    setError(errorConfig.title, errorConfig.message)
  }
}
</script>
```

Sekarang setiap kali backend mengirim error code baru, Anda hanya perlu:
1. Tambahkan ke `ERROR_MESSAGES` di `errorMessages.js`
2. Done! Frontend otomatis handle error tersebut ✅
