# Composables Structure

Struktur composables telah diorganisir berdasarkan fitur untuk mempermudah maintenance dan navigasi kode.

## 📁 Struktur Folder

### `core/`
Composables fundamental untuk fungsionalitas inti aplikasi:
- `useApi.js` - HTTP client dan dialog utilities
- `useAuth.js` - Autentikasi dan manajemen sesi
- `useErrorHandler.js` - Error handling terpusat
- `useNotification.js` - Toast notifications
- `useNavigation.js` - Navigasi dan routing helpers
- `useTheme.js` - Theme management

### `gym/`
Composables untuk manajemen operasional gym:
- `member-management/` - Manajemen data member
- `trainer-management/` - Manajemen data trainer/instruktur  
- `voucher-management/` - Manajemen voucher dan promo

### `subscription/`
Composables untuk billing, subscription, dan feature gating:
- `useSubscriptions.js` - Manajemen subscription tenant
- `useSubscriptionMonitor.js` - Monitor status subscription
- `useSubscriptionPlans.js` - Manajemen plan subscription
- `useInvoices.js` - Manajemen invoice
- `usePayments.js` - Manajemen pembayaran
- `useCurrency.js` - Konversi mata uang
- `useFeatureGate.js` - Feature gating logic
- `useFeatureAccess.js` - Feature access control
- `useFeatureMetadata.js` - Feature metadata management

### `admin/`
Composables untuk administrasi sistem:
- `useTenants.js` - Manajemen tenant
- `useTenantSettings.js` - Settings per tenant
- `useUsers.js` - Manajemen user
- `useRolesPermissions.js` - Role & permission management
- `useAuditLog.js` - Audit logging

## 🔄 Import Usage

Setiap folder memiliki `index.js` untuk re-export, sehingga Anda bisa import dengan dua cara:

```javascript
// Langsung dari file
import { useApi } from '@/composables/core/useApi'

// Atau dari index (jika tersedia)
import { useApi, useAuth, useNotification } from '@/composables/core'
```

## 📝 Best Practices

1. **Single Responsibility**: Setiap composable fokus pada satu domain/fitur
2. **Cross-folder Dependencies**: Core composables bisa digunakan oleh folder lain
3. **Naming Convention**: Gunakan prefix `use` untuk semua composables
4. **Index Exports**: Update `index.js` ketika menambah composable baru
