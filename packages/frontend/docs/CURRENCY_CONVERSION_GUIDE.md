# Currency Conversion with Frankfurter API

## 🎯 Overview

`useCurrency` composable now supports automatic currency conversion using the **Frankfurter API** (free, no API key required).

**Frankfurter API**: https://www.frankfurter.app/
- ✅ Free & Open Source
- ✅ No API key required
- ✅ Real-time exchange rates
- ✅ 33+ currencies supported
- ✅ Updated daily (ECB data)

---

## 🚀 Features

### 1. Basic Currency Formatting (Existing)
```javascript
import { useCurrency } from '@/composables/useCurrency'

const { formatCurrency, getCurrencyLabel } = useCurrency()

formatCurrency(100000) // "$100,000.00" or "Rp100.000"
getCurrencyLabel('Price') // "Price (USD)" or "Price (IDR)"
```

### 2. **NEW: Currency Conversion**
```javascript
const { 
  convertCurrency,
  formatCurrencyWithConversion,
  getExchangeRate 
} = useCurrency()

// Convert amount
const converted = await convertCurrency(100, 'USD', 'IDR')
// 100 USD = ~1,560,000 IDR (depends on rate)

// Format with conversion
const formatted = await formatCurrencyWithConversion(100, 'USD')
// "Rp1.560.000" (if tenant currency is IDR)

// Get exchange rate
const rate = await getExchangeRate('USD', 'IDR')
// 15600 (example rate)
```

---

## 📋 API Methods

### Core Methods (Existing)

#### `formatCurrency(amount, useSymbol)`
Format amount using tenant currency settings.
```javascript
formatCurrency(100000) // "$100,000.00"
formatCurrency(100000, true) // "Rp100.000" (custom symbol)
```

#### `getCurrencyLabel(label)`
Get label with currency code.
```javascript
getCurrencyLabel('Price') // "Price (USD)"
getCurrencyLabel('Total') // "Total (IDR)"
```

#### `getCurrencySymbol()`
Get tenant currency symbol.
```javascript
getCurrencySymbol() // "$" or "Rp"
```

#### `getCurrencyCode()`
Get tenant currency code.
```javascript
getCurrencyCode() // "USD" or "IDR"
```

---

### **NEW: Conversion Methods**

#### `fetchExchangeRates(baseCurrency)`
Fetch exchange rates from Frankfurter API.
```javascript
const rates = await fetchExchangeRates('USD')
// {
//   base: "USD",
//   date: "2024-11-23",
//   rates: {
//     EUR: 0.92,
//     GBP: 0.79,
//     IDR: 15600,
//     JPY: 149.5,
//     ...
//   }
// }
```

**Features**:
- ✅ Auto-caches rates for 1 hour
- ✅ Returns from cache if available
- ✅ Default base: tenant currency

#### `convertCurrency(amount, fromCurrency, toCurrency)`
Convert amount between currencies.
```javascript
// Convert USD to IDR (tenant currency)
const idr = await convertCurrency(100, 'USD')
// 1560000

// Convert EUR to USD
const usd = await convertCurrency(100, 'EUR', 'USD')
// 108.7
```

**Features**:
- ✅ Auto-fetches rates if not cached
- ✅ Returns original amount if same currency
- ✅ Throws error if rate not available

#### `formatCurrencyWithConversion(amount, fromCurrency, useSymbol)`
Convert and format in one call.
```javascript
// Convert $100 USD to tenant currency and format
const formatted = await formatCurrencyWithConversion(100, 'USD')
// "Rp1.560.000" (if tenant = IDR)
// "$100.00" (if tenant = USD)

// With custom symbol
const formatted2 = await formatCurrencyWithConversion(100, 'USD', true)
// "Rp1.560.000"
```

**Features**:
- ✅ Converts then formats
- ✅ Fallback to original if conversion fails
- ✅ Best for display purposes

