/**
 * PAPI Kostick Data Module
 * Export semua data dan fungsi terkait PAPI Kostick
 */

// Data JSON
export { default as papiQuestions } from './papiKostick_test.json'
export { default as papiNorms } from './papiKostick_norms.json'
export { default as papiNarratives } from './papiKostick_narratives.json'

// Functions dan constants
export {
  papiScaleNarratives,
  defaultLevelThresholds,
  interpretPapiScale,
  calculatePapiScores,
  groupByAspect,
  scaleDescriptions,
  PAPI_SCALES,
  MAX_SCORE_PER_SCALE,
} from './papiKostick_narratives.js'
