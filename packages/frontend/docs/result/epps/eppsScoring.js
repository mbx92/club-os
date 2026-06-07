// EPPS scoring utilities (JavaScript + JSDoc)
// Mirrors the Excel logic (inclusive bounds) and provides reusable functions.

/**
 * @typedef {'male'|'female'} Sex
 * @typedef {'- - -'|'- -'|'-'|'0'|'+'|'+ +'|'+ + +'|''} CategorySymbol
 * @typedef {{ min: number|null, max: number|null, label: CategorySymbol }} ThresholdSegment
 * @typedef {'ach'|'def'|'ord'|'exh'|'aut'|'aff'|'int'|'suc'|'dom'|'aba'|'nur'|'chg'|'end'|'het'|'agg'|string} TraitId
 */

/** @param {number|null} min @param {number|null} max @param {CategorySymbol} label */
const seg = (min, max, label) => ({ min, max, label })

// Male thresholds (sheet: Laki-laki)
/** @type {Record<string, ThresholdSegment[]>} */
const MALE_THRESHOLDS = {
  // Achievement
  ach: [
    seg(0, 9.5, '- - -'),
    seg(9.51, 12.67, '- -'),
    seg(12.68, 15.74, '-'),
    seg(15.75, 18.81, '0'),
    seg(18.82, 21.88, '+'),
    seg(21.89, 24.95, '+ +'),
    seg(24.96, null, '+ + +'),
  ],
  // Deference
  def: [
    seg(0, 6.04, '- - -'),
    seg(6.05, 9.52, '- -'),
    seg(9.53, 13.0, '-'),
    seg(13.01, 16.48, '0'),
    seg(16.49, 19.96, '+'),
    seg(19.97, 23.44, '+ +'),
    seg(23.45, null, '+ + +'),
  ],
  // Order
  ord: [
    seg(0, 9.31, '- - -'),
    seg(9.32, 13.2, '- -'),
    seg(13.21, 17.09, '-'),
    seg(17.1, 20.98, '0'),
    seg(20.99, 24.87, '+'),
    seg(24.88, 28.75, '+ +'),
    seg(28.76, null, '+ + +'),
  ],
  // Exhibition
  exh: [
    seg(0, 2.07, '- - -'),
    seg(2.08, 5.49, '- -'),
    seg(5.5, 8.91, '-'),
    seg(8.92, 12.33, '0'),
    seg(12.34, 15.75, '+'),
    seg(15.76, 19.17, '+ +'),
    seg(19.18, null, '+ + +'),
  ],
  // Autonomy
  aut: [
    seg(null, 0.01, '- - -'),
    seg(0.02, 3.35, '- -'),
    seg(3.36, 6.69, '-'),
    seg(6.7, 10.03, '0'),
    seg(10.04, 13.37, '+'),
    seg(13.38, 16.71, '+ +'),
    seg(16.72, null, '+ + +'),
  ],
  // Affiliation
  aff: [
    seg(0, 3.76, '- - -'),
    seg(3.77, 7.4, '- -'),
    seg(7.41, 11.04, '-'),
    seg(11.05, 14.68, '0'),
    seg(14.69, 18.32, '+'),
    seg(18.33, 21.96, '+ +'),
    seg(21.97, null, '+ + +'),
  ],
  // Intraception
  int: [
    seg(0, 4.4, '- - -'),
    seg(4.41, 8.25, '- -'),
    seg(8.26, 12.1, '-'),
    seg(12.11, 15.95, '0'),
    seg(15.96, 19.8, '+'),
    seg(19.81, 23.65, '+ +'),
    seg(23.66, null, '+ + +'),
  ],
  // Succorance
  suc: [
    seg(0, 0.65, '- - -'),
    seg(0.66, 5.66, '- -'),
    seg(5.67, 10.67, '-'),
    seg(10.68, 15.68, '0'),
    seg(15.69, 20.69, '+'),
    seg(20.7, 25.7, '+ +'),
    seg(25.71, null, '+ + +'),
  ],
  // Dominance
  dom: [
    seg(0, 3.34, '- - -'),
    seg(3.35, 7.51, '- -'),
    seg(7.52, 11.68, '-'),
    seg(11.69, 15.85, '0'),
    seg(15.86, 20.02, '+'),
    seg(20.03, 24.19, '+ +'),
    seg(24.2, null, '+ + +'),
  ],
  // Abasement
  aba: [
    seg(0, 7.63, '- - -'),
    seg(7.64, 11.63, '- -'),
    seg(11.64, 15.63, '-'),
    seg(15.64, 19.63, '0'),
    seg(19.64, 23.63, '+'),
    seg(23.64, 27.63, '+ +'),
    seg(27.64, null, '+ + +'),
  ],
  // Nurturance
  nur: [
    seg(0, 8.57, '- - -'),
    seg(8.58, 12.42, '- -'),
    seg(12.43, 16.27, '-'),
    seg(16.28, 20.12, '0'),
    seg(20.13, 23.97, '+'),
    seg(23.27, 27.82, '+ +'),
    seg(27.83, null, '+ + +'),
  ],
  // Change (G20)
  chg: [
    seg(0, 2.35, '- - -'),
    seg(2.36, 6.17, '- -'),
    seg(6.18, 9.99, '-'),
    seg(10, 13.81, '0'),
    seg(13.82, 17.63, '+'),
    seg(17.64, 21.45, '+ +'),
    seg(21.46, null, '+ + +'),
  ],
  // Endurance (G21)
  end: [
    seg(0, 10.01, '- - -'),
    seg(10.02, 13.92, '- -'),
    seg(13.93, 17.83, '-'),
    seg(17.84, 21.75, '0'),
    seg(21.75, 25.65, '+'),
    seg(25.66, 29.56, '+ +'),
    seg(29.57, null, '+ + +'),
  ],
  // Heterosex (G22) — order to respect Excel "< -4.81" then ">= -4.81"
  het: [
    seg(-4.81, 0.19, '- -'),
    seg(null, -4.81, '- - -'),
    seg(0.2, 4.42, '-'),
    seg(4.43, 9.05, '0'),
    seg(9.06, 13.68, '+'),
    seg(13.69, 18.31, '+ +'),
    seg(18.32, null, '+ + +'),
  ],
  // Aggression (G23)
  agg: [
    seg(0, 0.88, '- - -'),
    seg(0.89, 4.97, '- -'),
    seg(4.98, 9.06, '-'),
    seg(9.07, 13.15, '0'),
    seg(13.16, 17.24, '+'),
    seg(17.25, 21.33, '+ +'),
    seg(21.34, null, '+ + +'),
  ],
}

