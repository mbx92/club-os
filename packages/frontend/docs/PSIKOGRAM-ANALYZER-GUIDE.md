# Panduan Psikogram Analyzer

Dokumentasi lengkap untuk memahami dan mengkustomisasi **Psikogram Analyzer** - utility untuk menganalisis jawaban PAPI Kostick menjadi rating aspek Psikogram.

---

## 📁 Lokasi File

```
src/utils/psychology/psikogramAnalyzer.js
```

---

## 🎯 Tujuan

Utility ini melakukan:
1. Menerima jawaban PAPI (90 pertanyaan)
2. Menghitung skor per skala PAPI (20 skala)
3. Memetakan ke aspek Psikogram (13 aspek dalam 4 section)
4. Menghasilkan rating (R/K/C/B/T) untuk setiap aspek

---

## 📊 Rating Scale

| Code | Label | Rentang Persentase |
|------|-------|-------------------|
| `R` | Rendah | 0% - 20% |
| `K` | Kurang | 21% - 40% |
| `C` | Cukup | 41% - 60% |
| `B` | Baik | 61% - 80% |
| `T` | Tinggi | 81% - 100% |

### Mengubah Threshold Rating

Jika ingin mengubah rentang persentase untuk rating, edit konstanta `RATING_THRESHOLDS`:

```javascript
// Lokasi: sekitar baris 155
export const RATING_THRESHOLDS = {
  R: { min: 0, max: 20, label: 'Rendah' },
  K: { min: 21, max: 40, label: 'Kurang' },
  C: { min: 41, max: 60, label: 'Cukup' },
  B: { min: 61, max: 80, label: 'Baik' },
  T: { min: 81, max: 100, label: 'Tinggi' }
}
```

Dan update fungsi `percentToRating`:

```javascript
// Lokasi: sekitar baris 165
export function percentToRating(percent) {
  if (percent <= 20) return 'R'  // Ubah angka sesuai kebutuhan
  if (percent <= 40) return 'K'
  if (percent <= 60) return 'C'
  if (percent <= 80) return 'B'
  return 'T'
}
```

---

## 🔧 Struktur Mapping PAPI → Psikogram

### Lokasi Konfigurasi

```javascript
// Lokasi: baris 20-150
export const PSIKOGRAM_PAPI_MAPPING = {
  kecerdasan: { ... },
  sikapKerja: { ... },
  kepribadian: { ... },
  kemampuanBelajar: { ... }
}
```

### Format Konfigurasi

Setiap aspek memiliki struktur:

```javascript
namaAspek: {
  title: 'Nama Aspek yang Ditampilkan',
  description: 'Deskripsi aspek...',
  scales: [
    { code: 'X', weight: 1.5 },           // Normal
    { code: 'Y', weight: 1.0, inverse: true }  // Inverse
  ]
}
```

### Penjelasan Properties

| Property | Tipe | Deskripsi |
|----------|------|-----------|
| `code` | String | Kode skala PAPI (G, L, I, T, V, R, D, C, A, N, P, X, B, O, S, Z, E, K, W, F) |
| `weight` | Number | Bobot kontribusi skala terhadap aspek (default: 1) |
| `inverse` | Boolean | Jika `true`, skor tinggi = rating rendah (opsional, default: false) |

---

## ⚖️ Cara Kerja Bobot (Weight)

### Rumus Perhitungan

```
Skor Aspek = Σ(Persentase Skala × Bobot) / Σ(Bobot)
```

### Contoh Perhitungan

**Aspek: Logika Berpikir**
```javascript
scales: [
  { code: 'R', weight: 1.5 },  // Teoritis
  { code: 'I', weight: 1.0 },  // Keputusan
  { code: 'C', weight: 0.5 }   // Mengatur
]
```

**Jika skor PAPI:**
- R = 5/9 = 56%
- I = 7/9 = 78%
- C = 4/9 = 44%

**Perhitungan:**
```
= (56 × 1.5) + (78 × 1.0) + (44 × 0.5)
= 84 + 78 + 22
= 184

Total Bobot = 1.5 + 1.0 + 0.5 = 3.0

Skor Akhir = 184 / 3.0 = 61.3%
Rating = "B" (Baik)
```

### Tips Pengaturan Bobot

| Bobot | Makna |
|-------|-------|
| `2.0` | Sangat dominan/penting |
| `1.5` | Cukup dominan |
| `1.0` | Normal/standar |
| `0.5` | Pendukung/sekunder |

---

## 🔄 Inverse Scale

### Kapan Menggunakan Inverse?

Gunakan `inverse: true` ketika skor **tinggi** pada skala PAPI justru menunjukkan hasil **negatif** untuk aspek tersebut.

### Contoh: Stabilitas Emosi

