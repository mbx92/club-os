# Psikogram API Specification

Dokumentasi API untuk fitur Psikogram pada modul Psychology.

## Overview

Psikogram adalah dokumen hasil evaluasi psikologi yang berisi penilaian berbagai aspek kepribadian dan kemampuan peserta. Fitur ini memungkinkan psikolog untuk:
- Membuat psikogram berdasarkan hasil tes psikologi yang sudah terverifikasi
- Memberikan rating (R/K/C/B/T) untuk setiap aspek
- Menambahkan kesimpulan per section
- Memberikan rekomendasi akhir (Disarankan/Tidak Disarankan)
- Mencetak psikogram dalam format yang rapi

---

## Rating Scale

| Code | Label | Deskripsi |
|------|-------|-----------|
| `R` | Rendah | Skor terendah |
| `K` | Kurang | Di bawah rata-rata |
| `C` | Cukup | Rata-rata |
| `B` | Baik | Di atas rata-rata |
| `T` | Tinggi | Skor tertinggi |

---

## Data Models

### Psikogram Schema

```javascript
{
  id: String (UUID),
  
  // Relasi ke patient dan session
  patientId: String (UUID, required),
  sessionId: String (UUID, optional), // Session tes yang menjadi dasar psikogram
  
  // Info pemeriksaan
  examDate: Date (required), // Tanggal pemeriksaan
  examinerId: String (UUID), // Auto-filled dari user yang login
  
  // Data peserta (snapshot saat psikogram dibuat)
  participant: {
    name: String (required),
    birthDate: Date,
    education: String, // SMA, D1, D2, D3, S1, S2, S3
    corporate: String  // Perusahaan/Instansi
  },
  
  // Sections penilaian
  sections: {
    kecerdasan: SectionSchema,
    sikapKerja: SectionSchema,
    kepribadian: SectionSchema,
    kemampuanBelajar: SectionSchema
  },
  
  // Rekomendasi akhir
  recommendation: Enum ['recommended', 'not_recommended'],
  
  // Status dokumen
  status: Enum ['draft', 'final'] (default: 'draft'),
  
  // Timestamps
  createdAt: DateTime,
  updatedAt: DateTime
}

// Section Schema
SectionSchema = {
  items: [
    {
      title: String,
      description: String,
      rating: Enum ['R', 'K', 'C', 'B', 'T']
    }
  ],
  conclusion: String // Kesimpulan per section
}
```

---

## API Endpoints

### 1. Create Psikogram

Membuat psikogram baru.

```
POST /api/psychology/psikograms
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "patientId": "048663ce-f7a9-4805-891a-f6bb8ef9b14f",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "examDate": "2025-12-03",
  "participant": {
    "name": "I Kadek Dipa Pratama Putra",
    "birthDate": "1999-05-15",
    "education": "S1",
    "corporate": "PT Contoh Perusahaan"
  },
  "sections": {
    "kecerdasan": {
      "items": [
        {
          "title": "Logika Berpikir",
          "description": "Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi.",
          "rating": "B"
        },
        {
          "title": "Kemampuan Analisa",
          "description": "Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian yang lebih kecil.",
          "rating": "C"
        },
        {
          "title": "Kemampuan Numerikal",
          "description": "Kemampuan untuk berpikir praktis dalam memahami konsep angka dan hitungan.",
          "rating": "T"
        },
        {
          "title": "Kemampuan Verbal",
          "description": "Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata.",
          "rating": "B"
        }
      ],
      "conclusion": "Subjek memiliki kemampuan intelektual yang baik dengan keunggulan pada aspek numerikal."
    },
    "sikapKerja": {
      "items": [
        {
          "title": "Orientasi Hasil",
          "description": "Kemampuan untuk mempertahankan komitmen untuk menyelesaikan tugas secara bertanggung jawab.",
          "rating": "B"
        },
        {
          "title": "Fleksibilitas",
          "description": "Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan.",
          "rating": "C"
        },
        {
          "title": "Sistematika Kerja",
          "description": "Kemampuan untuk merencanakan hingga mengorganisasikan cara kerja.",
          "rating": "B"
        }
      ],
      "conclusion": "Subjek menunjukkan sikap kerja yang baik dan berorientasi pada hasil."
    },
    "kepribadian": {
      "items": [
        {
          "title": "Motivasi Berprestasi",
          "description": "Kemampuan untuk menunjukkan prestasi dan mencapai target.",
          "rating": "T"
        },
        {
          "title": "Kerjasama",
          "description": "Kemampuan untuk menjalin, membina dan mengoptimalkan hubungan kerja yang efektif.",
          "rating": "B"
        },
        {
          "title": "Keterampilan Interpersonal",
          "description": "Kemampuan untuk menjalin hubungan sosial dan mampu memahami kebutuhan orang lain.",
          "rating": "C"
        },
        {
          "title": "Stabilitas Emosi",
          "description": "Kemampuan untuk memahami dan mengontrol emosi.",
          "rating": "B"
        }
      ],
      "conclusion": "Subjek memiliki motivasi tinggi dan kemampuan bekerja sama yang baik."
    },
    "kemampuanBelajar": {
      "items": [
        {
          "title": "Pengembangan Diri",
          "description": "Kemampuan untuk meningkatkan pengetahuan dan menyempurnakan keterampilan diri.",
          "rating": "B"
        },
        {
          "title": "Mengelola Perubahan",
          "description": "Kemampuan dalam menyesuaikan diri dengan situasi baru.",
          "rating": "C"
        }
      ],
      "conclusion": "Subjek memiliki kemauan belajar yang baik."
    }
  },
  "recommendation": "recommended",
  "status": "final"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Psikogram berhasil dibuat",
  "data": {
    "id": "f8a7b6c5-d4e3-2f1a-0b9c-8d7e6f5a4b3c",
    "patientId": "048663ce-f7a9-4805-891a-f6bb8ef9b14f",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "examDate": "2025-12-03",
    "participant": {
      "name": "I Kadek Dipa Pratama Putra",
      "birthDate": "1999-05-15",
      "education": "S1",
      "corporate": "PT Contoh Perusahaan"
    },
    "sections": { ... },
    "recommendation": "recommended",
    "status": "final",
    "examiner": {
      "id": "user-uuid",
      "name": "Dr. Psikolog, M.Psi"
    },
    "createdAt": "2025-12-03T10:30:00.000Z",
    "updatedAt": "2025-12-03T10:30:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "patientId",
      "message": "Patient ID is required"
    },
    {
      "field": "sections.kecerdasan.items[0].rating",
      "message": "Rating must be one of: R, K, C, B, T"
    }
  ]
}
```

