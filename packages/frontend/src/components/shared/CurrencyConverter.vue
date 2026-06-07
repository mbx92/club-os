<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">Currency Converter</h2>
      
      <!-- Input Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Amount</span>
          </label>
          <input 
            v-model.number="amount" 
            type="number" 
            step="0.01"
            class="input input-bordered" 
            placeholder="100"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">From Currency</span>
          </label>
          <select v-model="fromCurrency" class="select select-bordered">
            <option v-for="curr in currencies" :key="curr.code" :value="curr.code">
              {{ curr.code }} - {{ curr.name }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text">To Currency</span>
          </label>
          <select v-model="toCurrency" class="select select-bordered">
            <option v-for="curr in currencies" :key="curr.code" :value="curr.code">
              {{ curr.code }} - {{ curr.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Convert Button -->
      <div class="mt-4">
        <button 
          @click="handleConvert" 
          :disabled="ratesLoading || !amount"
          class="btn btn-primary w-full"
        >
          <span v-if="ratesLoading" class="loading loading-spinner"></span>
          {{ ratesLoading ? 'Converting...' : 'Convert' }}
        </button>
      </div>

      <!-- Result Section -->
      <div v-if="result" class="alert alert-success mt-4">
        <div class="flex flex-col w-full">
          <div class="text-2xl font-bold">
            {{ result.formatted }}
          </div>
          <div class="text-sm opacity-70 mt-2">
            {{ result.original }} {{ fromCurrency }} = {{ result.converted.toFixed(2) }} {{ toCurrency }}
          </div>
          <div class="text-xs opacity-50 mt-1">
            Exchange Rate: 1 {{ fromCurrency }} = {{ result.rate }} {{ toCurrency }}
          </div>
          <div class="text-xs opacity-50">
            Last Updated: {{ result.date }}
          </div>
        </div>
      </div>

      <!-- Error Section -->
      <div v-if="ratesError" class="alert alert-error mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ ratesError }}</span>
      </div>

      <!-- Tenant Currency Info -->
      <div class="divider">Your Currency</div>
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-title">Currency Code</div>
          <div class="stat-value text-primary">{{ currencySettings.currency }}</div>
          <div class="stat-desc">{{ currencySettings.symbol }} symbol</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mt-4 flex flex-wrap gap-2">
        <button 
          @click="convertToTenantCurrency" 
          class="btn btn-sm btn-outline"
          :disabled="ratesLoading"
        >
          Convert to My Currency
        </button>
        <button 
          @click="fetchLatestRates" 
          class="btn btn-sm btn-outline"
          :disabled="ratesLoading"
        >
          Refresh Rates
        </button>
        <button 
          @click="clearCache" 
          class="btn btn-sm btn-ghost"
        >
          Clear Cache
        </button>
      </div>

      <!-- Cache Status -->
      <div class="text-xs opacity-50 mt-4">
        <span v-if="hasCachedRates(fromCurrency)">
          ✅ Using cached rates (valid for {{ cacheTimeRemaining }})
        </span>
        <span v-else>
          ⚠️ No cached rates available
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCurrency } from '@/composables/subscription/useCurrency'

const {
  currencySettings,
  convertCurrency,
  formatCurrency,
  getExchangeRate,
  fetchExchangeRates,
  hasCachedRates,
  clearRatesCache,
  ratesLoading,
  ratesError,
  exchangeRates
} = useCurrency()

// Form data
const amount = ref(100)
const fromCurrency = ref('USD')
const toCurrency = ref('IDR')
const result = ref(null)

// Popular currencies
const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' }
]

// Set toCurrency to tenant currency on mount
const setDefaultCurrencies = () => {
  toCurrency.value = currencySettings.value.currency
  
  // If tenant currency is USD, set from as EUR
  if (toCurrency.value === 'USD') {
    fromCurrency.value = 'EUR'
  } else {
    fromCurrency.value = 'USD'
  }
}

// Handle conversion
const handleConvert = async () => {
  if (!amount.value || amount.value <= 0) {
    return
  }

  result.value = null

  try {
    // Get exchange rate
    const rate = await getExchangeRate(fromCurrency.value, toCurrency.value)
    
    // Convert amount
    const converted = await convertCurrency(
      amount.value,
      fromCurrency.value,
      toCurrency.value
    )
    
    // Get rates data for date
    const rates = exchangeRates.value[fromCurrency.value]
    
    result.value = {
      original: amount.value,
      converted: converted,
      formatted: formatCurrency(converted),
      rate: rate,
      date: rates?.date || 'N/A'
    }
  } catch (error) {
    console.error('Conversion failed:', error)
  }
}

// Convert to tenant currency
const convertToTenantCurrency = async () => {
  toCurrency.value = currencySettings.value.currency
  await handleConvert()
}

// Fetch latest rates
const fetchLatestRates = async () => {
  try {
    clearRatesCache()
    await fetchExchangeRates(fromCurrency.value)
    
    if (result.value) {
      await handleConvert() // Re-convert with new rates
    }
  } catch (error) {
    console.error('Failed to fetch rates:', error)
  }
}

// Clear cache
const clearCache = () => {
  clearRatesCache()
  result.value = null
}

// Cache time remaining
const cacheTimeRemaining = computed(() => {
  // Calculate remaining cache time
  // This is simplified - you can make it more precise
  return '~1 hour'
})

// Auto-convert when currency changes
watch([fromCurrency, toCurrency], () => {
  if (result.value) {
    handleConvert()
  }
})

// Initialize
setDefaultCurrencies()
</script>

<style scoped>
.stat-value {
  font-size: 2rem;
}
</style>
