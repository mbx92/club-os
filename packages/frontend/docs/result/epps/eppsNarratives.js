import json from './eppsNarratives.json'

/** @typedef {{ name: string, description: string, levels?: { low?: string, medium?: string, high?: string } }} EppsNarrative */

/** @type {Record<string, EppsNarrative>} */
export const eppsNarratives = json
export default eppsNarratives
