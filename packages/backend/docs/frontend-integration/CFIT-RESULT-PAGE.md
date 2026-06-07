# CFIT Result Page - Frontend Integration Guide

## Overview

CFIT (Culture Fair Intelligence Test) mengukur kecerdasan non-verbal yang bebas dari pengaruh budaya. Tes ini terdiri dari 4 subtes dengan total 46 soal. Sistem menghitung raw score (jumlah jawaban benar), kemudian mengkonversi ke IQ score berdasarkan norma usia.

## Test Structure

### 4 Subtests:

| Subtest | Questions | Max Score | Description |
|---------|-----------|-----------|-------------|
| **Series** | 12 | 12 | Mengenali pola dan melanjutkan urutan |
| **Classification** | 14 | 14 | Mengklasifikasi dan membedakan objek |
| **Matrices** | 12 | 12 | Berpikir analogis dan melengkapi pola |
| **Topology** | 8 | 8 | Memahami hubungan spasial |
| **TOTAL** | **46** | **46** | |

## Scoring System

### Step 1: Calculate Raw Score

Raw score = Total jawaban benar dari semua subtest (0-46)

```javascript
// Backend menerima answers dalam 2 format:

// Format 1: Flat
{
  "series_1": "C",
  "series_2": "D",
  "classification_1": "B",
  ...
}

// Format 2: Nested (direkomendasikan)
{
  "series": {
    "1": "C",
    "2": "D",
    ...
  },
  "classification": {
    "1": "B",
    ...
  },
  ...
}
```

**Scoring Logic:**
- Bandingkan jawaban user dengan answer key dari `questions` array
- Setiap jawaban benar = +1 poin
- Hitung per subtest untuk detail analisis
- Total raw score = sum of all subtest scores

### Step 2: Calculate Age in Months

```javascript
const birthDate = new Date(patient.birthDate);
const testDate = new Date(); // or session completedAt

const years = testDate.getFullYear() - birthDate.getFullYear();
const months = testDate.getMonth() - birthDate.getMonth();
const ageInMonths = (years * 12) + months;
```

### Step 3: Determine Age Group

Backend lookup ke `cfit-norms.json` untuk menemukan norma yang sesuai:

```json
{
  "ageGroups": {
    "14-0_14-11": {
      "label": "14 Tahun 0-11 Bulan",
      "ageMonthsStart": 168,
      "ageMonthsEnd": 179,
      "norms": [ ... ]
    }
  }
}
```

**Currently available:** Hanya 1 age group (14 tahun 0-11 bulan / 168-179 months)
**Production:** Akan ditambahkan lebih banyak age groups

### Step 4: Convert Raw Score to IQ

Lookup tabel norma berdasarkan age group dan raw score:

```json
{
  "rawScore": 37,
  "iqScore": 149,
  "classification": "VERY SUPERIOR"
}
```

**Lookup Logic:**
1. Cari exact match raw score di norms table
2. Jika ada duplicate raw score (beda IQ), ambil yang pertama
3. Jika tidak ada exact match, cari closest raw score
4. Fallback: Estimasi dengan formula `IQ = (rawScore / 46) * 70 + 60`

### Step 5: Classification

IQ Score dikonversi ke kategori:

| Classification | IQ Range | Description (ID) |
|----------------|----------|------------------|
| **GENIUS** | 170+ | Kemampuan intelektual sangat luar biasa |
| **VERY SUPERIOR** | 140-169 | Kemampuan intelektual sangat tinggi |
| **SUPERIOR** | 120-139 | Kemampuan intelektual di atas rata-rata |
| **AVERAGE** | 90-119 | Kemampuan intelektual rata-rata |
| **LOW AVERAGE** | 80-89 | Kemampuan intelektual di bawah rata-rata |
| **BORDERLINE** | 70-79 | Batas kemampuan intelektual |
| **MILD DEFICIT** | 50-69 | Kemampuan intelektual rendah |
| **SIGNIFICANT DEFICIT** | <50 | Kemampuan intelektual sangat rendah |

## API Response Structure

