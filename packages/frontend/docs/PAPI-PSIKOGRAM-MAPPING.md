# PAPI to Psikogram Analysis Mapping

Dokumentasi mapping antara skala PAPI Kostick dengan aspek Psikogram untuk auto-analysis.

## Overview

Frontend melakukan **auto-analysis** jawaban PAPI Kostick untuk mengisi rating aspek Psikogram secara otomatis. Analisis ini menghitung skor per skala PAPI dan kemudian memetakan ke aspek-aspek Psikogram berdasarkan relevansi dan bobot.

---

## Rating Scale (R/K/C/B/T)

| Code | Label | Persentase |
|------|-------|------------|
| `R` | Rendah | 0% - 20% |
| `K` | Kurang | 21% - 40% |
| `C` | Cukup | 41% - 60% |
| `B` | Baik | 61% - 80% |
| `T` | Tinggi | 81% - 100% |

---

## PAPI Kostick Scales (20 Skala)

| Code | Name | Description |
|------|------|-------------|
| G | Hard Working | Pekerja Keras |
| L | Leadership Role | Peran Kepemimpinan |
| I | Ease of Decision Making | Kemudahan Pengambilan Keputusan |
| T | Pace | Kecepatan Kerja |
| V | Vigorous Type | Tipe Bersemangat |
| R | Theoretical Type | Tipe Teoritis |
| D | Interest in Detail | Minat pada Detail |
| C | Organized Type | Tipe Terorganisir |
| A | Need to Achieve | Kebutuhan Berprestasi |
| N | Need to Finish Task | Kebutuhan Menyelesaikan Tugas |
| P | Need to Control Others | Kebutuhan Mengontrol |
| X | Need to be Noticed | Kebutuhan Diperhatikan |
| B | Need to Belong | Kebutuhan Berkelompok |
| O | Need for Closeness | Kebutuhan Kedekatan |
| S | Social Extension | Pergaulan Sosial |
| Z | Need for Change | Kebutuhan Perubahan |
| E | Emotional Stability | Stabilitas Emosi |
| K | Aggressiveness | Agresif |
| W | Need for Rules | Kebutuhan Aturan |
| F | Need to Support Superior | Kebutuhan Mendukung Atasan |

---

## Mapping: PAPI Scales → Psikogram Aspects

### A. KECERDASAN

#### 1. Logika Berpikir
> Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| R (Teoritis) | 1.5 | Pemikiran analitis dan mendalam |
| I (Keputusan) | 1.0 | Kemampuan mengambil keputusan logis |
| C (Mengatur) | 0.5 | Kemampuan mengorganisir pikiran |

#### 2. Kemampuan Analisa
> Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian yang lebih kecil.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| R (Teoritis) | 1.5 | Analisis mendalam |
| D (Detail) | 1.5 | Perhatian pada detail |
| C (Mengatur) | 0.5 | Sistematisasi |

#### 3. Kemampuan Numerikal
> Kemampuan untuk berpikir praktis dalam memahami konsep angka dan hitungan.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| D (Detail) | 1.5 | Ketelitian dengan angka |
| C (Mengatur) | 1.0 | Kalkulasi |
| N (Menyelesaikan Tugas) | 0.5 | Fokus pada hasil |

#### 4. Kemampuan Verbal
> Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| S (Hubungan Sosial) | 1.5 | Komunikasi |
| X (Butuh Perhatian) | 1.0 | Ekspresi verbal |
| R (Teoritis) | 0.5 | Pemahaman konsep |

---

### B. SIKAP DAN CARA KERJA

#### 1. Orientasi Hasil
> Kemampuan untuk mempertahankan komitmen untuk menyelesaikan tugas secara bertanggung jawab.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| A (Motivasi) | 1.5 | Dorongan berprestasi |
| N (Menyelesaikan Tugas) | 1.5 | Komitmen |
| G (Pekerja Keras) | 1.0 | Kerja keras |

#### 2. Fleksibilitas
> Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan.

| Scale | Weight | Inverse | Rationale |
|-------|--------|---------|-----------|
| Z (Berubah) | 1.5 | No | Adaptasi |
| E (Pengendalian Emosi) | 1.0 | No | Tenang menghadapi perubahan |
| W (Aturan) | 0.5 | **Yes** | Terlalu kaku jika tinggi |

#### 3. Sistematika Kerja
> Kemampuan untuk merencanakan hingga mengorganisasikan cara kerja.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| C (Mengatur) | 1.5 | Organisasi |
| W (Mengikuti Aturan) | 1.0 | Prosedural |
| R (Teoritis) | 1.0 | Perencanaan |
| D (Detail) | 0.5 | Ketelitian |

---

### C. KEPRIBADIAN

#### 1. Motivasi Berprestasi
> Kemampuan untuk menunjukkan prestasi dan mencapai target.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| A (Motivasi) | 2.0 | Achievement |
| N (Menyelesaikan Tugas) | 1.0 | Penyelesaian |
| G (Pekerja Keras) | 0.5 | Usaha |

#### 2. Kerjasama
> Kemampuan untuk menjalin, membina dan mengoptimalkan hubungan kerja yang efektif.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| B (Diterima dalam Kelompok) | 1.5 | Team player |
| O (Kedekatan) | 1.0 | Hubungan baik |
| F (Membantu Atasan) | 1.0 | Supportive |

#### 3. Keterampilan Interpersonal
> Kemampuan untuk menjalin hubungan sosial dan mampu memahami kebutuhan orang lain.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| S (Hubungan Sosial) | 1.5 | Social skill |
| O (Kedekatan) | 1.0 | Empati |
| X (Butuh Perhatian) | 0.5 | Interaksi |

