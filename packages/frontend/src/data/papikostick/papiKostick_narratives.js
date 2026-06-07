/**
 * PAPI Kostick – Narasi per skala
 * Diambil dari JSON agar mudah dipelihara non-developer
 */

import narrativesJson from './papiKostick_narratives.json'

/** @typedef {{ name: string, description: string, levels?: { low?: string, medium?: string, high?: string } }} PapiScaleNarrative */

/** @type {Record<string, PapiScaleNarrative>} */
export const papiScaleNarratives = narrativesJson
export default papiScaleNarratives

// Default threshold untuk menentukan level (low/medium/high)
export const defaultLevelThresholds = { low: 0.33, high: 0.66 }

/**
 * Hitung level berdasarkan skor dan maksimum kemunculan skala.
 * @param {{ score: number, max: number, code: string, thresholds?: { low?: number, high?: number } }} p
 * @returns {{ level: 'low' | 'medium' | 'high', percent: number, label: string, title: string, narrative: string }}
 */
export const interpretPapiScale = ({ score, max, code, thresholds = {} }) => {
  const tLow = typeof thresholds.low === 'number' ? thresholds.low : defaultLevelThresholds.low
  const tHigh = typeof thresholds.high === 'number' ? thresholds.high : defaultLevelThresholds.high
  
  const meta = papiScaleNarratives[code] || { 
    name: `Skala ${code}`, 
    description: 'Deskripsi skala belum ditentukan.' 
  }
  
  const pct = max > 0 ? score / max : 0
  
  let level = 'medium'
  if (pct <= tLow) level = 'low'
  else if (pct > tHigh) level = 'high'
  
  const label = level === 'low' ? 'Rendah' : level === 'high' ? 'Tinggi' : 'Sedang'
  const narrative = meta.levels?.[level] || meta.description
  
  return { level, percent: pct, label, title: meta.name, narrative }
}

/**
 * Hitung skor untuk semua skala dari jawaban
 * @param {Array<{id: number, answer: 'A' | 'B'}>} answers - Array jawaban
 * @param {Array<{id: number, scaleA: string, scaleB: string}>} questions - Array pertanyaan dengan skala
 * @returns {Array<{code: string, score: number, max: number, percent: number, level: string, label: string, title: string, narrative: string}>}
 */
export const calculatePapiScores = (answers, questions) => {
  // Map id -> jawaban
  const answerMap = Object.create(null)
  for (const ans of answers) {
    if (ans && ans.id != null && ans.answer) {
      answerMap[ans.id] = ans.answer
    }
  }
  
  // Hitung skor per skala
  const counts = Object.create(null)
  const maxes = Object.create(null)
  
  for (const q of questions) {
    if (q.scaleA) maxes[q.scaleA] = (maxes[q.scaleA] || 0) + 1
    if (q.scaleB) maxes[q.scaleB] = (maxes[q.scaleB] || 0) + 1
    
    const ans = answerMap[q.id]
    if (ans === 'A' && q.scaleA) {
      counts[q.scaleA] = (counts[q.scaleA] || 0) + 1
    } else if (ans === 'B' && q.scaleB) {
      counts[q.scaleB] = (counts[q.scaleB] || 0) + 1
    }
  }
  
  // Gabungkan skor, maksimum, persentase dan narasi per skala
  const allKeys = new Set([...Object.keys(counts), ...Object.keys(maxes)])
  const list = []
  
  for (const code of allKeys) {
    const score = counts[code] || 0
    const max = maxes[code] || 0
    const { level, percent, label, title, narrative } = interpretPapiScale({ score, max, code })
    list.push({ code, score, max, percent, level, label, title, narrative })
  }
  
  // Sort by score descending, then by code
  list.sort((a, b) => (b.score - a.score) || String(a.code).localeCompare(String(b.code)))
  
  return list
}

/**
 * Group scales by aspect based on norms
 * @param {Array<{code: string, score: number, percent: number, level: string, label: string}>} scaleDetails
 * @param {Array<{aspect: string, code: string, description: string}>} norms
 * @returns {Array<{aspect: string, codes: Array<{code: string, description: string, score: number, percent: number, level: string, label: string}>}>}
 */
export const groupByAspect = (scaleDetails, norms) => {
  const detailsMap = new Map(scaleDetails.map((d) => [String(d.code), d]))
  const map = new Map()
  
  for (const entry of norms) {
    if (!map.has(entry.aspect)) map.set(entry.aspect, [])
    const det = detailsMap.get(String(entry.code)) || null
    map.get(entry.aspect).push({
      code: entry.code,
      description: entry.description,
      score: det?.score ?? 0,
      percent: det?.percent ?? 0,
      level: det?.level ?? null,
      label: det?.label ?? null,
    })
  }
  
  return Array.from(map.entries()).map(([aspect, codes]) => ({ aspect, codes }))
}

// Scale descriptions for quick reference
export const scaleDescriptions = {
  G: 'Hard Working (Pekerja Keras)',
  L: 'Leadership Role (Peran Kepemimpinan)',
  I: 'Ease of Decision Making (Kemudahan Pengambilan Keputusan)',
  T: 'Pace (Kecepatan Kerja)',
  V: 'Vigorous Type (Tipe Bersemangat)',
  R: 'Theoretical Type (Tipe Teoritis)',
  D: 'Interest in Detail (Minat pada Detail)',
  C: 'Organized Type (Tipe Terorganisir)',
  A: 'Need to Achieve (Kebutuhan Berprestasi)',
  N: 'Need to Finish Task (Kebutuhan Menyelesaikan Tugas)',
  P: 'Need to Control Others (Kebutuhan Mengontrol)',
  X: 'Need to be Noticed (Kebutuhan Diperhatikan)',
  B: 'Need to Belong (Kebutuhan Berkelompok)',
  O: 'Need for Closeness (Kebutuhan Kedekatan)',
  S: 'Social Extension (Pergaulan Sosial)',
  Z: 'Need for Change (Kebutuhan Perubahan)',
  E: 'Emotional Stability (Stabilitas Emosi)',
  K: 'Aggressiveness (Agresif)',
  W: 'Need for Rules (Kebutuhan Aturan)',
  F: 'Need to Support Superior (Kebutuhan Mendukung Atasan)',
}

// All PAPI scales ordered
export const PAPI_SCALES = ['G', 'L', 'I', 'T', 'V', 'R', 'D', 'C', 'A', 'N', 'P', 'X', 'B', 'O', 'S', 'Z', 'E', 'K', 'W', 'F']

// Max score per scale (each scale appears 9 times in the test)
export const MAX_SCORE_PER_SCALE = 9
