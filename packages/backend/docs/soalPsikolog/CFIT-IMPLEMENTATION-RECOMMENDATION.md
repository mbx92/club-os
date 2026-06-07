# CFIT (Culture Fair Intelligence Test) - Analisis & Rekomendasi Implementasi

## 📋 Ringkasan Analisis

### Tentang CFIT
CFIT (Culture Fair Intelligence Test) Form 2A adalah tes kecerdasan non-verbal yang dirancang untuk mengukur kemampuan kognitif tanpa dipengaruhi faktor bahasa atau budaya. Tes ini mengukur fluid intelligence (g-factor).

### Struktur Soal yang Ditemukan

| Subtes | Nama | Jumlah Soal | Contoh Soal | Waktu |
|--------|------|-------------|-------------|-------|
| **Subtes 1** | Series | 12 soal | 3 contoh | 4 menit |
| **Subtes 2** | Classification | 14 soal | 2 contoh | 3 menit |
| **Subtes 3** | Matrices | 12 soal | 3 contoh | 3 menit |
| **Subtes 4** | Topology | 8 soal | 3 contoh | 2.5 menit |
| **Total** | - | **46 soal** | 11 contoh | **12.5 menit** |

### Deskripsi Tiap Subtes

1. **Series (Subtes 1)**: Melanjutkan pola gambar - memilih 1 dari 5 pilihan yang paling tepat melanjutkan urutan
2. **Classification (Subtes 2)**: Mencari gambar yang berbeda dari lima gambar lainnya  
3. **Matrices (Subtes 3)**: Melengkapi gambar yang kosong dalam matriks
4. **Topology (Subtes 4)**: Mencari gambar yang memiliki bentuk dan hubungan sama dengan contoh

### Kunci Jawaban (dari Excel)

```
Subtes 1 (12 soal): C, D, A, C, B, E, B, C, C, C, D, A
Subtes 2 (14 soal): B, C, D, A, C, C, A, E, D, C, C, C, A, D
Subtes 3 (12 soal): A, C, B, E, C, A, B, D, E, A, B, B
Subtes 4 (8 soal):  C, B, A, D, C, C, A, B
```

### Sistem Scoring & Klasifikasi IQ

Raw Score dikonversi ke IQ Score berdasarkan usia (contoh untuk usia 14 tahun 0-11 bulan):

| Raw Score | IQ Score | Klasifikasi |
|-----------|----------|-------------|
| 49 | - | GENIUS |
| 44-48 | 169-183 | VERY SUPERIOR |
| 28-43 | 119-168 | SUPERIOR |
| 17-27 | 88-119 | AVERAGE |
| 14-16 | 78-86 | LOW AVERAGE |
| 10-13 | 68-76 | BORDERLINE MENTAL RETARDATION |
| 4-9 | 51-65 | MILD MENTAL RETARDATION |
| 0-3 | 45-50 | PROFOUND MENTAL RETARDATION |

---

## 🛠️ Rekomendasi Implementasi

### 1. **Transformasi Data Soal ke JSON**

Buat file `docs/soalPsikolog/data/cfit-transformed.json` dengan struktur:

```json
{
  "testInfo": {
    "code": "CFIT",
    "name": "Culture Fair Intelligence Test - Form 2A",
    "category": "cognitive",
    "description": "Tes kecerdasan non-verbal untuk mengukur kemampuan berpikir logis, melihat pola, dan memecahkan masalah tanpa dipengaruhi bahasa.",
    "totalQuestions": 46,
    "totalDuration": 750,
    "hasTimedSubtests": true
  },
  "subtests": [
    {
      "id": 1,
      "name": "Series",
      "description": "Pilih 1 gambar dari 5 pilihan yang paling tepat untuk melanjutkan urutan gambar.",
      "questionCount": 12,
      "exampleCount": 3,
      "timeLimit": 240,
      "questions": [...]
    },
    // ... subtes lainnya
  ],
  "scoringTable": {
    "ageGroups": {
      "14-0_14-11": {...},
      "15-0_15-11": {...}
    }
  },
  "iqClassification": [
    {"min": 130, "max": null, "label": "GENIUS"},
    {"min": 120, "max": 129, "label": "VERY SUPERIOR"},
    // ...
  ]
}
```

### 2. **Update Seeder untuk Psychology Test Types**

Tambahkan CFIT ke file `src/seeders/20251129200000-psychology-test-types.js`:

