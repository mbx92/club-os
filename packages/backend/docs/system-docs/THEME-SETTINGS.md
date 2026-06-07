# Theme Settings Implementation

## Overview
Sistem theme per-tenant yang memungkinkan setiap tenant memilih kombinasi theme DaisyUI sesuai preferensi mereka. Theme settings disimpan di field `settings` (JSONB) pada tabel `tenants`.

## Database Structure

### Tenant Settings Schema
```json
{
  "theme": {
    "preset": "professional",      // ID preset theme
    "lightTheme": "corporate",     // Nama theme DaisyUI untuk mode terang
    "darkTheme": "business"        // Nama theme DaisyUI untuk mode gelap
  }
}
```

## Backend API Endpoint Requirements

### 1. PATCH `/api/tenants/settings`
Update tenant settings (termasuk theme).

**Request Body:**
```json
{
  "theme": {
    "preset": "professional",
    "lightTheme": "corporate",
    "darkTheme": "business"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "tenant": {
      "id": 1,
      "name": "Gym XYZ",
      "settings": {
        "theme": {
          "preset": "professional",
          "lightTheme": "corporate",
          "darkTheme": "business"
        }
      }
    }
  }
}
```

**Implementation Notes:**
- Endpoint harus ter-autentikasi
- Hanya owner/admin tenant yang bisa update settings
- Gunakan JSON merge untuk update partial settings (jangan replace seluruh object)
- Contoh query (PostgreSQL):
```sql
UPDATE tenants 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{theme}',
  $1::jsonb
)
WHERE id = $2
RETURNING *;
```

### 2. GET `/api/auth/user` (existing)
Pastikan response sudah include `tenant.settings`:

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@gym.com",
      "role": "owner",
      "tenant": {
        "id": 1,
        "name": "Gym XYZ",
        "settings": {
          "theme": {
            "preset": "professional",
            "lightTheme": "corporate",
            "darkTheme": "business"
          }
        }
      }
    }
  }
}
```

## Frontend Implementation

### Files Created/Modified:

1. **`src/composables/useTheme.js`** (NEW)
   - Composable untuk manage theme state
   - 7 preset theme combinations
   - Methods: `toggleTheme()`, `updateTenantTheme()`, `initTheme()`

2. **`src/stores/auth.js`** (MODIFIED)
   - Added `tenantTheme` computed property
   - Reads theme from `user.tenant.settings.theme`

3. **`src/pages/settings/index.vue`** (MODIFIED)
   - UI untuk memilih theme preset
   - Preview theme dengan komponen DaisyUI
   - Save button untuk update tenant settings

4. **`src/layouts/default.vue`** (MODIFIED)
   - Removed hardcoded theme constants
   - Uses `useTheme()` composable
   - Theme applied from tenant settings

### Available Theme Presets:

1. **Professional & Clean** - `corporate` / `business`
2. **Warm & Energetic** - `autumn` / `coffee`
3. **Fresh & Modern** - `emerald` / `forest`
4. **Vibrant & Fun** - `cupcake` / `dracula`
5. **Minimal & Elegant** - `light` / `night`
6. **Luxurious** - `winter` / `luxury`
7. **Cyber/Tech** - `lofi` / `synthwave`

## User Flow

1. User login → Backend returns `user.tenant.settings.theme`
2. Frontend reads theme settings from auth store
3. `useTheme()` applies correct theme based on tenant settings
4. User can toggle light/dark mode (preference saved to localStorage)
5. Admin goes to Settings page → selects new theme preset
6. Frontend calls `PATCH /api/tenants/settings` with new theme
7. Backend updates tenant settings JSONB
8. All users in that tenant will see new theme on next page load

## Testing

### Manual Test Steps:
1. Login sebagai admin/owner
2. Buka `/settings`
3. Pilih theme preset (contoh: "Warm & Energetic")
4. Klik "Save Theme Settings"
5. Refresh halaman → theme berubah
6. Toggle dark mode dengan icon moon/sun
7. Login dengan user lain di tenant yang sama → theme sama

### Default Behavior:
- Jika `tenant.settings.theme` tidak ada → default ke "Professional & Clean" (`corporate`/`business`)
- Toggle dark/light mode tersimpan per-user di localStorage

## Notes
- Theme settings berlaku untuk **semua user** dalam satu tenant
- Light/dark mode preference adalah **per-user** (localStorage)
- Tenant bisa ganti theme kapan saja tanpa perlu restart aplikasi
- Theme applied real-time via HMR (Hot Module Replacement)
