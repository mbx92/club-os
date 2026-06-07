<route lang="yaml">
path: /member/dashboard
name: member.dashboard
meta:
  title: Dashboard Member
  layout: member
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMembers } from '@/composables/gym/member-management/useMembers'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices'
import { useApi } from '@/composables/core/useApi'

// Icons
import {
  IconId,
  IconMail,
  IconPhone,
  IconCalendar,
  IconClock,
  IconBarbell,
  IconCrown,
  IconStar,
  IconRefresh,
  IconUserCircle,
  IconLicense,
  IconSparkles,
  IconChevronRight,
  IconAlertTriangle,
} from '@tabler/icons-vue'

const auth = useAuthStore()
const { getMemberById, formatMemberName } = useMembers()
const { getServicesByMember, formatCurrency, formatDate, getStatusLabel, getStatusBadgeClass } = useActiveServices()
const api = useApi()

const loading = ref(true)
const member = ref(null)
const memberServices = ref(null)
const error = ref(null)

// ─── Computed ───

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Selamat Pagi'
  if (h < 15) return 'Selamat Siang'
  if (h < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const today = computed(() =>
  new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
)

const memberName = computed(() => formatMemberName(member.value))

const membershipPlan = computed(() => {
  if (!memberServices.value?.services) return null
  return memberServices.value.services.find(s => s.serviceType === 'membership' && s.status === 'active')
})

const activeServicePlans = computed(() => {
  if (!memberServices.value?.services) return []
  return memberServices.value.services.filter(s => s.serviceType !== 'membership' && s.status === 'active')
})

const expiringServices = computed(() => {
  if (!memberServices.value?.services) return []
  return memberServices.value.services.filter(s => s.status === 'expiring_soon' || s.isExpiringSoon)
})

const expiredServices = computed(() => {
  if (!memberServices.value?.services) return []
  return memberServices.value.services.filter(s => s.status === 'expired' || s.status === 'depleted')
})

const summary = computed(() => memberServices.value?.summary || { totalServices: 0, activeCount: 0 })

const serviceTypeLabel = (type) => {
  const map = {
    membership: 'Membership',
    class_package: 'Class Package',
    pt_package: 'Personal Training',
    spa_package: 'Spa Package',
    custom: 'Custom',
  }
  return map[type] || type
}

const serviceTypeIcon = (type) => {
  const map = {
    membership: IconCrown,
    class_package: IconSparkles,
    pt_package: IconBarbell,
    spa_package: IconStar,
    custom: IconLicense,
  }
  return map[type] || IconLicense
}

const daysLeftClass = (days) => {
  if (!days && days !== 0) return ''
  if (days <= 0) return 'text-error'
  if (days <= 7) return 'text-warning'
  if (days <= 30) return 'text-info'
  return 'text-success'
}

// ─── Init ───

onMounted(async () => {
  await init()
})

async function init() {
  loading.value = true
  error.value = null
  try {
    // Try to find the member record for this user
    const memberId = auth.user?.memberId
    if (memberId) {
      member.value = await getMemberById(memberId)
    } else {
      // Search by email as fallback
      const email = auth.user?.email
      if (email) {
        try {
          const searchRes = await api.get(`/gym/members?search=${encodeURIComponent(email)}&limit=1`)
          if (searchRes?.data?.length > 0) {
            member.value = searchRes.data[0]
          }
        } catch {
          // silent — member record may not exist yet
        }
      }
    }

    if (member.value?.id) {
      memberServices.value = await getServicesByMember(member.value.id)
    }
  } catch (err) {
    error.value = err?.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

async function refresh() {
  if (!member.value?.id) return
  try {
    member.value = await getMemberById(member.value.id)
    memberServices.value = await getServicesByMember(member.value.id)
  } catch {}
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
    <!-- ── Hero Welcome ── -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-charcoal via-brand-charcoal to-gym p-6 text-brand-white shadow-xl md:p-8">
      <div class="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-brand-gold/10 blur-3xl"></div>
      <div class="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-gym/15 blur-2xl"></div>
      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm tracking-widest uppercase text-brand-gold-light/70">Club OS</p>
          <h1 class="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
            {{ greeting }}, {{ memberName || auth.user?.name || auth.user?.username || 'Member' }}
          </h1>
          <p class="mt-2 flex items-center gap-2 text-sm text-white/50">
            <IconCalendar class="size-4" />
            {{ today }}
          </p>
        </div>
        <button
          class="btn btn-ghost btn-sm gap-2 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
          @click="refresh"
          :disabled="loading"
        >
          <IconRefresh class="size-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-4">
      <span class="loading loading-ring loading-lg text-primary"></span>
      <span class="text-sm text-base-content/40">Memuat data membership…</span>
    </div>

    <!-- ── Error ── -->
    <div v-else-if="error" class="alert alert-error">
      <IconAlertTriangle class="size-5 shrink-0" />
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-ghost" @click="init">Coba Lagi</button>
    </div>

    <!-- ── No member record ── -->
    <div v-else-if="!member" class="card bg-base-100 shadow">
      <div class="card-body items-center text-center py-12">
        <IconUserCircle class="size-16 text-base-content/20" />
        <h3 class="text-lg font-bold mt-4">Data Member Belum Tersedia</h3>
        <p class="text-sm text-base-content/50 max-w-md">
          Akun Anda belum terhubung dengan data member. Silakan hubungi staf gym untuk bantuan.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- ── Quick Stats ── -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="stat stat-compact rounded-xl bg-base-100 shadow-sm p-4">
          <div class="stat-title text-xs">ID Member</div>
          <div class="stat-value text-base">{{ member.id?.substring(0, 8) }}…</div>
        </div>
        <div class="stat stat-compact rounded-xl bg-base-100 shadow-sm p-4">
          <div class="stat-title text-xs">Status</div>
          <div class="stat-value text-base capitalize">{{ member.membershipStatus || '—' }}</div>
        </div>
        <div class="stat stat-compact rounded-xl bg-base-100 shadow-sm p-4">
          <div class="stat-title text-xs">Total Service</div>
          <div class="stat-value text-base">{{ summary.totalServices }}</div>
        </div>
        <div class="stat stat-compact rounded-xl bg-base-100 shadow-sm p-4">
          <div class="stat-title text-xs">Service Aktif</div>
          <div class="stat-value text-base text-success">{{ summary.activeCount }}</div>
        </div>
      </div>

      <!-- ── Membership Plan ── -->
      <div v-if="membershipPlan" class="relative overflow-hidden rounded-xl bg-gradient-to-br from-gym/10 to-gym/5 border border-gym/20 p-5 shadow-sm">
        <div class="absolute top-0 right-0 p-3">
          <IconCrown class="size-10 text-gym/15" />
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span class="badge badge-success gap-1">
            <span class="size-1.5 rounded-full bg-success-content"></span>
            Aktif
          </span>
          <span class="text-xs font-semibold tracking-widest uppercase text-gym">{{ serviceTypeLabel(membershipPlan.serviceType) }}</span>
        </div>
        <h3 class="text-lg font-bold">{{ membershipPlan.servicePlan?.name || 'Membership Plan' }}</h3>
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p class="text-base-content/40">Mulai</p>
            <p class="font-semibold">{{ formatDate(membershipPlan.startDate) }}</p>
          </div>
          <div>
            <p class="text-base-content/40">Berakhir</p>
            <p class="font-semibold">{{ formatDate(membershipPlan.endDate) }}</p>
          </div>
          <div>
            <p class="text-base-content/40">Hari Tersisa</p>
            <p class="font-semibold" :class="daysLeftClass(membershipPlan.daysRemaining)">
              {{ membershipPlan.daysRemaining ?? '—' }} hari
            </p>
          </div>
          <div v-if="membershipPlan.pricePaid">
            <p class="text-base-content/40">Harga</p>
            <p class="font-semibold">{{ formatCurrency(membershipPlan.pricePaid) }}</p>
          </div>
        </div>
      </div>

      <!-- Empty membership -->
      <div v-else class="card bg-base-100 border border-warning/30 shadow-sm">
        <div class="card-body items-center text-center py-8">
          <IconAlertTriangle class="size-10 text-warning/60" />
          <h3 class="text-base font-bold mt-2">Belum Ada Membership Aktif</h3>
          <p class="text-sm text-base-content/50">
            Anda belum memiliki paket membership yang aktif. Kunjungi gym untuk mendaftar atau perpanjang membership Anda.
          </p>
        </div>
      </div>

      <!-- ── Active Service Plans ── -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">Service Plans Aktif</h2>
          <span class="text-xs text-base-content/40">{{ activeServicePlans.length }} paket</span>
        </div>

        <div v-if="activeServicePlans.length === 0" class="card bg-base-100 shadow-sm">
          <div class="card-body items-center text-center py-10">
            <IconBarbell class="size-10 text-base-content/15" />
            <p class="text-sm text-base-content/50 mt-3">Belum ada paket layanan tambahan yang aktif.</p>
          </div>
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="svc in activeServicePlans"
            :key="svc.id"
            class="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
          >
            <div class="card-body p-5">
              <div class="flex items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <component :is="serviceTypeIcon(svc.serviceType)" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold tracking-wider uppercase text-base-content/40">{{ serviceTypeLabel(svc.serviceType) }}</p>
                  <h4 class="font-bold truncate">{{ svc.servicePlan?.name || 'Service Plan' }}</h4>
                </div>
                <span class="badge badge-sm" :class="getStatusBadgeClass(svc.status)">{{ getStatusLabel(svc.status) }}</span>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="text-base-content/40">Mulai</span>
                  <p class="font-semibold">{{ formatDate(svc.startDate) }}</p>
                </div>
                <div>
                  <span class="text-base-content/40">Berakhir</span>
                  <p class="font-semibold">{{ formatDate(svc.endDate) }}</p>
                </div>

                <!-- Session-based info -->
                <div v-if="svc.totalSessions != null">
                  <span class="text-base-content/40">Sesi Tersisa</span>
                  <p class="font-semibold" :class="{ 'text-warning': svc.hasLowSessions }">
                    {{ svc.remainingSessions ?? 0 }} / {{ svc.totalSessions }}
                  </p>
                </div>
                <div v-else>
                  <span class="text-base-content/40">Hari Tersisa</span>
                  <p class="font-semibold" :class="daysLeftClass(svc.daysRemaining)">
                    {{ svc.daysRemaining ?? '—' }} hari
                  </p>
                </div>

                <!-- Trainer -->
                <div v-if="svc.assignedTrainer?.name" class="col-span-2">
                  <span class="text-base-content/40">Trainer</span>
                  <p class="font-semibold">{{ svc.assignedTrainer.name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Expiring Soon ── -->
      <div v-if="expiringServices.length > 0">
        <h2 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span class="size-2 rounded-full bg-warning"></span>
          Akan Segera Berakhir
        </h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="svc in expiringServices"
            :key="svc.id"
            class="card bg-warning/5 border border-warning/20 shadow-sm"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-xs text-base-content/40">{{ serviceTypeLabel(svc.serviceType) }}</p>
                  <p class="font-semibold truncate">{{ svc.servicePlan?.name || 'Service Plan' }}</p>
                </div>
                <span class="badge badge-sm badge-warning">Expiring Soon</span>
              </div>
              <div class="mt-2 flex gap-4 text-xs">
                <span>Berakhir {{ formatDate(svc.endDate) }}</span>
                <span v-if="svc.daysRemaining != null" :class="daysLeftClass(svc.daysRemaining)">{{ svc.daysRemaining }} hari</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Expired ── -->
      <div v-if="expiredServices.length > 0">
        <details class="group">
          <summary class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-base-content/50 hover:text-base-content/70 list-none">
            <span class="text-xs">Riwayat Service ({{ expiredServices.length }})</span>
            <IconChevronRight class="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="svc in expiredServices"
              :key="svc.id"
              class="card bg-base-100 border border-base-200 opacity-60 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-base-content/40">{{ serviceTypeLabel(svc.serviceType) }}</p>
                    <p class="font-semibold truncate">{{ svc.servicePlan?.name || 'Service Plan' }}</p>
                  </div>
                  <span class="badge badge-sm" :class="getStatusBadgeClass(svc.status)">{{ getStatusLabel(svc.status) }}</span>
                </div>
                <div class="mt-2 flex gap-4 text-xs">
                  <span>{{ formatDate(svc.startDate) }} – {{ formatDate(svc.endDate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </template>
  </div>
</template>
