<script setup>
import { ref, computed, watch } from 'vue'
import { IconX, IconArrowsTransferDown, IconMinus, IconPlus } from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  /** Source order object (must have .items, .tableId, .table) */
  order: {
    type: Object,
    default: null
  },
  /** All active tables (including occupied) — source table will be excluded */
  tables: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// --- local state ---
// qty to transfer per orderItemId: { [orderItemId]: number }
const transferQty = ref({})
const targetTableId = ref('')

// reset on open
watch(
  () => props.show,
  (val) => {
    if (val) {
      transferQty.value = {}
      targetTableId.value = ''
    }
  }
)

// --- computed ---
const orderItems = computed(() => props.order?.items ?? [])

// Tables excluding the source table itself; sorted: occupied first then available
const targetTables = computed(() => {
  const sourceTableId = props.order?.tableId
  return [...props.tables]
    .filter((t) => t.id !== sourceTableId && t.isActive !== false)
    .sort((a, b) => {
      // occupied first
      if (a.status === 'occupied' && b.status !== 'occupied') return -1
      if (a.status !== 'occupied' && b.status === 'occupied') return 1
      return (a.tableNumber ?? '').localeCompare(b.tableNumber ?? '', undefined, { numeric: true })
    })
})

const hasSelection = computed(() =>
  Object.values(transferQty.value).some((q) => q > 0)
)

const isValid = computed(() => targetTableId.value && hasSelection.value)

// --- helpers ---
const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)

const itemName = (item) =>
  item.product?.name || item.productName || item.name || '(item)'

const itemPrice = (item) => item.price || item.unitPrice || 0

const getQty = (item) => transferQty.value[item.id] ?? 0

const setQty = (item, val) => {
  const clamped = Math.max(0, Math.min(item.quantity, val))
  transferQty.value = { ...transferQty.value, [item.id]: clamped }
}

const increment = (item) => setQty(item, getQty(item) + 1)
const decrement = (item) => setQty(item, getQty(item) - 1)

// select-all toggle for an item (0 → max, max → 0)
const toggleItem = (item) => {
  setQty(item, getQty(item) === 0 ? item.quantity : 0)
}

// --- submit ---
const handleSubmit = () => {
  if (!isValid.value) return
  const items = Object.entries(transferQty.value)
    .filter(([, qty]) => qty > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity }))
  emit('submit', { items, targetTableId: targetTableId.value })
}
</script>

<template>
  <Teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <IconArrowsTransferDown class="w-5 h-5 text-primary" />
            Pindah Item ke Meja Lain
          </h3>
          <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <!-- Source info -->
        <div class="text-sm text-base-content/60 mb-4">
          Dari meja
          <span class="font-semibold text-base-content">{{ order?.table?.tableNumber || '?' }}</span>
          &nbsp;—&nbsp;Order
          <span class="font-mono font-semibold text-base-content text-xs">
            {{ order?.transactionNumber || `#${order?.id?.slice(-6)}` }}
          </span>
        </div>

        <!-- Item list -->
        <div class="mb-5">
          <p class="text-sm font-semibold mb-2">Pilih item yang akan dipindah</p>

          <div v-if="orderItems.length === 0" class="text-sm text-base-content/50 py-4 text-center">
            Tidak ada item di order ini.
          </div>

          <div v-else class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="item in orderItems"
              :key="item.id"
              class="flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer"
              :class="
                getQty(item) > 0
                  ? 'border-primary bg-primary/5'
                  : 'border-base-300 hover:bg-base-200'
              "
              @click="toggleItem(item)"
            >
              <!-- Checkbox visual -->
              <div
                class="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                :class="getQty(item) > 0 ? 'bg-primary border-primary' : 'border-base-300'"
              >
                <svg
                  v-if="getQty(item) > 0"
                  class="w-3 h-3 text-primary-content"
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>

              <!-- Item info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium leading-tight">{{ itemName(item) }}</div>
                <div v-if="item.variantName" class="text-xs text-base-content/50">{{ item.variantName }}</div>
                <div v-if="item.extras?.length" class="text-xs text-base-content/50">
                  + {{ item.extras.map((e) => e.extra?.name || e.name).join(', ') }}
                </div>
                <div class="text-xs text-base-content/60 mt-0.5">
                  {{ formatCurrency(itemPrice(item)) }} × {{ item.quantity }}
                </div>
              </div>

              <!-- Qty selector (only visible when selected) -->
              <div
                v-if="getQty(item) > 0"
                class="flex items-center gap-1.5"
                @click.stop
              >
                <button
                  class="btn btn-xs btn-circle btn-outline"
                  :disabled="getQty(item) <= 1"
                  @click="decrement(item)"
                >
                  <IconMinus class="w-3 h-3" />
                </button>
                <span class="w-6 text-center text-sm font-bold">{{ getQty(item) }}</span>
                <button
                  class="btn btn-xs btn-circle btn-outline"
                  :disabled="getQty(item) >= item.quantity"
                  @click="increment(item)"
                >
                  <IconPlus class="w-3 h-3" />
                </button>
                <span class="text-xs text-base-content/40 ml-1">/{{ item.quantity }}</span>
              </div>

              <!-- Full qty badge when not in partial mode yet -->
              <div v-else class="text-xs text-base-content/40">
                ×{{ item.quantity }}
              </div>
            </div>
          </div>
        </div>

        <!-- Target table selector -->
        <div class="form-control mb-5">
          <label class="label pt-0">
            <span class="label-text font-semibold">Meja Tujuan</span>
          </label>
          <select v-model="targetTableId" class="select select-bordered w-full">
            <option value="" disabled>Pilih meja tujuan</option>
            <template v-for="table in targetTables" :key="table.id">
              <option :value="table.id">
                Meja {{ table.tableNumber }}
                <template v-if="table.status === 'occupied'">(terisi)</template>
                <template v-else-if="table.status === 'available'">(kosong)</template>
                <template v-if="table.location?.name"> — {{ table.location.name }}</template>
              </option>
            </template>
          </select>
          <label v-if="targetTables.length === 0" class="label">
            <span class="label-text-alt text-error">Tidak ada meja lain yang tersedia.</span>
          </label>
          <label v-else class="label">
            <span class="label-text-alt text-base-content/50">
              Meja terisi → item ditambahkan ke order yang ada.
              Meja kosong → order baru akan dibuat.
            </span>
          </label>
        </div>

        <!-- Actions -->
        <div class="modal-action mt-2">
          <button type="button" class="btn btn-ghost" :disabled="loading" @click="$emit('close')">
            Batal
          </button>
          <button
            type="button"
            class="btn btn-primary gap-2"
            :disabled="!isValid || loading"
            @click="handleSubmit"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm" />
            <IconArrowsTransferDown v-else class="w-4 h-4" />
            Pindah Item
          </button>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop" @click="$emit('close')">
        <button>close</button>
      </form>
    </dialog>
  </Teleport>
</template>
