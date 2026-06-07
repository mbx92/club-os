<route lang="yaml">
meta:
  title: Point of Sale - Combined Billing
  layout: default
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRestaurantBilling } from '@/composables/restaurant/useRestaurantBilling'
import { useNotification } from '@/composables/core/useNotification'
import CombinedBillingForm from '@/components/billing/CombinedBillingForm.vue'
import { 
  IconReceipt, 
  IconPrinter, 
  IconCheck, 
  IconArrowLeft,
  IconCrown,
  IconLock
} from '@tabler/icons-vue'

const router = useRouter()
const { 
  isCombinedBillingEnabled, 
  createCombinedTransaction, 
  formatCurrency,
  loading 
} = useRestaurantBilling()
const { showError, showSuccess } = useNotification()

const showReceipt = ref(false)
const completedTransaction = ref(null)

// Check feature access
const hasAccess = computed(() => isCombinedBillingEnabled())

const handleSubmit = async (transactionData) => {
  try {
    const result = await createCombinedTransaction(transactionData)
    completedTransaction.value = result
    showReceipt.value = true
  } catch (err) {
    console.error('Transaction error:', err)
  }
}

const handlePrintReceipt = () => {
  window.print()
}

const handleNewTransaction = () => {
  showReceipt.value = false
  completedTransaction.value = null
  // Reload page to reset form
  window.location.reload()
}

const goBack = () => {
  router.push('/restaurant')
}

onMounted(() => {
  if (!hasAccess.value) {
    showError('Combined billing feature not available in your subscription plan')
  }
})
</script>

<template>
  <div class="container px-4 py-6 mx-auto">
    <!-- Feature Gate Check -->
    <div v-if="!hasAccess" class="max-w-xl mx-auto">
      <div class="shadow-xl card bg-base-100">
        <div class="text-center card-body">
          <div class="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-warning/20">
            <IconLock class="w-10 h-10 text-warning" />
          </div>
          
          <h2 class="mb-2 text-2xl font-bold">Feature Locked</h2>
          <p class="mb-6 text-base-content/60">
            Combined billing feature is not available in your current subscription plan.
            Upgrade to access this feature.
          </p>
          
          <div class="flex justify-center gap-3">
            <button class="btn btn-ghost" @click="goBack">
              <IconArrowLeft class="w-4 h-4 mr-2" />
              Go Back
            </button>
            <router-link to="/subscription/plans" class="btn btn-primary">
              <IconCrown class="w-4 h-4 mr-2" />
              Upgrade Plan
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Combined Billing Form -->
    <div v-else>
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-sm" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Combined Billing</h1>
          <p class="mt-1 text-base-content/60">
            Membership + Restaurant Products in one transaction
          </p>
        </div>
        <div class="gap-2 badge badge-primary badge-lg">
          <IconCrown class="w-4 h-4" />
          Premium Feature
        </div>
      </div>

      <CombinedBillingForm
        :loading="loading"
        @submit="handleSubmit"
      />
    </div>

    <!-- Receipt Modal -->
    <Teleport to="body">
      <div v-if="showReceipt" class="modal modal-open">
        <div class="max-w-md modal-box">
          <!-- Success Header -->
          <div class="mb-6 text-center">
            <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-success/20">
              <IconCheck class="w-8 h-8 text-success" />
            </div>
            <h3 class="text-xl font-bold">Transaction Complete!</h3>
            <p class="text-base-content/60">
              Transaction #{{ completedTransaction?.transactionNumber || completedTransaction?.id }}
            </p>
          </div>

          <!-- Receipt Content -->
          <div class="p-4 mb-6 rounded-lg bg-base-200 print:bg-white print:border">
            <!-- Header -->
            <div class="pb-4 mb-4 text-center border-b border-dashed border-base-300">
              <h4 class="text-lg font-bold">RECEIPT</h4>
              <p class="text-sm text-base-content/60">
                {{ new Date().toLocaleString('id-ID') }}
              </p>
            </div>

            <!-- Customer -->
            <div class="mb-4">
              <p class="text-sm">
                <span class="text-base-content/60">Customer:</span>
                {{ completedTransaction?.customerName || '-' }}
              </p>
            </div>

            <!-- Items -->
            <div class="mb-4 space-y-2">
              <div 
                v-for="(item, index) in completedTransaction?.items" 
                :key="item.id || index"
                class="flex justify-between text-sm"
              >
                <div class="max-w-[65%]">
                  <span v-if="item.itemType === 'service_plan'" class="mr-1 badge badge-primary badge-xs">SP</span>
                  <span v-else class="mr-1 badge badge-secondary badge-xs">P</span>
                  <span class="font-medium">{{ item.itemName || item.itemDetails?.name || '-' }}</span>
                  <div v-if="item.itemDetails" class="mt-1 text-xs text-base-content/60">
                    <template v-if="item.itemDetails.serviceType">Type: {{ item.itemDetails.serviceType }}</template>
                    <template v-else-if="item.itemDetails.productName">Product: {{ item.itemDetails.productName }}</template>
                  </div>
                  <div v-if="item.notes" class="mt-1 text-xs text-base-content/60">Notes: {{ item.notes }}</div>
                </div>

                <div class="text-right">
                  <div>{{ formatCurrency(Number(item.unitPrice || item.price || 0) * (item.quantity || 1)) }}</div>
                  <div class="text-xs text-base-content/60">x{{ item.quantity || 1 }}</div>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="pt-4 space-y-2 border-t border-dashed border-base-300">
              <div class="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{{ formatCurrency(Number(completedTransaction?.subtotal || 0)) }}</span>
              </div>
              <div v-if="completedTransaction?.voucherDiscount" class="flex justify-between text-sm text-success">
                <span>Voucher Discount</span>
                <span>-{{ formatCurrency(Number(completedTransaction?.voucherDiscount || 0)) }}</span>
              </div>
              <div v-if="completedTransaction?.tax" class="flex justify-between text-sm">
                <span>Tax</span>
                <span>{{ formatCurrency(Number(completedTransaction?.tax || 0)) }}</span>
              </div>
              <div class="flex justify-between font-bold">
                <span>Total</span>
                <span>{{ formatCurrency(Number(completedTransaction?.totalAmount || completedTransaction?.total || 0)) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Paid ({{ completedTransaction?.payments?.[0]?.paymentMethod || completedTransaction?.payments?.[0]?.method || 'Cash' }})</span>
                <span>{{ formatCurrency(Number(completedTransaction?.paidAmount || completedTransaction?.payments?.[0]?.amount || 0)) }}</span>
              </div>
              <div v-if="Number(completedTransaction?.changeAmount || completedTransaction?.change || 0) > 0" class="flex justify-between text-sm">
                <span>Change</span>
                <span>{{ formatCurrency(Number(completedTransaction?.changeAmount || completedTransaction?.change || 0)) }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="pt-4 mt-4 text-xs text-center border-t border-dashed text-base-content/60 border-base-300">
              <p>Thank you for your purchase!</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button class="flex-1 btn btn-ghost" @click="handleNewTransaction">
              New Transaction
            </button>
            <button class="flex-1 btn btn-primary" @click="handlePrintReceipt">
              <IconPrinter class="w-4 h-4 mr-2" />
              Print
            </button>
          </div>
        </div>
        <div class="modal-backdrop bg-black/50" @click="handleNewTransaction"></div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@media print {
  .modal-backdrop,
  .modal-action,
  .btn {
    display: none !important;
  }
  
  .modal-box {
    max-width: 100%;
    box-shadow: none;
  }
}
</style>
