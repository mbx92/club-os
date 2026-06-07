# 🔒 Module Access Control Implementation

## Ringkasan

Sistem untuk mendeteksi error `MODULE_NOT_AVAILABLE` dan otomatis:
1. ✅ **Disable buttons** pada halaman
2. ✅ **Hide navigation menu** untuk module yang tidak tersedia
3. ✅ **Bypass untuk Super Admin**

---

## 📦 Files Created/Updated

### 1. **Composable** - `src/composables/core/useModuleAccess.js`
Composable utama untuk manage module access control

### 2. **Navigation** - `src/composables/core/useNavigation.js`
Updated untuk support module access filtering

### 3. **Navigation Config** - `src/navigation/navigation.js`
Updated dengan field `requireModule` untuk setiap menu item

### 4. **Documentation** - `docs/MODULE-ACCESS-CONTROL.md`
Complete usage guide dengan examples

### 5. **Example Component** - `docs/examples/TransactionTabWithModuleAccess.vue`
Contoh implementasi lengkap pada component

---

## 🎯 Quick Start

### Step 1: Import Composable

```vue
<script setup>
import { useModuleAccess } from '@/composables/core/useModuleAccess'

const {
  isModuleLocked,      // Boolean - true jika module locked
  lockedModule,        // String - nama module yang ter-lock
  isButtonDisabled,    // Boolean - untuk disable buttons
  disabledClass,       // String - CSS class untuk disabled state
  disabledAttrs,       // Object - HTML attributes (disabled, aria-disabled)
  handleModuleError,   // Function - handle API error
  hasModuleAccess,     // Function - check module access
  setModuleLocked      // Function - manually set locked state
} = useModuleAccess()
</script>
```

### Step 2: Check Module Access on Mount

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  // Option 1: Check proactively
  if (!hasModuleAccess('transactions')) {
    setModuleLocked('transactions')
    return
  }
  
  // Option 2: Load data and catch error
  try {
    await loadSettings()
  } catch (err) {
    handleModuleError(err) // Auto-lock if MODULE_NOT_AVAILABLE
  }
})
</script>
```

### Step 3: Disable Buttons

```vue
<template>
  <!-- Method 1: Using class and attrs -->
  <button
    class="btn btn-primary"
    :class="disabledClass"
    v-bind="disabledAttrs"
    @click="handleSave">
    Save
  </button>

  <!-- Method 2: Using isButtonDisabled -->
  <button
    class="btn btn-primary"
    :disabled="isButtonDisabled"
    @click="handleSave">
    Save
  </button>

  <!-- Method 3: Combined with other conditions -->
  <button
    class="btn btn-primary"
    :disabled="saving || !hasChanges || isButtonDisabled"
    @click="handleSave">
    {{ saving ? 'Saving...' : 'Save Changes' }}
  </button>
</template>
```

### Step 4: Show Alert When Locked

```vue
<template>
  <div v-if="isModuleLocked" class="alert alert-warning mb-4">
    <IconLock class="w-6 h-6" />
    <div>
      <h3 class="font-bold">Module Not Available</h3>
      <p>The "{{ lockedModule }}" module is not included in your plan.</p>
    </div>
    <button @click="handleUpgrade" class="btn btn-sm btn-primary">
      Upgrade Plan
    </button>
  </div>
</template>

<script setup>
import { useSubscriptionStore } from '@/stores/subscription'

const subscriptionStore = useSubscriptionStore()

const handleUpgrade = () => {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: lockedModule.value
  })
}
</script>
```

---

## 🗺️ Navigation Menu Auto-Hide

### Update Navigation Config

File: `src/navigation/navigation.js`

```javascript
export const navigation = [
  {
    label: "Dashboard",
    to: "/",
    icon: "layout-dashboard",
    // No requireModule - always visible
  },
  {
    label: "POS",
    to: "/pos",
    icon: "cash-register",
    requireModule: "pos", // Only show if 'pos' module available
  },
  {
    label: "Restaurant",
    to: "/restaurant",
    icon: "chef-hat",
    requireModule: "restaurant", // Only show if 'restaurant' module available
  },
  {
    label: "Gym",
    icon: "barbell",
    requireModule: "gym", // Parent requires gym module
    children: [
      {
        label: "Members",
        to: "/gym/members",
        icon: "users",
      },
      {
        label: "Classes",
        to: "/gym/classes",
        icon: "calendar",
      }
    ]
  }
]
```

### Navigation Component

File: `src/layouts/default.vue`

```vue
<template>
  <nav>
    <!-- Navigation items auto-filtered by module access -->
    <template v-for="item in navigation" :key="item.label">
      <!-- Parent menu -->
      <router-link
        v-if="!item.children"
        :to="item.to"
        class="nav-item">
        {{ item.label }}
      </router-link>

      <!-- Menu dengan children -->
      <div v-else class="nav-group">
        <span class="nav-group-title">{{ item.label }}</span>
        <router-link
          v-for="child in item.children"
          :key="child.to"
          :to="child.to"
          class="nav-item">
          {{ child.label }}
        </router-link>
      </div>
    </template>
  </nav>
