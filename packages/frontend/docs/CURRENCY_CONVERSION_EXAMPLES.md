# Currency Conversion - Quick Start Examples

## 📋 Practical Examples

### Example 1: Show Subscription Price in Tenant Currency

**Scenario**: Subscription plans are priced in USD, but tenant uses IDR.

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { formatCurrencyWithConversion, getExchangeRate } = useCurrency()

const plan = {
  name: 'Professional',
  priceUSD: 99,
  currency: 'USD'
}

const displayPrice = ref(null)
const exchangeRate = ref(null)

onMounted(async () => {
  // Convert and format
  displayPrice.value = await formatCurrencyWithConversion(
    plan.priceUSD, 
    plan.currency
  )
  
  // Get rate for info
  exchangeRate.value = await getExchangeRate(plan.currency)
})
</script>

<template>
  <div class="card">
    <h3>{{ plan.name }}</h3>
    
    <!-- Show in USD -->
    <p class="text-gray-500 line-through">
      ${{ plan.priceUSD }} USD
    </p>
    
    <!-- Show in tenant currency -->
    <p class="text-2xl font-bold">
      {{ displayPrice || 'Loading...' }}
    </p>
    
    <!-- Show rate -->
    <p class="text-sm text-gray-500" v-if="exchangeRate">
      Exchange rate: 1 USD = {{ exchangeRate }} {{ getCurrencyCode() }}
    </p>
  </div>
</template>
```

---

### Example 2: Invoice with Multiple Currencies

**Scenario**: Invoice can be in any currency, show in tenant currency.

```vue
<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const props = defineProps({
  invoice: Object // { amount: 500, currency: 'EUR' }
})

const { 
  convertCurrency, 
  formatCurrency, 
  getCurrencyCode 
} = useCurrency()

// Convert to tenant currency
const convertedAmount = computed(async () => {
  if (props.invoice.currency === getCurrencyCode()) {
    return props.invoice.amount
  }
  
  return await convertCurrency(
    props.invoice.amount,
    props.invoice.currency
  )
})

const displayAmount = computed(async () => {
  const converted = await convertedAmount.value
  return formatCurrency(converted)
})
</script>

<template>
  <div class="invoice">
    <h3>Invoice #{{ invoice.id }}</h3>
    
    <!-- Original amount -->
    <div class="text-sm text-gray-500">
      Original: {{ invoice.amount }} {{ invoice.currency }}
    </div>
    
    <!-- Converted amount -->
    <div class="text-xl font-bold">
      Your Currency: {{ displayAmount }}
    </div>
  </div>
</template>
```

---

### Example 3: Real-time Price Comparison

**Scenario**: Compare prices from different vendors in different currencies.

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { convertCurrency, formatCurrency } = useCurrency()

const vendors = ref([
  { name: 'Vendor A', price: 100, currency: 'USD' },
  { name: 'Vendor B', price: 90, currency: 'EUR' },
  { name: 'Vendor C', price: 1500000, currency: 'IDR' }
])

const convertedPrices = ref([])

onMounted(async () => {
  // Convert all prices to tenant currency
  const promises = vendors.value.map(async (vendor) => {
    const converted = await convertCurrency(vendor.price, vendor.currency)
    return {
      ...vendor,
      convertedPrice: converted,
      displayPrice: formatCurrency(converted)
    }
  })
  
  convertedPrices.value = await Promise.all(promises)
  
  // Sort by price
  convertedPrices.value.sort((a, b) => a.convertedPrice - b.convertedPrice)
})
</script>

<template>
  <div class="price-comparison">
    <h3>Best Price Comparison</h3>
    
    <div v-for="vendor in convertedPrices" :key="vendor.name" class="vendor">
      <span class="name">{{ vendor.name }}</span>
      <span class="original">{{ vendor.price }} {{ vendor.currency }}</span>
      <span class="converted">{{ vendor.displayPrice }}</span>
      
      <!-- Best deal badge -->
      <span v-if="vendor === convertedPrices[0]" class="badge badge-success">
        Best Deal!
      </span>
    </div>
  </div>
</template>
```

---

### Example 4: Payment Gateway Integration

**Scenario**: Payment gateway requires USD, tenant uses IDR.

```vue
<script setup>
import { ref } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { convertCurrency, getCurrencyCode } = useCurrency()

const orderTotal = ref(1500000) // IDR
const paymentCurrency = 'USD' // Gateway requires USD

const processPayment = async () => {
  try {
    // Convert to USD for gateway
    const amountUSD = await convertCurrency(
      orderTotal.value,
      getCurrencyCode(),
      paymentCurrency
    )
    
    console.log(`Charging: ${amountUSD} USD`)
    
    // Send to payment gateway
    const result = await paymentGateway.charge({
      amount: amountUSD,
      currency: paymentCurrency
    })
    
    return result
  } catch (error) {
    console.error('Payment failed:', error)
  }
}
</script>

<template>
  <div>
    <p>Order Total: {{ formatCurrency(orderTotal) }}</p>
    <button @click="processPayment">Pay Now</button>
  </div>
</template>
```

---

### Example 5: Budget Tracker (Multi-Currency)

**Scenario**: User has expenses in multiple currencies, show total in tenant currency.

