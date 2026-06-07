# Psychology Module - Frontend Integration Guide

## Overview

Psychology Module menyediakan layanan tes psikologi online dengan dukungan berbagai jenis tes (PAPI Kostick, EPPS, dll). Module ini mendukung:

- **Multi-tenancy**: Isolasi data per tenant
- **Feature-gating**: Berdasarkan subscription plan
- **Public access**: Pasien dapat mengerjakan tes tanpa login via token
- **Hybrid scoring**: Frontend preview + backend verification

## Base URL

```
/api/v1/psychology
```

## Authentication

- **Private endpoints**: Memerlukan JWT token + `psychology` module enabled
- **Public endpoints**: Menggunakan access token (tidak perlu login)

```javascript
// Private endpoints
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}

// Public endpoints - no auth header needed
// Token is part of URL path
```

---

# Public Endpoints (Untuk Pasien)

Endpoint ini digunakan pasien untuk mengerjakan tes psikologi. Tidak memerlukan login, hanya memerlukan access token yang dikirim via email/WhatsApp.

## 1. Validate Access Token

Memvalidasi token dan mendapatkan informasi tes.

**Endpoint:**
```
GET /api/v1/psychology/public/access/:token
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "orderNumber": "PSY-2025-0001",
      "patientName": "John Doe"
    },
    "sessions": [
      {
        "id": 1,
        "testType": {
          "id": 1,
          "code": "PAPI_KOSTICK",
          "name": "PAPI Kostick",
          "description": "Personality and Preference Inventory",
          "estimatedMinutes": 30
        },
        "status": "pending",
        "startedAt": null,
        "completedAt": null
      },
      {
        "id": 2,
        "testType": {
          "id": 2,
          "code": "EPPS",
          "name": "Edwards Personal Preference Schedule",
          "estimatedMinutes": 45
        },
        "status": "pending"
      }
    ],
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "message": "Invalid or expired access token"
}
```

**Vue 3 Implementation:**
```javascript
// composables/usePsychologyPublic.js
import { ref } from 'vue'
import { api } from '@/api/client'

export function usePsychologyPublic() {
  const tokenData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function validateToken(token) {
    loading.value = true
    error.value = null
    try {
      const response = await api(`/psychology/public/access/${token}`)
      tokenData.value = response.data
      return response.data
    } catch (err) {
      error.value = err.data?.message || 'Token tidak valid'
      throw err
    } finally {
      loading.value = false
    }
  }

  return { tokenData, loading, error, validateToken }
}
```

---

## 2. Get Test Questions

Mengambil soal-soal untuk sesi tes tertentu.

**Endpoint:**
```
GET /api/v1/psychology/public/access/:token/session/:sessionId/questions
```

**Response Success (200) - PAPI Kostick:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "status": "in_progress",
      "startedAt": "2025-01-15T10:00:00.000Z"
    },
    "testType": {
      "code": "PAPI_KOSTICK",
      "name": "PAPI Kostick",
      "estimatedMinutes": 30,
      "totalQuestions": 90
    },
    "questions": [
      {
        "id": 1,
        "textA": "Saya seorang pekerja giat",
        "textB": "Saya bukan seorang pemurung"
      },
      {
        "id": 2,
        "textA": "Saya biasanya menjadi pemimpin dalam kelompok",
        "textB": "Saya suka mengerjakan sesuatu dengan teliti"
      }
      // ... 90 questions total
    ],
    "savedAnswers": {
      "1": "A",
      "2": "B"
      // Previously saved answers (if any)
    }
  }
}
```

**Response Success (200) - EPPS:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 2,
      "status": "in_progress"
    },
    "testType": {
      "code": "EPPS",
      "name": "Edwards Personal Preference Schedule",
      "estimatedMinutes": 45,
      "totalQuestions": 225
    },
    "questions": [
      {
        "id": 1,
        "textA": "Saya ingin menolong teman-teman saya, bila mereka berada dalam kesulitan.",
        "textB": "Saya ingin berkarya dan bekerja sebaik mungkin."
      },
      {
        "id": 2,
        "textA": "Saya ingin mengetahui pandangan tokoh-tokoh dan para ahli mengenai berbagai masalah yang menarik perhatian saya.",
        "textB": "Saya ingin ahli dalam suatu pekerjaan, jabatan, atau bidang khusus."
      }
      // ... 225 questions total
    ],
    "savedAnswers": {}
  }
}
```

