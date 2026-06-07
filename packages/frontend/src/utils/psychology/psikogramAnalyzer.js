/**
 * Psikogram Analyzer
 * 
 * Utility untuk menganalisis skor PAPI Kostick dan mengkonversinya
 * menjadi rating aspek Psikogram (R/K/C/B/T)
 * 
 * Rating Scale:
 * - R (Rendah)    : 0% - 20%
 * - K (Kurang)    : 21% - 40%
 * - C (Cukup)     : 41% - 60%
 * - B (Baik)      : 61% - 80%
 * - T (Tinggi)    : 81% - 100%
 */

/**
 * Mapping aspek Psikogram ke skala PAPI
 * Setiap aspek memiliki daftar skala PAPI yang relevan beserta bobotnya
 * 
 * weight: bobot kontribusi skala terhadap aspek (default 1)
 * inverse: jika true, skor tinggi berarti rating rendah (misal: K untuk Stabilitas Emosi)
 */
export const PSIKOGRAM_PAPI_MAPPING = {
  // A. KECERDASAN
  kecerdasan: {
    logikaBerpikir: {
      title: 'Logika Berpikir',
      description: 'Kemampuan menggunakan pemikiran yang bersifat taktis untuk memecahkan masalah yang dihadapi.',
      scales: [
        { code: 'R', weight: 1.5 },   // Teoritis - pemikiran analitis
        { code: 'I', weight: 1 },     // Keputusan - kemampuan mengambil keputusan logis
        { code: 'C', weight: 0.5 }    // Mengatur - kemampuan mengorganisir pikiran
      ]
    },
    kemampuanAnalisa: {
      title: 'Kemampuan Analisa',
      description: 'Kemampuan untuk memahami situasi dengan menguraikannya menjadi bagian-bagian yang lebih kecil.',
      scales: [
        { code: 'R', weight: 1.5 },   // Teoritis - analisis mendalam
        { code: 'D', weight: 1.5 },   // Detail - perhatian pada detail
        { code: 'C', weight: 0.5 }    // Mengatur - sistematisasi
      ]
    },
    kemampuanNumerikal: {
      title: 'Kemampuan Numerikal',
      description: 'Kemampuan untuk berpikir praktis dalam memahami konsep angka dan hitungan.',
      scales: [
        { code: 'D', weight: 1.5 },   // Detail - ketelitian dengan angka
        { code: 'C', weight: 1 },     // Mengatur - kalkulasi
        { code: 'N', weight: 0.5 }    // Menyelesaikan Tugas - fokus pada hasil
      ]
    },
    kemampuanVerbal: {
      title: 'Kemampuan Verbal',
      description: 'Kemampuan untuk memahami konsep dan pola dalam bentuk kata-kata.',
      scales: [
        { code: 'S', weight: 1.5 },   // Hubungan Sosial - komunikasi
        { code: 'X', weight: 1 },     // Butuh Perhatian - ekspresi verbal
        { code: 'R', weight: 0.5 }    // Teoritis - pemahaman konsep
      ]
    }
  },

  // B. SIKAP DAN CARA KERJA
  sikapKerja: {
    orientasiHasil: {
      title: 'Orientasi Hasil',
      description: 'Kemampuan untuk mempertahankan komitmen untuk menyelesaikan tugas secara bertanggung jawab.',
      scales: [
        { code: 'A', weight: 1.5 },   // Motivasi - dorongan berprestasi
        { code: 'N', weight: 1.5 },   // Menyelesaikan Tugas - komitmen
        { code: 'G', weight: 1 }      // Pekerja Keras - kerja keras
      ]
    },
    fleksibilitas: {
      title: 'Fleksibilitas',
      description: 'Kemampuan untuk menyesuaikan diri dalam menghadapi permasalahan.',
      scales: [
        { code: 'Z', weight: 1.5 },   // Berubah - adaptasi
        { code: 'E', weight: 1 },     // Pengendalian Emosi - tenang menghadapi perubahan
        { code: 'W', weight: 0.5, inverse: true } // Aturan - terlalu kaku jika tinggi
      ]
    },
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
  },

  // C. KEPRIBADIAN
  kepribadian: {
    motivasiBerprestasi: {
      title: 'Motivasi Berprestasi',
      description: 'Kemampuan untuk menunjukkan prestasi dan mencapai target.',
      scales: [
        { code: 'A', weight: 2 },     // Motivasi - achievement
        { code: 'N', weight: 1 },     // Menyelesaikan Tugas - penyelesaian
        { code: 'G', weight: 0.5 }    // Pekerja Keras - usaha
      ]
    },
    kerjasama: {
      title: 'Kerjasama',
      description: 'Kemampuan untuk menjalin, membina dan mengoptimalkan hubungan kerja yang efektif.',
      scales: [
        { code: 'B', weight: 1.5 },   // Diterima dalam Kelompok - team player
        { code: 'O', weight: 1 },     // Kedekatan - hubungan baik
        { code: 'F', weight: 1 }      // Membantu Atasan - supportive
      ]
    },
    keterampilanInterpersonal: {
      title: 'Keterampilan Interpersonal',
      description: 'Kemampuan untuk menjalin hubungan sosial dan mampu memahami kebutuhan orang lain.',
      scales: [
        { code: 'S', weight: 1.5 },   // Hubungan Sosial - social skill
        { code: 'O', weight: 1 },     // Kedekatan - empati
        { code: 'X', weight: 0.5 }    // Butuh Perhatian - interaksi
      ]
    },
    stabilitasEmosi: {
      title: 'Stabilitas Emosi',
      description: 'Kemampuan untuk memahami dan mengontrol emosi.',
      scales: [
        { code: 'E', weight: 2 },     // Pengendalian Emosi - langsung
        { code: 'K', weight: 1, inverse: true } // Agresif - kebalikan stabilitas
      ]
    }
  },

  // D. KEMAMPUAN BELAJAR
  kemampuanBelajar: {
    pengembanganDiri: {
      title: 'Pengembangan Diri',
      description: 'Kemampuan untuk meningkatkan pengetahuan dan menyempurnakan keterampilan diri.',
      scales: [
        { code: 'Z', weight: 1 },     // Berubah - terbuka pada pengembangan
        { code: 'A', weight: 1.5 },   // Motivasi - dorongan berkembang
        { code: 'R', weight: 0.5 }    // Teoritis - minat belajar
      ]
    },
    mengelolaPerubahan: {
      title: 'Mengelola Perubahan',
      description: 'Kemampuan dalam menyesuaikan diri dengan situasi baru.',
      scales: [
        { code: 'Z', weight: 1.5 },   // Berubah - adaptasi
        { code: 'E', weight: 1 },     // Pengendalian Emosi - tenang
        { code: 'W', weight: 0.5, inverse: true } // Aturan - fleksibilitas
      ]
    }
  }
}