// Female thresholds (sheet: Wanita)
/** @type {Record<string, ThresholdSegment[]>} */
const FEMALE_THRESHOLDS = {
  // Achievement
  ach: [
    seg(0, 6.9, '- - -'),
    seg(6.91, 10.53, '- -'),
    seg(10.54, 14.16, '-'),
    seg(14.17, 17.79, '0'),
    seg(17.8, 21.42, '+'),
    seg(21.43, 25.05, '+ +'),
    seg(25.06, null, '+ + +'),
  ],
  // Deference
  def: [
    seg(0, 5.55, '- - -'),
    seg(5.56, 9.55, '- -'),
    seg(9.56, 13.75, '-'),
    seg(13.76, 17.96, '0'),
    seg(17.97, 22.16, '+'),
    seg(22.17, 26.36, '+ +'),
    seg(26.37, null, '+ + +'),
  ],
  // Order
  ord: [
    seg(0, 8.39, '- - -'),
    seg(8.4, 12.42, '- -'),
    seg(12.43, 16.45, '-'),
    seg(16.46, 20.48, '0'),
    seg(20.49, 24.51, '+'),
    seg(24.52, 28.34, '+ +'),
    seg(28.35, null, '+ + +'),
  ],
  // Exhibition
  exh: [
    seg(0, 0.38, '- - -'),
    seg(0.39, 3.78, '- -'),
    seg(3.79, 7.18, '-'),
    seg(7.19, 10.59, '0'),
    seg(10.6, 13.99, '+'),
    seg(14.0, 17.39, '+ +'),
    seg(17.4, null, '+ + +'),
  ],
  // Autonomy
  aut: [
    seg(0, 0.64, '- - -'),
    seg(0.65, 3.69, '- -'),
    seg(3.7, 6.56, '-'),
    seg(6.57, 9.53, '0'),
    seg(9.54, 12.49, '+'),
    seg(12.5, 15.45, '+ +'),
    seg(15.46, null, '+ + +'),
  ],
  // Affiliation
  aff: [
    seg(0, 6.9, '- - -'),
    seg(6.91, 10.53, '- -'),
    seg(10.54, 14.16, '-'),
    seg(14.17, 17.79, '0'),
    seg(17.8, 21.42, '+'),
    seg(21.43, 23.05, '+ +'),
    seg(23.06, null, '+ + +'),
  ],
  // Intraception
  int: [
    seg(0, 3.74, '- - -'),
    seg(3.75, 8.07, '- -'),
    seg(8.08, 12.4, '-'),
    seg(12.41, 16.73, '0'),
    seg(16.74, 21.06, '+'),
    seg(21.07, 25.39, '+ +'),
    seg(25.4, null, '+ + +'),
  ],
  // Succorance (special case: < 0)
  suc: [
    // Place non-negative bands first so 0 maps correctly, then catch negatives
    seg(0, 3.85, '- -'),
    seg(3.86, 7.71, '-'),
    seg(7.72, 11.58, '0'),
    seg(11.59, 15.44, '+'),
    seg(15.45, 19.3, '+ +'),
    seg(19.31, null, '+ + +'),
    seg(null, -0.000001, '- - -'),
  ],
  // Dominance
  dom: [
    seg(0, 3.9, '- - -'),
    seg(3.91, 8.03, '- -'),
    seg(8.04, 12.16, '-'),
    seg(12.17, 16.29, '0'),
    seg(16.3, 20.42, '+'),
    seg(20.43, 24.55, '+ +'),
    seg(24.56, null, '+ + +'),
  ],
  // Abasement
  aba: [
    seg(0, 8.41, '- - -'),
    seg(8.42, 12.38, '- -'),
    seg(12.39, 16.35, '-'),
    seg(16.36, 20.32, '0'),
    seg(20.33, 24.29, '+'),
    seg(24.3, 28.26, '+ +'),
    seg(28.27, null, '+ + +'),
  ],
  // Nurturance
  nur: [
    seg(0, 7.39, '- - -'),
    seg(7.4, 11.33, '- -'),
    seg(11.34, 15.27, '-'),
    seg(15.28, 19.22, '0'),
    seg(19.23, 23.16, '+'),
    seg(23.17, 27.1, '+ +'),
    seg(27.11, null, '+ + +'),
  ],
  // Change
  chg: [
    seg(0, 4.45, '- - -'),
    seg(4.46, 8.32, '- -'),
    seg(8.33, 12.19, '-'),
    seg(12.2, 16.06, '0'),
    seg(16.07, 19.93, '+'),
    seg(19.94, 23.8, '+ +'),
    seg(23.81, null, '+ + +'),
  ],
  // Endurance
  end: [
    seg(0, 9.62, '- - -'),
    seg(9.63, 13.6, '- -'),
    seg(13.61, 17.58, '-'),
    seg(17.59, 21.57, '0'),
    seg(21.58, 25.55, '+'),
    seg(25.56, 29.52, '+ +'),
    seg(29.53, null, '+ + +'),
  ],
  // Heterosex (special case: < -3.71)
  het: [
    // Put the >= -3.71 band before the negative open band so -3.71 maps correctly
    seg(-3.71, 0.26, '- -'),
    seg(null, -3.71, '- - -'),
    seg(0.27, 4.24, '-'),
    seg(4.25, 8.23, '0'),
    seg(8.24, 12.21, '+'),
    seg(12.22, 16.19, '+ +'),
    seg(16.2, null, '+ + +'),
  ],
  // Aggression
  agg: [
    seg(0, 1.88, '- - -'),
    seg(1.89, 5.11, '- -'),
    seg(5.12, 8.34, '-'),
    seg(8.35, 11.57, '0'),
    seg(11.58, 14.8, '+'),
    seg(14.81, 18.03, '+ +'),
    seg(18.04, null, '+ + +'),
  ],
}

/** @type {Record<Sex, Record<string, ThresholdSegment[]>>} */
export const thresholds = {
  male: MALE_THRESHOLDS,
  female: FEMALE_THRESHOLDS,
}

/** @param {number} x @param {ThresholdSegment} s */
const inRangeInclusive = (x, s) => (s.min == null || x >= s.min) && (s.max == null || x <= s.max)

/**
 * @param {{ sex: Sex, traitId: TraitId, rawScore: number }} p
 * @returns {CategorySymbol|null}
 */
export const scoreToCategory = ({ sex, traitId, rawScore }) => {
  const table = thresholds[sex]
  const list = table?.[traitId]
  if (!list || list.length === 0) return null
  const segment = list.find((s) => inRangeInclusive(rawScore, s))
  return segment ? segment.label : null
}

/** @param {Sex} sex @param {TraitId} traitId @param {number} rawScore */
export const getTraitCategory = (sex, traitId, rawScore) => scoreToCategory({ sex, traitId, rawScore })

/** @param {Array<number|null|undefined>} scores */
export const totalScore = (scores) => scores.reduce((sum, v) => sum + (typeof v === 'number' && !Number.isNaN(v) ? v : 0), 0)