> **Note untuk Frontend Developer:**
> - Tampilkan `textA` dan `textB` untuk setiap soal
> - User memilih A atau B
> - Tidak perlu menampilkan/memproses field lain (scaleA/scaleB untuk PAPI, rowIdx/colIdx untuk EPPS)
> - Scoring dilakukan oleh backend

**Vue 3 Component Example:**
```vue
<template>
  <div class="test-container">
    <!-- Progress -->
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: `${(currentIndex / questions.length) * 100}%` }"
      />
    </div>
    <p class="progress-text">
      Soal {{ currentIndex + 1 }} dari {{ questions.length }}
    </p>

    <!-- Question -->
    <div class="question-card" v-if="currentQuestion">
      <h2>Pilih salah satu yang paling menggambarkan diri Anda:</h2>
      
      <div class="choices">
        <button 
          class="choice-btn"
          :class="{ selected: answers[currentQuestion.id] === 'A' }"
          @click="selectAnswer('A')"
        >
          <span class="choice-label">A</span>
          <span class="choice-text">{{ currentQuestion.textA }}</span>
        </button>
        
        <button 
          class="choice-btn"
          :class="{ selected: answers[currentQuestion.id] === 'B' }"
          @click="selectAnswer('B')"
        >
          <span class="choice-label">B</span>
          <span class="choice-text">{{ currentQuestion.textB }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav-buttons">
      <button @click="prevQuestion" :disabled="currentIndex === 0">
        Sebelumnya
      </button>
      <button @click="saveProgress" :disabled="saving">
        Simpan Progress
      </button>
      <button 
        v-if="currentIndex < questions.length - 1" 
        @click="nextQuestion"
        :disabled="!answers[currentQuestion.id]"
      >
        Selanjutnya
      </button>
      <button 
        v-else 
        @click="submitTest"
        :disabled="!allAnswered || submitting"
      >
        Selesai & Kirim
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { api } from '@/api/client'

const props = defineProps({
  token: String,
  sessionId: Number
})

const questions = ref([])
const answers = ref({})
const currentIndex = ref(0)
const saving = ref(false)
const submitting = ref(false)

const currentQuestion = computed(() => questions.value[currentIndex.value])
const allAnswered = computed(() => 
  questions.value.every(q => answers.value[q.id])
)

async function loadQuestions() {
  const response = await api(
    `/psychology/public/access/${props.token}/session/${props.sessionId}/questions`
  )
  questions.value = response.data.questions
  answers.value = response.data.savedAnswers || {}
}

function selectAnswer(choice) {
  answers.value[currentQuestion.value.id] = choice
}

function prevQuestion() {
  if (currentIndex.value > 0) currentIndex.value--
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) currentIndex.value++
}

async function saveProgress() {
  saving.value = true
  try {
    await api(`/psychology/public/access/${props.token}/session/${props.sessionId}/save`, {
      method: 'POST',
      body: { answers: answers.value }
    })
    // Show success toast
  } finally {
    saving.value = false
  }
}

async function submitTest() {
  submitting.value = true
  try {
    await api(`/psychology/public/access/${props.token}/session/${props.sessionId}/submit`, {
      method: 'POST',
      body: { answers: answers.value }
    })
    // Navigate to result page
  } finally {
    submitting.value = false
  }
}

// Load on mount
loadQuestions()
</script>
```

---

## 3. Save Progress

Menyimpan jawaban sementara (auto-save).

**Endpoint:**
```
POST /api/v1/psychology/public/access/:token/session/:sessionId/save
```

**Request Body:**
```json
{
  "answers": {
    "1": "A",
    "2": "B",
    "3": "A",
    "4": "B"
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Progress saved",
  "data": {
    "savedAt": "2025-01-15T10:15:00.000Z",
    "answeredCount": 45,
    "totalQuestions": 90
  }
}
```

**Auto-save Implementation:**
```javascript
// Auto-save every 30 seconds
import { watchEffect, onUnmounted } from 'vue'

let autoSaveInterval = null

watchEffect(() => {
  if (Object.keys(answers.value).length > 0) {
    autoSaveInterval = setInterval(() => {
      saveProgress()
    }, 30000)
  }
})

onUnmounted(() => {
  if (autoSaveInterval) clearInterval(autoSaveInterval)
})
```

---

