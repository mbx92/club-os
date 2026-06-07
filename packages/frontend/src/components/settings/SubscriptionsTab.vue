<template>
  <div class="space-y-6">
    <!-- Subscription Overview Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconCreditCard class="w-6 h-6" />
          Current Subscription
        </h2>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="!hasSubscription" class="alert alert-warning">
          <IconAlertTriangle class="w-5 h-5" />
          <div>
            <div class="font-semibold">No Active Subscription</div>
            <div class="text-sm">Please subscribe to a plan to access features.</div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <!-- Plan Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Plan Name</div>
                <div class="stat-value text-2xl text-primary">{{ subscription?.plan?.name }}</div>
                <div class="stat-desc">{{ subscription?.plan?.description }}</div>
              </div>
            </div>

            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Status</div>
                <div class="stat-value text-2xl">
                  <div class="badge badge-lg" :class="statusBadgeClass">
                    {{ subscription?.status }}
                  </div>
                </div>
                <div class="stat-desc">Monthly subscription</div>
              </div>
            </div>
          </div>

          <!-- Trial Badge -->
          <div v-if="isTrialActive" class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <div>
              <div class="font-semibold">Trial Period Active</div>
              <div class="text-sm">Your trial ends on {{ formatDate(subscription?.trialEndDate) }}</div>
            </div>
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Start Date</span>
              </label>
              <input
                type="text"
                :value="formatDate(subscription?.startDate)"
                class="input input-bordered"
                readonly
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-semibold">End Date</span>
              </label>
              <input
                type="text"
                :value="formatDate(subscription?.endDate)"
                class="input input-bordered"
                readonly
              />
            </div>

            <div v-if="subscription?.trialEndDate" class="form-control">
              <label class="label">
                <span class="label-text font-semibold">Trial End Date</span>
              </label>
              <input
                type="text"
                :value="formatDate(subscription?.trialEndDate)"
                class="input input-bordered"
                readonly
              />
            </div>
          </div>

          <!-- Price -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Price</span>
            </label>
            
            <!-- Original USD Price -->
            <div class="text-lg text-base-content/60 line-through">
              ${{ subscription?.plan?.price }} USD
              <span class="text-sm">/ {{ subscription?.plan?.duration }} days</span>
            </div>
            
            <!-- Converted Price -->
            <div class="text-3xl font-bold text-primary mt-1">
              <span v-if="conversionLoading" class="loading loading-spinner loading-sm"></span>
              <span v-else-if="convertedPrice">{{ convertedPrice }}</span>
              <span v-else>${{ subscription?.plan?.price }}</span>
              <span class="text-sm text-base-content/60">/ {{ subscription?.plan?.duration }} days</span>
            </div>
            
            <!-- Exchange Rate Info -->
            <div v-if="exchangeRate" class="label">
              <span class="label-text-alt flex items-center gap-2">
                <IconInfoCircle class="w-4 h-4" />
                Exchange rate: 1 USD = {{ exchangeRate }} {{ getCurrencyCode() }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Card -->
    <div v-if="hasSubscription" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconBox class="w-6 h-6" />
          Plan Features
        </h2>

        <!-- Modules -->
        <div class="mb-6">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconApps class="w-5 h-5" />
            Modules
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="(enabled, module) in features?.modules"
              :key="module"
              class="flex items-center gap-2 p-3 rounded-lg border"
              :class="enabled ? 'bg-success/10 border-success' : 'bg-base-200 border-base-300'"
            >
              <IconCheck v-if="enabled" class="w-5 h-5 text-success" />
              <IconX v-else class="w-5 h-5 text-error" />
              <span class="text-sm capitalize">{{ formatModuleName(module) }}</span>
            </div>
          </div>
        </div>

        <!-- Limits -->
        <div class="mb-6">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconChartBar class="w-5 h-5" />
            Limits
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="(value, limit) in features?.limits"
              :key="limit"
              class="stat bg-base-200 rounded-lg"
            >
              <div class="stat-title text-xs">{{ formatLimitName(limit) }}</div>
              <div class="stat-value text-lg">{{ formatLimitValue(value) }}</div>
            </div>
          </div>
        </div>

        <!-- Payment Methods -->
        <div class="mb-6">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconCreditCard class="w-5 h-5" />
            Payment Methods
          </h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(enabled, method) in features?.payments"
              :key="method"
              class="badge badge-lg"
              :class="enabled ? 'badge-success' : 'badge-ghost'"
            >
              {{ formatPaymentMethod(method) }}
            </div>
          </div>
        </div>

        <!-- Transactions -->
        <div class="mb-6">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconReceipt class="w-5 h-5" />
            Transaction Features
          </h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(enabled, feature) in features?.transactions"
              :key="feature"
              class="badge badge-lg"
              :class="enabled ? 'badge-primary' : 'badge-ghost'"
            >
              {{ formatFeatureName(feature) }}
            </div>
          </div>
        </div>

        <!-- Integrations -->
        <div class="mb-6">
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconPlugConnected class="w-5 h-5" />
            Integrations
          </h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(enabled, integration) in features?.integrations"
              :key="integration"
              class="badge badge-lg"
              :class="enabled ? 'badge-accent' : 'badge-ghost'"
            >
              {{ formatIntegrationName(integration) }}
            </div>
          </div>
        </div>

        <!-- Support -->
        <div>
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <IconHeadset class="w-5 h-5" />
            Support
          </h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(enabled, support) in features?.support"
              :key="support"
              class="badge badge-lg"
              :class="enabled ? 'badge-info' : 'badge-ghost'"
            >
              {{ formatSupportName(support) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Card -->
    <div v-if="hasSubscription" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconSettings class="w-6 h-6" />
          Subscription Actions
        </h2>

        <div class="flex flex-wrap gap-3">
          <button class="btn btn-primary">
            <IconArrowUp class="w-5 h-5" />
            Upgrade Plan
          </button>
          <button class="btn btn-outline">
            <IconRefresh class="w-5 h-5" />
            Refresh Subscription
          </button>
          <button class="btn btn-outline btn-error">
            <IconX class="w-5 h-5" />
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useCurrency } from '@/composables/subscription/useCurrency'
import {
  IconCreditCard,
  IconBox,
  IconApps,
  IconChartBar,
  IconReceipt,
  IconPlugConnected,
  IconHeadset,
  IconSettings,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconArrowUp,
  IconRefresh
} from '@tabler/icons-vue'

const subscriptionStore = useSubscriptionStore()
const { 
  formatCurrencyWithConversion, 
  getExchangeRate, 
  getCurrencyCode,
  formatCurrency 
} = useCurrency()

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

// Reactive states for currency conversion
const convertedPrice = ref(null)
const exchangeRate = ref(null)
const conversionLoading = ref(false)

// Computed
const subscription = computed(() => subscriptionStore.subscription)
const features = computed(() => subscriptionStore.features)
const isTrialActive = computed(() => subscriptionStore.isTrialActive)
const hasSubscription = computed(() => subscriptionStore.hasSubscription)
const loading = computed(() => subscriptionStore.loading)

const statusBadgeClass = computed(() => {
  const status = subscription.value?.status
  switch (status) {
    case 'active':
      return 'badge-success'
    case 'pending':
      return 'badge-warning'
    case 'expired':
      return 'badge-error'
    case 'cancelled':
      return 'badge-ghost'
    default:
      return 'badge-neutral'
  }
})

// Methods
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatModuleName = (name) => {
  return name.replace(/([A-Z])/g, ' $1').trim()
}

const formatLimitName = (name) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

const formatLimitValue = (value) => {
  if (value === null || value === 0) return 'Unlimited'
  return value.toLocaleString()
}

const formatPaymentMethod = (method) => {
  const methods = {
    cash: 'Cash',
    creditCard: 'Card',
    bankTransfer: 'Bank Transfer',
    eWallet: 'E-Wallet',
    qris: 'QRIS',
    paymentGateway: 'Payment Gateway',
    compliment: 'Compliment'
  }
  return methods[method] || method
}

const formatFeatureName = (name) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

const formatIntegrationName = (name) => {
  const integrations = {
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    email: 'Email',
    paymentGateway: 'Payment Gateway',
    accounting: 'Accounting'
  }
  return integrations[name] || name
}

const formatSupportName = (name) => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Currency conversion method
const convertSubscriptionPrice = async () => {
  if (!subscription.value?.plan?.price) {
    convertedPrice.value = null
    exchangeRate.value = null
    return
  }

  conversionLoading.value = true
  try {
    const planCurrency = 'USD' // Assume plans are in USD
    const tenantCurrency = getCurrencyCode()

    // Only convert if currencies are different
    if (planCurrency !== tenantCurrency) {
      // Get converted price
      convertedPrice.value = await formatCurrencyWithConversion(
        subscription.value.plan.price,
        planCurrency
      )

      // Get exchange rate for display
      exchangeRate.value = await getExchangeRate(planCurrency, tenantCurrency)
    } else {
      // Same currency, just format
      convertedPrice.value = formatCurrency(subscription.value.plan.price)
      exchangeRate.value = null
    }
  } catch (error) {
    console.error('Failed to convert currency:', error)
    convertedPrice.value = null
    exchangeRate.value = null
  } finally {
    conversionLoading.value = false
  }
}

// Watch subscription changes
watch(subscription, async (newSub) => {
  if (newSub?.plan?.price) {
    await convertSubscriptionPrice()
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  // Only fetch if no subscription data exists (no cache)
  if (!subscription.value) {
    if (isDev) console.log('[SubscriptionsTab] No cached data, fetching subscription...')
    await subscriptionStore.fetchSubscription()
  } else {
    if (isDev) console.log('[SubscriptionsTab] Using cached subscription data')
  }
  
  // Convert price after loading
  await convertSubscriptionPrice()
})
</script>
