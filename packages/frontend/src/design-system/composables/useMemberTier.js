import { tierConfig } from '../tokens/index.js'

/**
 * Membership tier resolver composable
 * Determines a member's tier based on their accumulated points.
 *
 * @returns {{ getTier: (points: number) => TierInfo }}
 * @typedef {object} TierInfo
 * @property {string} name - Tier display name
 * @property {string} key - Tier key (bronze/silver/gold/platinum/vip)
 * @property {string} color - Tier color hex
 * @property {string} icon - Tabler icon name
 * @property {number} minPoints - Minimum points required
 * @property {number} index - Tier index (0-4)
 * @property {TierInfo|null} nextTier - Next tier info for progress
 * @property {number} progress - Progress toward next tier (0-100)
 */
export function useMemberTier() {
  /**
   * Get tier info for a given points value
   * @param {number} points
   * @returns {TierInfo}
   */
  const getTier = (points) => {
    const safePoints = Math.max(0, points || 0)
    let matched = tierConfig[0]

    for (let i = tierConfig.length - 1; i >= 0; i--) {
      if (safePoints >= tierConfig[i].minPoints) {
        matched = tierConfig[i]
        break
      }
    }

    const idx = tierConfig.findIndex((t) => t.key === matched.key)
    const nextTier = idx < tierConfig.length - 1 ? tierConfig[idx + 1] : null

    let progress = 100
    if (nextTier) {
      const range = nextTier.minPoints - matched.minPoints
      const current = safePoints - matched.minPoints
      progress = Math.min(100, Math.round((current / range) * 100))
    }

    return {
      ...matched,
      index: idx,
      nextTier,
      progress,
    }
  }

  /**
   * Get all tiers for display in selectors/badges
   * @returns {Array<TierInfo>}
   */
  const getAllTiers = () => tierConfig.map((t, i) => ({
    ...t,
    index: i,
    nextTier: i < tierConfig.length - 1 ? tierConfig[i + 1] : null,
    progress: 100,
  }))

  return { getTier, getAllTiers }
}
