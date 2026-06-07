<script setup>
/**
 * DMembershipTierBadge — Color-coded tier display with icon and progress bar toward next tier.
 *
 * Props:
 * - tier: bronze | silver | gold | platinum | vip
 * - points: number — current points
 * - showProgress: boolean — show progress to next tier
 * - size: sm | md | lg
 */
const props = defineProps({
  tier: {
    type: String,
    default: 'bronze',
    validator: (v) => ['bronze', 'silver', 'gold', 'platinum', 'vip'].includes(v),
  },
  points: { type: Number, default: 0 },
  showProgress: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

import { computed } from 'vue'
import { useMemberTier } from '../../composables/useMemberTier.js'
import { tierConfig } from '../../tokens/index.js'

const { getTier } = useMemberTier()
const tierInfo = computed(() => getTier(props.points))

const tierGradients = {
  bronze: 'from-[#CD7F32]/20 to-[#CD7F32]/5',
  silver: 'from-[#C0C0C0]/20 to-[#C0C0C0]/5',
  gold: 'from-[#FFD700]/20 to-[#FFD700]/5',
  platinum: 'from-[#E5E4E2]/20 to-[#E5E4E2]/5',
  vip: 'from-[#B026FF]/20 to-[#B026FF]/5',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-3',
}
</script>

<template>
  <div
    :class="[
      'rounded-xl border inline-flex flex-col',
      sizeClasses[size],
    ]"
    :style="{
      borderColor: tierInfo.color,
      background: `linear-gradient(135deg, ${tierInfo.color}14, ${tierInfo.color}05)`,
    }"
  >
    <!-- Tier name + icon -->
    <div class="flex items-center gap-2">
      <span class="text-lg leading-none">&#9670;</span>
      <span class="font-bold uppercase tracking-wider" :style="{ color: tierInfo.color }">
        {{ tierInfo.name }}
      </span>
    </div>

    <!-- Points display -->
    <div class="text-xs text-base-content/50 mt-0.5">
      {{ props.points.toLocaleString('id-ID') }} poin
    </div>

    <!-- Progress to next tier -->
    <div v-if="showProgress && tierInfo.nextTier" class="mt-2">
      <div class="flex justify-between text-[0.65rem] text-base-content/40 mb-1">
        <span>Menuju {{ tierInfo.nextTier.name }}</span>
        <span>{{ tierInfo.progress }}%</span>
      </div>
      <progress
        class="progress w-full h-1.5"
        :class="tierInfo.progress >= 100 ? 'progress-success' : 'progress-warning'"
        :value="tierInfo.progress"
        max="100"
      />
      <div class="text-[0.6rem] text-base-content/30 mt-0.5">
        Butuh {{ (tierInfo.nextTier.minPoints - props.points).toLocaleString('id-ID') }} poin lagi
      </div>
    </div>
  </div>
</template>
