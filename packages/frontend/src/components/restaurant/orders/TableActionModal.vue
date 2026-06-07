<script setup>
import { IconX, IconPlus, IconReceipt, IconLayoutColumns, IconPrinter, IconArrowsLeftRight, IconArrowsTransferDown } from '@tabler/icons-vue'
import OrderStatusBadge from './OrderStatusBadge.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  table: { type: Object, default: null },
  order: { type: Object, default: null },
  prePrintLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'add-item', 'view-bill', 'split-bill', 'pre-print', 'move-table', 'move-items'])

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
</script>

<template>
  <Teleport to="body">
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-sm px-5 py-5">
      <button
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="$emit('close')"
      >
        <IconX class="w-4 h-4" />
      </button>

      <!-- Header -->
      <h3 class="font-bold text-xl mb-4">
        Meja {{ table?.tableNumber }}
        <span v-if="table?.capacity" class="text-sm font-normal text-base-content/50 ml-1">({{ table.capacity }} pax)</span>
      </h3>

      <!-- Order summary box -->
      <div v-if="order" class="bg-base-200 rounded-xl p-4 mb-5 text-sm space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-base-content/60">No. Order</span>
          <span class="font-mono text-xs font-semibold">{{ order.transactionNumber || `#${order.id?.slice(-6)}` }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-base-content/60">Items</span>
          <span>{{ order.items?.length || 0 }} item(s)</span>
        </div>

        <!-- Item list -->
        <div v-if="order.items?.length" class="mt-1 space-y-2 border-t border-base-300 pt-2">
          <div v-for="item in order.items" :key="item.id">
            <!-- Item row -->
            <div class="flex justify-between items-start gap-2">
              <div class="flex-1 min-w-0">
                <span class="text-xs font-medium leading-tight">{{ item.quantity }}× {{ item.product?.name || item.itemName || item.productName || item.name }}</span>
              </div>
              <span class="text-xs font-semibold whitespace-nowrap">{{ formatCurrency((item.price || item.unitPrice || 0) * item.quantity) }}</span>
            </div>
            <!-- Extras rows — price column aligned with item price above -->
            <div
              v-for="extra in (item.extras?.length ? item.extras : item.itemDetails?.extras)"
              :key="extra.id || extra.extraId"
              class="flex justify-between items-center gap-2 pl-2 mt-0.5"
            >
              <span class="text-xs text-base-content/50 leading-tight">
                + {{ extra.extra?.name || extra.name }}<template v-if="(extra.quantity || 1) > 1"> ×{{ extra.quantity }}</template>
              </span>
              <span v-if="parseFloat(extra.price || extra.extra?.price || 0) > 0" class="text-xs text-base-content/40 whitespace-nowrap">
                {{ formatCurrency(parseFloat(extra.price || extra.extra?.price || 0) * (extra.quantity || 1)) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-base-content/60">Dibuka</span>
          <span>{{ formatTime(order.createdAt) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-base-content/60">Status</span>
          <OrderStatusBadge :status="order.status" />
        </div>
        <div class="flex justify-between items-center border-t border-base-300 pt-2 mt-1">
          <span class="font-bold">Total</span>
          <span class="font-bold text-primary text-base">{{ formatCurrency(order.totalAmount) }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2">
        <!-- 1. Tambah Item -->
        <button
          class="btn btn-outline btn-success btn-block justify-start gap-3 h-auto py-2.5"
          @click="$emit('add-item')"
        >
          <IconPlus class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Tambah Item</div>
            <div class="text-xs opacity-70 font-normal">Tambah pesanan ke order yang sudah ada</div>
          </div>
        </button>

        <!-- 2. Lihat Bill / Bayar -->
        <button
          class="btn btn-primary btn-block justify-start gap-3 h-auto py-2.5"
          @click="$emit('view-bill')"
        >
          <IconReceipt class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Lihat Bill / Bayar</div>
            <div class="text-xs opacity-70 font-normal">Proses pembayaran order ini</div>
          </div>
        </button>

        <!-- 3. Split Bill -->
        <button
          class="btn btn-warning btn-block justify-start gap-3 h-auto py-2.5"
          @click="$emit('split-bill')"
        >
          <IconLayoutColumns class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Split Bill</div>
            <div class="text-xs opacity-70 font-normal">Bagi tagihan ke beberapa orang</div>
          </div>
        </button>

        <!-- 4. Cetak Pre-Receipt -->
        <button
          class="btn btn-outline btn-info btn-block justify-start gap-3 h-auto py-2.5"
          :disabled="prePrintLoading"
          @click="$emit('pre-print')"
        >
          <span v-if="prePrintLoading" class="loading loading-spinner loading-sm flex-shrink-0"></span>
          <IconPrinter v-else class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Cetak Pre-Receipt</div>
            <div class="text-xs opacity-70 font-normal">Struk sementara untuk tamu</div>
          </div>
        </button>

        <!-- 5. Pindah Meja -->
        <button
          class="btn btn-outline btn-block justify-start gap-3 h-auto py-2.5"
          @click="$emit('move-table')"
        >
          <IconArrowsLeftRight class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Pindah Meja</div>
            <div class="text-xs opacity-70 font-normal">Pindahkan order ke meja lain</div>
          </div>
        </button>

        <!-- 6. Pindah Item -->
        <button
          class="btn btn-outline btn-secondary btn-block justify-start gap-3 h-auto py-2.5"
          @click="$emit('move-items')"
        >
          <IconArrowsTransferDown class="w-5 h-5 flex-shrink-0" />
          <div class="text-left">
            <div class="font-semibold text-sm">Pindah Item</div>
            <div class="text-xs opacity-70 font-normal">Pindahkan item tertentu ke meja lain</div>
          </div>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
  </Teleport>
</template>