```javascript
// CFIT - Culture Fair Intelligence Test
if (!existingCodes.includes("CFIT")) {
  testTypesToInsert.push({
    id: uuidv4(),
    tenantId,
    code: "CFIT",
    name: "Culture Fair Intelligence Test - Form 2A",
    category: "cognitive",
    description: "Tes kecerdasan non-verbal untuk mengukur kemampuan berpikir logis...",
    questionCount: 46,
    estimatedDuration: 15,
    questions: JSON.stringify(cfitQuestions),
    answerSchema: JSON.stringify({
      type: "multiple_choice",
      options: ["A", "B", "C", "D", "E"],
      required: true
    }),
    scoringConfig: JSON.stringify({
      type: "cfit",
      subtests: ["series", "classification", "matrices", "topology"],
      subtestConfig: {
        series: { questionCount: 12, timeLimit: 240 },
        classification: { questionCount: 14, timeLimit: 180 },
        matrices: { questionCount: 12, timeLimit: 180 },
        topology: { questionCount: 8, timeLimit: 150 }
      },
      scoringMethod: "raw_to_iq",
      maxRawScore: 46,
      ageBasedNorms: true
    }),
    config: JSON.stringify({
      allowBack: false, // Tidak boleh kembali karena ada time limit per subtes
      showProgress: true,
      randomizeQuestions: false,
      hasSubtests: true,
      subtestTimeLimit: true,
      instructionText: "Tes ini terdiri dari 4 subtes. Setiap subtes memiliki durasi waktu sendiri."
    }),
    isActive: true,
    version: 1,
    createdAt: now,
    updatedAt: now
  });
}
```

### 3. **Buat Scoring Service untuk CFIT**

Buat file `src/services/psychology/cfitScoringService.js`:

```javascript
class CFITScoringService {
  // Konversi raw score ke IQ berdasarkan usia
  calculateIQ(rawScore, ageYears, ageMonths) {}
  
  // Dapatkan klasifikasi IQ
  getIQClassification(iqScore) {}
  
  // Hitung skor per subtes
  calculateSubtestScores(answers, answerKey) {}
  
  // Generate hasil psikogram
  generateResult(sessionData) {}
}
```

### 4. **Penanganan Gambar Soal**

Karena CFIT menggunakan gambar (PNG), perlu:

#### Opsi A: Upload ke Cloud Storage
```javascript
// Struktur questions dengan URL gambar
{
  "id": 1,
  "subtest": "series",
  "imageUrl": "https://storage.example.com/cfit/subtes1/1.png",
  "options": [
    { "label": "A", "imageUrl": "..." },
    { "label": "B", "imageUrl": "..." },
    // ...
  ],
  "answer": "C"
}
```

#### Opsi B: Base64 Encoding (untuk development)
```javascript
{
  "id": 1,
  "subtest": "series", 
  "imageBase64": "data:image/png;base64,iVBORw0KGgo...",
  "options": [...]
}
```

#### Opsi C: Relative Path (file served dari server)
```javascript
{
  "id": 1,
  "subtest": "series",
  "imagePath": "/assets/psychology/cfit/subtes1/1.png",
  "options": [...]
}
```

