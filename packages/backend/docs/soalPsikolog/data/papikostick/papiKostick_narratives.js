// PAPI Kostick – narasi per skala diambil dari JSON agar mudah dipelihara non-developer
// Sumber: src/data/papikostick/papikostickNarative.json

import json from './papikostickNarative.json'

/** @typedef {{ name: string, description: string, levels?: { low?: string, medium?: string, high?: string } }} PapiScaleNarrative */

/** @type {Record<string, PapiScaleNarrative>} */
export const papiScaleNarratives = json
export default papiScaleNarratives

export const defaultLevelThresholds = { low: 0.33, high: 0.66 }

/**
 * Hitung level berdasarkan skor dan maksimum kemunculan skala.
 * @param {{ score: number, max: number, code: string, thresholds?: { low?: number, high?: number } }} p
 * @returns {{ level: 'low' | 'medium' | 'high', percent: number, label: string, title: string, narrative: string }}
 */
export const interpretPapiScale = ({ score, max, code, thresholds = {} }) => {
  const tLow = typeof thresholds.low === 'number' ? thresholds.low : defaultLevelThresholds.low
  const tHigh = typeof thresholds.high === 'number' ? thresholds.high : defaultLevelThresholds.high
  const meta = papiScaleNarratives[code] || { name: `Skala ${code}`, description: 'Deskripsi skala belum ditentukan.' }
  const pct = max > 0 ? score / max : 0
  let level = 'medium'
  if (pct <= tLow) level = 'low'
  else if (pct > tHigh) level = 'high'
  const label = level === 'low' ? 'Rendah' : level === 'high' ? 'Tinggi' : 'Sedang'
  const narrative = meta.levels?.[level] || meta.description
  return { level, percent: pct, label, title: meta.name, narrative }
}
