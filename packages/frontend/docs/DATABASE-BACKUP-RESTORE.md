# Database Backup & Restore System

Sistem backup dan restore database untuk keamanan data production dengan akses super admin.

## 📋 Overview

Sistem ini menyediakan:
- ✅ Backup database otomatis/manual ke file .sql
- ✅ Download backup file melalui API
- ✅ List semua backup files dengan metadata
- ✅ Delete backup files
- ✅ Database info & statistics
- ✅ Super admin only access
- ✅ Support MySQL & PostgreSQL
- ✅ Auto cleanup old backups (keep last 10)

## 🔧 Prerequisites

### MySQL
```bash
# Install MySQL client tools
# Windows: Download from mysql.com
# Linux: sudo apt install mysql-client
# Mac: brew install mysql-client
```

### PostgreSQL
```bash
# Install PostgreSQL client tools
# Windows: Download from postgresql.org
# Linux: sudo apt install postgresql-client
# Mac: brew install postgresql
```

## 📁 File Structure

```
gym-be/
├── scripts/
│   ├── backupDatabase.js       # Backup script
│   └── restoreDatabase.js      # Restore script
├── src/
│   ├── controllers/
│   │   └── admin/
│   │       └── databaseController.js   # API controller
│   ├── routes/
│   │   └── admin/
│   │       └── database.routes.js      # API routes
│   └── middlewares/
│       └── roleMiddleware.js           # Super admin middleware
├── backups/                    # Auto-created backup directory
└── package.json
```

## 🚀 Usage

### Command Line (Scripts)

#### Create Backup

```bash
# Development
npm run db:backup:dev

# Test
npm run db:backup:test

# Production
npm run db:backup:production
```

**Output:**
```
🔄 Starting MySQL backup for production environment...
📦 Database: gym_production
📁 File: backup_production_gym_production_2024-12-22T10-30-00.sql
✅ Backup completed successfully!
📊 Size: 45.32 MB
📂 Location: G:\onDev\gym-be\backups\backup_production_gym_production_2024-12-22T10-30-00.sql
```

#### Restore Database

```bash
# Restore latest backup
npm run db:restore:dev

# Restore specific backup file
npm run db:restore:dev -- backup_dev_gymdb_2024-12-22T10-30-00.sql
```

**Interactive Confirmation:**
```
⚠️  WARNING: This will DROP and RECREATE the database!
📦 Database: gym_development
🌍 Environment: development
📁 Backup file: backup_dev_gymdb_2024-12-22T10-30-00.sql

Are you sure you want to continue? (yes/no):
```

### API Endpoints

**Base URL:** `/api/v1/admin/database`

**Authentication:** Super Admin only (JWT token required)

---

#### 1. Create Backup

**Request:**
```http
POST /api/v1/admin/database/backup
Authorization: Bearer <super-admin-token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Database backup created successfully",
  "data": {
    "filename": "backup_production_gymdb_2024-12-22T10-30-00.sql",
    "size": "45.32 MB",
    "database": "gym_production",
    "environment": "production",
    "timestamp": "2024-12-22T10:30:00.000Z",
    "downloadUrl": "/api/v1/admin/database/download/backup_production_gymdb_2024-12-22T10-30-00.sql"
  }
}
```

---

#### 2. List All Backups

**Request:**
```http
GET /api/v1/admin/database/backups
Authorization: Bearer <super-admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "filename": "backup_production_gymdb_2024-12-22T10-30-00.sql",
        "size": 47523840,
        "sizeMB": "45.32",
        "createdAt": "2024-12-22T10:30:00.000Z",
        "environment": "production",
        "downloadUrl": "/api/v1/admin/database/download/backup_production_gymdb_2024-12-22T10-30-00.sql"
      },
      {
        "filename": "backup_production_gymdb_2024-12-21T09-15-00.sql",
        "size": 46234112,
        "sizeMB": "44.09",
        "createdAt": "2024-12-21T09:15:00.000Z",
        "environment": "production",
        "downloadUrl": "/api/v1/admin/database/download/backup_production_gymdb_2024-12-21T09-15-00.sql"
      }
    ],
    "total": 2,
    "totalSizeMB": "89.41"
  }
}
```

---

#### 3. Download Backup File

**Request:**
```http
GET /api/v1/admin/database/download/:filename
Authorization: Bearer <super-admin-token>
```

