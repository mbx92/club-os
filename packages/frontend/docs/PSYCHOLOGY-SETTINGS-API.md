# Psychology Settings API Endpoints

Dokumentasi endpoint yang dibutuhkan untuk fitur Settings Psikolog.

## Overview

Settings psikolog menyimpan konfigurasi profil, branding, dan preferensi laporan untuk modul psikologi.

---

## Endpoints

### 1. Get Psychology Settings

Mengambil pengaturan psikolog yang tersimpan.

**Endpoint:** `GET /psychology/settings`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    
    // Logo & Branding
    "logo": "https://storage.example.com/logo.png",
    "footer": "https://storage.example.com/footer.png",
    "primaryColor": "#1e3a5f",
    "secondaryColor": "#6b7280",
    
    // Psychologist Info
    "psychologistName": "Ns. Dr. Sarah, M.Psi",
    "licenseNumber": "SIPP.1234.05.2020",
    "email": "sarah@example.com",
    "phone": "08xx-xxxx-xxxx",
    
    // Institution Info
    "institutionName": "MENTAL MASTERY CONSULTING",
    "tagline": "HR & Mental Health Consultant",
    "address": "Jl. Sudirman No. 123, Jakarta Selatan",
    "institutionWebsite": "https://www.mentalmastery.com",
    "institutionEmail": "info@mentalmastery.com",
    "institutionPhone": "(021) 123-4567",
    "instagram": "mentalmastery",
    
    // Report Settings
    "reportTitle": "PSIKOGRAM",
    "reportSubtitle": "Hasil Pemeriksaan Psikologis",
    "reportFooter": "Dokumen ini bersifat rahasia dan hanya untuk keperluan yang bersangkutan",
    
    // Display Options
    "showLogo": true,
    "showSignature": true,
    "showWatermark": false,
    
    // Signature
    "signature": "https://storage.example.com/signature.png",
    
    // Timestamps
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Response Not Found (404):**
```json
{
  "success": false,
  "message": "Settings not found",
  "data": null
}
```

> **Note:** Jika settings belum ada, frontend akan menggunakan default values.

---

### 2. Save/Update Psychology Settings

Menyimpan atau memperbarui pengaturan psikolog.

**Endpoint:** `POST /psychology/settings`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  // Logo & Branding
  "logo": "https://storage.example.com/logo.png",
  "footer": "https://storage.example.com/footer.png",
  "primaryColor": "#1e3a5f",
  "secondaryColor": "#6b7280",
  
  // Psychologist Info
  "psychologistName": "Ns. Dr. Sarah, M.Psi",
  "licenseNumber": "SIPP.1234.05.2020",
  "email": "sarah@example.com",
  "phone": "08xx-xxxx-xxxx",
  
  // Institution Info
  "institutionName": "MENTAL MASTERY CONSULTING",
  "tagline": "HR & Mental Health Consultant",
  "address": "Jl. Sudirman No. 123, Jakarta Selatan",
  "institutionWebsite": "https://www.mentalmastery.com",
  "institutionEmail": "info@mentalmastery.com",
  "institutionPhone": "(021) 123-4567",
  "instagram": "mentalmastery",
  
  // Report Settings
  "reportTitle": "PSIKOGRAM",
  "reportSubtitle": "Hasil Pemeriksaan Psikologis",
  "reportFooter": "Dokumen ini bersifat rahasia",
  
  // Display Options
  "showLogo": true,
  "showSignature": true,
  "showWatermark": false,
  
  // Signature (URL or base64)
  "signature": "https://storage.example.com/signature.png"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Settings saved successfully",
  "data": {
    "id": "uuid",
    // ... all saved settings
  }
}
```

**Response Validation Error (422):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": ["Email format is invalid"],
    "primaryColor": ["Invalid color format"]
  }
}
```

---

### 3. Upload File (Logo/Footer/Signature)

Upload file gambar untuk logo, footer, atau tanda tangan.

**Endpoint:** `POST /upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | File gambar (PNG, JPG, SVG) |
| `type` | String | Yes | Tipe file: `psychology-logo`, `psychology-footer`, `psychology-signature` |

**Validations:**
- Max file size: 2MB
- Allowed formats: PNG, JPG, JPEG, SVG
- Recommended dimensions:
  - Logo: 200x200 px (square) atau 400x100 px (landscape)
  - Footer: 800x100 px
  - Signature: 300x150 px (transparent PNG recommended)

**Response Success (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://storage.example.com/uploads/psychology/logo-abc123.png",
    "filename": "logo-abc123.png",
    "size": 102400,
    "mimeType": "image/png"
  }
}
```

**Response Error - File Too Large (413):**
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 2MB"
}
```

**Response Error - Invalid Format (415):**
```json
{
  "success": false,
  "message": "Invalid file format. Allowed: PNG, JPG, JPEG, SVG"
}
```

---

## Data Model

### PsychologySettings Table/Collection

```sql
CREATE TABLE psychology_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Logo & Branding
  logo VARCHAR(500),
  footer VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#1e3a5f',
  secondary_color VARCHAR(7) DEFAULT '#6b7280',
  
  -- Psychologist Info
  psychologist_name VARCHAR(255),
  license_number VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Institution Info
  institution_name VARCHAR(255),
  tagline VARCHAR(255),
  address TEXT,
  institution_website VARCHAR(255),
  institution_email VARCHAR(255),
  institution_phone VARCHAR(50),
  instagram VARCHAR(100),
  
  -- Report Settings
  report_title VARCHAR(100) DEFAULT 'PSIKOGRAM',
  report_subtitle VARCHAR(255) DEFAULT 'Hasil Pemeriksaan Psikologis',
  report_footer TEXT,
  
  -- Display Options
  show_logo BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  show_watermark BOOLEAN DEFAULT false,
  
  -- Signature
  signature VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id)
);
```

---

## Alternative: Base64 Support

Jika tidak ingin menggunakan upload terpisah, endpoint settings juga bisa menerima base64 string langsung:

```json
{
  "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "footer": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Considerations:**
- Base64 increases payload size by ~33%
- Simpler implementation (no separate upload endpoint needed)
- Not recommended for large images
- Database storage increases significantly

---

## Frontend Usage Examples

### Fetching Settings
```javascript
const loadSettings = async () => {
  try {
    const response = await api.get('/psychology/settings')
    if (response.data) {
      Object.assign(settings, response.data)
    }
  } catch (error) {
    // Use default settings if not found
    console.log('Using default settings')
  }
}
```

### Saving Settings with File Upload
```javascript
const saveSettings = async () => {
  const payload = { ...settings }
  
  // Upload logo if new file selected
  if (logoFile.value) {
    const formData = new FormData()
    formData.append('file', logoFile.value)
    formData.append('type', 'psychology-logo')
    
    const uploadRes = await api.post('/upload', formData)
    if (uploadRes.data?.url) {
      payload.logo = uploadRes.data.url
    }
  }
  
  // Save settings
  await api.post('/psychology/settings', payload)
}
```

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Settings are tenant-scoped (multi-tenant support)
3. **File Validation**: Validate file type, size, and content on server
4. **XSS Prevention**: Sanitize text inputs before storing
5. **CORS**: Configure allowed origins properly

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Settings not exist |
| 413 | Payload Too Large - File exceeds limit |
| 415 | Unsupported Media Type - Invalid file format |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |
