# Testing Database Backup & Restore Endpoints

Quick guide untuk testing database backup/restore endpoints.

## Prerequisites

1. Server running: `npm run start:dev`
2. Super admin token (login sebagai super admin)

## Test Flow

### 1. Login sebagai Super Admin

**Request:**
```http
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "email": "superadmin@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "superadmin@example.com",
      "isSuperAdmin": true
    }
  }
}
```

**Copy the token** untuk digunakan di request selanjutnya.

---

### 2. Get Database Info

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/info
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "database": "gym_dev",
    "dialect": "postgres",
    "host": "10.50.30.42",
    "port": "5432",
    "environment": "development",
    "size": "12.45 MB",
    "tableCount": 45,
    "lastMigration": "20241222103000-some-migration.js",
    "timestamp": "2024-12-22T12:00:00.000Z"
  }
}
```

---

### 3. Create Backup

**Request:**
```http
POST http://localhost:8000/api/v1/admin/database/backup
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Database backup created successfully",
  "data": {
    "filename": "backup_development_gym_dev_2024-12-22T14-30-00.sql",
    "size": "12.45 MB",
    "database": "gym_dev",
    "environment": "development",
    "timestamp": "2024-12-22T14:30:00.000Z",
    "downloadUrl": "/api/v1/admin/database/download/backup_development_gym_dev_2024-12-22T14-30-00.sql"
  }
}
```

**Check backups directory:**
```bash
ls backups/
# Should see: backup_development_gym_dev_2024-12-22T14-30-00.sql
```

---

### 4. List All Backups

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/backups
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "filename": "backup_development_gym_dev_2024-12-22T14-30-00.sql",
        "size": 13056000,
        "sizeMB": "12.45",
        "createdAt": "2024-12-22T14:30:00.000Z",
        "environment": "development",
        "downloadUrl": "/api/v1/admin/database/download/backup_development_gym_dev_2024-12-22T14-30-00.sql"
      }
    ],
    "total": 1,
    "totalSizeMB": "12.45"
  }
}
```

---

### 5. Download Backup

**Request (Browser/Postman):**
```
http://localhost:8000/api/v1/admin/database/download/backup_development_gym_dev_2024-12-22T14-30-00.sql
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Browser:**
```javascript
// Frontend code
function downloadBackup(filename, token) {
  const url = `http://localhost:8000/api/v1/admin/database/download/${filename}`;
  
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}
```

**cURL:**
```bash
curl -X GET "http://localhost:8000/api/v1/admin/database/download/backup_development_gym_dev_2024-12-22T14-30-00.sql" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output backup.sql
```

**Expected:**
- File downloaded as `backup_development_gym_dev_2024-12-22T14-30-00.sql`
- Content-Type: `application/sql`

---

### 6. Delete Backup

**Request:**
```http
DELETE http://localhost:8000/api/v1/admin/database/backups/backup_development_gym_dev_2024-12-22T14-30-00.sql
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup file deleted successfully",
  "data": {
    "filename": "backup_development_gym_dev_2024-12-22T14-30-00.sql"
  }
}
```

**Verify deletion:**
```bash
ls backups/
# File should be deleted
```

---

## Error Cases

### 1. Non-Super Admin User

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/info
Authorization: Bearer REGULAR_USER_TOKEN
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Forbidden: Super Admin access required"
}
```

---

### 2. Invalid Filename (Security Test)

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/download/../../../etc/passwd
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid filename"
}
```

---

### 3. File Not Found

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/download/nonexistent.sql
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Backup file not found"
}
```

---

### 4. No Authentication

**Request:**
```http
GET http://localhost:8000/api/v1/admin/database/info
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthorized: Authentication required"
}
```

---

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Database Backup & Restore",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8000/api/v1"
    },
    {
      "key": "token",
      "value": "YOUR_SUPER_ADMIN_TOKEN"
    }
  ],
  "item": [
    {
      "name": "Get Database Info",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/admin/database/info"
      }
    },
    {
      "name": "Create Backup",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/admin/database/backup"
      }
    },
    {
      "name": "List Backups",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/admin/database/backups"
      }
    },
    {
      "name": "Download Backup",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/admin/database/download/backup_development_gym_dev_2024-12-22T14-30-00.sql"
      }
    },
    {
      "name": "Delete Backup",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/admin/database/backups/backup_development_gym_dev_2024-12-22T14-30-00.sql"
      }
    }
  ]
}
```

---

## Command Line Testing

### Create backup via CLI
```bash
npm run db:backup:dev
```

**Expected output:**
```
🔄 Starting PostgreSQL backup for development environment...
📦 Database: gym_dev
📁 File: backup_development_gym_dev_2024-12-22T14-30-00.sql
✅ Backup completed successfully!
📊 Size: 12.45 MB
📂 Location: G:\onDev\gym-be\backups\backup_development_gym_dev_2024-12-22T14-30-00.sql

📋 Backup Summary:
{
  "filename": "backup_development_gym_dev_2024-12-22T14-30-00.sql",
  "filePath": "G:\\onDev\\gym-be\\backups\\backup_development_gym_dev_2024-12-22T14-30-00.sql",
  "size": 13056000,
  "sizeMB": "12.45",
  "database": "gym_dev",
  "environment": "development",
  "timestamp": "2024-12-22T14:30:00.000Z"
}
```

### List backups
```bash
ls -la backups/
# or Windows
dir backups\
```

---

## Monitoring Logs

Check application logs for backup operations:

```bash
tail -f logs/combined.log
```

**Expected log entries:**
```
info: Database backup initiated {"userId":"admin-uuid","userName":"Admin Name","isSuperAdmin":true}
info: Database backup completed {"userId":"admin-uuid","filename":"backup_development_gym_dev_2024-12-22T14-30-00.sql","size":"12.45 MB"}
```

---

## Troubleshooting

### "pg_dump: command not found"
```bash
# Install PostgreSQL client
# Windows: Download from postgresql.org
# Add to PATH: C:\Program Files\PostgreSQL\16\bin

# Test
pg_dump --version
```

### "Access denied"
Check `.env.development`:
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=10.50.30.42
DB_PORT=5432
DB_NAME=gym_dev
```

### "Backup file not created"
```bash
# Check disk space
df -h

# Check write permissions
ls -la backups/

# Create directory if missing
mkdir backups
```

---

**Last Updated:** December 22, 2024
