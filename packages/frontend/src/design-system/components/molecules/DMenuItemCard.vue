<script setup>
/**
 * DMenuItemCard — Restaurant menu item card with image, price (IDR), category tag, calories, and cart button.
 *
 * Props:
 * - item: { id, name, image?, price, category?, calories?, description? }
 * - soldOut: boolean — show sold-out overlay
 * - onAddToCart: function — called when add-to-cart clicked
 */
const props = defineProps({
  item: {
    type: Object,
    required: true,
    // { id: string|number, name: string, image: string, price: number, category: string, calories: number, description: string }
  },
  soldOut: { type: Boolean, default: false },
})

const emit = defineEmits(['add-to-cart', 'click'])

import { useFormatIDR } from '../../composables/useFormatIDR.js'

const { format } = useFormatIDR()

const categoryColors = {
  makanan: 'bg-orange-100 text-orange-700 border-orange-200',
  minuman: 'bg-blue-100 text-blue-700 border-blue-200',
  dessert: 'bg-pink-100 text-pink-700 border-pink-200',
  snack: 'bg-amber-100 text-amber-700 border-amber-200',
  minuman_panas: 'bg-red-100 text-red-700 border-red-200',
}

function getCategoryColor(cat) {
  const key = (cat || '').toLowerCase().replace(/\s/g, '_')
  return categoryColors[key] || 'bg-slate-100 text-slate-600 border-slate-200'
}
</script>

<template>
  <div
    :class="[
      'group relative rounded-2xl border border-base-300 bg-base-100 overflow-hidden transition-all duration-200',
      soldOut ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:shadow-md hover:border-base-400',
    ]"
    @click="emit('click')"
  >
    <!-- Image -->
    <div class="relative aspect-[4/3] w-full overflow-hidden bg-base-200">
      <img
        v-if="item.image"
        :src="item.image"
        :alt="item.name"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-base-content/20">
        <span class="i-tabler-photo size-10" />
      </div>

      <!-- Sold-out overlay -->
      <div
        v-if="soldOut"
        class="absolute inset-0 bg-base-300/60 flex items-center justify-center backdrop-blur-[2px]"
      >
        <span class="btn btn-sm btn-ghost bg-base-100/80 text-error font-bold text-xs uppercase">Habis</span>
      </div>

      <!-- Category tag -->
      <div
        v-if="item.category"
        class="absolute top-2 left-2"
      >
        <span
          :class="['badge badge-sm text-[0.6rem] font-semibold border', getCategoryColor(item.category)]"
        >
          {{ item.category }}
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3.5">
      <h4 class="font-semibold text-sm leading-tight line-clamp-2">{{ item.name }}</h4>
      <p v-if="item.description" class="text-xs text-base-content/40 mt-1 line-clamp-1">{{ item.description }}</p>

      <div class="flex items-center justify-between mt-3">
        <div>
          <span class="text-base font-bold text-base-content">{{ format(item.price) }}</span>
          <span v-if="item.calories" class="text-[0.6rem] text-base-content/40 ml-2">{{ item.calories }} cal</span>
        </div>

        <button
          v-if="!soldOut"
          class="btn btn-primary btn-sm btn-square shadow-sm"
          :aria-label="`Tambah ${item.name} ke pesanan`"
          @click.stop="emit('add-to-cart', item)"
        >
          <span class="i-tabler-plus size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