## 4. Submit Answers

Mengirim jawaban final untuk di-score.

**Endpoint:**
```
POST /api/v1/psychology/public/access/:token/session/:sessionId/submit
```

**Request Body:**
```json
{
  "answers": {
    "1": "A",
    "2": "B",
    "3": "A",
    // ... all 90/225 answers
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "completed",
      "completedAt": "2025-01-15T10:45:00.000Z"
    },
    "canViewResult": true
  }
}
```

**Response Error - Incomplete (400):**
```json
{
  "success": false,
  "message": "All questions must be answered",
  "data": {
    "answeredCount": 85,
    "totalQuestions": 90,
    "missingQuestions": [12, 45, 67, 78, 89]
  }
}
```

---

## 5. Get Result

Mengambil hasil tes (jika diizinkan).

**Endpoint:**
```
GET /api/v1/psychology/public/access/:token/session/:sessionId/result
```

**Response Success (200) - PAPI:**
```json
{
  "success": true,
  "data": {
    "testType": "PAPI_KOSTICK",
    "completedAt": "2025-01-15T10:45:00.000Z",
    "scores": {
      "G": 7, "E": 5, "A": 8, "N": 4, "P": 6,
      "X": 3, "B": 5, "O": 6, "Z": 4, "K": 7,
      "F": 8, "W": 5, "C": 6, "L": 7, "I": 4,
      "T": 5, "V": 8, "S": 6, "R": 3, "D": 7
    },
    "interpretation": {
      "scales": [
        {
          "scale": "G",
          "score": 7,
          "level": "high",
          "label": "Hard Working",
          "percentile": 78
        }
        // ... all 20 scales
      ],
      "topScales": [
        { "scale": "A", "score": 8, "label": "Need to Achieve" },
        { "scale": "V", "score": 8, "label": "Vigor" },
        { "scale": "F", "score": 8, "label": "Need for Fairness" }
      ],
      "profile": {
        "workStyle": {
          "pace": 5,
          "vigor": 8,
          "detail": 7,
          "hardWorking": 7
        },
        "leadership": {
          "leadership": 7,
          "decisionMaking": 4,
          "control": 5
        }
      }
    }
  }
}
```

**Response Success (200) - EPPS:**
```json
{
  "success": true,
  "data": {
    "testType": "EPPS",
    "completedAt": "2025-01-15T11:30:00.000Z",
    "scores": {
      "needs": {
        "ach": 18, "def": 12, "ord": 15, "exh": 8, "aut": 14,
        "aff": 16, "int": 11, "suc": 9, "dom": 17, "aba": 7,
        "nur": 20, "chg": 13, "end": 16, "het": 10, "agg": 12
      },
      "consistency": {
        "BD": 12,
        "BH": 3,
        "S": 225,
        "valid": true
      }
    },
    "interpretation": {
      "needs": [
        {
          "need": "ach",
          "score": 18,
          "level": "medium",
          "label": "Achievement",
          "percentile": 64
        }
        // ... all 15 needs
      ],
      "topNeeds": [
        { "need": "nur", "score": 20, "label": "Nurturance" },
        { "need": "ach", "score": 18, "label": "Achievement" },
        { "need": "dom", "score": 17, "label": "Dominance" }
      ],
      "profile": {
        "achievement": {
          "achievement": 18,
          "endurance": 16,
          "order": 15
        },
        "social": {
          "affiliation": 16,
          "nurturance": 20,
          "succorance": 9
        }
      }
    }
  }
}
```

---

# Private Endpoints (Admin Panel)

Endpoint berikut memerlukan JWT authentication dan akses ke module `psychology`.

## Test Types (Jenis Tes)

### Get All Test Types

```
GET /api/v1/psychology/test-types
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "PAPI_KOSTICK",
      "name": "PAPI Kostick",
      "description": "Personality and Preference Inventory",
      "category": "personality",
      "estimatedMinutes": 30,
      "questionCount": 90,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "code": "EPPS",
      "name": "Edwards Personal Preference Schedule",
      "description": "Measures 15 psychological needs",
      "category": "personality",
      "estimatedMinutes": 45,
      "questionCount": 225,
      "isActive": true
    }
  ]
}
```

### Create Test Type