</template>

<script setup>
import { useNavigation } from '@/composables/core/useNavigation'

// Navigation sudah auto-filtered berdasarkan module access
const { navigation } = useNavigation()
</script>
```

---

## 🔧 Complete Component Example

### Transaction Settings Page

```vue
<template>
  <div class="page-container">
    <!-- Module Locked Alert -->
    <div v-if="isModuleLocked" class="alert alert-warning mb-6">
      <IconLock class="w-6 h-6" />
      <div>
        <h3 class="font-bold">Module Not Available</h3>
        <p class="text-sm">
          The "{{ lockedModule }}" module is not included in your current plan.
        </p>
      </div>
      <button @click="handleUpgrade" class="btn btn-sm btn-primary">
        Upgrade Plan
      </button>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit">
      <!-- Form fields dengan disabled state -->
      <div class="form-control">
        <label class="label">Tax Enable</label>
        <input
          type="checkbox"
          v-model="form.taxEnable"
          class="toggle"
          :disabled="isButtonDisabled"
        />
      </div>

      <div class="form-control">
        <label class="label">Tax Percentage</label>
        <input
          type="number"
          v-model="form.taxPercentage"
          class="input input-bordered"
          :disabled="isButtonDisabled"
        />
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="isButtonDisabled"
          @click="resetForm">
          Reset
        </button>
        
        <button
          type="submit"
          class="btn btn-primary"
          :class="disabledClass"
          v-bind="disabledAttrs"
          :disabled="saving || !hasChanges || isButtonDisabled">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useModuleAccess } from '@/composables/core/useModuleAccess'
import { useSubscriptionStore } from '@/stores/subscription'
import { IconLock } from '@tabler/icons-vue'

const api = useApi()
const subscriptionStore = useSubscriptionStore()

// Module Access Control
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

const saving = ref(false)
const form = ref({
  taxEnable: false,
  taxPercentage: 0
})
const original = ref(null)

const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(original.value)
})

onMounted(async () => {
  // Check module access first
  if (!hasModuleAccess('transactions')) {
    setModuleLocked('transactions')
    return
  }

  await loadSettings()
})

const loadSettings = async () => {
  try {
    const response = await api.get('/tenants/settings')
    form.value = response.data.transaction
    original.value = JSON.parse(JSON.stringify(form.value))
  } catch (err) {
    // Auto-lock if MODULE_NOT_AVAILABLE
    handleModuleError(err)
  }
}

const handleSubmit = async () => {
  if (isButtonDisabled.value) return

  saving.value = true
  try {
    await api.patch('/tenants/settings', { transaction: form.value })
    original.value = JSON.parse(JSON.stringify(form.value))
  } catch (err) {
    handleModuleError(err)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  form.value = JSON.parse(JSON.stringify(original.value))
}

const handleUpgrade = () => {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: lockedModule.value
  })
}
</script>
```

---

## 🎨 Styling Tips

### DaisyUI Classes

```vue
<template>
  <!-- Disabled button styling -->
  <button
    class="btn btn-primary"
    :class="{ 'opacity-50 cursor-not-allowed': isButtonDisabled }"
    :disabled="isButtonDisabled">
    Save
  </button>

  <!-- Input with disabled state -->
  <input
    class="input input-bordered"
    :class="{ 'input-disabled bg-base-200': isButtonDisabled }"
    :disabled="isButtonDisabled"
  />

  <!-- Alert for locked state -->
  <div v-if="isModuleLocked" class="alert alert-warning">
    <IconLock />
    <span>Module not available</span>
  </div>