```javascript
stabilitasEmosi: {
  title: 'Stabilitas Emosi',
  description: 'Kemampuan untuk memahami dan mengontrol emosi.',
  scales: [
    { code: 'E', weight: 2 },              // E tinggi = emosi stabil ✓
    { code: 'K', weight: 1, inverse: true } // K tinggi = agresif = emosi tidak stabil ✗
  ]
}
```

**Perhitungan dengan Inverse:**
- E = 6/9 = 67%
- K = 3/9 = 33% → inverse → 100 - 33 = **67%**

```
= (67 × 2.0) + (67 × 1.0)
= 134 + 67
= 201 / 3.0
= 67% → Rating "B"
```

---

## 📝 Daftar Lengkap Mapping

### A. KECERDASAN

#### 1. Logika Berpikir
```javascript
logikaBerpikir: {
  title: 'Logika Berpikir',
  description: 'Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah.',
  scales: [
    { code: 'R', weight: 1.5 },   // Teoritis - pemikiran analitis
    { code: 'I', weight: 1 },     // Keputusan - kemampuan mengambil keputusan logis
    { code: 'C', weight: 0.5 }    // Mengatur - kemampuan mengorganisir pikiran
  ]
}
```

#### 2. Kemampuan Analisa
```javascript
kemampuanAnalisa: {
  title: 'Kemampuan Analisa',
  description: 'Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian.',
  scales: [
    { code: 'R', weight: 1.5 },   // Teoritis - analisis mendalam
    { code: 'D', weight: 1.5 },   // Detail - perhatian pada detail
    { code: 'C', weight: 0.5 }    // Mengatur - sistematisasi
  ]
}
```

#### 3. Kemampuan Numerikal
```javascript
kemampuanNumerikal: {
  title: 'Kemampuan Numerikal',
  description: 'Kemampuan untuk berpikir praktis dalam memahami konsep angka.',
  scales: [
    { code: 'D', weight: 1.5 },   // Detail - ketelitian dengan angka
    { code: 'C', weight: 1 },     // Mengatur - kalkulasi
    { code: 'N', weight: 0.5 }    // Menyelesaikan Tugas - fokus pada hasil
  ]
}
```

#### 4. Kemampuan Verbal
```javascript
kemampuanVerbal: {
  title: 'Kemampuan Verbal',
  description: 'Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata.',
  scales: [
    { code: 'S', weight: 1.5 },   // Hubungan Sosial - komunikasi
    { code: 'X', weight: 1 },     // Butuh Perhatian - ekspresi verbal
    { code: 'R', weight: 0.5 }    // Teoritis - pemahaman konsep
  ]
}
```

---

### B. SIKAP DAN CARA KERJA

#### 1. Orientasi Hasil
```javascript
orientasiHasil: {
  title: 'Orientasi Hasil',
  description: 'Kemampuan untuk mempertahankan komitmen menyelesaikan tugas.',
  scales: [
    { code: 'A', weight: 1.5 },   // Motivasi - dorongan berprestasi
    { code: 'N', weight: 1.5 },   // Menyelesaikan Tugas - komitmen
    { code: 'G', weight: 1 }      // Pekerja Keras - kerja keras
  ]
}
```

#### 2. Fleksibilitas
```javascript
fleksibilitas: {
  title: 'Fleksibilitas',
  description: 'Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan.',
  scales: [
    { code: 'Z', weight: 1.5 },               // Berubah - adaptasi
    { code: 'E', weight: 1 },                 // Pengendalian Emosi - tenang
    { code: 'W', weight: 0.5, inverse: true } // Aturan - terlalu kaku jika tinggi
  ]
}
```

#### 3. Sistematika Kerja
```javascript
sistematikaKerja: {
  title: 'Sistematika Kerja',
  description: 'Kemampuan untuk merencanakan hingga mengorganisasikan cara kerja.',
  scales: [
    { code: 'C', weight: 1.5 },   // Mengatur - organisasi
    { code: 'W', weight: 1 },     // Mengikuti Aturan - prosedural
    { code: 'R', weight: 1 },     // Teoritis - perencanaan
    { code: 'D', weight: 0.5 }    // Detail - ketelitian
  ]
}
```

---

### C. KEPRIBADIAN

#### 1. Motivasi Berprestasi
```javascript
motivasiBerprestasi: {
  title: 'Motivasi Berprestasi',
  description: 'Kemampuan untuk menunjukkan prestasi dan mencapai target.',
  scales: [
    { code: 'A', weight: 2 },     // Motivasi - achievement (DOMINAN)
    { code: 'N', weight: 1 },     // Menyelesaikan Tugas - penyelesaian
    { code: 'G', weight: 0.5 }    // Pekerja Keras - usaha
  ]
}
```

#### 2. Kerjasama
```javascript
kerjasama: {
  title: 'Kerjasama',
  description: 'Kemampuan untuk menjalin dan mengoptimalkan hubungan kerja.',
  scales: [
    { code: 'B', weight: 1.5 },   // Diterima dalam Kelompok - team player
    { code: 'O', weight: 1 },     // Kedekatan - hubungan baik
    { code: 'F', weight: 1 }      // Membantu Atasan - supportive
  ]
}
```

