<script setup>
/**
 * DCheckInWidget — Gym check-in widget with member search, info display, check-in button, recent list, and stats.
 *
 * Props:
 * - checkInStatus: 'idle' | 'loading' | 'found' | 'notFound' | 'checkingIn' | 'success' | 'error'
 * - memberData: { id, name, photo, tier, membershipType, expiryDate, lastCheckIn? }
 * - recentCheckIns: Array<{ id, photo, name, tier, checkInTime }>
 * - todayStats: { totalVisits, activeNow }
 * - error: string
 *
 * Events: @search, @check-in, @reset
 */
const props = defineProps({
  checkInStatus: {
    type: String,
    default: 'idle',
    validator: (v) => ['idle', 'loading', 'found', 'notFound', 'checkingIn', 'success', 'error'].includes(v),
  },
  memberData: {
    type: Object,
    default: () => ({ id: '', name: '', photo: '', tier: '', membershipType: '', expiryDate: '', lastCheckIn: '' }),
  },
  recentCheckIns: { type: Array, default: () => [] },
  todayStats: {
    type: Object,
    default: () => ({ totalVisits: 0, activeNow: 0 }),
  },
  error: { type: String, default: '' },
})

const emit = defineEmits(['search', 'check-in', 'reset'])

import { ref } from 'vue'

const searchQuery = ref('')

function handleSearch() {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value.trim())
  }
}

function handleCheckIn() {
  emit('check-in', props.memberData.id)
}

function handleReset() {
  searchQuery.value = ''
  emit('reset')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search + Lookup area -->
    <div class="rounded-2xl border border-base-300 bg-base-100 p-5">
      <h3 class="text-lg font-bold flex items-center gap-2 mb-4">
        <span class="i-tabler-scan size-5 text-primary" />
        Check-In Anggota
      </h3>

      <!-- Idle state: Search input -->
      <div v-if="checkInStatus === 'idle' || checkInStatus === 'error'" class="space-y-3">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30">
              <span class="i-tabler-search size-4" />
            </span>
            <input
              v-model="searchQuery"
              type="text"
              class="input input-bordered w-full pl-10 pr-4"
              placeholder="Cari ID anggota atau scan QR..."
              @keydown.enter="handleSearch"
            />
          </div>
          <DButton variant="primary" icon-left="i-tabler-search" @click="handleSearch">
            Cari
          </DButton>
        </div>
        <DAlertBanner
          v-if="checkInStatus === 'error' && error"
          type="error"
          :message="error"
          dismissible
        />
      </div>

      <!-- Loading -->
      <div v-else-if="checkInStatus === 'loading'" class="flex items-center justify-center py-8">
        <DSpinner size="md" color="primary" label="Mencari anggota..." />
      </div>

      <!-- Found -->
      <div v-else-if="checkInStatus === 'found'" class="space-y-4">
        <div class="flex items-start gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
          <DAvatar :src="memberData.photo" :name="memberData.name" size="lg" :tier="memberData.tier" online />
          <div class="flex-1 min-w-0">
            <h4 class="text-lg font-bold">{{ memberData.name }}</h4>
            <p class="text-sm text-base-content/50">{{ memberData.id }}</p>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <DBadge :variant="memberData.tier || 'neutral'" size="xs">{{ memberData.tier?.toUpperCase() }}</DBadge>
              <DBadge variant="active" size="xs" outline>{{ memberData.membershipType || 'Member' }}</DBadge>
            </div>
            <div class="flex items-center gap-3 mt-2 text-xs text-base-content/50">
              <span class="flex items-center gap-1">
                <span class="i-tabler-calendar size-3" />
                Berlaku: {{ memberData.expiryDate || '—' }}
              </span>
              <span v-if="memberData.lastCheckIn" class="flex items-center gap-1">
                <span class="i-tabler-clock size-3" />
                Terakhir: {{ memberData.lastCheckIn }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <DButton variant="ghost" size="sm" icon-left="i-tabler-arrow-left" @click="handleReset">
            Kembali
          </DButton>
          <DButton variant="gold" size="md" icon-left="i-tabler-scan" class="flex-1" @click="handleCheckIn">
            Konfirmasi Check-In
          </DButton>
        </div>
      </div>

      <!-- Checking In -->
      <div v-else-if="checkInStatus === 'checkingIn'" class="flex items-center justify-center py-8">
        <DSpinner size="md" color="success" label="Memproses check-in..." />
      </div>

      <!-- Success -->
      <div v-else-if="checkInStatus === 'success'" class="space-y-4 text-center">
        <div class="py-6">
          <div class="size-16 rounded-full bg-success/10 mx-auto flex items-center justify-center text-success mb-3">
            <span class="i-tabler-circle-check size-10" />
          </div>
          <h4 class="text-xl font-bold text-success">Check-In Berhasil!</h4>
          <p class="text-sm text-base-content/50 mt-1">Selamat datang, {{ memberData.name }}</p>
        </div>
        <DButton variant="primary" size="md" icon-left="i-tabler-refresh" @click="handleReset">
          Check-In Anggota Lain
        </DButton>
      </div>

      <!-- Not Found -->
      <div v-else-if="checkInStatus === 'notFound'" class="text-center py-8 space-y-3">
        <div class="size-14 rounded-full bg-base-200 mx-auto flex items-center justify-center text-base-content/30">
          <span class="i-tabler-user-off size-7" />
        </div>
        <p class="text-base font-semibold text-base-content/60">Anggota tidak ditemukan</p>
        <p class="text-sm text-base-content/40">Periksa kembali ID atau scan QR.</p>
        <DButton variant="outline" size="sm" @click="handleReset">
          Coba Lagi
        </DButton>
      </div>
    </div>

    <!-- Today's Stats -->
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-base-300 bg-base-100 p-4">
        <p class="text-xs text-base-content/40 uppercase tracking-wider font-medium">Check-In Hari Ini</p>
        <p class="text-2xl font-bold font-mono mt-1">{{ todayStats.totalVisits }}</p>
      </div>
      <div class="rounded-2xl border border-base-300 bg-base-100 p-4">
        <p class="text-xs text-base-content/40 uppercase tracking-wider font-medium">Aktif Sekarang</p>
        <p class="text-2xl font-bold font-mono mt-1 text-success">{{ todayStats.activeNow }}</p>
      </div>
    </div>

    <!-- Recent Check-Ins -->
    <div class="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
      <div class="p-4 border-b border-base-200 flex items-center justify-between">
        <h3 class="text-sm font-bold flex items-center gap-2">
          <span class="i-tabler-history size-4 text-base-content/40" />
          Check-In Terbaru
        </h3>
        <span class="text-[0.65rem] text-base-content/30">{{ recentCheckIns.length }} anggota</span>
      </div>
      <div v-if="recentCheckIns.length" class="divide-y divide-base-200">
        <div
          v-for="(checkin, idx) in recentCheckIns.slice(0, 10)"
          :key="checkin.id || idx"
          class="flex items-center gap-3 p-3 hover:bg-base-200/50 transition-colors"
        >
          <DAvatar :src="checkin.photo" :name="checkin.name" size="xs" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ checkin.name }}</p>
            <p class="text-[0.65rem] text-base-content/40">{{ checkin.checkInTime || '' }}</p>
          </div>
          <DBadge :variant="checkin.tier || 'neutral'" size="xs" outline>
            {{ checkin.tier?.toUpperCase() }}
          </DBadge>
        </div>
      </div>
      <DEmptyState
        v-else
        icon="i-tabler-clock-off"
        title="Belum ada check-in"
        size="sm"
      />
    </div>
  </div>
</template>
