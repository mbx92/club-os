# Database Backup & Restore - Visual Guide

## 🎨 UI Preview

### 1. Entry Point - System & Audit Log Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Settings > System & Audit Log                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 🗄️  Database Backup & Restore         [Manage Backups]│  │
│ │                                                         │  │
│ │ Create, download, and manage database backups           │  │
│ │ for data protection                                     │  │
│ │                                                         │  │
│ │ ℹ️  Secure your data with automated backup management. │  │
│ │    Create backups, download files, and restore          │  │
│ │    database when needed.                                │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 📋  Audit Log                            [View Logs]   │  │
│ │                                                         │  │
│ │ Track system activities and user actions                │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Database Backup Canvas (Drawer)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🗄️  Database Backup & Restore                              ✕    │
│    Manage database backups for data protection                   │
├──────────────────────────────────────────────────────────────────┤
│ [➕ Create Backup]  [🔄 Refresh]                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ℹ️  Database Information                                   │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Database: gym_production    Type: MYSQL                    │  │
│ │ Size: 152.45 MB            Tables: 45                      │  │
│ │                                                            │  │
│ │ Environment: [PRODUCTION] localhost:3306                   │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ 📁 Total     │ │ 💾 Total     │ │ 🕐 Latest    │            │
│ │   Backups    │ │   Size       │ │   Backup     │            │
│ │      8       │ │  361.25 MB   │ │   2h ago     │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ 📋  Backup Files (8)                                       │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Filename             Size  Environment  Created   Actions  │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ backup_production_  45.32  PRODUCTION   Dec 22   [⬇️][🗑️] │  │
│ │   gymdb_2024-12-    MB                  10:30             │  │
│ │   22T10-30-00.sql                                          │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ backup_production_  44.09  PRODUCTION   Dec 21   [⬇️][🗑️] │  │
│ │   gymdb_2024-12-    MB                  09:15             │  │
│ │   21T09-15-00.sql                                          │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ⚠️  Important Notes:                                            │
│ • Backups are stored locally on the server                      │
│ • Only the last 10 backups are kept automatically               │
│ • Download important backups for off-site storage               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Delete Confirmation Modal

```
        ┌────────────────────────────────────┐
        │ ⚠️  Delete Backup File             │
        ├────────────────────────────────────┤
        │                                    │
        │ Are you sure you want to delete    │
        │ this backup file?                  │
        │                                    │
        │ ┌────────────────────────────────┐ │
        │ │ backup_production_gymdb_       │ │
        │ │   2024-12-21T09-15-00.sql      │ │
        │ └────────────────────────────────┘ │
        │                                    │
        │ This action cannot be undone.      │
        │                                    │
        │          [Cancel]  [🗑️ Delete]     │
        │                                    │
        └────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SystemAuditTab.vue                                 │   │
│  │  - Shows "Database Backup & Restore" card           │   │
│  │  - Opens DatabaseBackupCanvas on click              │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DatabaseBackupCanvas.vue                           │   │
│  │  - Main UI component (drawer)                       │   │
│  │  - Displays backups list                            │   │
│  │  - Shows database info                              │   │
│  │  - Handles user interactions                        │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  useDatabaseBackup.js (Composable)                  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ State:                                        │  │   │
│  │  │  - backups: ref([])                           │  │   │
│  │  │  - databaseInfo: ref(null)                    │  │   │
│  │  │  - isLoading: ref(false)                      │  │   │
│  │  │  - isCreatingBackup: ref(false)               │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ Methods:                                      │  │   │
│  │  │  - fetchBackups()                             │  │   │
│  │  │  - createBackup()                             │  │   │
│  │  │  - downloadBackup(filename)                   │  │   │
│  │  │  - deleteBackup(filename)                     │  │   │
│  │  │  - fetchDatabaseInfo()                        │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      │ HTTP Requests (JWT Auth)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    BACKEND API                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST   /api/v1/admin/database/backup                       │
│         ➜ Creates new backup                                │
│         ➜ Returns: { filename, size, environment }          │
│                                                             │
│  GET    /api/v1/admin/database/backups                      │
│         ➜ Lists all backups                                 │
│         ➜ Returns: { backups[], total, totalSizeMB }        │
│                                                             │
│  GET    /api/v1/admin/database/download/:filename           │
│         ➜ Streams backup file                               │
│         ➜ Returns: SQL file download                        │
│                                                             │
│  DELETE /api/v1/admin/database/backups/:filename            │
│         ➜ Deletes backup file                               │
│         ➜ Returns: { success, filename }                    │
│                                                             │
│  GET    /api/v1/admin/database/info                         │
│         ➜ Gets database information                         │
│         ➜ Returns: { database, size, tableCount, ... }      │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE & FILES                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MySQL/PostgreSQL Database                                  │
│  ┌─────────────────────────────┐                           │
│  │ gym_production              │                           │
│  │ - 45 tables                 │                           │
│  │ - 152.45 MB                 │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  Backup Files (backups/)                                    │
│  ┌─────────────────────────────┐                           │
│  │ backup_production_gymdb_    │                           │
│  │   2024-12-22T10-30-00.sql   │ 45.32 MB                  │
│  ├─────────────────────────────┤                           │
│  │ backup_production_gymdb_    │                           │
│  │   2024-12-21T09-15-00.sql   │ 44.09 MB                  │
│  ├─────────────────────────────┤                           │
│  │ ...  (up to 10 backups)     │                           │
│  └─────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Flow

```
┌───────────────────────────────────────────────────────────┐
│                     USER LOGIN                            │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────────────────┐
│  Authentication Check                                     │
│  - Is user logged in?                                     │
│  - Has valid JWT token?                                   │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────────────────┐
│  Super Admin Check                                        │
│  - authStore.user?.isSuperAdmin === true?                 │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ├─── ❌ NO ──────────────────────────────┐
                     │                                        │
                     │                                        ▼
                     │                        Feature NOT visible
                     │                        (v-if="isSuperAdmin")
                     │
                     └─── ✅ YES ─────────────────────────────┐
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Feature Visible                                                │
│  - Can see "Database Backup & Restore" card                     │
│  - Can click "Manage Backups"                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Request with JWT                                           │
│  - Authorization: Bearer <token>                                │
│  - Backend validates token                                      │
│  - Backend checks isSuperAdmin middleware                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─── ❌ INVALID TOKEN ──────────────────────┐
                     │                                            │
                     │                                            ▼
                     │                            401 Unauthorized
                     │                            (Show error toast)
                     │
                     └─── ✅ VALID & SUPER ADMIN ────────────────┐
                                                                  │
                                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Operation Allowed                                              │
