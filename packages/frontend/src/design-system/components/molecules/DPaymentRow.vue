<script setup>
/**
 * DPaymentRow — Transaction payment row showing type, amount (IDR), status, date, and payment channel.
 *
 * Props:
 * - transaction: { id, type, amount, status, date, channel, description? }
 * - compact: boolean
 */
const props = defineProps({
  transaction: {
    type: Object,
    required: true,
    // { id, type: string, amount: number, status: string, date: string, channel: string, description: string }
  },
  compact: { type: Boolean, default: false },
})

import { useFormatIDR } from '../../composables/useFormatIDR.js'

const { format } = useFormatIDR()

const channelLabels = {
  midtrans: 'Midtrans',
  xendit: 'Xendit',
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
}

const channelIcons = {
  midtrans: 'i-tabler-credit-card',
  xendit: 'i-tabler-wallet',
  cash: 'i-tabler-cash-banknote',
  transfer: 'i-tabler-building-bank',
  qris: 'i-tabler-qrcode',
}

const statusVariantMap = {
  success: 'success',
  pending: 'pending',
  failed: 'error',
  refund: 'warning',
  active: 'active',
}

function getChannelIcon(channel) {
  return channelIcons[channel] || 'i-tabler-credit-card'
}

function getChannelLabel(channel) {
  return channelLabels[channel] || channel
}
</script>

<template>
  <div
    :class="[
      'flex items-center gap-3 rounded-xl border border-base-200 bg-base-100 transition-colors hover:border-base-300',
      compact ? 'p-3' : 'p-4',
    ]"
  >
    <!-- Channel icon -->
    <div class="shrink-0 size-9 rounded-lg bg-base-200 flex items-center justify-center text-base-content/50">
      <span :class="[getChannelIcon(transaction.channel), compact ? 'size-4' : 'size-5']" />
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span :class="['text-sm font-semibold truncate', compact ? 'text-xs' : 'text-sm']">
          {{ transaction.type || transaction.description || 'Transaksi' }}
        </span>
        <DBadge
          v-if="transaction.status"
          :variant="statusVariantMap[transaction.status] || 'neutral'"
          size="xs"
          outline
        >
          {{ transaction.status }}
        </DBadge>
      </div>
      <div class="flex items-center gap-2 text-xs text-base-content/40 mt-0.5">
        <span>{{ transaction.date || '—' }}</span>
        <span>&middot;</span>
        <span>{{ getChannelLabel(transaction.channel) }}</span>
      </div>
    </div>

    <!-- Amount -->
    <div :class="['text-right shrink-0', compact ? '' : '']">
      <div :class="['font-bold font-mono', compact ? 'text-sm' : 'text-base']">
        {{ format(transaction.amount) }}
      </div>
    </div>
  </div>
</template>