---

### 2. Get All Psikograms (List)

Mengambil daftar psikogram dengan pagination dan filter.

```
GET /api/psychology/psikograms
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Number | 1 | Halaman |
| `limit` | Number | 20 | Jumlah per halaman |
| `status` | String | - | Filter by status: `draft`, `final` |
| `patientId` | UUID | - | Filter by patient |
| `examinerId` | UUID | - | Filter by examiner |
| `startDate` | Date | - | Filter examDate >= startDate |
| `endDate` | Date | - | Filter examDate <= endDate |
| `search` | String | - | Search by participant name |
| `sortBy` | String | `createdAt` | Sort field |
| `sortOrder` | String | `desc` | Sort order: `asc`, `desc` |

**Example Request:**
```
GET /api/psychology/psikograms?page=1&limit=10&status=final&search=kadek
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "f8a7b6c5-d4e3-2f1a-0b9c-8d7e6f5a4b3c",
      "patientId": "048663ce-f7a9-4805-891a-f6bb8ef9b14f",
      "examDate": "2025-12-03",
      "participant": {
        "name": "I Kadek Dipa Pratama Putra",
        "birthDate": "1999-05-15",
        "education": "S1",
        "corporate": "PT Contoh Perusahaan"
      },
      "recommendation": "recommended",
      "status": "final",
      "examiner": {
        "id": "user-uuid",
        "name": "Dr. Psikolog, M.Psi"
      },
      "createdAt": "2025-12-03T10:30:00.000Z",
      "updatedAt": "2025-12-03T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 3. Get Psikogram by ID

Mengambil detail psikogram berdasarkan ID.

```
GET /api/psychology/psikograms/:id
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "f8a7b6c5-d4e3-2f1a-0b9c-8d7e6f5a4b3c",
    "patientId": "048663ce-f7a9-4805-891a-f6bb8ef9b14f",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "examDate": "2025-12-03",
    "participant": {
      "name": "I Kadek Dipa Pratama Putra",
      "birthDate": "1999-05-15",
      "education": "S1",
      "corporate": "PT Contoh Perusahaan"
    },
    "sections": {
      "kecerdasan": {
        "items": [
          {
            "title": "Logika Berpikir",
            "description": "Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi.",
            "rating": "B"
          },
          ...
        ],
        "conclusion": "Subjek memiliki kemampuan intelektual yang baik..."
      },
      "sikapKerja": { ... },
      "kepribadian": { ... },
      "kemampuanBelajar": { ... }
    },
    "recommendation": "recommended",
    "status": "final",
    "examiner": {
      "id": "user-uuid",
      "name": "Dr. Psikolog, M.Psi"
    },
    "patient": {
      "id": "048663ce-f7a9-4805-891a-f6bb8ef9b14f",
      "fullName": "I Kadek Dipa Pratama Putra",
      "email": "kadek@example.com"
    },
    "session": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "testType": {
        "name": "PAPI Kostick"
      },
      "completedAt": "2025-12-02T15:30:00.000Z",
      "verifiedAt": "2025-12-02T16:00:00.000Z"
    },
    "createdAt": "2025-12-03T10:30:00.000Z",
    "updatedAt": "2025-12-03T10:30:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Psikogram not found"
}
```

