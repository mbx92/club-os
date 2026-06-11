<script setup>
/**
 * DPointOfSalePanel — Restaurant POS with menu grid, active order, and order summary.
 *
 * Props:
 * - menuItems: Array<{ id, name, category, price, image?, calories?, soldOut? }>
 * - categories: Array<{ key, label }>
 * - orderItems: Array<{ id, item, qty, note? }> — v-model active order
 *
 * Events: @add-item, @remove-item, @update-qty, @update-note, @checkout, @switch-category
 */
const props = defineProps({
  menuItems: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [
    { key: 'all', label: 'Semua' },
    { key: 'makanan', label: 'Makanan' },
    { key: 'minuman', label: 'Minuman' },
    { key: 'dessert', label: 'Dessert' },
    { key: 'snack', label: 'Snack' },
  ]},
  orderItems: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'add-item',
  'remove-item',
  'update-qty',
  'update-note',
  'checkout',
])

import { ref, computed } from 'vue'
import { useFormatIDR } from '../../composables/useFormatIDR.js'

const { format } = useFormatIDR()

const activeCategory = ref('all')
const editingNoteId = ref(null)
const noteText = ref('')

const filteredItems = computed(() => {
  if (activeCategory.value === 'all') return props.menuItems
  return props.menuItems.filter((item) => {
    const cat = (item.category || '').toLowerCase().replace(/\s/g, '_')
    return cat === activeCategory.value
  })
})

const subtotal = computed(() => {
  return props.orderItems.reduce((sum, oi) => sum + (oi.item?.price || 0) * oi.qty, 0)
})

const tax = computed(() => Math.round(subtotal.value * 0.11))
const discount = ref(0)
const total = computed(() => subtotal.value + tax.value - discount.value)

function switchCategory(key) {
  activeCategory.value = key
  emit('switch-category', key)
}

function startEditNote(id) {
  const oi = props.orderItems.find((o) => o.id === id)
  noteText.value = oi?.note || ''
  editingNoteId.value = id
}

function saveNote() {
  if (editingNoteId.value) {
    emit('update-note', { id: editingNoteId.value, note: noteText.value })
    editingNoteId.value = null
    noteText.value = ''
  }
}

function cancelNote() {
  editingNoteId.value = null
  noteText.value = ''
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
    <!-- LEFT: Menu grid -->
    <div class="lg:col-span-2 flex flex-col overflow-hidden">
      <!-- Category tabs -->
      <div class="tabs tabs-box mb-3 shrink-0">
        <button
          v-for="cat in categories"
          :key="cat.key"
          :class="['tab text-xs font-semibold', activeCategory === cat.key ? 'tab-active' : '']"
          @click="switchCategory(cat.key)"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Menu grid scroll -->
      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DMenuItemCard
            v-for="item in filteredItems"
            :key="item.id"
            :item="item"
            :sold-out="item.soldOut"
            @add-to-cart="emit('add-item', $event)"
          />
        </div>
        <DEmptyState
          v-if="!filteredItems.length"
          icon="i-tabler-tools-kitchen-2"
          title="Menu kosong"
          description="Tidak ada item dalam kategori ini."
          size="sm"
        />
      </div>
    </div>

    <!-- RIGHT: Order panel -->
    <div class="flex flex-col border border-base-300 rounded-2xl bg-base-100 overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-base-200">
        <h3 class="text-base font-bold flex items-center gap-2">
          <span class="i-tabler-shopping-cart size-5" />
          Pesanan Aktif
        </h3>
        <p class="text-xs text-base-content/40 mt-0.5">{{ orderItems.length }} item</p>
      </div>

      <!-- Order items list -->
      <div class="flex-1 overflow-y-auto p-3 space-y-2">
        <template v-if="orderItems.length">
          <div
            v-for="oi in orderItems"
            :key="oi.id"
            class="flex items-start gap-3 p-2.5 rounded-xl hover:bg-base-200/50 transition-colors"
          >
            <!-- Item info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ oi.item?.name || 'Item' }}</p>
              <p class="text-xs text-base-content/40">{{ format(oi.item?.price || 0) }}</p>
              <!-- Note -->
              <div v-if="editingNoteId === oi.id" class="mt-1.5 flex gap-1">
                <input
                  v-model="noteText"
                  class="input input-bordered input-xs flex-1 text-xs"
                  placeholder="Catatan..."
                  @keydown.enter="saveNote"
                />
                <button class="btn btn-xs btn-primary" @click="saveNote">OK</button>
                <button class="btn btn-xs btn-ghost" @click="cancelNote">X</button>
              </div>
              <button
                v-else
                class="text-[0.6rem] text-primary/60 hover:text-primary mt-0.5 flex items-center gap-0.5"
                @click="startEditNote(oi.id)"
              >
                <span class="i-tabler-pencil size-2.5" />
                {{ oi.note || 'Tambah catatan' }}
              </button>
            </div>

            <!-- Qty controls -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                class="btn btn-ghost btn-xs btn-circle"
                @click="oi.qty <= 1 ? emit('remove-item', oi.id) : emit('update-qty', { id: oi.id, qty: oi.qty - 1 })"
              >
                <span class="i-tabler-minus size-3.5" />
              </button>
              <span class="text-sm font-mono font-semibold w-6 text-center">{{ oi.qty }}</span>
              <button
                class="btn btn-ghost btn-xs btn-circle"
                @click="emit('update-qty', { id: oi.id, qty: oi.qty + 1 })"
              >
                <span class="i-tabler-plus size-3.5" />
              </button>
            </div>
          </div>
        </template>
        <DEmptyState
          v-else
          icon="i-tabler-shopping-cart-off"
          title="Keranjang kosong"
          description="Pilih item dari menu untuk memulai pesanan."
          size="sm"
        />
      </div>

      <!-- Order summary footer -->
      <div v-if="orderItems.length" class="border-t border-base-200 p-4 space-y-2">
        <div class="flex justify-between text-xs text-base-content/50">
          <span>Subtotal</span>
          <span class="font-mono">{{ format(subtotal) }}</span>
        </div>
        <div class="flex justify-between text-xs text-base-content/50">
          <span>Pajak (11%)</span>
          <span class="font-mono">{{ format(tax) }}</span>
        </div>
        <DDivider />
        <div class="flex justify-between text-base">
          <span class="font-bold">Total</span>
          <span class="font-bold font-mono">{{ format(total) }}</span>
        </div>
        <DButton
          variant="restaurant"
          :class="'bg-[#E8604C] !border-[#E8604C] !text-white hover:!bg-[#D45038]'"
          block
          size="md"
          icon-left="i-tabler-cash-register"
          class="mt-2"
          @click="emit('checkout')"
        >
          Proses Pembayaran
        </DButton>
      </div>
    </div>
  </div>
</template>