#### `getExchangeRate(fromCurrency, toCurrency)`
Get exchange rate between two currencies.
```javascript
const rate = await getExchangeRate('USD', 'IDR')
// 15600

const rate2 = await getExchangeRate('EUR', 'USD')
// 1.087
```

**Features**:
- ✅ Returns 1 if same currency
- ✅ Returns null if rate unavailable
- ✅ Auto-caches for reuse

#### `hasCachedRates(baseCurrency)`
Check if rates are cached and valid.
```javascript
const cached = hasCachedRates('USD')
// true or false
```

#### `clearRatesCache()`
Clear all cached exchange rates.
```javascript
clearRatesCache()
// Clears cache, next call will fetch fresh rates
```

---

## 💡 Usage Examples

### Example 1: Display Price in Multiple Currencies
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { 
  formatCurrency, 
  formatCurrencyWithConversion,
  getExchangeRate 
} = useCurrency()

const priceUSD = 99 // Original price in USD
const priceInTenantCurrency = ref(null)
const exchangeRate = ref(null)

onMounted(async () => {
  // Convert to tenant currency
  priceInTenantCurrency.value = await formatCurrencyWithConversion(priceUSD, 'USD')
  
  // Show exchange rate
  exchangeRate.value = await getExchangeRate('USD')
})
</script>

<template>
  <div class="card">
    <h3>Subscription Plan</h3>
    <p>Original: ${{ priceUSD }}</p>
    <p>Your Price: {{ priceInTenantCurrency }}</p>
    <p class="text-sm text-gray-500">Rate: {{ exchangeRate }}</p>
  </div>
</template>
```

### Example 2: Multi-Currency Invoice
```vue
<script setup>
import { useCurrency } from '@/composables/useCurrency'

const { convertCurrency, formatCurrency } = useCurrency()

const invoice = {
  amount: 1000,
  currency: 'EUR'
}

// Convert to tenant currency for display
const displayAmount = async () => {
  const converted = await convertCurrency(invoice.amount, invoice.currency)
  return formatCurrency(converted)
}
</script>

<template>
  <div>
    <p>Invoice Amount: €{{ invoice.amount }}</p>
    <p>Your Currency: {{ displayAmount() }}</p>
  </div>
</template>
```

### Example 3: Currency Converter Widget
```vue
<script setup>
import { ref } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { 
  convertCurrency, 
  formatCurrency,
  ratesLoading,
  ratesError 
} = useCurrency()

const amount = ref(100)
const fromCurrency = ref('USD')
const toCurrency = ref('IDR')
const result = ref(null)

const convert = async () => {
  try {
    const converted = await convertCurrency(
      amount.value, 
      fromCurrency.value, 
      toCurrency.value
    )
    result.value = formatCurrency(converted)
  } catch (error) {
    console.error('Conversion failed:', error)
  }
}
</script>

<template>
  <div class="converter">
    <input v-model.number="amount" type="number" />
    <select v-model="fromCurrency">
      <option value="USD">USD</option>
      <option value="EUR">EUR</option>
      <option value="IDR">IDR</option>
    </select>
    <button @click="convert" :disabled="ratesLoading">
      Convert to {{ toCurrency }}
    </button>
    
    <div v-if="ratesLoading">Loading rates...</div>
    <div v-else-if="ratesError" class="text-red-500">{{ ratesError }}</div>
    <div v-else-if="result" class="result">{{ result }}</div>
  </div>
</template>
```

---

## 🎨 Real-World Use Cases

### 1. **Subscription Plans (Multi-Currency)**
```javascript
// Plan price is in USD, but show in tenant currency
const plan = {
  name: 'Professional',
  priceUSD: 99
}

const displayPrice = await formatCurrencyWithConversion(plan.priceUSD, 'USD')
// Tenant sees: "Rp1.544.400" instead of "$99"
```

### 2. **International Invoices**
```javascript
// Invoice from foreign vendor in EUR
const invoice = {
  amount: 500,
  currency: 'EUR'
}