</template>
```

### Custom CSS

```css
/* Add to your global CSS */
.feature-locked {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-locked {
  @apply opacity-50 cursor-not-allowed;
}
```

---

## ✅ Testing Checklist

### Test Scenarios

1. **Super Admin User**
   - [ ] Semua menu navigation tampil
   - [ ] Semua button enabled
   - [ ] No module locked alerts

2. **User dengan Module Access**
   - [ ] Menu untuk module yang dimiliki tampil
   - [ ] Button enabled pada halaman yang accessible
   - [ ] No locked alerts pada module yang dimiliki

3. **User tanpa Module Access**
   - [ ] Menu untuk module yang tidak dimiliki HIDDEN
   - [ ] Button disabled pada halaman restricted
   - [ ] Alert "Module Not Available" muncul
   - [ ] Upgrade button berfungsi

4. **API Error MODULE_NOT_AVAILABLE**
   - [ ] `handleModuleError()` return true
   - [ ] `isModuleLocked` jadi true
   - [ ] `isButtonDisabled` jadi true
   - [ ] Alert muncul dengan module name yang benar

5. **Navigation Filtering**
   - [ ] Menu dengan `requireModule` auto-filtered
   - [ ] Parent menu dengan children ter-filter jika semua children hidden
   - [ ] No broken menu items

---

## 🐛 Common Issues & Solutions

### Issue 1: Button masih bisa diklik meskipun disabled

**Solution**: Pastikan menggunakan `@click` handler dengan check:

```vue
<button @click="handleSave">Save</button>

<script>
const handleSave = () => {
  if (isButtonDisabled.value) return // Guard clause
  // Save logic
}
</script>
```

### Issue 2: Navigation tidak ter-filter

**Solution**: Pastikan `requireModule` sudah di-set di `navigation.js`:

```javascript
{
  label: "POS",
  to: "/pos",
  requireModule: "pos" // Wajib ada
}
```

### Issue 3: Super admin masih terkena restriction

**Solution**: Check di composable sudah bypass super admin:

```javascript
const isSuperAdmin = computed(() => {
  return authStore.user?.isSuperAdmin === true
})

if (isSuperAdmin.value) return true // Bypass all checks
```

---

## 📚 API Reference

### useModuleAccess()

| Property | Type | Description |
|----------|------|-------------|
| `isModuleLocked` | `Ref<Boolean>` | True jika module tidak tersedia |
| `lockedModule` | `Ref<String>` | Nama module yang ter-lock |
| `errorCode` | `Ref<String>` | Error code (MODULE_NOT_AVAILABLE, dll) |
| `isSuperAdmin` | `ComputedRef<Boolean>` | True jika user super admin |
| `isButtonDisabled` | `ComputedRef<Boolean>` | Untuk disable buttons |
| `shouldHideNavigation` | `ComputedRef<Boolean>` | Untuk hide navigation |
| `disabledClass` | `ComputedRef<String>` | CSS class untuk disabled state |
| `disabledAttrs` | `ComputedRef<Object>` | HTML attributes (disabled, aria-disabled) |
| `hasModuleAccess(module)` | `Function` | Check if module available |
| `hasFeatureAccess(category, name)` | `Function` | Check if feature available |
| `setModuleLocked(module, code)` | `Function` | Manually lock module |
| `clearLocked()` | `Function` | Clear locked state |
| `handleModuleError(error)` | `Function` | Handle API error, return true if MODULE_NOT_AVAILABLE |

---

## 🔗 Related Files

- `src/composables/core/useModuleAccess.js` - Main composable
- `src/composables/core/useNavigation.js` - Navigation filtering
- `src/navigation/navigation.js` - Navigation config
- `src/stores/subscription.js` - Subscription state
- `src/plugins/api.js` - API client dengan error handling
- `src/directives/featureLock.js` - Alternative directive approach

---

## 📝 Summary

**Dengan implementasi ini:**

✅ Button otomatis disabled ketika error `MODULE_NOT_AVAILABLE`  
✅ Navigation menu otomatis hidden untuk module yang tidak tersedia  
✅ Super admin bypass semua restriction  
✅ User experience lebih baik dengan alert dan upgrade prompt  
✅ Clean code dengan reusable composable  
✅ Type-safe dengan clear API  

**Next Steps:**

1. Test dengan berbagai user roles
2. Add unit tests untuk composable
3. Add visual regression tests untuk UI states
4. Monitor error logs untuk MODULE_NOT_AVAILABLE occurrences

---

**Last Updated**: November 26, 2025  
**Version**: 1.0.0