---

### 4. Update Psikogram

Mengupdate psikogram yang sudah ada.

```
PUT /api/psychology/psikograms/:id
```

**Request Body:** (Same as Create, all fields optional)
```json
{
  "sections": {
    "kecerdasan": {
      "items": [...],
      "conclusion": "Updated conclusion"
    }
  },
  "recommendation": "not_recommended",
  "status": "final"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Psikogram berhasil diupdate",
  "data": { ... }
}
```

**Business Rules:**
- Psikogram dengan status `final` hanya bisa diupdate oleh examiner yang sama atau admin
- Perubahan status dari `final` ke `draft` memerlukan permission khusus

---

### 5. Delete Psikogram

Menghapus psikogram.

```
DELETE /api/psychology/psikograms/:id
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Psikogram berhasil dihapus"
}
```

**Business Rules:**
- Hanya psikogram dengan status `draft` yang bisa dihapus
- Psikogram `final` memerlukan soft delete atau permission admin

---

### 6. Get Psikogram Print Data (Optional)

Mengambil data untuk keperluan print/PDF.

```
GET /api/psychology/psikograms/:id/print
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "f8a7b6c5-d4e3-2f1a-0b9c-8d7e6f5a4b3c",
    "examDate": "2025-12-03",
    "participant": {
      "name": "I Kadek Dipa Pratama Putra",
      "birthDate": "1999-05-15",
      "age": 26,
      "education": "S1",
      "corporate": "PT Contoh Perusahaan"
    },
    "sections": { ... },
    "recommendation": "recommended",
    "recommendationLabel": "DISARANKAN",
    "examiner": {
      "name": "Dr. Psikolog, M.Psi",
      "title": "Psikolog Klinis"
    },
    "organization": {
      "name": "Klinik Psikologi ABC",
      "logo": "https://example.com/logo.png",
      "address": "Jl. Contoh No. 123"
    }
  }
}
```

---

## Default Section Items

Berikut adalah default items untuk setiap section yang digunakan di frontend:

### A. Kecerdasan
| Title | Description |
|-------|-------------|
| Logika Berpikir | Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi. |
| Kemampuan Analisa | Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian yang lebih kecil. |
| Kemampuan Numerikal | Kemampuan untuk berpikir praktis dalam memahami konsep angka dan hitungan. |
| Kemampuan Verbal | Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata. |

### B. Sikap dan Cara Kerja
| Title | Description |
|-------|-------------|
| Orientasi Hasil | Kemampuan untuk mempertahankan komitmen untuk menyelesaikan tugas secara bertanggung jawab. |
| Fleksibilitas | Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan. |
| Sistematika Kerja | Kemampuan untuk merencanakan hingga mengorganisasikan cara kerja. |

### C. Kepribadian
| Title | Description |
|-------|-------------|
| Motivasi Berprestasi | Kemampuan untuk menunjukkan prestasi dan mencapai target. |
| Kerjasama | Kemampuan untuk menjalin, membina dan mengoptimalkan hubungan kerja yang efektif. |
| Keterampilan Interpersonal | Kemampuan untuk menjalin hubungan sosial dan mampu memahami kebutuhan orang lain. |
| Stabilitas Emosi | Kemampuan untuk memahami dan mengontrol emosi. |

### D. Kemampuan Belajar
| Title | Description |
|-------|-------------|
| Pengembangan Diri | Kemampuan untuk meningkatkan pengetahuan dan menyempurnakan keterampilan diri. |
| Mengelola Perubahan | Kemampuan dalam menyesuaikan diri dengan situasi baru. |

---

## Validation Rules

### Required Fields
- `patientId` - UUID, harus valid patient yang exists
- `examDate` - Date, tidak boleh di masa depan
- `participant.name` - String, min 2 characters
- `status` - Enum: `draft`, `final`

### Optional Fields
- `sessionId` - UUID, jika ada harus valid session dengan status `verified`
- `participant.birthDate` - Date
- `participant.education` - String
- `participant.corporate` - String
- `sections` - Object, semua sections optional
- `recommendation` - Enum: `recommended`, `not_recommended`

### Rating Validation
- Setiap `rating` dalam items harus salah satu dari: `R`, `K`, `C`, `B`, `T`, atau empty string

---

## Authorization

