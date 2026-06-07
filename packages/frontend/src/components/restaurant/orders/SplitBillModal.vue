<script setup>
import { ref, computed, watch } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  IconUsers,
  IconReceipt,
  IconPlus,
  IconTrash,
  IconMinus,
  IconAlertTriangle,
  IconLock
} from '@tabler/icons-vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

// Feature gate
const subscriptionStore = useSubscriptionStore()
const hasSplitPaymentFeature = computed(() =>
  subscriptionStore.features?.transactions?.splitPayment !== false
)
const splitType = ref('equal') // 'equal' or 'by_items'
const equalSplits = ref(2)
const itemSplits = ref([])

// Build a qtyMap initialised to 0 for every order item
const _makeQtyMap = () => {
  const map = {}
  ;(props.order?.items || []).forEach(item => {
    map[item.id] = 0
  })
  return map
}

const _defaultSplits = () => [
  { customerName: 'Person 1', qtyMap: _makeQtyMap(), notes: '' },
  { customerName: 'Person 2', qtyMap: _makeQtyMap(), notes: '' }
]

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// ── Equal split ──────────────────────────────────────────────────────────────

const calculateEqualSplit = computed(() => {
  if (!props.order || splitType.value !== 'equal') return []
  const totalAmount = props.order.totalAmount || 0
  const perPerson = Math.ceil(totalAmount / equalSplits.value)
  return Array.from({ length: equalSplits.value }, (_, i) => ({
    person: i + 1,
    amount: i === equalSplits.value - 1
      ? totalAmount - perPerson * (equalSplits.value - 1)
      : perPerson
  }))
})

// ── By-items split ───────────────────────────────────────────────────────────

// How many of itemId are assigned to personIndex
const getPersonQty = (personIndex, itemId) => {
  return itemSplits.value[personIndex]?.qtyMap?.[itemId] ?? 0
}

// Total assigned qty for an item across all persons
const getTotalAssignedQty = (itemId) => {
  return itemSplits.value.reduce((sum, s) => sum + (s.qtyMap?.[itemId] ?? 0), 0)
}

// How many of itemId are still unassigned
const getRemainingQty = (itemId) => {
  const item = props.order?.items?.find(i => i.id === itemId)
  return (item?.quantity ?? 0) - getTotalAssignedQty(itemId)
}

// Increment qty for a person on a specific item (capped at item's total qty)
const incrementQty = (personIndex, itemId) => {
  const item = props.order?.items?.find(i => i.id === itemId)
  if (!item) return
  const remaining = getRemainingQty(itemId)
  if (remaining <= 0) return
  itemSplits.value[personIndex].qtyMap[itemId] = (itemSplits.value[personIndex].qtyMap[itemId] ?? 0) + 1
}

// Decrement qty for a person on a specific item (min 0)
const decrementQty = (personIndex, itemId) => {
  const current = itemSplits.value[personIndex]?.qtyMap?.[itemId] ?? 0
  if (current <= 0) return
  itemSplits.value[personIndex].qtyMap[itemId] = current - 1
}

// Calculate totals per split person
const calculateItemSplitTotals = computed(() => {
  if (!props.order?.items) return []
  const subtotalRate = props.order.subtotal || 0
  const taxRate = subtotalRate > 0 ? (props.order.taxAmount || 0) / subtotalRate : 0

  return itemSplits.value.map(split => {
    let subtotal = 0
    const assignedItems = []

    props.order.items.forEach(item => {
      const qty = split.qtyMap?.[item.id] ?? 0
      if (qty > 0) {
        const unitPrice = (item.subtotal || 0) / (item.quantity || 1)
        const lineSubtotal = unitPrice * qty
        subtotal += lineSubtotal
        assignedItems.push({ itemId: item.id, quantity: qty })
      }
    })

    const tax = Math.round(subtotal * taxRate)
    return {
      customerName: split.customerName,
      notes: split.notes,
      assignedItems, // [{ itemId, quantity }]
      subtotal,
      tax,
      total: subtotal + tax
    }
  })
})

// All item qtys are fully distributed across persons
const allItemsFullyAssigned = computed(() => {
  if (!props.order?.items || splitType.value !== 'by_items') return true
  return props.order.items.every(item => getRemainingQty(item.id) === 0)
})

// Validation
const isValid = computed(() => {
  if (splitType.value === 'equal') {
    return equalSplits.value >= 2 && equalSplits.value <= 10
  }
  return (
    itemSplits.value.length >= 2 &&
    allItemsFullyAssigned.value &&
    itemSplits.value.every(s => Object.values(s.qtyMap).some(q => q > 0))
  )
})