```vue
<script setup>
import { ref, computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { convertCurrency, formatCurrency } = useCurrency()

const expenses = ref([
  { description: 'Software License', amount: 99, currency: 'USD' },
  { description: 'Server Hosting', amount: 50, currency: 'EUR' },
  { description: 'Marketing', amount: 2000000, currency: 'IDR' }
])

// Calculate total in tenant currency
const totalInTenantCurrency = computed(async () => {
  let total = 0
  
  for (const expense of expenses.value) {
    const converted = await convertCurrency(expense.amount, expense.currency)
    total += converted
  }
  
  return total
})

const displayTotal = computed(async () => {
  const total = await totalInTenantCurrency.value
  return formatCurrency(total)
})
</script>

<template>
  <div class="budget-tracker">
    <h3>Monthly Expenses</h3>
    
    <div v-for="expense in expenses" :key="expense.description">
      <span>{{ expense.description }}</span>
      <span>{{ expense.amount }} {{ expense.currency }}</span>
    </div>
    
    <div class="divider"></div>
    
    <div class="total">
      <span>Total (Your Currency):</span>
      <span class="font-bold text-xl">{{ displayTotal }}</span>
    </div>
  </div>
</template>
```

---

## 🎯 Integration with Existing Components

### Update PlanFormModal to Show Converted Prices

```vue
<!-- src/components/subscription/PlanFormModal.vue -->
<script setup>
import { ref, watch } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { 
  getCurrencyLabel, 
  formatCurrencyWithConversion,
  getExchangeRate 
} = useCurrency()

const props = defineProps({
  plan: Object
})

const planPrice = ref(props.plan?.price)
const planCurrency = ref('USD') // Assume plans are in USD
const convertedPrice = ref(null)
const exchangeRate = ref(null)

// Watch for plan changes
watch(() => props.plan, async (newPlan) => {
  if (newPlan?.price) {
    // Convert to tenant currency
    convertedPrice.value = await formatCurrencyWithConversion(
      newPlan.price,
      planCurrency.value
    )
    
    exchangeRate.value = await getExchangeRate(planCurrency.value)
  }
}, { immediate: true })
</script>

<template>
  <div>
    <!-- Price input -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">{{ getCurrencyLabel('Price') }}</span>
      </label>
      <input v-model.number="planPrice" type="number" class="input" />
      
      <!-- Show converted price -->
      <div v-if="convertedPrice && planCurrency !== getCurrencyCode()" class="label">
        <span class="label-text-alt">
          ≈ {{ convertedPrice }} ({{ getCurrencyCode() }})
        </span>
      </div>
    </div>
  </div>
</template>
```

---

### Update Invoice List to Show Converted Amounts

```vue
<!-- src/components/billing/InvoiceList.vue -->
<script setup>
import { computed } from 'vue'
import { useCurrency } from '@/composables/useCurrency'

const { 
  convertCurrency, 
  formatCurrency,
  getCurrencyCode 
} = useCurrency()

const props = defineProps({
  invoices: Array
})

// Convert each invoice to tenant currency
const convertedInvoices = computed(async () => {
  const promises = props.invoices.map(async (invoice) => {
    let displayAmount = invoice.amount
    
    // Convert if different currency
    if (invoice.currency !== getCurrencyCode()) {
      displayAmount = await convertCurrency(invoice.amount, invoice.currency)
    }
    
    return {
      ...invoice,
      originalAmount: invoice.amount,
      originalCurrency: invoice.currency,
      displayAmount: displayAmount,
      formattedAmount: formatCurrency(displayAmount)
    }
  })
  
  return await Promise.all(promises)
})
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Original Amount</th>
        <th>Your Currency</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="invoice in convertedInvoices" :key="invoice.id">
        <td>{{ invoice.id }}</td>
        <td class="text-gray-500">
          {{ invoice.originalAmount }} {{ invoice.originalCurrency }}
        </td>
        <td class="font-bold">
          {{ invoice.formattedAmount }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

---

## 📌 Best Practices

### 1. Prefetch Rates on App Load
```javascript
// In App.vue or main layout
import { useCurrency } from '@/composables/useCurrency'

onMounted(async () => {
  const { fetchExchangeRates } = useCurrency()
  
  // Prefetch rates for common conversions
  try {
    await fetchExchangeRates('USD') // Most plans are in USD
    console.log('Exchange rates preloaded')
  } catch (error) {
    console.warn('Failed to prefetch rates:', error)
  }
})
```

### 2. Handle Errors Gracefully
```javascript
const displayPrice = async (amount, currency) => {
  try {
    return await formatCurrencyWithConversion(amount, currency)
  } catch (error) {
    // Fallback: show original with note
    return `${amount} ${currency} (conversion unavailable)`
  }
}
```

### 3. Show Loading States
```vue
<template>
  <div>
    <span v-if="ratesLoading">Loading price...</span>
    <span v-else-if="convertedPrice">{{ convertedPrice }}</span>
    <span v-else>Price unavailable</span>
  </div>
</template>
```

### 4. Cache Strategy
```javascript
// Clear cache when tenant changes currency settings
watch(() => tenantSettings.currency, () => {
  const { clearRatesCache } = useCurrency()
  clearRatesCache()
})
```

---

## 🧪 Testing

```javascript
import { useCurrency } from '@/composables/useCurrency'

describe('Currency Conversion', () => {
  it('should convert USD to IDR', async () => {
    const { convertCurrency } = useCurrency()
    
    const result = await convertCurrency(100, 'USD', 'IDR')
    
    expect(result).toBeGreaterThan(1000000) // ~15x rate
  })
  
  it('should cache rates', async () => {
    const { fetchExchangeRates, hasCachedRates } = useCurrency()
    
    await fetchExchangeRates('USD')
    
    expect(hasCachedRates('USD')).toBe(true)
  })
  
  it('should handle same currency', async () => {
    const { convertCurrency } = useCurrency()
    
    const result = await convertCurrency(100, 'USD', 'USD')
    
    expect(result).toBe(100) // No conversion
  })
})
```

---

**Happy Converting!** 💱