#### 3. Keterampilan Interpersonal
```javascript
keterampilanInterpersonal: {
  title: 'Keterampilan Interpersonal',
  description: 'Kemampuan untuk menjalin hubungan sosial dan memahami kebutuhan orang lain.',
  scales: [
    { code: 'S', weight: 1.5 },   // Hubungan Sosial - social skill
    { code: 'O', weight: 1 },     // Kedekatan - empati
    { code: 'X', weight: 0.5 }    // Butuh Perhatian - interaksi
  ]
}
```

#### 4. Stabilitas Emosi
```javascript
stabilitasEmosi: {
  title: 'Stabilitas Emosi',
  description: 'Kemampuan untuk memahami dan mengontrol emosi.',
  scales: [
    { code: 'E', weight: 2 },                 // Pengendalian Emosi (DOMINAN)
    { code: 'K', weight: 1, inverse: true }   // Agresif - kebalikan stabilitas
  ]
}
```

---

### D. KEMAMPUAN BELAJAR

#### 1. Pengembangan Diri
```javascript
pengembanganDiri: {
  title: 'Pengembangan Diri',
  description: 'Kemampuan untuk meningkatkan pengetahuan dan keterampilan diri.',
  scales: [
    { code: 'Z', weight: 1 },     // Berubah - terbuka pada pengembangan
    { code: 'A', weight: 1.5 },   // Motivasi - dorongan berkembang
    { code: 'R', weight: 0.5 }    // Teoritis - minat belajar
  ]
}
```

#### 2. Mengelola Perubahan
```javascript
mengelolaPerubahan: {
  title: 'Mengelola Perubahan',
  description: 'Kemampuan dalam menyesuaikan diri dengan situasi baru.',
  scales: [
    { code: 'Z', weight: 1.5 },               // Berubah - adaptasi
    { code: 'E', weight: 1 },                 // Pengendalian Emosi - tenang
    { code: 'W', weight: 0.5, inverse: true } // Aturan - fleksibilitas
  ]
}
```

---

## 🔧 Cara Mengubah Mapping

### Contoh 1: Mengubah Bobot

Misal ingin membuat skala **A (Motivasi)** lebih dominan untuk **Orientasi Hasil**:

```javascript
// SEBELUM
orientasiHasil: {
  scales: [
    { code: 'A', weight: 1.5 },  // ← Ubah ini
    { code: 'N', weight: 1.5 },
    { code: 'G', weight: 1 }
  ]
}

// SESUDAH
orientasiHasil: {
  scales: [
    { code: 'A', weight: 2.5 },  // ← Jadi lebih dominan
    { code: 'N', weight: 1.5 },
    { code: 'G', weight: 1 }
  ]
}
```

### Contoh 2: Menambah Skala Baru

Misal ingin menambah skala **L (Leadership)** ke aspek **Orientasi Hasil**:

```javascript
orientasiHasil: {
  scales: [
    { code: 'A', weight: 1.5 },
    { code: 'N', weight: 1.5 },
    { code: 'G', weight: 1 },
    { code: 'L', weight: 0.5 }   // ← Tambah ini
  ]
}
```

### Contoh 3: Menambah Inverse Scale

Misal ingin menambah skala **W (Aturan)** sebagai inverse ke aspek tertentu:

```javascript
fleksibilitas: {
  scales: [
    { code: 'Z', weight: 1.5 },
    { code: 'E', weight: 1 },
    { code: 'W', weight: 0.5, inverse: true }  // W tinggi = kurang fleksibel
  ]
}
```

---

## 📋 Referensi Skala PAPI

| Code | Nama | Deskripsi |
|------|------|-----------|
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

## 🧪 Testing Perubahan

Setelah mengubah mapping, Anda bisa test dengan:

1. Buka halaman **Buat Psikogram** (`/psychology/psikogram/create`)
2. Pilih peserta yang sudah verified
3. Lihat **Console Browser** (F12 → Console) untuk debug output:
   - `Session Data:` - Data session dari backend
   - `Answers found:` - Jumlah jawaban
   - `Scale Scores:` - Skor per skala PAPI
4. Perhatikan rating yang dihasilkan

---

## 📞 Bantuan

Jika ada pertanyaan tentang konfigurasi, hubungi tim development atau buka file:
- `src/utils/psychology/psikogramAnalyzer.js` - Kode analyzer
- `docs/PAPI-PSIKOGRAM-MAPPING.md` - Dokumentasi mapping detail
- `docs/PSIKOGRAM-API-SPECIFICATION.md` - Spesifikasi API

---

## 📝 Changelog

| Versi | Tanggal | Perubahan |
|-------|---------|-----------|
| 1.0.0 | 2025-12-03 | Initial release |