// ── Person management ────────────────────────────────────────────────────────

const addPerson = () => {
  itemSplits.value.push({
    customerName: `Person ${itemSplits.value.length + 1}`,
    qtyMap: _makeQtyMap(),
    notes: ''
  })
}

const removePerson = (index) => {
  if (itemSplits.value.length > 2) {
    itemSplits.value.splice(index, 1)
  }
}

// ── Form lifecycle ───────────────────────────────────────────────────────────

const resetForm = () => {
  splitType.value = 'equal'
  equalSplits.value = 2
  itemSplits.value = _defaultSplits()
}

const handleSubmit = () => {
  if (!isValid.value) return

  if (splitType.value === 'equal') {
    emit('submit', { type: 'equal', splits: equalSplits.value })
  } else {
    emit('submit', {
      type: 'by_items',
      splits: calculateItemSplitTotals.value.map(s => ({
        customerName: s.customerName,
        items: s.assignedItems, // [{ itemId, quantity }]
        ...(s.notes ? { notes: s.notes } : {})
      }))
    })
  }
}

const closeModal = () => {
  emit('close')
  setTimeout(resetForm, 300)
}

watch(() => props.show, (val) => {
  if (val) resetForm()
})
</script>

<template>
  <Teleport to="body">
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-4xl">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="closeModal"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4">
        Split Bill - Order #{{ order?.orderNumber || order?.id?.slice(-6) }}
      </h3>

      <!-- Feature Gate: locked state -->
      <div v-if="!hasSplitPaymentFeature" class="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <IconLock class="w-12 h-12 text-warning" />
        <div>
          <p class="font-bold text-lg">Split Bill Not Available</p>
          <p class="text-base-content/60 text-sm mt-1">Upgrade your subscription to unlock the Split Bill feature.</p>
        </div>
      </div>

      <!-- Main content (only if feature gate passed) -->
      <template v-else>
        <!-- Order Summary -->
        <div class="alert mb-4">
          <div class="flex flex-wrap gap-4 text-sm">
            <span>Items: <strong>{{ order?.items?.length || 0 }}</strong></span>
            <span>Subtotal: <strong>{{ formatCurrency(order?.subtotal) }}</strong></span>
            <span v-if="order?.taxAmount">Tax: <strong>{{ formatCurrency(order?.taxAmount) }}</strong></span>
            <span>Total: <strong class="text-primary">{{ formatCurrency(order?.totalAmount) }}</strong></span>
          </div>
        </div>

        <!-- Split Type Selector -->
        <div class="tabs tabs-boxed mb-6">
          <button
            class="tab gap-2"
            :class="{ 'tab-active': splitType === 'equal' }"
            @click="splitType = 'equal'"
          >
            <IconUsers class="w-4 h-4" />
            Split Equally
          </button>
          <button
            class="tab gap-2"
            :class="{ 'tab-active': splitType === 'by_items' }"
            @click="splitType = 'by_items'"
          >
            <IconReceipt class="w-4 h-4" />
            Split by Items
          </button>
        </div>

        <!-- Equal Split -->
        <div v-if="splitType === 'equal'" class="space-y-4">
          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text font-medium">Number of People</span>
            </label>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-square btn-outline"
                :disabled="equalSplits <= 2"
                @click="equalSplits--"
              >-</button>
              <input
                v-model.number="equalSplits"
                type="number"
                class="input input-bordered w-24 text-center"
                min="2"
                max="10"
              />
              <button
                class="btn btn-square btn-outline"
                :disabled="equalSplits >= 10"
                @click="equalSplits++"
              >+</button>
            </div>
          </div>

          <div class="card bg-base-200">
            <div class="card-body py-4">
              <h4 class="font-semibold mb-3">Split Preview</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div
                  v-for="split in calculateEqualSplit"
                  :key="split.person"
                  class="p-4 bg-base-100 rounded-lg text-center shadow"
                >
                  <div class="text-sm text-base-content/60 mb-1">Person {{ split.person }}</div>
                  <div class="text-xl font-bold text-primary">{{ formatCurrency(split.amount) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Items Split -->
        <div v-if="splitType === 'by_items'" class="space-y-4">
          <!-- Validation Warnings -->
          <div v-if="!allItemsFullyAssigned && itemSplits.length > 0" class="alert alert-warning">
            <IconAlertTriangle class="w-5 h-5" />
            <span>Some items still have unassigned quantities. Distribute all quantities before submitting.</span>
          </div>

          <!-- People List -->
          <div class="space-y-4">
            <div
              v-for="(split, index) in itemSplits"
              :key="index"
              class="card bg-base-200"
            >
              <div class="card-body py-4">
                <div class="flex items-center justify-between mb-3">
                  <input
                    v-model="split.customerName"
                    type="text"
                    class="input input-bordered input-sm w-48"
                    placeholder="Person name"
                  />
                  <div class="flex items-center gap-2">
                    <span class="badge badge-primary badge-lg">
                      {{ formatCurrency(calculateItemSplitTotals[index]?.total || 0) }}
                    </span>
                    <button
                      v-if="itemSplits.length > 2"
                      class="btn btn-ghost btn-sm btn-square text-error"
                      @click="removePerson(index)"
                      title="Remove person"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Items Grid — qty stepper per item -->
                <div class="space-y-2">
                  <div
                    v-for="item in order?.items"
                    :key="item.id"
                    class="flex items-center gap-3 p-3 rounded-lg bg-base-100 border-2 transition-colors"
                    :class="getPersonQty(index, item.id) > 0 ? 'border-primary' : 'border-base-300'"
                  >
                    <!-- Item info -->
                    <div class="flex-1 min-w-0">
                      <div class="font-medium truncate">
                        {{ item.product?.name || item.name }}
                      </div>
                      <div v-if="item.variants?.length" class="text-xs text-base-content/60">
                        {{ item.variants.map(v => v.name || v).join(', ') }}
                      </div>
                      <div class="text-xs text-base-content/50 mt-0.5">
                        Total qty: {{ item.quantity }}
                        <span
                          class="ml-2 font-medium"
                          :class="getRemainingQty(item.id) > 0 ? 'text-warning' : 'text-success'"
                        >
                          {{ getRemainingQty(item.id) > 0 ? `${getRemainingQty(item.id)} unassigned` : 'fully assigned' }}
                        </span>
                      </div>
                    </div>

                    <!-- Qty stepper -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        class="btn btn-xs btn-square btn-outline"
                        :disabled="getPersonQty(index, item.id) <= 0"
                        @click.stop="decrementQty(index, item.id)"
                      >
                        <IconMinus class="w-3 h-3" />
                      </button>
                      <span class="w-8 text-center font-bold text-sm">
                        {{ getPersonQty(index, item.id) }}
                      </span>
                      <button
                        type="button"
                        class="btn btn-xs btn-square btn-outline"
                        :disabled="getRemainingQty(item.id) <= 0"
                        @click.stop="incrementQty(index, item.id)"
                      >
                        <IconPlus class="w-3 h-3" />
                      </button>
                    </div>

                    <!-- Line subtotal for this person -->
                    <div class="text-right flex-shrink-0 w-24">
                      <div class="font-semibold text-sm">
                        {{ formatCurrency(getPersonQty(index, item.id) * ((item.subtotal || 0) / (item.quantity || 1))) }}
                      </div>
                      <div class="text-xs text-base-content/50">
                        {{ formatCurrency((item.subtotal || 0) / (item.quantity || 1)) }} /ea
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Notes for this split -->
                <div class="mt-3 form-control">
                  <label class="label py-1">
                    <span class="label-text text-xs font-medium">Notes (optional)</span>
                  </label>
                  <input
                    v-model="split.notes"
                    type="text"
                    class="input input-bordered input-sm w-full"
                    :placeholder="`e.g. Bill ${index + 1}`"
                  />
                </div>

                <!-- Split Summary -->
                <div v-if="calculateItemSplitTotals[index]?.assignedItems?.length > 0" class="mt-3 pt-3 border-t border-base-300">
                  <div class="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{{ formatCurrency(calculateItemSplitTotals[index]?.subtotal) }}</span>
                  </div>
                  <div v-if="calculateItemSplitTotals[index]?.tax > 0" class="flex justify-between text-sm text-base-content/60">
                    <span>Tax (proportional)</span>
                    <span>{{ formatCurrency(calculateItemSplitTotals[index]?.tax) }}</span>
                  </div>
                  <div class="flex justify-between text-sm font-bold mt-1">
                    <span>Total</span>
                    <span class="text-primary">{{ formatCurrency(calculateItemSplitTotals[index]?.total) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Person Button -->
          <button class="btn btn-outline btn-block gap-2" @click="addPerson">
            <IconPlus class="w-4 h-4" />
            Add Person
          </button>
        </div>
      </template>

      <!-- Modal Actions -->
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          @click="closeModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          v-if="hasSplitPaymentFeature"
          class="btn btn-primary gap-2"
          @click="handleSubmit"
          :disabled="loading || !isValid"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <template v-else>
            <IconReceipt class="w-4 h-4" />
            Split Bill
          </template>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeModal">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>
</template>
