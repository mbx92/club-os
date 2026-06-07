<script setup>
/**
 * DMemberCard — Member identity card displaying photo, name, ID, tier, expiry, QR.
 *
 * Props:
 * - member: { id, name, photo, tier, membershipType, expiryDate, qrCode? }
 * - status: active | expired
 * - condensed: boolean — compact card variant
 */
const props = defineProps({
  member: {
    type: Object,
    required: true,
    // { id: string, name: string, photo: string, tier: string, membershipType: string, expiryDate: string, qrCode?: string }
  },
  status: {
    type: String,
    default: 'active',
    validator: (v) => ['active', 'expired'].includes(v),
  },
  condensed: { type: Boolean, default: false },
})

import { computed } from 'vue'
import { useMemberTier } from '../../composables/useMemberTier.js'

const { getTier } = useMemberTier()
const tierInfo = computed(() => getTier(props.member.tierPoints || 0))

const tierColors = {
  bronze: 'border-[#CD7F32]',
  silver: 'border-[#C0C0C0]',
  gold: 'border-[#FFD700]',
  platinum: 'border-[#E5E4E2]',
  vip: 'border-[#B026FF]',
}

import { useFormatIDR } from '../../composables/useFormatIDR.js'
</script>

<template>
  <div
    :class="[
      'relative overflow-hidden rounded-2xl border bg-base-100 transition-all duration-300',
      status === 'expired' ? 'opacity-60 border-error/30' : 'border-base-300 hover:shadow-md',
      condensed ? 'p-4' : 'p-5',
    ]"
  >
    <!-- Tier accent stripe -->
    <div
      :class="['absolute top-0 left-0 right-0 h-1', tierColors[member.tier] || 'border-primary', status === 'expired' ? 'bg-error' : '']"
    />

    <div :class="['flex items-start gap-4', condensed ? '' : 'mt-2']">
      <!-- Photo / Avatar -->
      <DAvatar
        :src="member.photo"
        :name="member.name"
        :size="condensed ? 'md' : 'lg'"
        :tier="member.tier"
        :online="status === 'active'"
        rounded
      />

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <h3 :class="['font-bold truncate', condensed ? 'text-sm' : 'text-base']">
          {{ member.name }}
        </h3>
        <p class="text-xs text-base-content/50 mt-0.5">{{ member.id || '—' }}</p>

        <!-- Tier + Membership -->
        <div class="flex flex-wrap items-center gap-1.5 mt-2">
          <DBadge
            :variant="member.tier || 'neutral'"
            size="xs"
            :outline="false"
          >
            {{ member.tier?.toUpperCase() || 'STANDARD' }}
          </DBadge>
          <DBadge v-if="member.membershipType" variant="info" size="xs" outline>
            {{ member.membershipType }}
          </DBadge>
        </div>

        <!-- Expiry -->
        <div class="flex items-center gap-1.5 mt-2 text-xs" :class="status === 'expired' ? 'text-error' : 'text-base-content/50'">
          <span class="i-tabler-calendar size-3" />
          <span v-if="member.expiryDate">{{ member.expiryDate }}</span>
          <span v-else class="opacity-40">Tanpa tanggal</span>
        </div>
      </div>

      <!-- QR Code placeholder -->
      <div
        v-if="!condensed"
        class="shrink-0 size-16 rounded-lg border border-base-300 bg-base-200 flex items-center justify-center text-base-content/20"
      >
        <span class="i-tabler-qrcode size-8" />
      </div>
    </div>

    <!-- Active/Expired status overlay ribbon -->
    <div
      v-if="status === 'expired'"
      class="absolute -right-8 top-5 rotate-45 bg-error text-error-content text-[0.6rem] font-bold uppercase px-8 py-0.5 tracking-wider"
    >
      EXPIRED
    </div>
  </div>
</template>
