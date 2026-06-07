# Routes Metadata Generation Guide

## Overview
Script `generateRoutesMetadata.js` secara otomatis men-scan semua file routes di `src/routes/` dan menggenerate file `src/utils/routesMetadata.js` yang berisi metadata lengkap dari setiap endpoint.

## Kapan Perlu Regenerate?

Jalankan script ini setiap kali:
- ✅ Menambah endpoint baru
- ✅ Mengubah HTTP method pada route
- ✅ Mengubah path route
- ✅ Menambah/mengubah middleware authorization

❌ **TIDAK** perlu dijalankan jika hanya mengubah business logic di controller.

## Cara Menjalankan Script

### Option 1: Manual Command (Recommended)
```bash
npm run generate:routes
```

**Kapan menggunakan:**
- Setelah menambah/mengubah routes
- Sebelum commit code ke Git
- Sebelum deploy ke production

**Keuntungan:**
- Full control kapan regenerate
- Tidak memperlambat server startup
- Bisa di-review perubahan sebelum commit

---

### Option 2: Via API Endpoint ⭐ (New!)

**Endpoint**: `POST /api/permissions/routes/regenerate`

**Kapan menggunakan:**
- Dari admin dashboard/frontend UI
- Remote regeneration tanpa akses server
- After deployment untuk sync routes

**Authorization**: Superadmin only

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer <superadmin-token>" \
  http://localhost:3000/api/permissions/routes/regenerate
```

**Response**:
```json
{
  "success": true,
  "message": "Routes metadata regenerated successfully",
  "data": {
    "routesCount": 33,
    "timestamp": "2025-11-21T10:30:00.000Z"
  }
}
```

**Frontend Integration Example**:
```javascript
// Vue.js component
async function regenerateRoutes() {
  try {
    loading.value = true;
    
    const response = await fetch('/api/permissions/routes/regenerate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success(`Routes regenerated: ${result.data.routesCount} routes`);
      
      // Reload routes metadata
      await fetchRoutesMetadata();
    }
  } catch (error) {
    toast.error('Failed to regenerate routes');
  } finally {
    loading.value = false;
  }
}
```

**Keuntungan:**
- Dapat dipanggil dari frontend UI
- Tidak perlu SSH ke server
- Real-time update (langsung reload di memory)
- Audit trail otomatis tercatat

**Kekurangan:**
- Requires authentication (superadmin only)
- Depends on server running

---

### Option 3: Auto-run Saat Development (Watch Mode)

Tambahkan script berikut ke `package.json`:

```json
{
  "scripts": {
    "dev": "npm run generate:routes && nodemon src/server.js",
    "dev:watch": "nodemon --watch src/routes --exec \"npm run generate:routes\" & nodemon src/server.js"
  }
}
```

**Kapan menggunakan:**
- Saat aktif development dengan banyak perubahan routes
- Ingin otomatis regenerate setiap kali save file routes

**Keuntungan:**
- Otomatis regenerate saat file routes berubah
- Tidak perlu manual run command

**Kekurangan:**
- Slightly slower development experience
- File system watching overhead

---

### Option 3: Auto-run Saat Development (Watch Mode)

Tambahkan script berikut ke `package.json`:

```json
{
  "scripts": {
    "dev": "npm run generate:routes && nodemon src/server.js",
    "dev:watch": "nodemon --watch src/routes --exec \"npm run generate:routes\" & nodemon src/server.js"
  }
}
```

**Kapan menggunakan:**
- Saat aktif development dengan banyak perubahan routes
- Ingin otomatis regenerate setiap kali save file routes

**Keuntungan:**
- Otomatis regenerate saat file routes berubah
- Tidak perlu manual run command

**Kekurangan:**
- Slightly slower development experience
- File system watching overhead

---

### Option 4: Pre-commit Git Hook

Install husky dan setup pre-commit hook:

```bash
npm install --save-dev husky
npx husky init
```

Buat file `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if any route files changed
if git diff --cached --name-only | grep -q "src/routes/"; then
  echo "🔄 Routes changed, regenerating metadata..."
  npm run generate:routes
  git add src/utils/routesMetadata.js
fi
```

**Kapan menggunakan:**
- Tim development dengan multiple developers
- Ingin ensure routes metadata always up-to-date sebelum commit

**Keuntungan:**
- Otomatis run hanya jika ada perubahan routes
- Ensure consistency across team
- Tidak perlu remember manual command

**Kekurangan:**
- Requires husky setup
- Pre-commit hook bisa memperlambat commit process

---

### Option 5: CI/CD Pipeline

Tambahkan step di CI/CD pipeline (GitHub Actions, GitLab CI, dll):

```yaml
# .github/workflows/deploy.yml
- name: Generate Routes Metadata
  run: npm run generate:routes

- name: Check if metadata changed
  run: |
    if git diff --exit-code src/utils/routesMetadata.js; then
      echo "✅ Routes metadata is up to date"
    else
      echo "❌ Routes metadata needs update!"
      exit 1
    fi
