# Module Access Control - Usage Guide

## Overview
Composable `useModuleAccess` membantu mendeteksi error `MODULE_NOT_AVAILABLE` dan secara otomatis:
- **Disable buttons** pada halaman yang ter-lock
- **Hide navigation menu items** untuk module yang tidak tersedia
- **Bypass untuk Super Admin**

---

## 📦 Installation

Composable sudah tersedia di:
```
src/composables/core/useModuleAccess.js
```

---

## 🎯 Use Cases

### 1. **Disable Buttons pada Halaman ketika Module Not Available**

```vue
<template>
  <div class="page-container">
    <!-- Alert jika module locked -->
    <div v-if="isModuleLocked" class="alert alert-warning mb-4">
      <IconLock class="w-5 h-5" />
      <span>Module "{{ lockedModule }}" tidak tersedia di plan Anda</span>
      <button @click="subscriptionStore.showUpgradeModal({ type: 'module', module: lockedModule })" 
              class="btn btn-sm btn-primary">
        Upgrade Plan
      </button>
    </div>

    <!-- Buttons akan auto-disabled jika module locked -->
    <div class="actions">
      <button 
        class="btn btn-primary"
        :class="disabledClass"
        v-bind="disabledAttrs"
        @click="handleCreate">
        Create New
      </button>
      
      <button 
        class="btn btn-secondary"
        :disabled="isButtonDisabled"
        @click="handleEdit">
        Edit
      </button>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Your page content -->
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useModuleAccess } from '@/composables/core/useModuleAccess'
import { useSubscriptionStore } from '@/stores/subscription'
import { useApi } from '@/composables/core/useApi'

const api = useApi()
const subscriptionStore = useSubscriptionStore()

const {
  isModuleLocked,
  lockedModule,
  isButtonDisabled,
  disabledClass,
  disabledAttrs,
  handleModuleError,
  hasModuleAccess
} = useModuleAccess()

// Check module access on mount
onMounted(async () => {
  // Option 1: Check module access proactively
  if (!hasModuleAccess('pos')) {
    setModuleLocked('pos')
  }
  
  // Option 2: Try to fetch data and catch error
  try {
    const response = await api.get('/pos/transactions')
    // Handle success
  } catch (error) {
    // This will set isModuleLocked = true if error is MODULE_NOT_AVAILABLE
    handleModuleError(error)
  }
})

const handleCreate = () => {
  if (isButtonDisabled.value) return
  // Your create logic
}
</script>
```

---

### 2. **Hide Navigation Menu untuk Module yang Tidak Tersedia**

```vue
<template>
  <nav class="navigation">
    <!-- Dashboard - always visible -->
    <router-link to="/dashboard" class="nav-item">
      <IconDashboard />
      <span>Dashboard</span>
    </router-link>

    <!-- POS Module - hide if not available -->
    <router-link 
      v-if="hasModuleAccess('pos')" 
      to="/pos" 
      class="nav-item">
      <IconCash />
      <span>POS</span>
    </router-link>

    <!-- Restaurant Module - hide if not available -->
    <router-link 
      v-if="hasModuleAccess('restaurant')" 
      to="/restaurant" 
      class="nav-item">
      <IconChefHat />
      <span>Restaurant</span>
    </router-link>

    <!-- Gym Module - hide if not available -->
    <router-link 
      v-if="hasModuleAccess('gym')" 
      to="/gym" 
      class="nav-item">
      <IconBarbell />
      <span>Gym</span>
    </router-link>
    
    <!-- Show locked indicator with upgrade button -->
    <div v-if="!hasModuleAccess('pos')" class="nav-item-locked">
      <IconLock class="w-4 h-4" />
      <span class="text-sm opacity-70">POS Module</span>
      <button 
        @click="showUpgrade('pos')" 
        class="btn btn-xs btn-ghost">
        Unlock
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useModuleAccess } from '@/composables/core/useModuleAccess'
import { useSubscriptionStore } from '@/stores/subscription'

const { hasModuleAccess } = useModuleAccess()
const subscriptionStore = useSubscriptionStore()

const showUpgrade = (moduleName) => {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: moduleName
  })
}
</script>
```

