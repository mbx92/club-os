<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    default: () => ({})
  }
})

// Default settings
const printerSettings = computed(() => ({
  businessName: props.settings.businessName || 'Restaurant',
  address: props.settings.address || '',
  phone: props.settings.phone || '',
  footerMessage: props.settings.footerMessage || 'Thank you for visiting!',
  showLogo: props.settings.showLogo ?? true,
  logoUrl: props.settings.logoUrl || '',
  ...props.settings
}))

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

// Get order type label
const orderTypeLabel = computed(() => {
  switch (props.order.orderType) {
    case 'dine-in':
      return `Table ${props.order.table?.tableNumber || props.order.tableNumber || '-'}`
    case 'takeaway':
      return 'Takeaway'
    case 'delivery':
      return 'Delivery'
    default:
      return props.order.orderType || '-'
  }
})

// Calculate change amount
const changeAmount = computed(() => {
  if (!props.order.payments?.length) return 0
  const totalPaid = props.order.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  return Math.max(0, totalPaid - (props.order.totalAmount || 0))
})
</script>

<template>
  <div class="receipt-container bg-white text-black p-6 font-mono text-sm max-w-xs mx-auto">
    <!-- Header -->
    <div class="text-center mb-4">
      <img
        v-if="printerSettings.showLogo && printerSettings.logoUrl"
        :src="printerSettings.logoUrl"
        alt="Logo"
        class="h-12 mx-auto mb-2"
      />
      <h2 class="text-xl font-bold">{{ printerSettings.businessName }}</h2>
      <p v-if="printerSettings.address" class="text-xs">{{ printerSettings.address }}</p>
      <p v-if="printerSettings.phone" class="text-xs">Tel: {{ printerSettings.phone }}</p>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-3"></div>

    <!-- Order Info -->
    <div class="mb-4 space-y-1">
      <div class="flex justify-between">
        <span>Receipt #</span>
        <span class="font-bold">{{ order.transactionNumber || order.orderNumber || order.id?.slice(-8) }}</span>
      </div>
      <div class="flex justify-between">
        <span>Date</span>
        <span>{{ formatDate(order.createdAt) }}</span>
      </div>
      <div class="flex justify-between">
        <span>Type</span>
        <span>{{ orderTypeLabel }}</span>
      </div>
      <div v-if="order.queueNumber" class="flex justify-between">
        <span>Queue #</span>
        <span class="font-bold text-lg">{{ order.queueNumber }}</span>
      </div>
      <div v-if="order.customerName || order.customer?.name" class="flex justify-between">
        <span>Customer</span>
        <span>{{ order.customerName || order.customer?.name }}</span>
      </div>
      <div v-if="order.staffName || order.staff?.name" class="flex justify-between">
        <span>Cashier</span>
        <span>{{ order.staffName || order.staff?.name }}</span>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-3"></div>

    <!-- Items -->
    <div class="mb-4">
      <div
        v-for="item in order.items"
        :key="item.id"
        class="mb-3"
      >
        <div class="flex justify-between">
          <span class="flex-1 font-medium">{{ item.product?.name || item.name }}</span>
        </div>
        <div class="flex justify-between text-xs pl-2">
          <span>{{ item.quantity }} x {{ formatCurrency(item.price) }}</span>
          <span>{{ formatCurrency(item.subtotal) }}</span>
        </div>
        <div v-if="item.variants?.length" class="text-xs pl-2 text-gray-600">
          {{ item.variants.map(v => v.name || v).join(', ') }}
        </div>
        <div v-if="item.notes" class="text-xs pl-2 text-gray-600 italic">
          Note: {{ item.notes }}
        </div>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-3"></div>

    <!-- Totals -->
    <div class="space-y-1">
      <div class="flex justify-between">
        <span>Subtotal</span>
        <span>{{ formatCurrency(order.subtotal || 0) }}</span>
      </div>
      
      <div v-if="order.voucherDiscount > 0 || order.discountAmount > 0" class="flex justify-between text-green-600">
        <span>Discount</span>
        <span>-{{ formatCurrency(order.voucherDiscount || order.discountAmount || 0) }}</span>
      </div>
      <div v-if="order.voucherCode" class="flex justify-between text-xs text-gray-600">
        <span>Voucher: {{ order.voucherCode }}</span>
      </div>
      
      <div v-if="order.serviceCharge > 0" class="flex justify-between">
        <span>Service Charge</span>
        <span>{{ formatCurrency(order.serviceCharge || 0) }}</span>
      </div>
      
      <div v-if="(order.tax || order.taxAmount) > 0" class="flex justify-between">
        <span>Tax</span>
        <span>{{ formatCurrency(order.tax || order.taxAmount || 0) }}</span>
      </div>
      
      <div class="border-t border-gray-400 pt-1 mt-2"></div>
      <div class="flex justify-between text-lg font-bold">
        <span>TOTAL</span>
        <span>{{ formatCurrency(order.totalAmount || 0) }}</span>
      </div>
    </div>

    <!-- Payment Info -->
    <div v-if="order.payments?.length > 0" class="mt-4">
      <div class="border-t-2 border-dashed border-gray-400 my-3"></div>
      <div class="font-semibold mb-2">Payment</div>
      <div
        v-for="payment in order.payments"
        :key="payment.id"
        class="flex justify-between"
      >
        <span class="capitalize">{{ (payment.paymentMethod || payment.method || '').replace('_', ' ') }}</span>
        <span>{{ formatCurrency(payment.amount) }}</span>
      </div>
      <div v-if="changeAmount > 0" class="flex justify-between mt-1 font-semibold">
        <span>Change</span>
        <span>{{ formatCurrency(changeAmount) }}</span>
      </div>
    </div>

    <!-- Single Payment Method (fallback) -->
    <div v-else-if="order.paymentMethod" class="mt-4">
      <div class="border-t-2 border-dashed border-gray-400 my-3"></div>
      <div class="flex justify-between">
        <span>Payment Method</span>
        <span class="capitalize">{{ order.paymentMethod.replace('_', ' ') }}</span>
      </div>
    </div>

    <div class="border-t-2 border-dashed border-gray-400 my-4"></div>

    <!-- Footer -->
    <div class="text-center text-xs">
      <p class="mb-2 font-medium">{{ printerSettings.footerMessage }}</p>
      <p v-if="order.transactionNumber" class="text-gray-500">
        Ref: {{ order.transactionNumber }}
      </p>
      <div class="mt-3">
        <div class="inline-block border-t border-gray-300 w-32"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.receipt-container {
  width: 80mm;
  min-height: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

@media print {
  .receipt-container {
    width: 80mm;
    margin: 0;
    padding: 5mm;
    box-shadow: none;
  }
}

@media screen {
  .receipt-container {
    max-width: 320px;
  }
}
</style>
