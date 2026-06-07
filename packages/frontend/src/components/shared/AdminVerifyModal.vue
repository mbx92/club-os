<template>
  <dialog ref="modalRef" class="modal">
    <div class="modal-box max-w-sm">
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="cancel">✕</button>
      </form>

      <div class="flex items-center gap-3 mb-1">
        <div class="bg-warning/10 rounded-xl p-2 text-warning">
          <IconShieldLock class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-lg">Admin Verification</h3>
      </div>
      <p class="text-sm text-base-content/60 mb-5">
        This action requires admin authorization. Please enter admin credentials to proceed.
      </p>

      <div class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Admin Email</span>
          </label>
          <input
            ref="emailInput"
            v-model="form.email"
            type="email"
            class="input input-bordered w-full"
            :class="{ 'input-error': errorMsg }"
            placeholder="admin@example.com"
            autocomplete="off"
            @keydown.enter="passwordInput?.focus()"
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">Password</span>
          </label>
          <div class="relative">
            <input
              ref="passwordInput"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="input input-bordered w-full pr-10"
              :class="{ 'input-error': errorMsg }"
              placeholder="••••••••"
              autocomplete="off"
              @keydown.enter="handleVerify"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-3 flex items-center text-base-content/40 hover:text-base-content"
              tabindex="-1"
              @click="showPassword = !showPassword"
            >
              <IconEye v-if="!showPassword" class="w-4 h-4" />
              <IconEyeOff v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="alert alert-error py-2 px-3 text-sm">
          {{ errorMsg }}
        </div>
      </div>

      <div class="modal-action mt-5">
        <button class="btn btn-ghost" :disabled="loading" @click="cancel">Cancel</button>
        <button
          class="btn btn-warning"
          :disabled="!form.email || !form.password || loading"
          @click="handleVerify"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Verify & Proceed</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="cancel">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { IconShieldLock, IconEye, IconEyeOff } from '@tabler/icons-vue'

const authStore = useAuthStore()

const modalRef = ref(null)
const emailInput = ref(null)
const passwordInput = ref(null)

const form = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

// Resolve/reject for the open() promise
let resolveFn = null

const ADMIN_ROLES = ['admin', 'Admin', 'ADMIN', 'manager', 'Manager', 'MANAGER', 'superadmin']

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const handleVerify = async () => {
  if (!form.value.email || !form.value.password) return
  errorMsg.value = ''
  loading.value = true

  try {
    // Use native fetch to bypass the ApiService interceptor entirely.
    // The interceptor calls removeToken() on a 401 /auth/login response,
    // which would destroy the current cashier session.
    const tenantDomain = authStore.user?.tenant?.domain || undefined
    const payload = { email: form.value.email, password: form.value.password }
    if (tenantDomain) payload.tenantDomain = tenantDomain

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      errorMsg.value = data?.message || 'Invalid credentials'
      loading.value = false
      return
    }

    const role = data?.user?.role || data?.data?.user?.role || ''
    if (!ADMIN_ROLES.includes(role)) {
      errorMsg.value = 'The provided account does not have admin privileges.'
      loading.value = false
      return
    }

    // Success — close and resolve WITHOUT touching current session tokens
    modalRef.value?.close()
    resolveFn?.(true)
    resolveFn = null
  } catch (err) {
    errorMsg.value = err?.message || 'Connection error. Please try again.'
  } finally {
    loading.value = false
  }
}

const cancel = () => {
  modalRef.value?.close()
  resolveFn?.(false)
  resolveFn = null
}

/**
 * Open the modal and return a Promise<boolean>.
 * Resolves true if admin verified, false if cancelled.
 */
const open = () => {
  form.value = { email: '', password: '' }
  showPassword.value = false
  errorMsg.value = ''
  loading.value = false
  modalRef.value?.showModal()
  setTimeout(() => emailInput.value?.focus(), 50)

  return new Promise((resolve) => {
    resolveFn = resolve
  })
}

defineExpose({ open })
</script>