### GET `/api/v1/psychology/sessions/:sessionId`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionNumber": "PSY-2024-001",
    "status": "completed",
    "testType": {
      "code": "CFIT",
      "name": "Culture Fair Intelligence Test",
      "category": "intelligence"
    },
    "scores": {
      "subtestScores": {
        "series": 10,
        "classification": 11,
        "matrices": 9,
        "topology": 7
      },
      "subtestPercentiles": {
        "series": 83,
        "classification": 79,
        "matrices": 75,
        "topology": 88
      },
      "rawScore": 37,
      "maxRawScore": 46,
      "iqScore": 149,
      "classification": "VERY SUPERIOR",
      "ageInMonths": 180,
      "ageGroup": "14-0_14-11",
      "totalPercentile": 80
    },
    "interpretation": {
      "subtests": {
        "series": {
          "score": 10,
          "maxScore": 12,
          "percentage": 83,
          "level": "high",
          "description": "Kemampuan sangat baik dalam mengenali pola dan melanjutkan urutan"
        },
        "classification": {
          "score": 11,
          "maxScore": 14,
          "percentage": 79,
          "level": "medium",
          "description": "Kemampuan cukup dalam mengklasifikasi dan membedakan objek"
        },
        "matrices": {
          "score": 9,
          "maxScore": 12,
          "percentage": 75,
          "level": "medium",
          "description": "Kemampuan cukup dalam berpikir analogis dan melengkapi pola"
        },
        "topology": {
          "score": 7,
          "maxScore": 8,
          "percentage": 88,
          "level": "high",
          "description": "Kemampuan sangat baik dalam memahami hubungan spasial"
        }
      },
      "overall": {
        "rawScore": 37,
        "maxRawScore": 46,
        "iqScore": 149,
        "classification": "VERY SUPERIOR",
        "classificationDescription": "Kemampuan intelektual sangat tinggi",
        "percentile": 80
      },
      "ageInfo": {
        "ageInMonths": 180,
        "ageGroup": "14-0_14-11"
      }
    },
    "order": {
      "patient": {
        "fullName": "John Doe",
        "birthDate": "2010-01-15",
        "age": 14,
        "sex": "male"
      }
    },
    "completedAt": "2024-12-08T10:30:00Z"
  }
}
```

## Frontend Implementation Guide

### 1. Data Fetching

```javascript
// Vue 3 Composition API
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api'; // atau sesuai path api service Anda

const sessionData = ref(null);
const loading = ref(true);
const route = useRoute();

async function fetchCFITResult(sessionId) {
  try {
    const response = await api.get(`/psychology/sessions/${sessionId}`);
    
    // Response format: { success: true, data: { ... } }
    if (response.success) {
      sessionData.value = response.data;
    }
  } catch (error) {
    console.error('Error fetching CFIT result:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const sessionId = route.params.id;
  fetchCFITResult(sessionId);
});
```

### 2. Display Components

#### A. Header Section
```vue
<template>
  <div class="cfit-result-header">
    <h1>CFIT Result</h1>
    <div class="patient-info">
      <p><strong>Nama:</strong> {{ sessionData.order.patient.fullName }}</p>
      <p><strong>Tanggal Lahir:</strong> {{ formatDate(sessionData.order.patient.birthDate) }}</p>
      <p><strong>Usia:</strong> {{ sessionData.order.patient.age }} tahun</p>
      <p><strong>Session:</strong> {{ sessionData.sessionNumber }}</p>
      <p><strong>Tanggal Test:</strong> {{ formatDate(sessionData.completedAt) }}</p>
    </div>
  </div>
</template>
```

#### B. IQ Score Display (Main Focus)
```vue
<template>
  <div class="iq-score-card">
    <div class="iq-circle">
      <div class="iq-value">{{ scores.iqScore }}</div>
      <div class="iq-label">IQ Score</div>
    </div>
    <div class="classification">
      <h3>{{ scores.classification }}</h3>
      <p>{{ interpretation.overall.classificationDescription }}</p>
    </div>
    <div class="percentile">
      <span>Percentile: {{ scores.totalPercentile }}%</span>
    </div>
  </div>
</template>

<style>
.iq-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.iq-value {
  font-size: 64px;
  font-weight: bold;
}

.classification {
  margin-top: 20px;
  text-align: center;
}

.classification h3 {
  font-size: 28px;
  color: #667eea;
  margin-bottom: 10px;
}
</style>
```

#### C. Raw Score Summary
```vue
<template>
  <div class="raw-score-summary">
    <h3>Raw Score</h3>
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: `${(scores.rawScore / scores.maxRawScore) * 100}%` }"
      ></div>
    </div>
    <p>{{ scores.rawScore }} / {{ scores.maxRawScore }} correct answers</p>
  </div>
