import { computed, ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useAuthStore } from '@/stores/auth'
import {
  banksToOptions,
  buildDefaultBanks,
  normalizeBankKey,
} from '@/utils/paymentBanks'

const normalizeCatalog = (banks) =>
  (banks || []).map((bank) => ({
    ...bank,
    key: normalizeBankKey(bank.key || bank.value),
    label: String(bank.label || bank.key || bank.value || '').trim(),
    enabled: bank.enabled !== false,
    isSystem: bank.isSystem === true,
  }))

const cachedBanks = ref(null)
let loadPromise = null

const readBanksFromAuth = (authStore) => {
  const settings = authStore.user?.tenant?.settings
  const transaction = settings?.transaction || settings?.transactions
  const banks = transaction?.payment?.banks

  if (Array.isArray(banks) && banks.length > 0) {
    return normalizeCatalog(banks)
  }

  return null
}

/**
 * Tenant transaction settings control which banks appear in POS/billing dropdowns.
 */
export function usePaymentBanks() {
  const api = useApi()
  const authStore = useAuthStore()

  const configuredBanks = computed(() => {
    const fromAuth = readBanksFromAuth(authStore)
    if (fromAuth) return fromAuth

    if (cachedBanks.value?.length) {
      return cachedBanks.value
    }

    return buildDefaultBanks()
  })

  const enabledBanks = computed(() =>
    configuredBanks.value.filter((bank) => bank.enabled !== false)
  )

  const bankOptions = computed(() => banksToOptions(enabledBanks.value))

  const applyBanks = (banks) => {
    if (!Array.isArray(banks) || banks.length === 0) return
    cachedBanks.value = normalizeCatalog(banks)

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
            banks: cachedBanks.value,
          },
        },
      }

      const storage = localStorage.getItem('user') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(authStore.user))
    }
  }

  const loadBanks = async (force = false) => {
    if (!force && readBanksFromAuth(authStore)) {
      return configuredBanks.value
    }

    if (loadPromise && !force) {
      await loadPromise
      return configuredBanks.value
    }

    loadPromise = (async () => {
      try {
        const response = await api.get('/transaction-settings/payment')
        const payload = response.data || response
        const banks = payload.banks || payload.data?.banks

        if (Array.isArray(banks) && banks.length > 0) {
          applyBanks(banks)
        }
      } catch {
        // Keep fallback defaults when API is unavailable
      } finally {
        loadPromise = null
      }
    })()

    await loadPromise
    return configuredBanks.value
  }

  return {
    configuredBanks,
    enabledBanks,
    bankOptions,
    loadBanks,
    applyBanks,
  }
}
