# Database Backup & Restore - Frontend Implementation

Implementasi lengkap fitur Database Backup & Restore pada frontend aplikasi Gym Management System.

## 📋 Overview

Fitur ini memungkinkan Super Admin untuk:
- ✅ Membuat backup database dengan satu klik
- ✅ Melihat daftar semua backup files
- ✅ Download backup files ke komputer lokal
- ✅ Menghapus backup files yang tidak diperlukan
- ✅ Melihat informasi database real-time

## 📁 File Structure

```
src/
├── composables/
│   └── admin/
│       └── useDatabaseBackup.js          # Composable untuk API calls
├── components/
│   └── settings/
│       ├── DatabaseBackupCanvas.vue       # Main UI component
│       └── SystemAuditTab.vue            # Tab integration
└── pages/
    └── core/
        └── settings/
            └── index.vue                  # Settings page
```

## 🎨 User Interface

### Access Point
**Path:** Settings → System & Audit Log Tab

**Permission:** Super Admin only (`isSuperAdmin: true`)

### UI Components

#### 1. **Database Backup Card** (SystemAuditTab.vue)
Entry point card dengan tombol "Manage Backups"

```vue
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <div class="flex items-center gap-3">
      <IconDatabase class="w-8 h-8 text-success" />
      <div>
        <h2 class="card-title">Database Backup & Restore</h2>
        <p class="text-sm">Create, download, and manage database backups</p>
      </div>
    </div>
    <button @click="openDatabaseBackupCanvas">
      Manage Backups
    </button>
  </div>
</div>
```

#### 2. **Database Backup Canvas** (DatabaseBackupCanvas.vue)
Full-width drawer dengan fitur lengkap:

**Sections:**
- Header dengan title dan close button
- Quick actions (Create Backup, Refresh)
- Database information card
- Statistics cards (Total Backups, Total Size, Latest Backup)
- Backups table dengan actions
- Warning notices

## 🔧 Composable API

### useDatabaseBackup()

Composable function untuk mengelola database backups.

#### Import
```javascript
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'
```

#### Returns

```typescript
{
  // State
  backups: Ref<Array>,           // List of backup files
  databaseInfo: Ref<Object>,     // Database information
  isLoading: Ref<Boolean>,       // General loading state
  isCreatingBackup: Ref<Boolean>, // Backup creation state

  // Methods
  fetchBackups: () => Promise<Array>,
  createBackup: () => Promise<Object>,
  downloadBackup: (filename: string) => Promise<void>,
  deleteBackup: (filename: string) => Promise<Boolean>,
  fetchDatabaseInfo: () => Promise<Object>
}
```

#### State Objects

**Backup Object:**
```typescript
{
  filename: string,        // "backup_production_gymdb_2024-12-22T10-30-00.sql"
  size: number,           // 47523840 (bytes)
  sizeMB: string,         // "45.32"
  createdAt: string,      // "2024-12-22T10:30:00.000Z"
  environment: string,    // "production" | "development" | "staging"
  downloadUrl: string     // "/api/v1/admin/database/download/..."
}
```

**Database Info Object:**
```typescript
{
  database: string,       // "gym_production"
  dialect: string,        // "mysql" | "postgres"
  host: string,          // "localhost"
  port: string,          // "3306"
  environment: string,   // "production"
  size: string,          // "152.45 MB"
  tableCount: number,    // 45
  lastMigration: string, // "20241222103000-create-support-tickets.js"
  timestamp: string      // "2024-12-22T12:00:00.000Z"
}
```

## 💻 Usage Examples

### Basic Usage

```vue
<script setup>
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'

const {
  backups,
  databaseInfo,
  isLoading,
  isCreatingBackup,
  fetchBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  fetchDatabaseInfo
} = useDatabaseBackup()

// Load data on mount
onMounted(async () => {
  await fetchBackups()
  await fetchDatabaseInfo()
})
</script>
```

### Create Backup

```javascript
const handleCreateBackup = async () => {
  try {
    const result = await createBackup()
    console.log('Backup created:', result.filename)
    // Auto-refreshes backups list
  } catch (error) {
    console.error('Failed to create backup:', error)
  }
}
```

### Download Backup

```javascript
const handleDownload = async (filename) => {
  await downloadBackup(filename)
  // File will be downloaded via browser
}
```

### Delete Backup

```javascript
const handleDelete = async (filename) => {
  // Show confirmation modal first
  const confirmed = await showConfirmModal()
  
  if (confirmed) {
    const success = await deleteBackup(filename)
    if (success) {
      console.log('Backup deleted successfully')
      // Auto-refreshes backups list
    }
  }
}
```

### Reactive Data Display

```vue
<template>
  <!-- Loading State -->
  <div v-if="isLoading">
    <span class="loading loading-spinner"></span>
  </div>

  <!-- Database Info -->
  <div v-if="databaseInfo">
    <p>Database: {{ databaseInfo.database }}</p>
    <p>Size: {{ databaseInfo.size }}</p>
    <p>Tables: {{ databaseInfo.tableCount }}</p>
  </div>

  <!-- Backups List -->
  <div v-for="backup in backups" :key="backup.filename">
    <span>{{ backup.filename }}</span>
    <span>{{ backup.sizeMB }} MB</span>
    <span>{{ formatDate(backup.createdAt) }}</span>
    <button @click="downloadBackup(backup.filename)">Download</button>
    <button @click="deleteBackup(backup.filename)">Delete</button>
  </div>
</template>
```

## 🎯 Features Implementation

### 1. Create Backup Button