</template>
```

#### D. Subtest Breakdown
```vue
<template>
  <div class="subtest-breakdown">
    <h3>Subtest Analysis</h3>
    <div class="subtest-grid">
      <div 
        v-for="(data, subtest) in interpretation.subtests" 
        :key="subtest"
        class="subtest-card"
        :class="`level-${data.level}`"
      >
        <h4>{{ formatSubtestName(subtest) }}</h4>
        <div class="subtest-score">
          <span class="score">{{ data.score }}</span>
          <span class="max">/ {{ data.maxScore }}</span>
        </div>
        <div class="percentage-circle">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path 
              class="circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path 
              class="circle"
              :stroke-dasharray="`${data.percentage}, 100`"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" class="percentage">{{ data.percentage }}%</text>
          </svg>
        </div>
        <p class="level-badge">{{ data.level.toUpperCase() }}</p>
        <p class="description">{{ data.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
function formatSubtestName(subtest) {
  const names = {
    series: 'Series',
    classification: 'Classification',
    matrices: 'Matrices',
    topology: 'Topology'
  };
  return names[subtest] || subtest;
}
</script>

<style>
.subtest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.subtest-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.subtest-card.level-high {
  border-color: #4caf50;
  background-color: #f1f8f4;
}

.subtest-card.level-medium {
  border-color: #ff9800;
  background-color: #fff8f0;
}

.subtest-card.level-low {
  border-color: #f44336;
  background-color: #fef5f5;
}

.circular-chart {
  width: 80px;
  height: 80px;
  margin: 10px auto;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke: #667eea;
  stroke-width: 3.8;
  stroke-linecap: round;
}

.level-high .circle {
  stroke: #4caf50;
}

.level-medium .circle {
  stroke: #ff9800;
}

.level-low .circle {
  stroke: #f44336;
}
</style>
```

#### E. Age-Based Information
```vue
<template>
  <div class="age-info">
    <h3>Age-Based Scoring</h3>
    <p>
      <strong>Patient Age:</strong> 
      {{ Math.floor(interpretation.ageInfo.ageInMonths / 12) }} years 
      {{ interpretation.ageInfo.ageInMonths % 12 }} months
    </p>
    <p>
      <strong>Norm Group:</strong> {{ formatAgeGroup(interpretation.ageInfo.ageGroup) }}
    </p>
    <p class="info-note">
      <i>IQ score dihitung berdasarkan norma kelompok usia untuk memastikan penilaian yang adil. 
      Setiap kelompok usia memiliki tabel konversi raw score → IQ yang berbeda.</i>
    </p>
  </div>
</template>

<script setup>
function formatAgeGroup(ageGroup) {
  // "14-0_14-11" -> "14 Years 0-11 Months"
  const [start, end] = ageGroup.split('_');
  const [startYear, startMonth] = start.split('-');
  const [endYear, endMonth] = end.split('-');
  return `${startYear} Years ${startMonth}-${endMonth} Months`;
}
</script>
```

### 3. Complete Page Layout

```vue
<template>
  <div class="cfit-result-page">
    <div v-if="loading" class="loading">Loading...</div>
    
    <div v-else-if="sessionData" class="result-container">
      <!-- Header -->
      <CFITHeader :session="sessionData" />
      
      <!-- Main IQ Score -->
      <CFITIQScore 
        :scores="sessionData.scores" 
        :interpretation="sessionData.interpretation" 
      />
      
      <!-- Raw Score -->
      <CFITRawScore :scores="sessionData.scores" />
      
      <!-- Subtest Breakdown -->
      <CFITSubtestBreakdown :interpretation="sessionData.interpretation" />
      
      <!-- Age Info -->
      <CFITAgeInfo :interpretation="sessionData.interpretation" />
      
      <!-- Actions -->
      <div class="actions">
        <button @click="printResult">Print Report</button>
        <button @click="exportPDF">Export to PDF</button>
        <button @click="backToList">Back to Sessions</button>
      </div>
    </div>
  </div>
</template>
```

## Level Interpretation Logic

```javascript
// Frontend dapat menggunakan logic yang sama untuk display
function getSubtestLevel(percentage) {
  if (percentage >= 80) return { 
    level: 'high', 
    color: '#4caf50', 
    label: 'HIGH' 
  };
  if (percentage >= 50) return { 
    level: 'medium', 
    color: '#ff9800', 
    label: 'MEDIUM' 
  };
  return { 
    level: 'low', 
    color: '#f44336', 
    label: 'LOW' 
  };
}

function getIQColor(classification) {
  const colors = {
    'GENIUS': '#9c27b0',
    'VERY SUPERIOR': '#673ab7',
    'SUPERIOR': '#3f51b5',
    'AVERAGE': '#4caf50',
    'LOW AVERAGE': '#ff9800',
    'BORDERLINE': '#ff5722',
    'MILD DEFICIT': '#f44336',
    'SIGNIFICANT DEFICIT': '#d32f2f'
  };
  return colors[classification] || '#4caf50';
}
```

## Chart/Visualization Recommendations

### 1. IQ Distribution Chart
```javascript
// Show where patient's IQ falls in normal distribution
// Use Chart.js or similar library
const iqDistributionData = {
  labels: ['<70', '70-79', '80-89', '90-119', '120-139', '140-169', '170+'],
  datasets: [{
    label: 'IQ Distribution',
    data: [2, 7, 16, 50, 16, 7, 2], // Percentage of population
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: 'rgba(102, 126, 234, 1)'
  }]
};

// Highlight patient's position with marker
```

### 2. Radar Chart for Subtests
```javascript
// Show subtest performance in radar chart
const radarData = {
  labels: ['Series', 'Classification', 'Matrices', 'Topology'],
  datasets: [{
    label: 'Performance',
    data: [83, 79, 75, 88], // Percentages from subtestPercentiles
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderColor: 'rgba(102, 126, 234, 1)'
  }]
};
```

## Important Notes

### 1. Data Availability
- **scores** dan **interpretation** hanya tersedia jika status = "completed" atau "verified"
- **answers** hanya tersedia jika `?includeAnswers=true` atau status = "verified"

### 2. Age Group Limitation
- Saat ini hanya ada norma untuk usia 14 tahun (168-179 bulan)
- Untuk usia lain, sistem akan fallback ke estimasi atau default norm
- **TODO Production:** Tambahkan norma untuk semua age groups (8-16 tahun biasanya)

### 3. Classification Display
- Gunakan warna berbeda untuk setiap classification level
- GENIUS/VERY SUPERIOR: Purple/Blue gradient
- SUPERIOR: Blue
- AVERAGE: Green
- LOW AVERAGE: Orange
- BORDERLINE & below: Red spectrum

### 4. Mobile Responsive
- IQ circle harus tetap proporsional di mobile
- Subtest grid menjadi single column di mobile
- Chart/graph menjadi scrollable horizontal jika perlu

## Testing Checklist

- [ ] Display IQ score correctly
- [ ] Show classification label and description
- [ ] Render subtest breakdown with percentages
- [ ] Display circular progress for each subtest
- [ ] Color coding based on performance level (high/medium/low)
- [ ] Show age information and norm group
- [ ] Handle missing data (age, norms)
- [ ] Responsive design for mobile
- [ ] Print-friendly layout
- [ ] PDF export functionality

## References

- Backend Scoring Service: `src/modules/psychology/services/scoringService.js`
- CFIT Norms Data: `docs/soalPsikolog/data/cfit-norms.json`
- Session Controller: `src/modules/psychology/controllers/sessionController.js`