// Convert to tenant currency for accounting
const amountInTenantCurrency = await convertCurrency(
  invoice.amount, 
  invoice.currency
)
// Store converted amount in local currency
```

### 3. **Payment Gateway Integration**
```javascript
// Payment gateway requires USD
// Tenant currency is IDR
const orderTotal = 1500000 // IDR

// Convert to USD for payment
const amountUSD = await convertCurrency(orderTotal, 'IDR', 'USD')
// Send to payment gateway: $96.15
```

### 4. **Financial Reports**
```javascript
// Show revenue in both currencies
const revenue = {
  local: 50000000, // IDR
  currency: 'IDR'
}

// Convert to USD for global reporting
const revenueUSD = await convertCurrency(revenue.local, 'IDR', 'USD')
// $3,205 USD
```

---

## ⚙️ Configuration

### Cache Duration
Default: **1 hour** (3600000ms)

Change in `useCurrency.js`:
```javascript
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
// or
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
```

### Supported Currencies
Frankfurter supports 33 currencies:
- USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD
- IDR, SGD, MYR, THB, PHP, VND
- And more...

Full list: https://www.frankfurter.app/docs/

---

## 🔄 Data Flow

```
User requests conversion
    ↓
Check cache (valid for 1 hour?)
    ↓ NO
Fetch from Frankfurter API
    ↓
Cache rates + timestamp
    ↓
Calculate conversion (amount × rate)
    ↓
Format with tenant settings
    ↓
Display converted amount
```

---

## 🛡️ Error Handling

```javascript
const { convertCurrency, ratesError } = useCurrency()

try {
  const converted = await convertCurrency(100, 'USD', 'IDR')
  console.log('Converted:', converted)
} catch (error) {
  // Handle error
  if (ratesError.value) {
    console.error('API Error:', ratesError.value)
    // Fallback: use original amount
  }
}
```

**Common Errors**:
- Network error (API down)
- Invalid currency code
- Rate not available
- API rate limit exceeded

**Fallback Strategy**:
```javascript
const formatWithFallback = async (amount, fromCurrency) => {
  try {
    return await formatCurrencyWithConversion(amount, fromCurrency)
  } catch (error) {
    // Fallback: format without conversion
    return formatCurrency(amount)
  }
}
```

---

## 📊 Performance

### Caching Strategy:
- ✅ **First call**: Fetches from API (~200-500ms)
- ✅ **Subsequent calls**: Returns from cache (~0ms)
- ✅ **Cache expires**: After 1 hour, refetch automatically
- ✅ **Multiple currencies**: Each base currency cached separately

### Optimization Tips:
1. **Prefetch rates on app load**:
```javascript
// In App.vue or layout
onMounted(async () => {
  const { fetchExchangeRates } = useCurrency()
  await fetchExchangeRates() // Prefetch tenant currency rates
})
```

2. **Batch conversions**:
```javascript
// Fetch rates once, use multiple times
await fetchExchangeRates('USD') // Fetch once
const price1 = await convertCurrency(100, 'USD') // Use cache
const price2 = await convertCurrency(200, 'USD') // Use cache
const price3 = await convertCurrency(300, 'USD') // Use cache
```

3. **Clear cache when needed**:
```javascript
// After tenant changes currency settings
clearRatesCache()
```

---

## ✅ Benefits

1. ✅ **Free**: No API key or billing
2. ✅ **Real-time**: Updated daily with ECB data
3. ✅ **Cached**: Fast subsequent calls
4. ✅ **Reliable**: Frankfurter has 99.9% uptime
5. ✅ **Simple**: No complex setup
6. ✅ **Multi-tenant**: Each tenant sees their currency

---

## 🚀 Next Steps

1. ✅ Add to subscription plans display
2. ✅ Show converted prices in invoices
3. ✅ Support payment gateway USD conversion
4. ✅ Add currency converter in settings
5. ✅ Display exchange rate info to users

---

**Status**: ✅ Implemented & Ready to Use
**API**: Frankfurter (https://www.frankfurter.app/)
**Cache**: 1 hour auto-refresh
**Supported**: 33+ currencies