### 5. **API Endpoints yang Perlu Ditambahkan/Dimodifikasi**

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/psychology/tests/CFIT/start` | POST | Mulai tes CFIT dengan timer per subtes |
| `/psychology/tests/CFIT/subtest/:id` | GET | Ambil soal subtes tertentu |
| `/psychology/tests/CFIT/submit-subtest` | POST | Submit jawaban per subtes (karena ada time limit) |
| `/psychology/sessions/:id/cfit-result` | GET | Hasil lengkap dengan IQ score dan klasifikasi |

### 6. **Migrasi untuk Tabel Norm/Scoring (Opsional)**

Jika akan mendukung multiple age-based norms:

```javascript
// Migration: create-cfit-norms-table.js
await queryInterface.createTable('CFITNorms', {
  id: { type: DataTypes.UUID, primaryKey: true },
  ageGroupStart: DataTypes.INTEGER,  // Usia mulai (dalam bulan)
  ageGroupEnd: DataTypes.INTEGER,    // Usia akhir (dalam bulan)
  rawScore: DataTypes.INTEGER,
  iqScore: DataTypes.INTEGER,
  classification: DataTypes.STRING,
  tenantId: DataTypes.UUID
});
```

---

## 📝 Task List (Breakdown Detail)

---

### 🔷 Phase 1: Data Preparation ⏱️ ~2-3 jam

#### 1.1 Organisasi & Upload Gambar Soal (~1 jam)
- [ ] Buat folder struktur untuk gambar CFIT:
  ```
  uploads/psychology/cfit/
  ├── subtes1/
  │   ├── contoh/
  │   │   ├── contoh-1.png
  │   │   ├── contoh-2.png
  │   │   └── contoh-3.png
  │   ├── 1.png
  │   ├── 2.png
  │   └── ... (12 soal)
  ├── subtes2/
  ├── subtes3/
  └── subtes4/
  ```
- [ ] Rename file gambar agar konsisten (lowercase, no spaces)
- [ ] Optimasi ukuran gambar (compress jika > 500KB)
- [ ] Upload ke cloud storage ATAU copy ke folder `uploads/`

#### 1.2 Transformasi Data ke JSON (~1 jam)
- [ ] Buat file `docs/soalPsikolog/data/cfit-questions.json`:
  ```json
  {
    "subtes1": {
      "examples": [
        { "id": "ex1", "imagePath": "/cfit/subtes1/contoh/contoh-1.png" }
      ],
      "questions": [
        { "id": 1, "imagePath": "/cfit/subtes1/1.png", "answer": "C" }
      ]
    }
  }
  ```
- [ ] Buat file `docs/soalPsikolog/data/cfit-norms.json` (tabel konversi raw score → IQ)
- [ ] Buat file `docs/soalPsikolog/data/cfit-config.json` (konfigurasi tes)

#### 1.3 Validasi Data (~30 menit)
- [ ] Cross-check kunci jawaban dengan Excel `CFIT 2 Form A Psikogram & Jawaban.xlsx`
- [ ] Verifikasi jumlah soal per subtes (12 + 14 + 12 + 8 = 46)
- [ ] Verifikasi jumlah contoh per subtes (3 + 2 + 3 + 3 = 11)
- [ ] Test akses gambar dari path yang ditentukan

---

### 🔷 Phase 2: Backend - Database & Model ⏱️ ~2-3 jam

#### 2.1 Migration untuk Norms Table (~30 menit)
- [ ] Buat migration `src/migrations/YYYYMMDDHHMMSS-create-psychology-norms.js`:
  ```javascript
  // Fields: id, testTypeCode, ageGroupLabel, ageMonthsStart, ageMonthsEnd,
  //         rawScore, convertedScore, classification, tenantId
  ```
- [ ] Run migration: `npm run db:dev:migrate`

#### 2.2 Model untuk Norms (~30 menit)
- [ ] Buat model `src/models/psychologyNorm.js`
- [ ] Definisikan associations dengan `PsychologyTestType`
- [ ] Export dari `src/models/index.js`

#### 2.3 Update Seeder Psychology Test Types (~1 jam)
- [ ] Edit `src/seeders/20251129200000-psychology-test-types.js`
- [ ] Tambahkan variabel `cfitQuestions` dengan data dari JSON
- [ ] Tambahkan entry CFIT dengan struktur lengkap:
  - `code: "CFIT"`
  - `category: "cognitive"`
  - `questions`: Array soal per subtes
  - `scoringConfig`: Konfigurasi scoring dengan subtest info
  - `config`: Settings khusus (timer, no-back, dll)

#### 2.4 Seeder untuk Norms Data (~1 jam)
- [ ] Buat seeder baru `src/seeders/YYYYMMDDHHMMSS-cfit-norms.js`
- [ ] Import data dari Excel (49 rows untuk age group 14-0 s/d 14-11)
- [ ] Tambahkan age groups lain jika data tersedia
- [ ] Run seeder: `npm run db:dev:seed`

---

### 🔷 Phase 3: Backend - Scoring Service ⏱️ ~2-3 jam

#### 3.1 Buat CFIT Scoring Service (~1.5 jam)
- [ ] Buat file `src/services/psychology/cfitScoringService.js`:
  ```javascript
  class CFITScoringService {
    /**
     * Hitung skor per subtes
     * @param {Array} answers - Jawaban user [{questionId, answer}]
     * @param {Object} answerKey - Kunci jawaban
     * @returns {Object} {series: 8, classification: 10, matrices: 9, topology: 6}
     */
    calculateSubtestScores(answers, answerKey) {}

    /**
     * Hitung total raw score
     * @returns {number} Total jawaban benar (0-46)
     */
    calculateRawScore(subtestScores) {}

    /**
     * Konversi raw score ke IQ berdasarkan usia
     * @param {number} rawScore
     * @param {Date} birthDate
     * @param {Date} testDate
     * @returns {number} IQ Score
     */
    async convertToIQ(rawScore, birthDate, testDate, tenantId) {}

    /**
     * Dapatkan klasifikasi IQ
     * @param {number} iqScore
     * @returns {string} "GENIUS", "VERY SUPERIOR", "SUPERIOR", dll
     */
    getClassification(iqScore) {}

    /**
     * Generate hasil lengkap
     */
    async generateResult(sessionId) {}
  }
  ```

#### 3.2 Helper Functions (~30 menit)
- [ ] Buat `src/utils/ageCalculator.js`:
  ```javascript
  // Hitung usia dalam tahun dan bulan
  function calculateAge(birthDate, testDate) {
    return { years: 25, months: 10, totalMonths: 310 }
  }
  
  // Tentukan age group untuk lookup norms
  function getAgeGroup(totalMonths) {
    return "14-0_14-11" // atau group lainnya
  }
  ```

#### 3.3 Integrasi dengan Session (~1 jam)
- [ ] Update `src/services/psychology/sessionService.js`:
  - Tambahkan method `processSubtestSubmission()`
  - Tambahkan method `finalizeSession()` untuk CFIT
- [ ] Handle case ketika waktu subtes habis (auto-submit)

---

### 🔷 Phase 4: Backend - Controller & Routes ⏱️ ~2-3 jam

#### 4.1 Update Session Controller (~1.5 jam)
- [ ] Edit `src/controllers/psychology/sessionController.js`:
  ```javascript
  // Endpoint baru untuk CFIT
  async startCFITSession(req, res, next) {}
  async getSubtestQuestions(req, res, next) {}
  async submitSubtest(req, res, next) {}
  async getCFITResult(req, res, next) {}
  ```

#### 4.2 Tambah Routes (~30 menit)
- [ ] Edit `src/routes/psychology/session.routes.js`:
  ```javascript
  // CFIT specific routes
  router.post('/cfit/start', authenticate, sessionController.startCFITSession);
  router.get('/cfit/:sessionId/subtest/:subtestId', authenticate, sessionController.getSubtestQuestions);
  router.post('/cfit/:sessionId/subtest/:subtestId/submit', authenticate, sessionController.submitSubtest);
  router.get('/cfit/:sessionId/result', authenticate, sessionController.getCFITResult);
  ```

#### 4.3 Middleware untuk Timer Validation (~1 jam)
- [ ] Buat `src/middlewares/subtestTimerMiddleware.js`:
  ```javascript
  // Validasi waktu subtes belum expired
  // Jika expired, auto-submit jawaban yang sudah ada
  async function validateSubtestTimer(req, res, next) {}
  ```
- [ ] Implementasi logic untuk track waktu mulai per subtes

---

### 🔷 Phase 5: Testing ⏱️ ~2-3 jam

#### 5.1 Unit Tests untuk Scoring Service (~1 jam)
- [ ] Buat `tests/services/cfitScoringService.test.js`:
  ```javascript
  describe('CFITScoringService', () => {
    describe('calculateSubtestScores', () => {
      it('should calculate correct scores for each subtest');
      it('should handle empty answers');
      it('should handle partial answers');
    });
    
    describe('convertToIQ', () => {
      it('should convert raw score 33 to IQ 136 for age 14');
      it('should return correct classification');
    });
  });
  ```

#### 5.2 Integration Tests (~1 jam)
- [ ] Buat `tests/integration/cfit.test.js`:
  ```javascript
  describe('CFIT Test Flow', () => {
    it('should start a new CFIT session');
    it('should return subtest 1 questions with examples');
    it('should submit subtest and move to next');
    it('should auto-submit when time expires');
    it('should calculate final result correctly');
  });
  ```

#### 5.3 Validasi dengan Sample Data (~1 jam)
- [ ] Gunakan data dari `Output CFIT.xlsx` untuk validasi:
  - Input jawaban dari responden pertama
  - Verifikasi raw score yang dihitung
  - Verifikasi IQ score yang dihasilkan
  - Verifikasi klasifikasi yang tepat

---

### 🔷 Phase 6: Documentation & Cleanup ⏱️ ~1 jam

#### 6.1 API Documentation (~30 menit)
- [ ] Update `docs/PSIKOGRAM-API-SPECIFICATION.md` dengan endpoint CFIT
- [ ] Tambahkan contoh request/response untuk setiap endpoint
- [ ] Dokumentasikan flow pengerjaan tes

#### 6.2 Postman Collection (~30 menit)
- [ ] Tambahkan folder "CFIT" di Postman collection
- [ ] Buat request untuk semua endpoint baru
- [ ] Tambahkan test scripts untuk validasi response

#### 6.3 Code Cleanup
- [ ] Run `npm run lint` dan fix issues
- [ ] Run `npm run generate:routes` untuk update routes metadata
- [ ] Review dan hapus console.log yang tidak perlu

---

## 📊 Summary Timeline

| Phase | Deskripsi | Estimasi | Dependencies |
|-------|-----------|----------|--------------|
| **1** | Data Preparation | 2-3 jam | - |
| **2** | Database & Model | 2-3 jam | Phase 1 |
| **3** | Scoring Service | 2-3 jam | Phase 2 |
| **4** | Controller & Routes | 2-3 jam | Phase 3 |
| **5** | Testing | 2-3 jam | Phase 4 |
| **6** | Documentation | 1 jam | Phase 5 |

**Total Estimasi: 11-16 jam kerja**

---

## ✅ Checklist per Phase

### Phase 1 Completion Criteria:
- [ ] Semua gambar terorganisir dan bisa diakses
- [ ] File JSON untuk questions, norms, config sudah dibuat
- [ ] Data tervalidasi dengan Excel source

### Phase 2 Completion Criteria:
- [ ] Migration berhasil dijalankan
- [ ] Model terdaftar dan bisa di-query
- [ ] Seeder berhasil populate data CFIT

### Phase 3 Completion Criteria:
- [ ] Scoring service bisa hitung skor dengan benar
- [ ] Konversi IQ sesuai dengan tabel norm
- [ ] Klasifikasi IQ tepat

### Phase 4 Completion Criteria:
- [ ] Semua endpoint bisa diakses
- [ ] Timer validation bekerja
- [ ] Response format sesuai spesifikasi

### Phase 5 Completion Criteria:
- [ ] Semua unit tests passing
- [ ] Integration tests passing
- [ ] Hasil validasi dengan sample data benar

### Phase 6 Completion Criteria:
- [ ] Dokumentasi lengkap
- [ ] Postman collection updated
- [ ] No lint errors

---

## ⚠️ Pertimbangan Khusus

### 1. Timer per Subtes
Berbeda dengan PAPI/EPPS yang tidak ada time limit, CFIT memerlukan:
- Timer 4 menit untuk Subtes 1
- Timer 3 menit untuk Subtes 2
- Timer 3 menit untuk Subtes 3
- Timer 2.5 menit untuk Subtes 4

**Solusi**: Modifikasi `config` field untuk support `subtestTimeLimit` dan track waktu per subtes di session.

### 2. Tidak Boleh Kembali
Setelah waktu subtes habis atau user submit, tidak boleh kembali ke soal sebelumnya.

### 3. Age-Based Norms
IQ Score berbeda untuk setiap kelompok usia. Perlu:
- Input tanggal lahir peserta
- Kalkulasi usia saat tes
- Lookup ke tabel norm yang sesuai

### 4. Penyimpanan Gambar
Total ~58 file gambar (46 soal + 11 contoh + 1 soal per opsi tidak ada, cuma label). 
Rekomendasi: Upload ke cloud storage untuk performa dan skalabilitas.

---

## 📁 File yang Perlu Dibuat/Dimodifikasi

### Baru:
1. `docs/soalPsikolog/data/cfit-transformed.json` - Data soal dalam format JSON
2. `src/services/psychology/cfitScoringService.js` - Service untuk scoring
3. `src/migrations/xxx-create-psychology-norms.js` - Tabel norm (opsional)
4. `uploads/psychology/cfit/` - Folder untuk gambar soal

### Modifikasi:
1. `src/seeders/20251129200000-psychology-test-types.js` - Tambah CFIT
2. `src/controllers/psychology/sessionController.js` - Handle subtest timer
3. `src/routes/psychology/session.routes.js` - Endpoint baru

---

## 🔄 Output yang Diharapkan

Format hasil tes CFIT (sesuai dengan file `Output CFIT.xlsx`):

```json
{
  "sessionId": "uuid",
  "testCode": "CFIT",
  "participant": {
    "name": "Nama Peserta",
    "gender": "Laki-laki/Perempuan",
    "testDate": "2025-12-08",
    "birthDate": "2000-01-15",
    "age": { "years": 25, "months": 10 }
  },
  "results": {
    "subtestScores": {
      "series": 8,
      "classification": 10,
      "matrices": 9,
      "topology": 6
    },
    "rawScore": 33,
    "iqScore": 136,
    "classification": "SUPERIOR"
  }
}
```

---

## 📌 Kesimpulan

CFIT adalah tes kognitif yang lebih kompleks dibanding PAPI/EPPS karena:
1. **Menggunakan gambar** (bukan teks)
2. **Ada time limit per subtes**
3. **Scoring berdasarkan usia**
4. **Tidak boleh kembali ke soal sebelumnya**

Implementasi memerlukan modifikasi pada sistem psychology testing yang sudah ada untuk mendukung fitur-fitur spesifik ini.