/**
 * Threshold untuk konversi persentase ke rating R/K/C/B/T
 */
export const RATING_THRESHOLDS = {
  R: { min: 0, max: 20, label: 'Rendah' },
  K: { min: 21, max: 40, label: 'Kurang' },
  C: { min: 41, max: 60, label: 'Cukup' },
  B: { min: 61, max: 80, label: 'Baik' },
  T: { min: 81, max: 100, label: 'Tinggi' }
}

/**
 * Konversi persentase ke rating (R/K/C/B/T)
 * @param {number} percent - Persentase (0-100)
 * @returns {string} Rating code (R/K/C/B/T)
 */
export function percentToRating(percent) {
  if (percent <= 20) return 'R'
  if (percent <= 40) return 'K'
  if (percent <= 60) return 'C'
  if (percent <= 80) return 'B'
  return 'T'
}

/**
 * Hitung skor aspek berdasarkan skor skala PAPI
 * @param {Object} aspectConfig - Konfigurasi aspek dari PSIKOGRAM_PAPI_MAPPING
 * @param {Object} papiScores - Object dengan key = scale code, value = { score, max, percent }
 * @returns {{ percent: number, rating: string, details: Array }}
 */
export function calculateAspectScore(aspectConfig, papiScores) {
  const { scales } = aspectConfig
  let totalWeightedScore = 0
  let totalWeight = 0
  const details = []

  for (const scaleConfig of scales) {
    const { code, weight = 1, inverse = false } = scaleConfig
    const scaleData = papiScores[code]
    
    if (scaleData) {
      // Konversi skor ke persentase (0-100)
      let percent = (scaleData.score / (scaleData.max || 9)) * 100
      
      // Jika inverse, balik persentasenya
      if (inverse) {
        percent = 100 - percent
      }
      
      totalWeightedScore += percent * weight
      totalWeight += weight
      
      details.push({
        code,
        score: scaleData.score,
        max: scaleData.max || 9,
        percent: Math.round(percent),
        weight,
        inverse,
        contribution: Math.round(percent * weight)
      })
    }
  }

  const finalPercent = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0
  
  return {
    percent: finalPercent,
    rating: percentToRating(finalPercent),
    details
  }
}

