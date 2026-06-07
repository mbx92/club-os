import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * Composable for dynamic currency formatting based on tenant settings
 * Uses tenant.settings.transaction.currency for currency and symbol
 * Supports currency conversion using Frankfurter API
 */
export const useCurrency = () => {
  const authStore = useAuthStore()
  
  // Exchange rates cache
  const exchangeRates = ref({})
  const ratesLoading = ref(false)
  const ratesError = ref(null)
  const lastFetchTime = ref(null)
  
  // Cache duration: 1 hour
  const CACHE_DURATION = 60 * 60 * 1000

  // Get currency settings from tenant
  const currencySettings = computed(() => {
    const settings = authStore.user?.tenant?.settings?.transaction?.currency
    return {
      currency: settings?.defaultCurrency || 'USD',
      symbol: settings?.currencySymbol || '$',
      decimalSeparator: settings?.decimalSeparator || '.',
      thousandSeparator: settings?.thousandSeparator || ',',
      useDecimals: settings?.useDecimals ?? true
    }
  })

  /**
   * Format amount as currency using tenant settings
   * @param {number} amount - Amount to format
   * @param {boolean} useSymbol - Use custom symbol instead of Intl formatter (default: false)
   * @returns {string} Formatted currency string
   */
  const formatCurrency = (amount, useSymbol = false) => {
    if (amount == null || isNaN(amount)) return `${currencySettings.value.symbol}0`

    const settings = currencySettings.value

    // Option 1: Use custom symbol and formatting (manual)
    if (useSymbol) {
      const decimals = settings.useDecimals ? 2 : 0
      const formatted = Math.abs(amount).toFixed(decimals)
      const parts = formatted.split('.')
      
      // Add thousand separators
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandSeparator)
      
      // Join with decimal separator
      const numberStr = settings.useDecimals 
        ? parts.join(settings.decimalSeparator)
        : parts[0]
      
      return `${amount < 0 ? '-' : ''}${settings.symbol}${numberStr}`
    }

    // Option 2: Use Intl.NumberFormat (standard)
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: settings.currency,
        minimumFractionDigits: settings.useDecimals ? 2 : 0,
        maximumFractionDigits: settings.useDecimals ? 2 : 0
      }).format(amount)
    } catch (error) {
      // Fallback if currency code is invalid
      console.warn(`Invalid currency code: ${settings.currency}, using symbol fallback`)
      return formatCurrency(amount, true)
    }
  }

  /**
   * Get currency label for display (e.g., "Price (USD)" or "Price (IDR)")
   * @param {string} label - Base label (e.g., "Price")
   * @returns {string} Label with currency code
   */
  const getCurrencyLabel = (label = 'Price') => {
    return `${label} (${currencySettings.value.currency})`
  }

  /**
   * Get just the currency symbol
   * @returns {string} Currency symbol
   */
  const getCurrencySymbol = () => {
    return currencySettings.value.symbol
  }

  /**
   * Get currency code
   * @returns {string} Currency code (e.g., "USD", "IDR")
   */
  const getCurrencyCode = () => {
    return currencySettings.value.currency
  }

  /**
   * Fetch exchange rates from Frankfurter API
   * @param {string} baseCurrency - Base currency (default: tenant currency)
   * @returns {Promise<Object>} Exchange rates object
   */
  const fetchExchangeRates = async (baseCurrency = null) => {
    const base = baseCurrency || currencySettings.value.currency
    
    // Check if cache is still valid
    const now = Date.now()
    if (
      exchangeRates.value[base] && 
      lastFetchTime.value && 
      now - lastFetchTime.value < CACHE_DURATION
    ) {
      console.log(`[useCurrency] Using cached rates for ${base}`)
      return exchangeRates.value[base]
    }
    
    ratesLoading.value = true
    ratesError.value = null
    
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${base}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache the rates
      exchangeRates.value[base] = {
        base: data.base,
        date: data.date,
        rates: data.rates
      }
      lastFetchTime.value = now
      
      console.log(`[useCurrency] Fetched exchange rates for ${base}:`, data.rates)
      
      return exchangeRates.value[base]
    } catch (error) {
      ratesError.value = error.message
      console.error('[useCurrency] Failed to fetch exchange rates:', error)
      throw error
    } finally {
      ratesLoading.value = false
    }
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code (default: tenant currency)
   * @returns {Promise<number>} Converted amount
   */
  const convertCurrency = async (amount, fromCurrency, toCurrency = null) => {
    const target = toCurrency || currencySettings.value.currency
    
    // No conversion needed if same currency
    if (fromCurrency === target) {
      return amount
    }
    
    try {
      const rates = await fetchExchangeRates(fromCurrency)
      const rate = rates.rates[target]
      
      if (!rate) {
        throw new Error(`Exchange rate not available for ${target}`)
      }
      
      const converted = amount * rate
      console.log(`[useCurrency] Converted ${amount} ${fromCurrency} = ${converted} ${target} (rate: ${rate})`)
      
      return converted
    } catch (error) {
      console.error(`[useCurrency] Conversion failed:`, error)
      throw error
    }
  }

  /**
   * Format amount with currency conversion
   * @param {number} amount - Amount to format
   * @param {string} fromCurrency - Original currency code
   * @param {boolean} useSymbol - Use custom symbol formatting
   * @returns {Promise<string>} Formatted currency string
   */
  const formatCurrencyWithConversion = async (amount, fromCurrency, useSymbol = false) => {
    try {
      const converted = await convertCurrency(amount, fromCurrency)
      return formatCurrency(converted, useSymbol)
    } catch (error) {
      // Fallback: just format original amount without conversion
      console.warn(`[useCurrency] Using original amount without conversion`)
      return formatCurrency(amount, useSymbol)
    }
  }

  /**
   * Get current exchange rate between two currencies
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency (default: tenant currency)
   * @returns {Promise<number>} Exchange rate
   */
  const getExchangeRate = async (fromCurrency, toCurrency = null) => {
    const target = toCurrency || currencySettings.value.currency
    
    if (fromCurrency === target) {
      return 1
    }
    
    try {
      const rates = await fetchExchangeRates(fromCurrency)
      return rates.rates[target] || null
    } catch (error) {
      console.error(`[useCurrency] Failed to get exchange rate:`, error)
      return null
    }
  }

  /**
   * Check if exchange rates are cached and valid
   * @param {string} baseCurrency - Base currency to check
   * @returns {boolean} True if cached rates are valid
   */
  const hasCachedRates = (baseCurrency = null) => {
    const base = baseCurrency || currencySettings.value.currency
    const now = Date.now()
    return !!(
      exchangeRates.value[base] && 
      lastFetchTime.value && 
      now - lastFetchTime.value < CACHE_DURATION
    )
  }

  /**
   * Clear exchange rates cache
   */
  const clearRatesCache = () => {
    exchangeRates.value = {}
    lastFetchTime.value = null
    ratesError.value = null
    console.log('[useCurrency] Exchange rates cache cleared')
  }

  return {
    currencySettings,
    formatCurrency,
    getCurrencyLabel,
    getCurrencySymbol,
    getCurrencyCode,
    
    // Currency conversion
    fetchExchangeRates,
    convertCurrency,
    formatCurrencyWithConversion,
    getExchangeRate,
    hasCachedRates,
    clearRatesCache,
    
    // Conversion state
    exchangeRates,
    ratesLoading,
    ratesError
  }
}