| Endpoint | Required Permission |
|----------|---------------------|
| `POST /psikograms` | `create:Psikogram` atau `create:PsychologySession` |
| `GET /psikograms` | `read:Psikogram` atau `read:PsychologySession` |
| `GET /psikograms/:id` | `read:Psikogram` atau `read:PsychologySession` |
| `PUT /psikograms/:id` | `update:Psikogram` atau owner |
| `DELETE /psikograms/:id` | `delete:Psikogram` atau owner (draft only) |

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Validation error | Request body tidak valid |
| 401 | Unauthorized | Token tidak valid atau expired |
| 403 | Forbidden | Tidak memiliki permission |
| 404 | Psikogram not found | ID tidak ditemukan |
| 409 | Conflict | Duplikat atau constraint violation |
| 500 | Internal server error | Server error |

---

## Notes untuk Backend Developer

1. **Tenant Isolation**: Semua data psikogram harus di-filter berdasarkan `tenantId` dari user yang login.

2. **Examiner Auto-fill**: Field `examinerId` otomatis diisi dari user yang melakukan request POST.

3. **Audit Trail**: Pertimbangkan untuk menyimpan history perubahan untuk psikogram dengan status `final`.

4. **Soft Delete**: Disarankan menggunakan soft delete untuk psikogram final.

5. **Index**: Buat index pada:
   - `tenantId`
   - `patientId`
   - `sessionId`
   - `status`
   - `examDate`
   - `examinerId`

6. **Session Relation**: Jika `sessionId` diberikan, validasi bahwa session tersebut:
   - Milik patient yang sama (`patientId`)
   - Status session adalah `verified`

7. **⚠️ PENTING: Session Detail dengan Answers**
   
   Frontend membutuhkan data `answers` dari session untuk melakukan **auto-analysis** rating aspek Psikogram berdasarkan jawaban PAPI.
   
   **Update endpoint `GET /psychology/sessions/:id`** untuk menyertakan `answers`:
   
   ```json
   {
     "success": true,
     "data": {
       "id": "session-uuid",
       "patientId": "patient-uuid",
       "status": "verified",
       "testType": {
         "id": "test-type-uuid",
         "name": "PAPI Kostick",
         "code": "PAPI_KOSTICK",
         "questions": [
           { "id": 1, "textA": "...", "textB": "...", "scaleA": "G", "scaleB": "L" },
           { "id": 2, "textA": "...", "textB": "...", "scaleA": "S", "scaleB": "W" }
           // ... 90 questions total
         ]
       },
       "answers": [
         { "id": 1, "answer": "A" },
         { "id": 2, "answer": "B" },
         { "id": 3, "answer": "A" }
         // ... all 90 answers
       ],
       "order": {
         "patient": {
           "id": "patient-uuid",
           "fullName": "Nama Peserta",
           "email": "email@example.com",
           "birthDate": "1999-05-15",
           "personalData": {
             "education": "S1",
             "corporate": "PT ABC"
           }
         }
       },
       "completedAt": "2025-12-02T15:30:00Z",
       "verifiedAt": "2025-12-02T16:00:00Z"
     }
   }
   ```
   
   **Format Answers:**
   - `id`: Question ID (1-90 untuk PAPI)
   - `answer`: `"A"` atau `"B"` (pilihan yang dipilih peserta)
   
   **Penggunaan di Frontend:**
   Frontend akan menggunakan data `answers` untuk:
   1. Menghitung skor per skala PAPI (G, L, I, T, V, R, D, C, A, N, P, X, B, O, S, Z, E, K, W, F)
   2. Menganalisis ke aspek Psikogram (Kecerdasan, Sikap Kerja, Kepribadian, Kemampuan Belajar)
   3. Auto-generate rating (R/K/C/B/T) untuk setiap item aspek

---

## Contoh Penggunaan di Frontend

```javascript
// composables/psychology/usePsikogram.js
import { useApi } from '@/composables/core/useApi'

export const usePsikogram = () => {
  const api = useApi()
  
  const createPsikogram = async (data) => {
    return await api.post('/psychology/psikograms', data)
  }
  
  const getPsikograms = async (params) => {
    return await api.get('/psychology/psikograms', { params })
  }
  
  const getPsikogramById = async (id) => {
    return await api.get(`/psychology/psikograms/${id}`)
  }
  
  const updatePsikogram = async (id, data) => {
    return await api.put(`/psychology/psikograms/${id}`, data)
  }
  
  const deletePsikogram = async (id) => {
    return await api.delete(`/psychology/psikograms/${id}`)
  }
  
  return {
    createPsikogram,
    getPsikograms,
    getPsikogramById,
    updatePsikogram,
    deletePsikogram
  }
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-03 | Initial specification |