**Example:**
```http
GET /api/v1/admin/database/download/backup_production_gymdb_2024-12-22T10-30-00.sql
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
- Content-Type: `application/sql`
- Content-Disposition: `attachment; filename="backup_production_gymdb_2024-12-22T10-30-00.sql"`
- Body: SQL file stream

**Browser behavior:** File will be downloaded automatically.

---

#### 4. Delete Backup File

**Request:**
```http
DELETE /api/v1/admin/database/backups/:filename
Authorization: Bearer <super-admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup file deleted successfully",
  "data": {
    "filename": "backup_production_gymdb_2024-12-21T09-15-00.sql"
  }
}
```

---

#### 5. Get Database Info

**Request:**
```http
GET /api/v1/admin/database/info
Authorization: Bearer <super-admin-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "database": "gym_production",
    "dialect": "mysql",
    "host": "localhost",
    "port": "3306",
    "environment": "production",
    "size": "152.45 MB",
    "tableCount": 45,
    "lastMigration": "20241222103000-create-support-tickets.js",
    "timestamp": "2024-12-22T12:00:00.000Z"
  }
}
```

## 🔐 Security

### Access Control
- **Super Admin Only**: All endpoints require `isSuperAdmin: true`
- JWT authentication required
- Role-based authorization via `requireSuperAdmin` middleware

### File Security
- Filename validation to prevent directory traversal attacks
- Only `.sql` files can be downloaded/deleted
- Validates file existence before operations

### Production Safety
- Restore script requires explicit confirmation for production
- Interactive prompts prevent accidental data loss
- Backup before restore recommended

## 📦 Backup Strategy

### Automatic Cleanup
- Keeps **last 10 backups** per environment
- Auto-deletes older backups when limit exceeded
- Runs after each successful backup

### Filename Format
```
backup_[environment]_[database]_[timestamp].sql

Example:
backup_production_gym_production_2024-12-22T10-30-00.sql
```

### Storage Location
```
gym-be/
└── backups/
    ├── backup_production_gymdb_2024-12-22T10-30-00.sql
    ├── backup_production_gymdb_2024-12-21T09-15-00.sql
    └── backup_dev_gymdb_2024-12-22T08-00-00.sql
```

## 🛡️ Best Practices

### Before Production Deploy

1. **Create backup:**
   ```bash
   npm run db:backup:production
   ```

2. **Test migration on staging:**
   ```bash
   NODE_ENV=staging npm run db:migrate
   ```

3. **Deploy to production:**
   ```bash
   NODE_ENV=production npm run db:migrate
   pm2 reload gym-be --update-env
   ```

4. **If issues occur - rollback:**
   ```bash
   NODE_ENV=production npm run db:migrate:undo
   # Or restore from backup
   npm run db:restore:production
   ```

### Regular Backups

**Option 1: Manual via API**
```bash
curl -X POST https://api.yourdomain.com/api/v1/admin/database/backup \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

**Option 2: Automated via Cron**
```bash
# Add to crontab (every day at 2 AM)
0 2 * * * cd /path/to/gym-be && npm run db:backup:production
```

**Option 3: Via Node-Cron (in application)**
```javascript
// src/jobs/backupJob.js
const cron = require('node-cron');
const { createBackup } = require('../scripts/backupDatabase');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting automated database backup...');
  try {
    await createBackup();
    console.log('Automated backup completed');
  } catch (error) {
    console.error('Automated backup failed:', error);
  }
});
```

### Off-site Storage

For production, consider uploading backups to cloud storage:

```javascript
// Example: Upload to AWS S3 after backup
const AWS = require('aws-sdk');
const fs = require('fs');

async function uploadToS3(backupPath) {
  const s3 = new AWS.S3();
  const fileStream = fs.createReadStream(backupPath);
  
  await s3.upload({
    Bucket: 'your-backup-bucket',
    Key: `backups/${path.basename(backupPath)}`,
    Body: fileStream
  }).promise();
}
```

## 🔧 Troubleshooting

### Error: "mysqldump: command not found"
```bash
# Install MySQL client tools
# Windows: Add MySQL bin folder to PATH
# Linux: sudo apt install mysql-client
# Mac: brew install mysql-client
```

### Error: "Access denied for user"
```bash
# Check database credentials in .env file
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
```

### Error: "Backup file was not created"
```bash
# Check disk space
df -h

# Check write permissions
ls -la backups/
```

### Large Database Performance
For very large databases (> 1GB):
- Use `--single-transaction` flag for MySQL
- Schedule backups during off-peak hours
- Consider incremental backups

## 📊 Monitoring

### Logging
All backup/restore operations are logged:
```javascript
logger.info('Database backup initiated', {
  userId: 'super-admin-id',
  userName: 'Admin Name',
  isSuperAdmin: true
});
```

### Error Tracking
```javascript
logger.error('Database backup failed', {
  userId: 'super-admin-id',
  error: err.message,
  stack: err.stack
});
```

## 🎯 Frontend Integration

### Vue 3 + Composition API Implementation

The system is fully integrated into the frontend with a modern, user-friendly interface.

#### **Location:** Settings > System & Audit Log Tab

**Files:**
- `src/composables/admin/useDatabaseBackup.js` - Composable for API integration
- `src/components/settings/DatabaseBackupCanvas.vue` - Main UI component  
- `src/components/settings/SystemAuditTab.vue` - Settings tab integration

#### Frontend Features:
- ✅ **Create Backups** - One-click backup creation with progress indicator
- ✅ **View All Backups** - List with metadata (size, date, environment)
- ✅ **Download Files** - Direct download to local machine
- ✅ **Delete Backups** - Remove old/unnecessary backups with confirmation
- ✅ **Database Info** - Real-time database statistics and information
- ✅ **Super Admin Only** - Built-in access control
- ✅ **Auto Refresh** - Keep data up-to-date
- ✅ **Beautiful UI** - DaisyUI components with responsive design

#### Composable Usage:

```javascript
// In your Vue component
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'

const {
  backups,           // ref([]) - Array of backup files
  databaseInfo,      // ref(null) - Database information
  isLoading,         // ref(false) - Loading state
  isCreatingBackup,  // ref(false) - Creating backup state
  fetchBackups,      // Function to fetch backups
  createBackup,      // Function to create new backup
  downloadBackup,    // Function to download backup file
  deleteBackup,      // Function to delete backup file
  fetchDatabaseInfo  // Function to fetch database info
} = useDatabaseBackup()

// Create new backup
await createBackup()

// Download specific backup
await downloadBackup('backup_production_gymdb_2024-12-22T10-30-00.sql')

// Delete old backup
await deleteBackup('backup_old_gymdb_2024-12-01T10-30-00.sql')

// Fetch latest data
await fetchBackups()
await fetchDatabaseInfo()
```

#### Component Integration:

```vue
<template>
  <button @click="handleCreateBackup" :disabled="isCreatingBackup">
    <span v-if="isCreatingBackup">Creating...</span>
    <span v-else>Create Backup</span>
  </button>
  
  <div v-for="backup in backups" :key="backup.filename">
    <span>{{ backup.filename }}</span>
    <span>{{ backup.sizeMB }} MB</span>
    <button @click="downloadBackup(backup.filename)">Download</button>
    <button @click="deleteBackup(backup.filename)">Delete</button>
  </div>
</template>

<script setup>
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'

const { 
  backups, 
  isCreatingBackup, 
  createBackup, 
  downloadBackup, 
  deleteBackup 
} = useDatabaseBackup()

const handleCreateBackup = async () => {
  await createBackup()
  // Backups list will be automatically refreshed
}
</script>
```

### Legacy/Alternative Implementation

For non-Vue applications or direct API usage:

```javascript
// React/Vanilla JS example
async function createBackup() {
  try {
    const response = await fetch('/api/v1/admin/database/backup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Backup created:', result.data);
      alert(`Backup created: ${result.data.filename}`);
    }
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

async function downloadBackup(filename) {
  window.location.href = `/api/v1/admin/database/download/${filename}?token=${token}`;
}
```

## 📝 Error Codes

| Code | Status | Message |
|------|--------|---------|
| `BACKUP_FAILED` | 500 | Database backup gagal |
| `RESTORE_FAILED` | 500 | Database restore gagal |
| `NOT_FOUND` | 404 | Backup file not found |
| `INVALID_INPUT` | 400 | Invalid filename |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Super Admin access required |

## 🔄 Future Enhancements

- [x] Frontend integration with Vue 3 + Composition API
- [x] Beautiful UI with DaisyUI components
- [x] Super admin access control
- [ ] Scheduled automatic backups via cron
- [ ] Cloud storage integration (S3, Google Cloud Storage)
- [ ] Backup compression (gzip)
- [ ] Incremental backups
- [ ] Point-in-time recovery
- [ ] Multi-region backup replication
- [ ] Backup encryption
- [ ] Restore preview (dry-run)
- [ ] Email notifications on backup success/failure
- [ ] Restore functionality via frontend UI

## 📚 Related Documentation

- [Transaction Architecture](./TRANSACTION-ARCHITECTURE.md)
- [SaaS Application Flow](./SAAS-APPLICATION-FLOW.md)
- [Race Condition Prevention](./RACE-CONDITION-PREVENTION.md)

---

**Last Updated:** December 22, 2025
**Version:** 2.0.0 (with Frontend Integration)