```
POST /api/v1/psychology/test-types
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body - PAPI:**
```json
{
  "code": "PAPI_KOSTICK",
  "name": "PAPI Kostick",
  "description": "Personality and Preference Inventory",
  "category": "personality",
  "estimatedMinutes": 30,
  "questions": [
    {
      "id": 1,
      "textA": "Saya seorang pekerja giat",
      "textB": "Saya bukan seorang pemurung",
      "scaleA": "G",
      "scaleB": "E"
    }
    // ... 90 questions
  ],
  "scoringConfig": {
    "scales": ["G","E","A","N","P","X","B","O","Z","K","F","W","C","L","I","T","V","S","R","D"],
    "maxPerScale": 9
  },
  "isActive": true
}
```

**Request Body - EPPS:**
```json
{
  "code": "EPPS",
  "name": "Edwards Personal Preference Schedule",
  "description": "Measures 15 psychological needs",
  "category": "personality",
  "estimatedMinutes": 45,
  "questions": [
    {
      "id": 1,
      "textA": "Saya ingin menolong teman-teman saya...",
      "textB": "Saya ingin berkarya dan bekerja sebaik mungkin.",
      "rowIdx": 1,
      "colIdx": 1,
      "matrixGroup": 1
    }
    // ... 225 questions
  ],
  "scoringConfig": {
    "needs": ["ach","def","ord","exh","aut","aff","int","suc","dom","aba","nur","chg","end","het","agg"],
    "consistency": ["BD", "BH", "S"],
    "matrixBased": true
  },
  "isActive": true
}
```

### Validate Questions (Preview)

```
POST /api/v1/psychology/test-types/validate
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "testTypeCode": "PAPI_KOSTICK",
  "questions": [...]
}
```

**Response - Valid:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "stats": {
      "total": 90,
      "valid": 90,
      "invalid": 0
    }
  }
}
```

**Response - Invalid:**
```json
{
  "success": false,
  "message": "Question validation failed",
  "errors": [
    "Question 5: invalid scaleA \"X\"",
    "Question 10: textB is required"
  ],
  "stats": {
    "total": 90,
    "valid": 88,
    "invalid": 2
  }
}
```

---

## Patients (Pasien)

### Get All Patients

```
GET /api/v1/psychology/patients
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search by name, email, phone |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "081234567890",
      "birthDate": "1990-05-15",
      "gender": "male",
      "address": "Jakarta Selatan",
      "notes": "Referred by HR dept",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Search Patients (Autocomplete)

```
GET /api/v1/psychology/patients/search?q=john
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" },
    { "id": 5, "name": "Johnny Smith", "email": "johnny@example.com" }
  ]
}
```

### Create Patient

```
POST /api/v1/psychology/patients
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "birthDate": "1990-05-15",
  "gender": "male",
  "address": "Jakarta Selatan",
  "notes": "Referred by HR dept"
}
```

---

## Packages (Paket Tes)

### Get All Packages

```
GET /api/v1/psychology/packages
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic Personality Assessment",
      "description": "PAPI Kostick only",
      "basePrice": 250000,
      "testTypes": [
        { "id": 1, "code": "PAPI_KOSTICK", "name": "PAPI Kostick" }
      ],
      "isActive": true
    },
    {
      "id": 2,
      "name": "Complete Personality Assessment",
      "description": "PAPI Kostick + EPPS",
      "basePrice": 450000,
      "testTypes": [
        { "id": 1, "code": "PAPI_KOSTICK", "name": "PAPI Kostick" },
        { "id": 2, "code": "EPPS", "name": "EPPS" }
      ],
      "isActive": true
    }
  ]
}
```

### Calculate Package Price

```
GET /api/v1/psychology/packages/:id/price?quantity=5
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "packageId": 2,
    "packageName": "Complete Personality Assessment",
    "basePrice": 450000,
    "quantity": 5,
    "subtotal": 2250000,
    "discount": {
      "ruleId": 1,
      "ruleName": "Bulk Discount 5+",
      "type": "percentage",
      "value": 10,
      "amount": 225000
    },
    "finalPrice": 2025000,
    "pricePerUnit": 405000
  }
}
```

### Create Package

```
POST /api/v1/psychology/packages
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Complete Personality Assessment",
  "description": "PAPI Kostick + EPPS",
  "basePrice": 450000,
  "testTypeIds": [1, 2],
  "isActive": true
}
```

---

## Orders (Pemesanan)

### Get All Orders

```
GET /api/v1/psychology/orders
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: pending, paid, completed, cancelled |
| patientId | number | Filter by patient |
| startDate | date | Filter by order date |
| endDate | date | Filter by order date |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "PSY-2025-0001",
      "patient": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "package": {
        "id": 2,
        "name": "Complete Personality Assessment"
      },
      "totalAmount": 405000,
      "paymentStatus": "paid",
      "accessToken": "abc123xyz",
      "accessUrl": "https://test.example.com/access/abc123xyz",
      "expiresAt": "2025-12-31T23:59:59.000Z",
      "sessions": [
        {
          "id": 1,
          "testType": { "code": "PAPI_KOSTICK", "name": "PAPI Kostick" },
          "status": "completed",
          "completedAt": "2025-01-15T10:45:00.000Z"
        },
        {
          "id": 2,
          "testType": { "code": "EPPS", "name": "EPPS" },
          "status": "pending"
        }
      ],
      "createdAt": "2025-01-15T08:00:00.000Z"
    }
  ]
}
```

### Create Order

```
POST /api/v1/psychology/orders
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "patientId": 1,
  "packageId": 2,
  "notes": "Urgent assessment for job application",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "PSY-2025-0001",
    "accessToken": "abc123xyz789def",
    "accessUrl": "https://test.example.com/access/abc123xyz789def",
    "sessions": [
      { "id": 1, "testTypeCode": "PAPI_KOSTICK", "status": "pending" },
      { "id": 2, "testTypeCode": "EPPS", "status": "pending" }
    ]
  }
}
```

### Update Payment Status

```
PATCH /api/v1/psychology/orders/:id/payment
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "paymentStatus": "paid",
  "paymentMethod": "transfer",
  "paymentReference": "TRF-12345"
}
```

### Regenerate Access Token

```
POST /api/v1/psychology/orders/:id/regenerate-token
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "newtoken123abc",
    "accessUrl": "https://test.example.com/access/newtoken123abc"
  }
}
```

### Cancel Order

```
POST /api/v1/psychology/orders/:id/cancel
Authorization: Bearer <jwt_token>
```

---

## Sessions (Sesi Tes)

### Get Session Details

```
GET /api/v1/psychology/sessions/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order": {
      "id": 1,
      "orderNumber": "PSY-2025-0001",
      "patient": { "name": "John Doe" }
    },
    "testType": {
      "code": "PAPI_KOSTICK",
      "name": "PAPI Kostick"
    },
    "status": "completed",
    "startedAt": "2025-01-15T10:00:00.000Z",
    "completedAt": "2025-01-15T10:45:00.000Z",
    "answers": { "1": "A", "2": "B", ... },
    "scores": { "G": 7, "E": 5, ... }
  }
}
```

### Get Session Result (Admin View)

```
GET /api/v1/psychology/sessions/:id/result
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": { ... },
    "scores": { ... },
    "interpretation": { ... },
    "verifiedAt": "2025-01-15T10:45:00.000Z"
  }
}
```

### Recalculate Scores

```
POST /api/v1/psychology/sessions/:id/recalculate
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scores recalculated",
  "data": {
    "previousScores": { ... },
    "newScores": { ... },
    "recalculatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

## Price Rules (Aturan Harga)

### Get All Price Rules

```
GET /api/v1/psychology/price-rules
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bulk Discount 5+",
      "type": "bulk_quantity",
      "discountType": "percentage",
      "discountValue": 10,
      "minQuantity": 5,
      "maxQuantity": null,
      "validFrom": "2025-01-01",
      "validUntil": "2025-12-31",
      "isActive": true,
      "priority": 1
    },
    {
      "id": 2,
      "name": "Corporate Partner Discount",
      "type": "corporate",
      "discountType": "fixed",
      "discountValue": 50000,
      "isActive": true,
      "priority": 2
    }
  ]
}
```

### Create Price Rule

```
POST /api/v1/psychology/price-rules
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Early Bird Discount",
  "type": "promotional",
  "discountType": "percentage",
  "discountValue": 15,
  "validFrom": "2025-01-01",
  "validUntil": "2025-01-31",
  "isActive": true,
  "priority": 1
}
```

### Toggle Price Rule Active

```
PATCH /api/v1/psychology/price-rules/:id/toggle
Authorization: Bearer <jwt_token>
```

---

# Pinia Store Example

```javascript
// stores/psychology.js
import { defineStore } from 'pinia'
import { api } from '@/api/client'

export const usePsychologyStore = defineStore('psychology', {
  state: () => ({
    testTypes: [],
    patients: [],
    packages: [],
    orders: [],
    currentSession: null,
    loading: false,
    error: null
  }),

  actions: {
    // Test Types
    async fetchTestTypes() {
      this.loading = true
      try {
        const response = await api('/psychology/test-types')
        this.testTypes = response.data
      } finally {
        this.loading = false
      }
    },

    async createTestType(data) {
      const response = await api('/psychology/test-types', {
        method: 'POST',
        body: data
      })
      this.testTypes.push(response.data)
      return response.data
    },

    // Patients
    async fetchPatients(params = {}) {
      const response = await api('/psychology/patients', { params })
      this.patients = response.data
      return response
    },

    async searchPatients(query) {
      const response = await api('/psychology/patients/search', {
        params: { q: query }
      })
      return response.data
    },

    // Orders
    async createOrder(data) {
      const response = await api('/psychology/orders', {
        method: 'POST',
        body: data
      })
      this.orders.unshift(response.data)
      return response.data
    },

    async updatePaymentStatus(orderId, data) {
      const response = await api(`/psychology/orders/${orderId}/payment`, {
        method: 'PATCH',
        body: data
      })
      const index = this.orders.findIndex(o => o.id === orderId)
      if (index !== -1) {
        this.orders[index] = { ...this.orders[index], ...response.data }
      }
      return response.data
    },

    // Package Pricing
    async calculatePrice(packageId, quantity) {
      const response = await api(`/psychology/packages/${packageId}/price`, {
        params: { quantity }
      })
      return response.data
    }
  }
})
```

---

# Error Handling

## Common Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Validation failed |
| 401 | UNAUTHORIZED | Invalid or expired token |
| 403 | MODULE_NOT_AVAILABLE | Psychology module not available |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (duplicate) |

## Error Response Format

```json
{
  "success": false,
  "message": "Human readable message",
  "code": "ERROR_CODE",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

## Vue Error Handler

```javascript
// plugins/errorHandler.js
export function setupErrorHandler(app) {
  app.config.errorHandler = (err, vm, info) => {
    if (err.response?.status === 403) {
      const data = err.response.data
      if (data.code === 'MODULE_NOT_AVAILABLE') {
        // Show upgrade modal
        useSubscriptionStore().showUpgradeModal({
          module: 'psychology',
          message: data.message
        })
        return
      }
    }
    // Default error handling
    console.error('Error:', err)
  }
}
```

---

# Quick Reference

## Endpoint Summary

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Public** | GET | `/public/access/:token` | Validate token |
| | GET | `/public/access/:token/session/:id/questions` | Get questions |
| | POST | `/public/access/:token/session/:id/save` | Save progress |
| | POST | `/public/access/:token/session/:id/submit` | Submit answers |
| | GET | `/public/access/:token/session/:id/result` | Get result |
| **Test Types** | GET | `/test-types` | List all |
| | POST | `/test-types` | Create |
| | POST | `/test-types/validate` | Validate questions |
| **Patients** | GET | `/patients` | List all |
| | GET | `/patients/search` | Search |
| | POST | `/patients` | Create |
| **Packages** | GET | `/packages` | List all |
| | GET | `/packages/:id/price` | Calculate price |
| | POST | `/packages` | Create |
| **Orders** | GET | `/orders` | List all |
| | POST | `/orders` | Create |
| | PATCH | `/orders/:id/payment` | Update payment |
| | POST | `/orders/:id/regenerate-token` | Regenerate token |
| | POST | `/orders/:id/cancel` | Cancel |
| **Sessions** | GET | `/sessions/:id` | Get details |
| | GET | `/sessions/:id/result` | Get result |
| | POST | `/sessions/:id/recalculate` | Recalculate scores |
| **Price Rules** | GET | `/price-rules` | List all |
| | POST | `/price-rules` | Create |
| | PATCH | `/price-rules/:id/toggle` | Toggle active |

---

## Related Documentation

- [Psychology API Format Guide](../postman/PSYCHOLOGY-API-FORMAT.md) - Detail format PAPI & EPPS
- [Feature Gating Guide](./FEATURE-GATING-GUIDE.md) - Subscription feature checks
- [Quick Start](./QUICK-START.md) - General API client setup
