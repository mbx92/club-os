<template>
  <div class="flex min-h-[55vh] items-center justify-center py-6">
    <div class="w-full max-w-xl">
      <div class="card border border-base-300/70 bg-base-100 shadow-md">
        <div class="card-body items-center p-6 text-center md:p-8">
          <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-error/10">
            <IconShieldLock class="h-10 w-10 text-error" stroke-width="1.5" />
          </div>

          <div class="badge badge-error badge-outline mb-3 gap-1.5 px-3 py-2 text-xs font-semibold">
            <IconLock class="h-3.5 w-3.5" />
            403 — Akses Ditolak
          </div>

          <h2 class="text-2xl font-bold text-base-content">
            Anda Tidak Memiliki Akses
          </h2>

          <p class="mt-2 text-sm text-base-content/70 md:text-base">
            {{ displayMessage }}
          </p>

          <div
            v-if="resolvedFrom"
            class="mt-5 w-full rounded-lg border border-base-300 bg-base-200/50 p-3 text-left"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Halaman / resource yang diakses
            </p>
            <p class="mt-1 break-all font-mono text-xs text-base-content/80 md:text-sm">
              {{ resolvedFrom }}
            </p>
          </div>

          <div v-if="authStore.user" class="alert alert-warning mt-5 w-full py-3">
            <IconUser class="h-5 w-5 shrink-0" />
            <div class="text-left">
              <p class="text-sm font-semibold">{{ authStore.user.name }}</p>
              <p v-if="userRoleLabel" class="text-xs opacity-80">
                Role: <span class="font-medium">{{ userRoleLabel }}</span>
              </p>
            </div>
          </div>

          <p class="mt-4 text-xs text-base-content/60">
            Hubungi administrator jika Anda merasa ini sebuah kesalahan.
          </p>

          <div class="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <button type="button" class="btn btn-outline flex-1 gap-2" @click="goBack">
              <IconArrowLeft class="h-4 w-4" />
              Kembali
            </button>
            <RouterLink :to="dashboardPath" class="btn btn-primary flex-1 gap-2">
              <IconHome class="h-4 w-4" />
              Ke Dashboard
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconHome,
  IconLock,
  IconShieldLock,
  IconUser,
} from '@tabler/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'

const props = defineProps({
  from: { type: String, default: '' },
  reason: { type: String, default: '' },
  message: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const REASON_MESSAGES = {
  permission: 'Role Anda tidak memiliki izin untuk mengakses halaman atau fitur ini.',
  role: 'Halaman ini dibatasi untuk role tertentu.',
  api: 'Permintaan ditolak karena Anda tidak memiliki izin yang diperlukan.',
}

const resolvedFrom = computed(() => {
  if (props.from) return props.from
  const from = route.query.from
  return typeof from === 'string' && from.length > 0 ? from : null
})

const displayMessage = computed(() => {
  if (props.message?.trim()) return props.message.trim()

  const custom = route.query.message
  if (typeof custom === 'string' && custom.trim()) return custom.trim()

  const reason = props.reason || route.query.reason
  if (typeof reason === 'string' && REASON_MESSAGES[reason]) {
    return REASON_MESSAGES[reason]
  }

  return 'Area ini dibatasi hanya untuk pengguna yang memiliki izin.'
})

const userRoleLabel = computed(() => {
  const role = authStore.user?.role
  if (!role) return null
  return typeof role === 'string' ? role : role.name
})

const dashboardPath = computed(() => {
  if (authStore.user?.isSuperAdmin) return '/'

  const roleName = userRoleLabel.value?.toLowerCase()
  if (roleName === 'member') return '/member/dashboard'
  if (roleName === 'kasir' || roleName === 'cashier') return '/restaurant/pos/floor-plan-pos'

  const modules = subscriptionStore.features?.modules || {}
  if (modules.gym) return '/'
  if (modules.restaurant) return '/restaurant'
  return '/'
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push(dashboardPath.value)
  }
}
</script>
