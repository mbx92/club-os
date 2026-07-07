import { computed, ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useAuthStore } from '@/stores/auth'
import {
  buildDefaultPaymentMethods,
  getPaymentLabel,
  normalizePaymentMethodKey,
  resolvePaymentMethodLabel,
} from '@/utils/paymentMethods'

const normalizeCatalog = (methods) =>
  (methods || []).map((method) => ({
    ...method,
    key: normalizePaymentMethodKey(method.key),
  }))

const cachedPaymentMethods = ref(null)
let loadPromise = null

const readPaymentMethodsFromAuth = (authStore) => {
  const settings = authStore.user?.tenant?.settings
  const transaction = settings?.transaction || settings?.transactions
  const methods = transaction?.payment?.paymentMethods

  if (Array.isArray(methods) && methods.length > 0) {
    return normalizeCatalog(methods)
  }

  return null
}

/**
 * Tenant transaction settings control which payment methods appear in POS/billing.
 */
export function usePaymentMethods() {
  const api = useApi()
  const authStore = useAuthStore()

  const configuredPaymentMethods = computed(() => {
    const fromAuth = readPaymentMethodsFromAuth(authStore)
    if (fromAuth) return fromAuth

    if (cachedPaymentMethods.value?.length) {
      return cachedPaymentMethods.value
    }

    return buildDefaultPaymentMethods()
  })

  const enabledPaymentMethods = computed(() =>
    configuredPaymentMethods.value.filter((method) => method.enabled !== false)
  )

  const availableMethods = computed(() =>
    enabledPaymentMethods.value.map((method) => method.key)
  )

  const paymentOptions = computed(() =>
    enabledPaymentMethods.value.map((method) => ({
      value: method.key,
      label: method.label || getPaymentLabel(method.key),
      requiresBank: method.requiresBank === true,
      isSystem: method.isSystem !== false,
    }))
  )

  const defaultPaymentMethod = computed(() => {
    const cash = paymentOptions.value.find((option) => option.value === 'cash')
    return cash?.value || paymentOptions.value[0]?.value || 'cash'
  })

  const getMethodLabel = (key, locale = 'id') =>
    resolvePaymentMethodLabel(configuredPaymentMethods.value, key, locale)

  const isMethodEnabled = (key) =>
    availableMethods.value.includes(normalizePaymentMethodKey(key))

  const methodRequiresBank = (key) => {
    const normalized = normalizePaymentMethodKey(key)
    const method = enabledPaymentMethods.value.find((item) => item.key === normalized)
    return method?.requiresBank === true
  }

  const applyPaymentMethods = (methods) => {
    if (!Array.isArray(methods) || methods.length === 0) return
    cachedPaymentMethods.value = normalizeCatalog(methods)

    if (authStore.user?.tenant) {
      const settings = authStore.user.tenant.settings || {}
      const transaction = settings.transaction || settings.transactions || {}
      const payment = transaction.payment || {}

      authStore.user.tenant.settings = {
        ...settings,
        transaction: {
          ...transaction,
          payment: {
            ...payment,
            paymentMethods: cachedPaymentMethods.value,
          },
        },
      }

      const storage = localStorage.getItem('user') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(authStore.user))
    }
  }

  const loadPaymentMethods = async (force = false) => {
    if (!force && readPaymentMethodsFromAuth(authStore)) {
      return configuredPaymentMethods.value
    }

    if (loadPromise && !force) {
      await loadPromise
      return configuredPaymentMethods.value
    }

    loadPromise = (async () => {
      try {
        const response = await api.get('/transaction-settings/payment')
        const payload = response.data || response
        const methods = payload.paymentMethods || payload.data?.paymentMethods

        if (Array.isArray(methods) && methods.length > 0) {
          applyPaymentMethods(methods)
        }
      } catch {
        // Keep fallback defaults when API is unavailable
      } finally {
        loadPromise = null
      }
    })()

    await loadPromise
    return configuredPaymentMethods.value
  }

  return {
    configuredPaymentMethods,
    enabledPaymentMethods,
    availableMethods,
    paymentOptions,
    defaultPaymentMethod,
    getMethodLabel,
    isMethodEnabled,
    methodRequiresBank,
    loadPaymentMethods,
  }
}