---

### 3. **Component-Level Protection**

```vue
<template>
  <div class="feature-section">
    <!-- Combined Billing Feature -->
    <button 
      v-if="hasFeatureAccess('transactions', 'combinedBilling')"
      class="btn btn-primary"
      @click="handleCombinedBilling">
      Combined Billing
    </button>
    
    <!-- Advanced Reports Feature -->
    <div v-if="hasFeatureAccess('reports', 'advanced')">
      <AdvancedReports />
    </div>
  </div>
</template>

<script setup>
import { useModuleAccess } from '@/composables/core/useModuleAccess'

const { hasFeatureAccess } = useModuleAccess()
</script>
```

---

### 4. **Handle Error dari API Call**

```vue
<script setup>
import { ref } from 'vue'
import { useModuleAccess } from '@/composables/core/useModuleAccess'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

const api = useApi()
const { handleModuleError, isButtonDisabled } = useModuleAccess()
const { handleError } = useNotification()

const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const response = await api.get('/pos/transactions')
    // Handle success
    return response.data
  } catch (error) {
    // Check if it's MODULE_NOT_AVAILABLE error
    const isModuleError = handleModuleError(error)
    
    if (isModuleError) {
      // Error modal already shown by API interceptor
      // Buttons are now disabled automatically
      console.log('Module not available')
    } else {
      // Handle other errors
      handleError(error, 'Failed to fetch data')
    }
  } finally {
    loading.value = false
  }
}
</script>
```

---

### 5. **Complete Page Example**

```vue
<template>
  <div class="container mx-auto p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold">POS Transactions</h1>
      <p class="text-gray-600">Manage your point of sale transactions</p>
    </div>

    <!-- Module Locked Alert -->
    <div v-if="isModuleLocked" class="alert alert-warning shadow-lg mb-6">
      <div>
        <IconLock class="w-6 h-6" />
        <div>
          <h3 class="font-bold">Module Not Available</h3>
          <div class="text-sm">
            The "{{ lockedModule }}" module is not included in your current plan.
          </div>
        </div>
      </div>
      <div class="flex-none">
        <button 
          @click="handleUpgrade" 
          class="btn btn-sm btn-primary">
          Upgrade Plan
        </button>
      </div>
    </div>

    <!-- Action Buttons - Auto disabled when locked -->
    <div class="flex gap-3 mb-6">
      <button 
        class="btn btn-primary"
        :class="disabledClass"
        v-bind="disabledAttrs"
        @click="handleCreate">
        <IconPlus class="w-5 h-5" />
        New Transaction
      </button>
      
      <button 
        class="btn btn-secondary"
        :disabled="isButtonDisabled"
        @click="handleExport">
        <IconDownload class="w-5 h-5" />
        Export
      </button>
    </div>

    <!-- Data Table -->
    <div v-if="!isModuleLocked" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Your data table here -->
      </div>
    </div>
    
    <!-- Locked State -->
    <div v-else class="card bg-base-200 shadow-xl">
      <div class="card-body items-center text-center py-12">
        <IconLock class="w-16 h-16 mb-4 opacity-50" />
        <h2 class="card-title">Module Locked</h2>
        <p class="text-gray-600 mb-4">
          Upgrade your plan to access POS features
        </p>
        <button @click="handleUpgrade" class="btn btn-primary">
          View Plans
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useModuleAccess } from '@/composables/core/useModuleAccess'
import { useSubscriptionStore } from '@/stores/subscription'
import { useApi } from '@/composables/core/useApi'
import { IconLock, IconPlus, IconDownload } from '@tabler/icons-vue'

const api = useApi()
const subscriptionStore = useSubscriptionStore()

const {
  isModuleLocked,
  lockedModule,
  isButtonDisabled,
  disabledClass,
  disabledAttrs,
  handleModuleError,
  hasModuleAccess,
  setModuleLocked
} = useModuleAccess()

const loading = ref(false)
const transactions = ref([])

onMounted(async () => {
  // Check access before making API call
  if (!hasModuleAccess('pos')) {
    setModuleLocked('pos')
    return
  }
  
  await loadTransactions()
})

const loadTransactions = async () => {
  loading.value = true
  try {
    const response = await api.get('/pos/transactions')
    transactions.value = response.data
  } catch (error) {
    // Auto-disable buttons if MODULE_NOT_AVAILABLE
    const isModuleError = handleModuleError(error)
    if (!isModuleError) {
      console.error('Failed to load transactions:', error)
    }
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  if (isButtonDisabled.value) return
  // Your create logic
  console.log('Creating new transaction...')
}

const handleExport = () => {
  if (isButtonDisabled.value) return
  // Your export logic
  console.log('Exporting transactions...')
}

const handleUpgrade = () => {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: lockedModule.value || 'pos'
  })
}
</script>
```

