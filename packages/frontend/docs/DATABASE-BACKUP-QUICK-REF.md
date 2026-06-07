# Database Backup & Restore - Quick Reference

## 🚀 Quick Start

### For Users (Super Admin)
1. Navigate to **Settings**
2. Click **System & Audit Log** tab
3. Find **Database Backup & Restore** card
4. Click **[Manage Backups]**
5. Use the drawer to manage backups

### For Developers

```javascript
// Import the composable
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'

// Use in your component
const { backups, createBackup, downloadBackup } = useDatabaseBackup()

// Create backup
await createBackup()

// Download backup
await downloadBackup('backup_file.sql')
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/database/backup` | Create new backup |
| `GET` | `/api/v1/admin/database/backups` | List all backups |
| `GET` | `/api/v1/admin/database/download/:filename` | Download backup |
| `DELETE` | `/api/v1/admin/database/backups/:filename` | Delete backup |
| `GET` | `/api/v1/admin/database/info` | Get database info |

## 🎯 Composable Methods

```javascript
const {
  // State
  backups,              // Array of backup objects
  databaseInfo,         // Database information object
  isLoading,           // General loading state
  isCreatingBackup,    // Backup creation state
  
  // Methods
  fetchBackups,        // Load all backups
  createBackup,        // Create new backup
  downloadBackup,      // Download a backup file
  deleteBackup,        // Delete a backup file
  fetchDatabaseInfo    // Load database info
} = useDatabaseBackup()
```

## 📊 Data Structures

### Backup Object
```javascript
{
  filename: "backup_production_gymdb_2024-12-22T10-30-00.sql",
  size: 47523840,           // bytes
  sizeMB: "45.32",
  createdAt: "2024-12-22T10:30:00.000Z",
  environment: "production",
  downloadUrl: "/api/v1/admin/database/download/..."
}
```

### Database Info Object
```javascript
{
  database: "gym_production",
  dialect: "mysql",
  host: "localhost",
  port: "3306",
  environment: "production",
  size: "152.45 MB",
  tableCount: 45,
  lastMigration: "20241222103000-create-support-tickets.js",
  timestamp: "2024-12-22T12:00:00.000Z"
}
```

## 🔐 Access Control

### Super Admin Check
```javascript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.user?.isSuperAdmin === true)
```

### Template Usage
```vue
<div v-if="isSuperAdmin">
  <!-- Super admin only content -->
</div>
```

## 💻 Common Code Patterns

### Create Backup
```javascript
const handleCreateBackup = async () => {
  try {
    const result = await createBackup()
    console.log('Created:', result.filename)
  } catch (error) {
    console.error('Failed:', error)
  }
}
```

### Download Backup
```javascript
const handleDownload = async (filename) => {
  await downloadBackup(filename)
  // File downloads automatically
}
```

### Delete with Confirmation
```vue
<template>
  <button @click="confirmDelete(backup)">Delete</button>
  
  <dialog ref="modal">
    <p>Delete {{ backupToDelete?.filename }}?</p>
    <button @click="performDelete">Confirm</button>
  </dialog>
</template>

<script setup>
const modal = ref(null)
const backupToDelete = ref(null)

const confirmDelete = (backup) => {
  backupToDelete.value = backup
  modal.value?.showModal()
}

const performDelete = async () => {
  await deleteBackup(backupToDelete.value.filename)
  modal.value?.close()
}
</script>
```

### Load Data on Mount
```javascript
import { onMounted } from 'vue'

onMounted(async () => {
  await Promise.all([
    fetchBackups(),
    fetchDatabaseInfo()
  ])
})
```

## 🎨 UI Components

### Create Button with Loading
```vue
<button 
  class="btn btn-primary"
  :disabled="isCreatingBackup"
  @click="createBackup"
>
  <span v-if="isCreatingBackup" class="loading loading-spinner"></span>
  <IconPlus v-else />
  Create Backup
</button>
```