#### 4. Stabilitas Emosi
> Kemampuan untuk memahami dan mengontrol emosi.

| Scale | Weight | Inverse | Rationale |
|-------|--------|---------|-----------|
| E (Pengendalian Emosi) | 2.0 | No | Langsung |
| K (Agresif) | 1.0 | **Yes** | Kebalikan stabilitas |

---

### D. KEMAMPUAN BELAJAR

#### 1. Pengembangan Diri
> Kemampuan untuk meningkatkan pengetahuan dan menyempurnakan keterampilan diri.

| Scale | Weight | Rationale |
|-------|--------|-----------|
| Z (Berubah) | 1.0 | Terbuka pada pengembangan |
| A (Motivasi) | 1.5 | Dorongan berkembang |
| R (Teoritis) | 0.5 | Minat belajar |

#### 2. Mengelola Perubahan
> Kemampuan dalam menyesuaikan diri dengan situasi baru.

| Scale | Weight | Inverse | Rationale |
|-------|--------|---------|-----------|
| Z (Berubah) | 1.5 | No | Adaptasi |
| E (Pengendalian Emosi) | 1.0 | No | Tenang |
| W (Aturan) | 0.5 | **Yes** | Fleksibilitas |

---

## Calculation Formula

### 1. Hitung Skor Per Skala PAPI

```javascript
// Untuk setiap skala, hitung berapa kali dipilih
for (const question of questions) {
  const answer = answers[question.id]
  if (answer === 'A' && question.scaleA) {
    scores[question.scaleA]++
  } else if (answer === 'B' && question.scaleB) {
    scores[question.scaleB]++
  }
}

// Persentase = (score / maxScore) * 100
// maxScore per skala = 9 (setiap skala muncul 9x dalam 90 pertanyaan)
```

### 2. Hitung Skor Per Aspek Psikogram

```javascript
function calculateAspectScore(aspectConfig, papiScores) {
  let totalWeightedScore = 0
  let totalWeight = 0
  
  for (const scale of aspectConfig.scales) {
    const { code, weight, inverse } = scale
    let percent = (papiScores[code].score / 9) * 100
    
    // Jika inverse, balik persentasenya
    if (inverse) {
      percent = 100 - percent
    }
    
    totalWeightedScore += percent * weight
    totalWeight += weight
  }
  
  return totalWeightedScore / totalWeight
}
```

### 3. Konversi ke Rating

```javascript
function percentToRating(percent) {
  if (percent <= 20) return 'R'  // Rendah
  if (percent <= 40) return 'K'  // Kurang
  if (percent <= 60) return 'C'  // Cukup
  if (percent <= 80) return 'B'  // Baik
  return 'T'                      // Tinggi
}
```

---

## Example Calculation

### Input: PAPI Scores

```javascript
const papiScores = {
  G: { score: 6, max: 9 },  // 67%
  L: { score: 4, max: 9 },  // 44%
  I: { score: 7, max: 9 },  // 78%
  R: { score: 5, max: 9 },  // 56%
  A: { score: 8, max: 9 },  // 89%
  N: { score: 7, max: 9 },  // 78%
  E: { score: 6, max: 9 },  // 67%
  K: { score: 3, max: 9 },  // 33% (inverse: 67%)
  // ... etc
}
```

### Calculate: Logika Berpikir

```
R (56% × 1.5) + I (78% × 1.0) + C (44% × 0.5)
= 84 + 78 + 22
= 184 / 3.0 (total weight)
= 61.3%
= Rating "B" (Baik)
```

### Calculate: Stabilitas Emosi

```
E (67% × 2.0) + K-inverse ((100-33)% × 1.0)
= 134 + 67
= 201 / 3.0
= 67%
= Rating "B" (Baik)
```

---

## Frontend Implementation

File: `src/utils/psychology/psikogramAnalyzer.js`

```javascript
import { 
  analyzePapiScoresToPsikogram, 
  calculateScalesFromAnswers,
  getRatingLabel,
  getRatingColorClass
} from '@/utils/psychology/psikogramAnalyzer'

// Usage in component
const answers = sessionData.answers  // dari API
const questions = sessionData.testType.questions  // dari API atau local

// Calculate scale scores
const scaleScores = calculateScalesFromAnswers(answers, questions)

// Convert to object format
const papiScores = {}
for (const scale of scaleScores) {
  papiScores[scale.code] = { score: scale.score, max: scale.max }
}

// Analyze to Psikogram
const analysis = analyzePapiScoresToPsikogram(papiScores)

// Result:
// {
//   kecerdasan: {
//     items: [
//       { title: 'Logika Berpikir', rating: 'B', percent: 61 },
//       { title: 'Kemampuan Analisa', rating: 'C', percent: 55 },
//       ...
//     ],
//     overallPercent: 58
//   },
//   sikapKerja: { ... },
//   kepribadian: { ... },
//   kemampuanBelajar: { ... },
//   overallPercent: 62,
//   overallRating: 'B'
// }
```

---

## Notes

1. **Bobot (Weight)** dapat disesuaikan oleh psikolog berdasarkan kebutuhan dan pengalaman klinis.

2. **Inverse scales** digunakan ketika skor tinggi pada skala PAPI justru menunjukkan hal negatif untuk aspek tersebut (misal: K/Agresif tinggi = Stabilitas Emosi rendah).

3. **Manual Override**: Psikolog tetap dapat mengubah rating secara manual setelah auto-analysis.

4. **Catatan Klinis**: Hasil auto-analysis adalah rekomendasi awal. Psikolog harus mempertimbangkan observasi klinis dan konteks peserta.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-03 | Initial mapping documentation |