---

## 🔑 API Reference

### State
- `isModuleLocked`: Boolean - true jika module tidak tersedia
- `lockedModule`: String - nama module yang ter-lock
- `errorCode`: String - error code (MODULE_NOT_AVAILABLE atau FEATURE_NOT_AVAILABLE)
- `isSuperAdmin`: Boolean - true jika user adalah super admin (bypass all locks)

### Computed
- `isButtonDisabled`: Boolean - gunakan untuk disable buttons
- `shouldHideNavigation`: Boolean - gunakan untuk hide navigation items
- `disabledClass`: String - class untuk styling disabled button
- `disabledAttrs`: Object - attributes untuk disabled button (disabled, aria-disabled)

### Methods
- `hasModuleAccess(moduleName)`: Check if module is available
- `hasFeatureAccess(category, featureName)`: Check if feature is available
- `setModuleLocked(moduleName, code)`: Manually lock module
- `clearLocked()`: Clear locked state
- `handleModuleError(error)`: Handle API error and auto-lock if MODULE_NOT_AVAILABLE

---

## 🎨 Styling

Tambahkan global styles untuk locked elements:

```css
/* In your global CSS */
.nav-item-locked {
  @apply flex items-center gap-2 px-4 py-2 text-gray-400 bg-gray-100 rounded-lg;
}

.btn-disabled {
  @apply opacity-50 cursor-not-allowed pointer-events-none;
}
```

---

## ✅ Best Practices

1. **Check Access Proactively**
   ```js
   // Check before making API call
   if (!hasModuleAccess('pos')) {
     setModuleLocked('pos')
     return
   }
   ```

2. **Hide vs Disable**
   - **Hide**: Navigation menu items (gunakan `v-if="hasModuleAccess('module')"`)
   - **Disable**: Action buttons pada halaman (gunakan `:disabled="isButtonDisabled"`)

3. **Super Admin Bypass**
   - Super admin otomatis bypass semua module locks
   - Tidak perlu manual check di component

4. **Error Handling**
   - Gunakan `handleModuleError(error)` untuk auto-detect MODULE_NOT_AVAILABLE
   - API interceptor sudah auto-show modal upgrade

5. **User Experience**
   - Show alert/banner ketika module locked
   - Provide "Upgrade" button untuk redirect ke billing
   - Disable buttons instead of hiding untuk better UX awareness

---

## 🔗 Related

- `src/stores/subscription.js` - Subscription state management
- `src/directives/featureLock.js` - Directive untuk lock UI elements
- `src/plugins/api.js` - API client dengan auto error handling
- `src/components/shared/UpgradeModal.vue` - Modal untuk upgrade prompt

---

**Last Updated**: November 26, 2025