```vue
<button
  class="btn btn-primary"
  :disabled="isCreatingBackup"
  @click="handleCreateBackup"
>
  <span v-if="isCreatingBackup" class="loading loading-spinner"></span>
  <IconPlus v-else />
  Create Backup
</button>
```

**Behavior:**
- Shows loading spinner while creating
- Disables button during creation
- Auto-refreshes list after success
- Shows toast notification

### 2. Backups Table

```vue
<table class="table">
  <thead>
    <tr>
      <th>Filename</th>
      <th>Size</th>
      <th>Environment</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="backup in sortedBackups" :key="backup.filename">
      <td>{{ backup.filename }}</td>
      <td>{{ backup.sizeMB }} MB</td>
      <td>
        <span class="badge" :class="getEnvironmentBadge(backup.environment)">
          {{ backup.environment }}
        </span>
      </td>
      <td>{{ formatDate(backup.createdAt) }}</td>
      <td>
        <button @click="downloadBackup(backup.filename)">Download</button>
        <button @click="handleDeleteClick(backup)">Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

### 3. Statistics Cards

```vue
<div class="stats">
  <div class="stat">
    <div class="stat-title">Total Backups</div>
    <div class="stat-value">{{ backups.length }}</div>
  </div>
  
  <div class="stat">
    <div class="stat-title">Total Size</div>
    <div class="stat-value">{{ totalSizeMB }} MB</div>
  </div>
  
  <div class="stat">
    <div class="stat-title">Latest Backup</div>
    <div class="stat-value">{{ latestBackupTime }}</div>
  </div>
</div>
```

### 4. Delete Confirmation Modal

```vue
<dialog ref="deleteModal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Delete Backup File</h3>
    <p class="py-4">
      Are you sure you want to delete:
      <code>{{ backupToDelete?.filename }}</code>
    </p>
    <div class="modal-action">
      <button class="btn btn-ghost" @click="closeDeleteModal">
        Cancel
      </button>
      <button class="btn btn-error" @click="confirmDelete">
        Delete
      </button>
    </div>
  </div>
</dialog>
```

## 🔐 Security & Access Control

### Super Admin Only

```javascript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isSuperAdmin = computed(() => {
  return authStore.user?.isSuperAdmin === true
})
```

```vue
<div v-if="isSuperAdmin" class="database-backup-section">
  <!-- Show database backup features -->
</div>
```

### API Authentication

All API calls automatically include JWT token via `useApiRequest`:

```javascript
const { apiRequest } = useApiRequest()

// Token is automatically added to headers
const response = await apiRequest('/api/v1/admin/database/backups', {
  method: 'GET'
})
```

## 📊 Helper Functions

### Format Date

```javascript
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

### Format Time

```javascript
const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
```

### Relative Time

```javascript
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return formatDate(dateString)
}
```

### Environment Badge

```javascript
const getEnvironmentBadge = (environment) => {
  const badges = {
    production: 'badge-error',
    staging: 'badge-warning',
    development: 'badge-info',
    test: 'badge-ghost'
  }
  return badges[environment] || 'badge-neutral'
}
```

### Sort Backups

```javascript
const sortedBackups = computed(() => {
  return [...backups.value].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})
```

## 🎨 Styling

### DaisyUI Classes Used

```css
/* Cards */
.card
.card-body
.card-title

/* Buttons */
.btn
.btn-primary
.btn-success
.btn-error
.btn-ghost

/* Badges */
.badge
.badge-error
.badge-warning
.badge-info

/* Loading */
.loading
.loading-spinner

/* Stats */
.stat
.stat-title
.stat-value
.stat-figure

/* Table */
.table
.table-zebra

/* Modal */
.modal
.modal-box
.modal-action

/* Drawer */
.drawer
.drawer-end
.drawer-side
.drawer-toggle
.drawer-overlay
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create backup button works
- [ ] Loading states appear correctly
- [ ] Backups list displays properly
- [ ] Download functionality works
- [ ] Delete confirmation modal appears
- [ ] Delete operation succeeds
- [ ] Refresh updates data
- [ ] Database info displays correctly
- [ ] Statistics are accurate
- [ ] Environment badges show correct colors
- [ ] Dates format properly
- [ ] Super admin restriction works
- [ ] Error handling shows toast messages
- [ ] Canvas opens/closes smoothly

## 🐛 Error Handling

All operations include comprehensive error handling:

```javascript
try {
  const response = await apiRequest(...)
  
  if (response.success) {
    showSuccess('Operation completed')
    return response.data
  }
} catch (err) {
  const errorMessage = err.response?.data?.error 
    || err.message 
    || 'Operation failed'
  showError(errorMessage)
  console.error('[Error]:', err)
}
```

## 📱 Responsive Design

- ✅ Full-width drawer on desktop (max-w-4xl)
- ✅ Responsive grid layouts
- ✅ Mobile-friendly table
- ✅ Touch-friendly buttons
- ✅ Adaptive spacing

## 🚀 Performance

- ✅ Lazy loading of backup list
- ✅ Efficient re-rendering with Vue reactivity
- ✅ Debounced refresh operations
- ✅ Optimized file downloads
- ✅ Minimal API calls

## 📚 Related Files

- Backend: See [DATABASE-BACKUP-RESTORE.md](./DATABASE-BACKUP-RESTORE.md)
- API Endpoints: `/api/v1/admin/database/*`
- Auth Store: `src/stores/auth.js`
- API Request: `src/composables/useApiRequest.js`
- Toast Notifications: `src/composables/useToast.js`

---

**Last Updated:** December 22, 2025
**Version:** 2.0.0
