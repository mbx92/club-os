# Pages Structure

Struktur pages telah diorganisir berdasarkan fitur untuk mempermudah maintenance dan navigasi.

## 📁 Struktur Folder

### `index.vue`
Dashboard utama aplikasi

### `core/`
Pages untuk fungsionalitas inti sistem:

#### `auth/`
- `login.vue` - Halaman login

#### `settings/`
- `index.vue` - Halaman pengaturan sistem

#### `errors/`
- `404.vue` - Not found page
- `403.vue` - Forbidden page
- `no-subscription.vue` - No active subscription page

#### `profile/`
- `index.vue` - User profile page

**Routes:**
- `/core/auth/login`
- `/core/settings`
- `/core/errors/404`
- `/core/errors/403`
- `/core/errors/no-subscription`
- `/core/profile`

### `gym/`
Pages untuk operasional gym:

#### `members/`
- `index.vue` - Daftar member
- `[id].vue` - Detail member

#### `instructors/`
- `index.vue` - Daftar instruktur
- `[id].vue` - Detail instruktur

#### `classes/`
- `index.vue` - Jadwal kelas
- `types.vue` - Tipe kelas

#### `memberships/`
- `index.vue` - Daftar membership aktif
- `plans.vue` - Plan membership

#### `payments/`
- `index.vue` - Daftar pembayaran

**Routes:**
- `/gym/members`, `/gym/members/:id`
- `/gym/instructors`, `/gym/instructors/:id`
- `/gym/classes`, `/gym/classes/types`
- `/gym/memberships`, `/gym/memberships/plans`
- `/gym/payments`

### `vouchers/`
Pages untuk manajemen voucher (Global - berlaku untuk semua tenant):

- `index.vue` - Daftar voucher
- `[id].vue` - Detail voucher

**Routes:**
- `/vouchers`, `/vouchers/:id`

### `subscription/`
Pages untuk manajemen subscription (Super Admin):

- `plans.vue` - Manajemen subscription plans
- `subscriptions.vue` - Manajemen subscriptions
- `tenants.vue` - Manajemen tenants
- `billing.vue` - Billing & invoices

**Routes:**
- `/subscription/plans`
- `/subscription/subscriptions`
- `/subscription/tenants`
- `/subscription/billing`

### `_test/`
Pages untuk testing & development:

- `feature-gating.vue` - Test feature gating
- `theme-test.vue` - Test theme system
- `daisy.vue` - Test DaisyUI components

**Routes:**
- `/_test/feature-gating`
- `/_test/theme-test`
- `/_test/daisy`

## 🔄 Route Generation

Routes di-generate otomatis menggunakan `unplugin-vue-router` berdasarkan struktur folder.

**Naming Convention:**
- Folder dengan huruf kapital atau special char akan jadi lowercase dengan dash
- `[id].vue` menjadi dynamic route parameter
- `index.vue` menjadi root route dari folder

**Example:**
```
pages/gym/members/[id].vue  →  /gym/members/:id
pages/core/auth/login.vue   →  /core/auth/login
```

## 📝 Best Practices

1. **Grouping**: Group related pages dalam folder yang sama
2. **Naming**: Gunakan nama yang deskriptif untuk file
3. **Dynamic Routes**: Gunakan `[param].vue` untuk dynamic routes
4. **Index Routes**: `index.vue` untuk route default folder
5. **Layout**: Semua page menggunakan layout dari `src/layouts`

## 🔗 Related Files

- **Router**: `src/router/index.js` - Router configuration & guards
- **Navigation**: `src/navigation/navigation.js` - Navigation menu
- **Layouts**: `src/layouts/` - Page layouts (default, auth, public)

## 📚 Documentation Index