/**
 * Analisis lengkap skor PAPI dan hasilkan rating untuk semua aspek Psikogram
 * @param {Array<{id: number, answer: 'A' | 'B'}>} answers - Jawaban PAPI
 * @param {Array<{id: number, scaleA: string, scaleB: string}>} questions - Pertanyaan PAPI
 * @returns {Object} Hasil analisis dengan rating per aspek
 */
export function analyzePapiToPsikogram(answers, questions) {
  // Import fungsi calculatePapiScores
  // Note: Ini akan dipanggil dari composable yang sudah memiliki akses ke fungsi tersebut
  
  // Hitung skor per skala PAPI
  const scaleScores = calculateScalesFromAnswers(answers, questions)
  
  // Konversi ke format yang mudah diakses
  const papiScores = {}
  for (const scale of scaleScores) {
    papiScores[scale.code] = {
      score: scale.score,
      max: scale.max,
      percent: scale.percent
    }
  }
  
  return analyzePapiScoresToPsikogram(papiScores)
}

/**
 * Hitung skor per skala dari jawaban
 * Support 2 format:
 * 1. Array: [{ id: 1, answer: "A" }, { id: 2, answer: "B" }, ...]
 * 2. Object: { "1": "A", "2": "B", ... }
 * 
 * @param {Array|Object} answers - Jawaban PAPI (array atau object)
 * @param {Array<{id: number, scaleA: string, scaleB: string}>} questions
 * @returns {Array<{code: string, score: number, max: number, percent: number}>}
 */
export function calculateScalesFromAnswers(answers, questions) {
  // Normalize answers ke format map { id: answer }
  const answerMap = {}
  
  if (Array.isArray(answers)) {
    // Format array: [{ id: 1, answer: "A" }, ...]
    for (const ans of answers) {
      if (ans && ans.id != null && ans.answer) {
        answerMap[ans.id] = ans.answer
      }
    }
  } else if (answers && typeof answers === 'object') {
    // Format object bisa 2 jenis:
    // 1. { "1": "A", "2": "B", ... } (OLD FORMAT)
    // 2. { "1": { answer: "A", duration: 8, timestamp: "..." }, ... } (NEW FORMAT)
    for (const [id, answer] of Object.entries(answers)) {
      if (answer) {
        // Check if answer is object with 'answer' property (new format)
        if (typeof answer === 'object' && answer.answer) {
          answerMap[id] = answer.answer
        } else if (typeof answer === 'string') {
          // Old format: direct string value
          answerMap[id] = answer
        }
      }
    }
  }
  
  // Hitung skor per skala
  const counts = {}
  const maxes = {}
  
  for (const q of questions) {
    if (q.scaleA) maxes[q.scaleA] = (maxes[q.scaleA] || 0) + 1
    if (q.scaleB) maxes[q.scaleB] = (maxes[q.scaleB] || 0) + 1
    
    const ans = answerMap[q.id] || answerMap[String(q.id)]
    if (ans === 'A' && q.scaleA) {
      counts[q.scaleA] = (counts[q.scaleA] || 0) + 1
    } else if (ans === 'B' && q.scaleB) {
      counts[q.scaleB] = (counts[q.scaleB] || 0) + 1
    }
  }
  
  // Gabungkan hasil
  const allKeys = new Set([...Object.keys(counts), ...Object.keys(maxes)])
  const list = []
  
  for (const code of allKeys) {
    const score = counts[code] || 0
    const max = maxes[code] || 9
    const percent = Math.round((score / max) * 100)
    list.push({ code, score, max, percent })
  }
  
  return list
}