### Backups Table
```vue
<table class="table">
  <thead>
    <tr>
      <th>Filename</th>
      <th>Size</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="backup in backups" :key="backup.filename">
      <td>{{ backup.filename }}</td>
      <td>{{ backup.sizeMB }} MB</td>
      <td>{{ formatDate(backup.createdAt) }}</td>
      <td>
        <button @click="downloadBackup(backup.filename)">⬇️</button>
        <button @click="deleteBackup(backup.filename)">🗑️</button>
      </td>
    </tr>
  </tbody>
</table>
```

### Environment Badge
```vue
<span 
  class="badge" 
  :class="{
    'badge-error': backup.environment === 'production',
    'badge-warning': backup.environment === 'staging',
    'badge-info': backup.environment === 'development'
  }"
>
  {{ backup.environment }}
</span>
```

## 📝 Helper Functions

### Format Date
```javascript
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

### Sort by Date
```javascript
const sortedBackups = computed(() => {
  return [...backups.value].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  )
})
```

### Calculate Total Size
```javascript
const totalSizeMB = computed(() => {
  return backups.value
    .reduce((sum, b) => sum + parseFloat(b.sizeMB || 0), 0)
    .toFixed(2)
})
```

## 🐛 Error Handling

### With Try-Catch
```javascript
try {
  const result = await createBackup()
  showSuccess('Backup created!')
} catch (error) {
  showError('Failed to create backup')
  console.error(error)
}
```

### API Error Response
```javascript
{
  success: false,
  error: "Database backup gagal",
  message: "Detailed error message"
}
```

## 🧪 Testing

### Check Feature Visibility
```javascript
// Should be visible for super admin
expect(wrapper.find('.database-backup-card').exists()).toBe(true)

// Should NOT be visible for regular user
expect(wrapper.find('.database-backup-card').exists()).toBe(false)
```

### Mock Composable
```javascript
vi.mock('@/composables/admin/useDatabaseBackup', () => ({
  useDatabaseBackup: () => ({
    backups: ref([]),
    createBackup: vi.fn(),
    downloadBackup: vi.fn(),
    deleteBackup: vi.fn()
  })
}))
```

## 📱 Responsive Classes

```vue
<!-- Desktop: 4 columns, Tablet: 2 columns, Mobile: 1 column -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Stats cards -->
</div>

<!-- Full width on mobile, max width on desktop -->
<div class="w-full max-w-4xl">
  <!-- Content -->
</div>
```

## ⚡ Performance Tips

1. **Parallel Requests**: Load data simultaneously
   ```javascript
   await Promise.all([fetchBackups(), fetchDatabaseInfo()])
   ```

2. **Computed Properties**: Use for derived state
   ```javascript
   const sortedBackups = computed(() => [...backups.value].sort(...))
   ```

3. **Lazy Loading**: Only fetch when canvas opens
   ```javascript
   watch(() => props.modelValue, (isOpen) => {
     if (isOpen) fetchBackups()
   })
   ```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Download not working | Check JWT token and CORS settings |
| Create fails | Verify backend has write permissions |
| List is empty | Confirm super admin role is set |
| Styles not applied | Check DaisyUI is installed |

## 📚 Related Documentation

- [Full Documentation](./DATABASE-BACKUP-RESTORE.md)
- [Frontend Guide](./DATABASE-BACKUP-FRONTEND.md)
- [Visual Guide](./DATABASE-BACKUP-VISUAL-GUIDE.md)
- [Implementation Summary](./DATABASE-BACKUP-IMPLEMENTATION-SUMMARY.md)

## 🎯 Checklist

### Before Deployment
- [ ] Super admin role assigned to user
- [ ] Backend API endpoints working
- [ ] Database has write permissions
- [ ] JWT authentication configured
- [ ] CORS settings allow download
- [ ] Toast notifications working

### After Deployment
- [ ] Test create backup
- [ ] Test download backup
- [ ] Test delete backup
- [ ] Verify auto-refresh works
- [ ] Check loading states
- [ ] Confirm error handling
- [ ] Validate super admin restriction

---

**Need Help?** Check the [Full Documentation](./DATABASE-BACKUP-RESTORE.md) or [Implementation Summary](./DATABASE-BACKUP-IMPLEMENTATION-SUMMARY.md)

**Version:** 2.0.0 | **Last Updated:** December 22, 2025