### System & Infrastructure
- [Database Backup & Restore](./DATABASE-BACKUP-RESTORE.md) - **⭐ Full documentation (Backend + Frontend)**
- [Database Backup Frontend](./DATABASE-BACKUP-FRONTEND.md) - **Frontend implementation details**
- [Database Backup Visual Guide](./DATABASE-BACKUP-VISUAL-GUIDE.md) - **UI mockups & diagrams**
- [Database Backup Quick Reference](./DATABASE-BACKUP-QUICK-REF.md) - **Developer quick reference**
- [Database Backup Implementation Summary](./DATABASE-BACKUP-IMPLEMENTATION-SUMMARY.md) - **Implementation status**
- [Aggressive Subscription Protection](./AGGRESSIVE-SUBSCRIPTION-PROTECTION.md)
- [Dynamic Error Handling](./DYNAMIC-ERROR-HANDLING.md)
- [Session Logging API](./SESSION-LOGGING-API.md)
- [Theme Settings](./THEME-SETTINGS.md)
- [Theme Live Change](./THEME-LIVE-CHANGE.md)

### Access Control & Security
- [Module Access Control](./MODULE-ACCESS-CONTROL.md)
- [Module Access Implementation Summary](./MODULE-ACCESS-IMPLEMENTATION-SUMMARY.md)
- [Role Permission Management](./ROLE-PERMISSION-MANAGEMENT.md)
- [CASL Synchronization](./CASL-SYNCHRONIZATION.md)
- [Super Admin Bypass](./SUPER-ADMIN-BYPASS.md)
- [Protection Examples](./PROTECTION-EXAMPLES.md)

### Features & Modules
- [Product Extras Feature](./PRODUCT-EXTRAS-FEATURE.md)
- [Product Extras Frontend](./PRODUCT-EXTRAS-FRONTEND-IMPLEMENTATION.md)
- [Service Purchase System](./SERVICE-PURCHASE-SYSTEM.md)
- [Service Purchase Quick Ref](./SERVICE-PURCHASE-QUICK-REF.md)
- [Service Purchase API Examples](./SERVICE-PURCHASE-API-EXAMPLES.md)
- [Printer Settings Implementation](./PRINTER-SETTINGS-IMPLEMENTATION.md)
- [Psychology Settings API](./PSYCHOLOGY-SETTINGS-API.md)

### Subscription & Billing
- [Billing Subscription Frontend](./BILLING-SUBSCRIPTION-FRONTEND.md)
- [Subscription Plans Implementation](./SUBSCRIPTION-PLANS-IMPLEMENTATION.md)
- [Currency Conversion Guide](./CURRENCY_CONVERSION_GUIDE.md)
- [Currency Conversion Examples](./CURRENCY_CONVERSION_EXAMPLES.md)

### Psychology Module
- [Psikogram Analyzer Guide](./PSIKOGRAM-ANALYZER-GUIDE.md)
- [Psikogram API Specification](./PSIKOGRAM-API-SPECIFICATION.md)
- [PAPI Psikogram Mapping](./PAPI-PSIKOGRAM-MAPPING.md)
- [CFIT Test Type](./CFIT-TEST-TYPE-CORRECTED.json)
- [CFIT Norms](./cfit-norms.json)

### Developer Guides
- [Routes Metadata Guide](./ROUTES-METADATA-GUIDE.md)
- [User Management Frontend](./USER-MANAGEMENT-FRONTEND.md)
- [Settings Structure](./SETTINGS-STRUCTURE.md)
- [Toast Notifications](./TOAST-NOTIFICATIONS.md)
- [Log Management Integration](./LOG-MANAGEMENT-INTEGRATION.md)
- [Test Session Logging](./TEST-SESSION-LOGGING.md)

### API Collections
- `gym-api.postman_collection.json` - Main API collection
- `gym-api.postman_environment.json` - Environment variables
- `Printer Settings.postman_collection.json` - Printer API
- `Psychology-Dashboard-Reports.postman_collection.json` - Psychology reports
- `psychology-module.postman_collection.json` - Psychology module