│  - Create backup                                                │
│  - View backups                                                 │
│  - Download backup                                              │
│  - Delete backup                                                │
│  - View database info                                           │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Component Mounted / Canvas Opened                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  isLoading = true                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──────────────┬─────────────────────────┐
                     │              │                         │
                     ▼              ▼                         ▼
        ┌──────────────────┐  ┌──────────────┐   (Parallel requests)
        │ fetchBackups()   │  │ fetchDatabase│
        │                  │  │   Info()     │
        └────────┬─────────┘  └──────┬───────┘
                 │                   │
                 │                   │
                 ▼                   ▼
        ┌──────────────────┐  ┌──────────────┐
        │ backups = [...]  │  │ databaseInfo │
        │                  │  │   = {...}    │
        └────────┬─────────┘  └──────┬───────┘
                 │                   │
                 └──────────┬────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  isLoading = false                                          │
│  UI renders with data                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 User Interaction Flow

```
USER CREATES BACKUP:
┌────────────────┐
│ Click "Create  │
│   Backup"      │
└────┬───────────┘
     │
     ▼
┌────────────────────────┐
│ isCreatingBackup=true  │
│ Button shows spinner   │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ POST /api/.../backup   │
└────┬───────────────────┘
     │
     ├─── ❌ Error ────────┐
     │                     ▼
     │         ┌──────────────────┐
     │         │ showError()      │
     │         │ isCreating=false │
     │         └──────────────────┘
     │
     └─── ✅ Success ─────┐
                          ▼
              ┌──────────────────────┐
              │ showSuccess()        │
              │ fetchBackups()       │
              │ isCreating=false     │
              │ List updates         │
              └──────────────────────┘

USER DOWNLOADS BACKUP:
┌────────────────┐
│ Click Download │
│   button       │
└────┬───────────┘
     │
     ▼
┌────────────────────────────┐
│ GET /api/.../download/file │
│ with JWT token             │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│ Create blob from response  │
│ Trigger browser download   │
│ showSuccess()              │
└────────────────────────────┘

USER DELETES BACKUP:
┌────────────────┐
│ Click Delete   │
│   button       │
└────┬───────────┘
     │
     ▼
┌────────────────────────────┐
│ Show confirmation modal    │
│ "Are you sure?"            │
└────┬───────────────────────┘
     │
     ├─── Cancel ─────────────┐
     │                        ▼
     │              ┌──────────────┐
     │              │ Close modal  │
     │              │ No action    │
     │              └──────────────┘
     │
     └─── Confirm ───────────┐
                             ▼
                  ┌────────────────────────┐
                  │ DELETE /api/.../file   │
                  └────┬───────────────────┘
                       │
                       ├─── Error ────┐
                       │              ▼
                       │    ┌──────────────┐
                       │    │ showError()  │
                       │    └──────────────┘
                       │
                       └─── Success ─┐
                                     ▼
                          ┌──────────────────┐
                          │ showSuccess()    │
                          │ fetchBackups()   │
                          │ Close modal      │
                          │ List updates     │
                          └──────────────────┘
```

## 🎨 Component Hierarchy

```
SystemAuditTab.vue
│
├─ v-if="isSuperAdmin"
│  │
│  ├─ Features Metadata Card
│  │  └─ [View Metadata] → FeaturesMetadataCanvas
│  │
│  ├─ System Information Card
│  │  └─ Environment & Version info
│  │
│  └─ 🆕 Database Backup & Restore Card
│     └─ [Manage Backups] → DatabaseBackupCanvas
│        │
│        ├─ Header (title, close button)
│        │
│        ├─ Quick Actions
│        │  ├─ [Create Backup] button
│        │  └─ [Refresh] button
│        │
│        ├─ Database Info Card
│        │  ├─ Database name
│        │  ├─ Type (MySQL/Postgres)
│        │  ├─ Size
│        │  ├─ Table count
│        │  └─ Environment badge
│        │
│        ├─ Statistics Cards
│        │  ├─ Total Backups
│        │  ├─ Total Size
│        │  └─ Latest Backup time
│        │
│        ├─ Backups Table
│        │  └─ For each backup:
│        │     ├─ Filename
│        │     ├─ Size
│        │     ├─ Environment badge
│        │     ├─ Created date/time
│        │     └─ Actions
│        │        ├─ [Download] button
│        │        └─ [Delete] button
│        │
│        ├─ Warning Notice
│        │  └─ Important notes
│        │
│        └─ Delete Confirmation Modal
│           ├─ Warning message
│           ├─ Filename display
│           ├─ [Cancel] button
│           └─ [Delete] button
│
└─ Audit Log Card
   └─ [View Logs] → AuditLogCanvas
```

---

**Last Updated:** December 22, 2025
