<script setup>
/**
 * DPricingCard — Membership pricing card with plan name, price (IDR), features, CTA, and popular badge.
 *
 * Props:
 * - plan: { name, price, period, features: string[], ctaLabel, popular?, description? }
 * - selected: boolean
 * - disabled: boolean
 * - color: primary | gold | gym | restaurant
 */
const props = defineProps({
  plan: {
    type: Object,
    required: true,
    // { name, price: number, period: string, features: string[], ctaLabel: string, popular: boolean, description: string }
  },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  color: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'gold', 'gym', 'restaurant'].includes(v),
  },
})

const emit = defineEmits(['select'])

import { computed } from 'vue'
import { useFormatIDR } from '../../composables/useFormatIDR.js'

const { format } = useFormatIDR()

const borderColors = {
  primary: selected.value ? 'border-primary ring-1 ring-primary' : 'border-base-300',
  gold: selected.value ? 'border-[#F4A823] ring-1 ring-[#F4A823]' : 'border-base-300',
  gym: selected.value ? 'border-[#2D6A9F] ring-1 ring-[#2D6A9F]' : 'border-base-300',
  restaurant: selected.value ? 'border-[#E8604C] ring-1 ring-[#E8604C]' : 'border-base-300',
}

const popularColors = {
  primary: 'bg-primary',
  gold: 'bg-[#F4A823] text-[#1A1A2E]',
  gym: 'bg-[#2D6A9F] text-white',
  restaurant: 'bg-[#E8604C] text-white',
}

const activeColor = computed(() => selected.value ? popularColors[props.color] : '')
</script>

<template>
  <div
    :class="[
      'relative rounded-2xl border p-6 transition-all duration-200',
      selected ? 'shadow-lg scale-[1.02]' : 'hover:shadow-sm',
      selected ? borderColors[color].split(' ').find(c => c.startsWith('border-')) || 'border-primary' : 'border-base-300',
    ]"
    :style="selected ? { boxShadow: color === 'gold' ? '0 8px 24px rgba(244,168,35,0.2)' : '' } : {}"
  >
    <!-- Popular ribbon -->
    <div
      v-if="plan.popular"
      :class="['absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider', popularColors[color]]"
    >
      Terpopuler
    </div>

    <!-- Plan name -->
    <h3 :class="['text-lg font-bold', plan.popular ? 'mt-2' : '']">{{ plan.name }}</h3>
    <p v-if="plan.description" class="text-xs text-base-content/50 mt-1">{{ plan.description }}</p>

    <!-- Price -->
    <div class="mt-4 flex items-baseline gap-0.5">
      <span class="text-3xl font-bold font-mono">{{ format(plan.price) }}</span>
      <span v-if="plan.period" class="text-sm text-base-content/50">/ {{ plan.period }}</span>
    </div>

    <!-- Feature list -->
    <ul class="mt-5 space-y-2.5">
      <li
        v-for="(feature, idx) in plan.features"
        :key="idx"
        class="flex items-start gap-2 text-sm text-base-content/70"
      >
        <span class="i-tabler-circle-check size-4 text-success shrink-0 mt-0.5" />
        <span>{{ feature }}</span>
      </li>
    </ul>

    <!-- CTA -->
    <button
      :class="[
        'btn w-full mt-6',
        selected ? 'btn-primary' : 'btn-outline',
        disabled ? 'btn-disabled' : '',
      ]"
      :disabled="disabled"
      @click="emit('select', plan)"
    >
      {{ plan.ctaLabel || 'Pilih Paket' }}
    </button>
  </div>
</template>