/**
 * Analisis skor PAPI yang sudah dihitung ke aspek Psikogram
 * @param {Object} papiScores - Object dengan key = scale code, value = { score, max, percent }
 * @returns {Object} Hasil analisis lengkap
 */
export function analyzePapiScoresToPsikogram(papiScores) {
  const result = {
    kecerdasan: {
      items: [],
      overallPercent: 0
    },
    sikapKerja: {
      items: [],
      overallPercent: 0
    },
    kepribadian: {
      items: [],
      overallPercent: 0
    },
    kemampuanBelajar: {
      items: [],
      overallPercent: 0
    }
  }
  
  // Process setiap section
  for (const [sectionKey, sectionConfig] of Object.entries(PSIKOGRAM_PAPI_MAPPING)) {
    let sectionTotalPercent = 0
    let itemCount = 0
    
    for (const [itemKey, itemConfig] of Object.entries(sectionConfig)) {
      const analysis = calculateAspectScore(itemConfig, papiScores)
      
      result[sectionKey].items.push({
        key: itemKey,
        title: itemConfig.title,
        description: itemConfig.description,
        rating: analysis.rating,
        percent: analysis.percent,
        details: analysis.details
      })
      
      sectionTotalPercent += analysis.percent
      itemCount++
    }
    
    result[sectionKey].overallPercent = itemCount > 0 
      ? Math.round(sectionTotalPercent / itemCount) 
      : 0
  }
  
  // Hitung overall score
  const allSections = Object.values(result)
  const totalPercent = allSections.reduce((sum, s) => sum + s.overallPercent, 0)
  result.overallPercent = Math.round(totalPercent / allSections.length)
  result.overallRating = percentToRating(result.overallPercent)
  
  return result
}

/**
 * Generate form data untuk Psikogram create page dari hasil analisis
 * @param {Object} analysisResult - Hasil dari analyzePapiScoresToPsikogram
 * @returns {Object} Form data yang bisa langsung digunakan
 */
export function generatePsikogramFormData(analysisResult) {
  return {
    sections: {
      kecerdasan: {
        items: analysisResult.kecerdasan.items.map(item => ({
          title: item.title,
          description: item.description,
          rating: item.rating
        })),
        conclusion: ''
      },
      sikapKerja: {
        items: analysisResult.sikapKerja.items.map(item => ({
          title: item.title,
          description: item.description,
          rating: item.rating
        })),
        conclusion: ''
      },
      kepribadian: {
        items: analysisResult.kepribadian.items.map(item => ({
          title: item.title,
          description: item.description,
          rating: item.rating
        })),
        conclusion: ''
      },
      kemampuanBelajar: {
        items: analysisResult.kemampuanBelajar.items.map(item => ({
          title: item.title,
          description: item.description,
          rating: item.rating
        })),
        conclusion: ''
      }
    },
    analysisDetails: analysisResult // Simpan detail untuk referensi
  }
}

/**
 * Get rating label
 * @param {string} rating - Rating code (R/K/C/B/T)
 * @returns {string} Label text
 */
export function getRatingLabel(rating) {
  return RATING_THRESHOLDS[rating]?.label || rating
}

/**
 * Get rating color class (untuk DaisyUI)
 * @param {string} rating - Rating code (R/K/C/B/T)
 * @returns {string} CSS class
 */
export function getRatingColorClass(rating) {
  const colors = {
    R: 'badge-error',
    K: 'badge-warning',
    C: 'badge-info',
    B: 'badge-success',
    T: 'badge-primary'
  }
  return colors[rating] || 'badge-ghost'
}

export default {
  PSIKOGRAM_PAPI_MAPPING,
  RATING_THRESHOLDS,
  percentToRating,
  calculateAspectScore,
  analyzePapiToPsikogram,
  analyzePapiScoresToPsikogram,
  calculateScalesFromAnswers,
  generatePsikogramFormData,
  getRatingLabel,
  getRatingColorClass
}