```

**Kapan menggunakan:**
- Production deployment
- Ensure routes metadata updated sebelum deploy

---

## ⚠️ TIDAK Direkomendasikan: Auto-run Saat Server Start

```javascript
// ❌ JANGAN lakukan ini di src/server.js
const { generateRoutesMetadataFile } = require('../scripts/generateRoutesMetadata');

// Before starting server
generateRoutesMetadataFile(); // BAD: Memperlambat startup

app.listen(PORT, () => {
  console.log('Server running');
});
```

**Kenapa tidak?**
- ❌ Memperlambat server startup (tambahan 500ms-1s)
- ❌ Tidak efisien di production (routes jarang berubah)
- ❌ File system overhead setiap restart
- ❌ Unnecessary di production environment

---

## Rekomendasi Workflow

### Development (Local)
1. Tambah/edit route di `src/routes/xxxRoutes.js`
2. Test endpoint di Postman
3. **Option A**: Jalankan `npm run generate:routes`
4. **Option B**: Trigger via API: `POST /api/permissions/routes/regenerate` dari Postman
5. Commit semua changes termasuk `routesMetadata.js`

### Development (Team dengan Frontend)
1. Backend developer tambah route baru
2. Push ke development server
3. Frontend developer trigger regenerate via admin UI button
4. Frontend langsung dapat updated routes metadata
5. Build permission UI based on new routes

### Production Deployment
1. Ensure `npm run generate:routes` sudah dijalankan
2. Verify `src/utils/routesMetadata.js` up-to-date
3. Deploy code
4. (Optional) Trigger via API endpoint untuk verify: `POST /api/permissions/routes/regenerate`

### Admin Dashboard Integration (Recommended)
1. Tambahkan tombol "Regenerate Routes" di admin settings
2. Only visible untuk superadmin
3. On click, call `POST /api/permissions/routes/regenerate`
4. Show success notification dengan routes count
5. Auto-refresh permission UI

**UI Example**:
```vue
<template>
  <div class="admin-settings">
    <div class="card">
      <h3>Routes Management</h3>
      <p>Current routes: {{ routesCount }}</p>
      <button 
        @click="regenerateRoutes" 
        :disabled="loading"
        class="btn btn-primary"
      >
        <span v-if="loading">🔄 Regenerating...</span>
        <span v-else>🔄 Regenerate Routes Metadata</span>
      </button>
      <p class="text-sm text-gray-500 mt-2">
        Last updated: {{ lastUpdated }}
      </p>
    </div>
  </div>
</template>
```

### Tim Development (Best Practice)
1. Setup pre-commit hook dengan husky (Option 4)
2. Add CI/CD check (Option 5)
3. Add admin UI button untuk regenerate (Option 2 - API Endpoint)
4. Document di README.md bahwa routes metadata harus regenerate

---

## Output Script

Setelah menjalankan script, Anda akan melihat:

```bash
$ npm run generate:routes

Generated routes metadata from 9 files { routesCount: 33 }
Routes metadata file generated successfully
✅ Routes metadata generated successfully with 33 routes
📁 Output file: G:\onDev\gym-be\src\utils\routesMetadata.js
```

File yang di-generate:
- **Location**: `src/utils/routesMetadata.js`
- **Format**: JavaScript module dengan object metadata
- **Size**: ~10-50KB tergantung jumlah routes
- **Structure**: 
  ```javascript
  {
    "routeName.method": {
      "path": "/api/resource",
      "method": "GET",
      "description": "Description",
      "permissions": {
        "roles": ["admin"],
        "actions": ["read"],
        "resource": "Resource"
      }
    }
  }
  ```

---

## Troubleshooting

### Script tidak menemukan routes
**Problem**: Output shows `routesCount: 0`

**Solution**:
- Check `src/routes/` directory exists
- Ensure file naming: `*Routes.js` (e.g., `userRoutes.js`)
- Verify routes use `router.get()`, `router.post()`, etc.

### Generated metadata tidak sesuai
**Problem**: Resource names atau permissions salah

**Solution**:
- Edit `scripts/generateRoutesMetadata.js`:
  - `resourceMapping`: Map route names ke resource names
  - `defaultRoles`: Set default roles per resource
  - `defaultMethodPermissions`: Adjust actions per HTTP method
- Atau edit manual di `src/utils/routesMetadata.js`

### Routes tidak muncul di frontend
**Problem**: Endpoint `GET /api/permissions/routes` tidak return route baru

**Solution**:
1. Jalankan `npm run generate:routes`
2. Restart server untuk reload `routesMetadata.js`
3. Verify file updated: `git diff src/utils/routesMetadata.js`

---

## Related Documentation

- [Role & Permission Management](./ROLE-PERMISSION-MANAGEMENT.md)
- [API Documentation](./API-DOCUMENTATION.md)
- [CASL Synchronization](./CASL-SYNCHRONIZATION.md)

---

## Changelog

### Version 1.0.0 (2025-11-21)
- Initial documentation
- 4 options untuk regenerate routes metadata
- Rekomendasi workflow untuk development dan production
- Troubleshooting guide
