# Toast Notification System

## Global Functions

Toast notifications tersedia secara global di seluruh aplikasi.

### Usage in Composition API

```javascript
import { showSuccess, showError, showWarning, showInfo, showHttpError } from '@/plugins/utils'

// Success notification
showSuccess('Data berhasil disimpan!')

// Error notification
showError('Gagal menyimpan data')

// Warning notification
showWarning('Perhatian: Data akan dihapus')

// Info notification
showInfo('Informasi penting')

// HTTP Error (auto-detect from axios error)
try {
  await api.post('/endpoint', data)
} catch (error) {
  showHttpError(error) // Will show appropriate message based on HTTP status
  // or with custom message
  showHttpError(error, 'Gagal mengirim data')
}
```

### Usage in Options API

```javascript
export default {
  methods: {
    async saveData() {
      try {
        await this.$api.post('/endpoint', this.data)
        this.showSuccess('Data berhasil disimpan!')
      } catch (error) {
        this.showHttpError(error)
      }
    }
  }
}
```

### Usage with Custom Duration

```javascript
// Default durations:
// success: 3000ms
// error: 5000ms
// warning: 4000ms
// info: 3000ms

// Custom duration
showSuccess('Pesan ini tampil 10 detik', 10000)
showError('Error message', 7000)
```

## HTTP Error Messages

`showHttpError()` akan otomatis menampilkan pesan berdasarkan HTTP status code:

- **400** - Bad Request: Data yang dikirim tidak valid
- **401** - Unauthorized: Anda perlu login terlebih dahulu
- **403** - Forbidden: Anda tidak memiliki akses
- **404** - Not Found: Data tidak ditemukan
- **422** - Validation Error: Data tidak valid
- **500** - Server Error: Terjadi kesalahan pada server
- **503** - Service Unavailable: Server sedang maintenance

Jika response dari server memiliki field `message` atau `error`, akan ditampilkan sebagai gantinya.

## Toast Types

- **success** - Background hijau, icon check
- **error** - Background merah, icon alert circle
- **warning** - Background kuning, icon alert triangle
- **info** - Background biru, icon info circle

## Features

- Auto dismiss setelah duration tertentu
- Manual dismiss dengan tombol close
- Smooth animation (slide in/out)
- Stacking multiple notifications
- Position: top-right corner
- Responsive design
