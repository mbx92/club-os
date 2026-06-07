<script setup>
/**
 * DesignSystemDemo — Full design system showcase page.
 * Renders every component in all variants/states, grouped by category.
 * Includes dark/light toggle and GYM/RESTAURANT module context toggle.
 */

import { ref, computed } from 'vue'
import { useTheme } from './composables/useTheme.js'

const { isDark, toggle: toggleTheme } = useTheme()
const activeModule = ref('gym')
const formDemo = ref({ text: '', email: '', password: '', select: 'option1', checkbox: false, toggle: false, radio: 'a' })
const modalVisible = ref(false)
const searchVal = ref('')

const demoTx = {
  id: 'TX-001', type: 'Membership Bulanan', amount: 500000, status: 'success',
  date: '06 Jun 2026', channel: 'midtrans',
}

const demoMenuItems = [
  { id: 1, name: 'Nasi Goreng Special', category: 'Makanan', price: 35000, calories: 520 },
  { id: 2, name: 'Smoothie Bowl', category: 'Minuman', price: 28000, calories: 180 },
  { id: 3, name: 'Chicken Steak', category: 'Makanan', price: 45000, calories: 680 },
  { id: 4, name: 'Matcha Latte', category: 'Minuman', price: 22000, calories: 120 },
  { id: 5, name: 'Panna Cotta', category: 'Dessert', price: 18000, calories: 250 },
  { id: 6, name: 'French Fries', category: 'Snack', price: 15000, calories: 310, soldOut: true },
]

const demoOrderItems = [
  { id: 'o1', item: { name: 'Nasi Goreng Special', price: 35000 }, qty: 2 },
  { id: 'o2', item: { name: 'Matcha Latte', price: 22000 }, qty: 1 },
]

const demoNav = [
  { label: 'Dashboard', icon: 'i-tabler-layout-dashboard', path: '#', active: true },
  { label: 'Anggota', icon: 'i-tabler-users', path: '#' },
  { label: 'Transaksi', icon: 'i-tabler-cash', path: '#' },
  { separator: true, label: 'MODULES' },
  {
    label: 'Gym', icon: 'i-tabler-dumbbell', active: true,
    children: [
      { label: 'Check-In', icon: 'i-tabler-scan', path: '#', badge: '3', badgeVariant: 'success' },
      { label: 'Member', icon: 'i-tabler-id', path: '#' },
    ],
  },
  {
    label: 'Restaurant', icon: 'i-tabler-tools-kitchen-2',
    children: [
      { label: 'POS', icon: 'i-tabler-device-laptop', path: '#' },
      { label: 'Orders', icon: 'i-tabler-clipboard-list', path: '#', badge: '5', badgeVariant: 'warning' },
    ],
  },
]

const demoUser = { name: 'Admin Dynasty', email: 'admin@dynasty.fit', photo: '', tier: 'gold' }

const tableCols = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Nama', sortable: true },
  { key: 'tier', label: 'Tier' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Tanggal', sortable: true },
]

const tableRows = [
  { id: 1, name: 'John Doe', tier: 'gold', status: 'active', date: '06 Jun 2026' },
  { id: 2, name: 'Jane Smith', tier: 'silver', status: 'expired', date: '01 Jun 2026' },
  { id: 3, name: 'Bob Wilson', tier: 'platinum', status: 'active', date: '03 Jun 2026' },
]

const codeSnippets = {
  button: `<DButton variant="primary" size="md">Primary</DButton>
<DButton variant="secondary" size="md">Secondary</DButton>
<DButton variant="gold" size="md" loading>Loading</DButton>`,
  badge: `<DBadge variant="active">Active</DBadge>
<DBadge variant="vip" dot>VIP</DBadge>`,
}
</script>

<template>
  <div class="min-h-screen" :data-theme="isDark ? 'dynasty-club-night' : 'dynasty-club'">
    <!-- Toolbar -->
    <div class="sticky top-0 z-50 bg-base-200/90 backdrop-blur border-b border-base-300 px-6 py-3 flex items-center gap-4">
      <h1 class="text-lg font-bold font-display tracking-wide">DYNASTY FITNESS</h1>
      <span class="text-sm text-base-content/40">Design System</span>
      <div class="flex-1" />
      <div class="flex gap-2">
        <button
          :class="['btn btn-sm', activeModule === 'gym' ? 'btn-primary' : 'btn-ghost']"
          @click="activeModule = 'gym'"
        >GYM</button>
        <button
          :class="['btn btn-sm', activeModule === 'restaurant' ? 'btn-primary' : 'btn-ghost']"
          @click="activeModule = 'restaurant'"
        >RESTAURANT</button>
      </div>
      <DButton variant="ghost" size="sm" icon-only :icon-left="isDark ? 'i-tabler-moon' : 'i-tabler-sun'" @click="toggleTheme" />
    </div>

    <div class="max-w-7xl mx-auto px-6 py-8 space-y-16">
      <!-- ════════════ ATOMS ════════════ -->
      <section>
        <h2 class="text-2xl font-bold mb-6 pb-2 border-b-2 border-base-300">ATOMS</h2>
        <div class="space-y-12">
          <!-- Button -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Button</h3>
            <p class="text-xs text-base-content/40 font-mono mb-3">{{ codeSnippets.button }}</p>
            <div class="flex flex-wrap gap-3 items-center p-4 rounded-xl bg-base-100 border border-base-200">
              <DButton variant="primary">Primary</DButton>
              <DButton variant="secondary">Secondary</DButton>
              <DButton variant="ghost">Ghost</DButton>
              <DButton variant="outline">Outline</DButton>
              <DButton variant="danger">Danger</DButton>
              <DButton variant="gold">Gold</DButton>
              <DButton variant="primary" loading>Loading</DButton>
              <DButton variant="primary" disabled>Disabled</DButton>
              <DButton variant="primary" size="sm">Small</DButton>
              <DButton variant="primary" size="lg">Large</DButton>
              <DButton variant="primary" icon-right="i-tabler-arrow-right">With Icon</DButton>
              <DButton variant="primary" icon-only icon-left="i-tabler-plus" />
              <DButton variant="ghost" pill>Pill</DButton>
            </div>
          </div>

          <!-- Badge -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Badge</h3>
            <div class="flex flex-wrap gap-2 items-center p-4 rounded-xl bg-base-100 border border-base-200">
              <DBadge variant="active">Active</DBadge>
              <DBadge variant="expired">Expired</DBadge>
              <DBadge variant="pending">Pending</DBadge>
              <DBadge variant="gym">GYM</DBadge>
              <DBadge variant="restaurant">Restaurant</DBadge>
              <DBadge variant="vip">VIP</DBadge>
              <DBadge variant="success">Success</DBadge>
              <DBadge variant="warning">Warning</DBadge>
              <DBadge variant="error">Error</DBadge>
              <DBadge variant="info">Info</DBadge>
              <DBadge variant="bronze">Bronze</DBadge>
              <DBadge variant="silver">Silver</DBadge>
              <DBadge variant="gold">Gold</DBadge>
              <DBadge variant="platinum">Platinum</DBadge>
              <DBadge variant="neutral" dot>Dot Style</DBadge>
              <DBadge variant="active" dot>Online</DBadge>
              <DBadge variant="active" outline>Outline</DBadge>
              <DBadge variant="neutral" closeable @close="() => {}">Closeable</DBadge>
            </div>
          </div>

          <!-- Avatar -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Avatar</h3>
            <div class="flex flex-wrap gap-4 items-end p-4 rounded-xl bg-base-100 border border-base-200">
              <DAvatar name="John Doe" size="xs" />
              <DAvatar name="John Doe" size="sm" />
              <DAvatar name="John Doe" size="md" online />
              <DAvatar name="John Doe" size="lg" tier="gold" />
              <DAvatar name="Jane Smith" size="xl" tier="platinum" online />
              <DAvatar name="" size="md" />
              <DAvatar name="Bob" size="md" rounded />
            </div>
          </div>

          <!-- Input -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Input</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-base-100 border border-base-200">
              <DInput v-model="formDemo.text" label="Text Input" placeholder="Masukkan teks" />
              <DInput v-model="formDemo.email" label="Email" type="email" placeholder="email@contoh.com" />
              <DInput v-model="formDemo.password" label="Password" type="password" />
              <DInput v-model="formDemo.text" label="Search" type="search" placeholder="Cari..." />
              <DInput v-model="formDemo.text" label="With Icon" placeholder="Prefix icon" prefix-icon="i-tabler-user" />
              <DInput v-model="formDemo.text" label="Error State" error="Field ini wajib diisi" />
            </div>
          </div>

          <!-- Select -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Select</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-base-100 border border-base-200">
              <DSelect
                v-model="formDemo.select"
                :options="[{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }, { value: 'option3', label: 'Option 3', group: 'Group A' }]"
                label="Basic Select"
                placeholder="Pilih..."
              />
              <DSelect
                v-model="formDemo.select"
                :options="[{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta', group: 'Greek' }, { value: 'g', label: 'Gamma', group: 'Greek' }]"
                label="Searchable + Groups"
                placeholder="Pilih..."
                searchable
              />
            </div>
          </div>

          <!-- Checkbox & Radio & Toggle -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Checkbox / Radio / Toggle</h3>
            <div class="flex flex-wrap gap-6 items-center p-4 rounded-xl bg-base-100 border border-base-200">
              <DCheckbox v-model="formDemo.checkbox" label="Saya setuju" />
              <DCheckbox :model-value="true" indeterminate label="Indeterminate" />
              <DCheckbox disabled label="Disabled" />
              <div class="flex gap-3">
                <DRadio v-model="formDemo.radio" value="a" label="Option A" name="demo" />
                <DRadio v-model="formDemo.radio" value="b" label="Option B" name="demo" />
              </div>
              <DToggle v-model="formDemo.toggle" label="Notifikasi" />
              <DToggle v-model="formDemo.toggle" label="Disabled" disabled />
              <DToggle :model-value="true" label="Success" color="success" />
            </div>
          </div>

          <!-- Tag -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Tag / Chip</h3>
            <div class="flex flex-wrap gap-2 items-center p-4 rounded-xl bg-base-100 border border-base-200">
              <DTag color="gym" label="Gym" />
              <DTag color="restaurant" label="Restaurant" />
              <DTag color="active" label="Active" />
              <DTag color="gold" label="Gold" />
              <DTag color="primary" label="Clickable" :clickable="true" @click="() => {}" />
              <DTag color="error" label="Removable" removable @remove="() => {}" />
              <DTag color="neutral" label="Neutral" />
              <DTag color="neutral" size="xs" label="XS" />
              <DTag color="neutral" size="lg" label="Large" />
            </div>
          </div>

          <!-- Skeleton -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Skeleton</h3>
            <div class="space-y-3 p-4 rounded-xl bg-base-100 border border-base-200 w-1/2">
              <DSkeleton variant="text" />
              <DSkeleton variant="avatar" size="lg" />
              <DSkeleton variant="card" />
              <DSkeleton variant="table" :repeat="3" />
            </div>
          </div>

          <!-- Spinner -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Spinner / Loader</h3>
            <div class="flex flex-wrap gap-6 items-end p-4 rounded-xl bg-base-100 border border-base-200">
              <DSpinner size="xs" color="primary" />
              <DSpinner size="sm" color="gold" />
              <DSpinner size="md" color="success" />
              <DSpinner size="lg" color="error" label="Memuat data..." />
              <DSpinner variant="dots" color="primary" />
              <DSpinner variant="ring" color="info" />
              <DSpinner variant="bars" color="warning" />
            </div>
          </div>

          <!-- Divider -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Divider</h3>
            <div class="space-y-4 p-4 rounded-xl bg-base-100 border border-base-200 max-w-md">
              <DDivider />
              <DDivider label="ATAU" />
              <div class="flex gap-4 items-center h-12">
                <span>Left</span>
                <DDivider direction="vertical" />
                <span>Right</span>
              </div>
            </div>
          </div>

          <!-- Tooltip -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Tooltip</h3>
            <div class="flex gap-4 items-center p-4 rounded-xl bg-base-100 border border-base-200">
              <DTooltip text="Helpful information" position="top"><span class="btn btn-sm">Top</span></DTooltip>
              <DTooltip text="Bottom tip" position="bottom"><span class="btn btn-sm">Bottom</span></DTooltip>
              <DTooltip text="Left tip" position="left"><span class="btn btn-sm">Left</span></DTooltip>
              <DTooltip text="Right tip" position="right"><span class="btn btn-sm">Right</span></DTooltip>
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════ MOLECULES ════════════ -->
      <section>
        <h2 class="text-2xl font-bold mb-6 pb-2 border-b-2 border-base-300">MOLECULES</h2>
        <div class="space-y-12">
          <!-- MemberCard -->
          <div>
            <h3 class="text-lg font-semibold mb-1">MemberCard</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DMemberCard
                :member="{ id: 'DYN-00123', name: 'John Doe', tier: 'gold', membershipType: 'Premium', expiryDate: '31 Dec 2026' }"
                status="active"
              />
              <DMemberCard
                :member="{ id: 'DYN-00456', name: 'Jane Smith', tier: 'silver', membershipType: 'Basic', expiryDate: '01 Jan 2025' }"
                status="expired"
                condensed
              />
            </div>
          </div>

          <!-- MembershipTierBadge -->
          <div>
            <h3 class="text-lg font-semibold mb-1">MembershipTierBadge</h3>
            <div class="flex flex-wrap gap-4 p-4 rounded-xl bg-base-100 border border-base-200">
              <DMembershipTierBadge tier="bronze" :points="500" show-progress />
              <DMembershipTierBadge tier="silver" :points="3500" show-progress />
              <DMembershipTierBadge tier="gold" :points="12000" show-progress />
              <DMembershipTierBadge tier="platinum" :points="25000" />
              <DMembershipTierBadge tier="vip" :points="75000" />
            </div>
          </div>

          <!-- StatCard -->
          <div>
            <h3 class="text-lg font-semibold mb-1">StatCard</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DStatCard label="Anggota Aktif" :value="1247" icon="i-tabler-users" :trend="12" trend-label="vs bulan lalu" color="primary" />
              <DStatCard label="Pendapatan" value="12.5" prefix="Rp" suffix="Jt" icon="i-tabler-cash" :trend="8" color="gold" />
              <DStatCard label="Check-In" :value="89" icon="i-tabler-scan" :trend="-3" color="gym" />
              <DStatCard label="Orders" :value="34" icon="i-tabler-tools-kitchen-2" :trend="15" color="restaurant" />
            </div>
          </div>

          <!-- MenuItemCard -->
          <div>
            <h3 class="text-lg font-semibold mb-1">MenuItemCard</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <DMenuItemCard
                v-for="item in demoMenuItems"
                :key="item.id"
                :item="item"
                :sold-out="item.soldOut"
                @add-to-cart="() => {}"
              />
            </div>
          </div>

          <!-- WorkoutPlanCard -->
          <div>
            <h3 class="text-lg font-semibold mb-1">WorkoutPlanCard</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DWorkoutPlanCard
                :plan="{ name: 'Bench Press', sets: 4, reps: 10, muscleGroup: 'Dada', difficulty: 'menengah' }"
              />
              <DWorkoutPlanCard
                :plan="{ name: 'Deadlift', sets: 3, reps: 8, muscleGroup: 'Punggung', difficulty: 'mahir', duration: '15 min' }"
                selected
              />
              <DWorkoutPlanCard
                :plan="{ name: 'Squat', sets: 5, reps: 5, muscleGroup: 'Kaki', difficulty: 'pemula', description: 'Pemanasan 5 menit, lalu 5 set squat dengan beban progresif.' }"
                compact
              />
            </div>
          </div>

          <!-- PaymentRow -->
          <div>
            <h3 class="text-lg font-semibold mb-1">PaymentRow</h3>
            <div class="space-y-2 max-w-lg">
              <DPaymentRow :transaction="demoTx" />
              <DPaymentRow :transaction="{ id: 'TX-002', type: 'Resto Order', amount: 125000, status: 'pending', date: '06 Jun 2026', channel: 'cash' }" compact />
            </div>
          </div>

          <!-- SearchBar -->
          <div>
            <h3 class="text-lg font-semibold mb-1">SearchBar</h3>
            <div class="max-w-xl p-4 rounded-xl bg-base-100 border border-base-200">
              <DSearchBar
                v-model="searchVal"
                placeholder="Cari anggota atau menu..."
                :filters="[{ key: 'all', label: 'Semua', active: true }, { key: 'gym', label: 'Gym', active: false }, { key: 'resto', label: 'Resto', active: false }]"
                show-filter-button
              />
            </div>
          </div>

          <!-- DateRangePicker -->
          <div>
            <h3 class="text-lg font-semibold mb-1">DateRangePicker</h3>
            <div class="max-w-sm p-4 rounded-xl bg-base-100 border border-base-200">
              <DDateRangePicker label="Rentang Tanggal" />
            </div>
          </div>

          <!-- PricingCard -->
          <div>
            <h3 class="text-lg font-semibold mb-1">PricingCard</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DPricingCard
                :plan="{ name: 'Basic', price: 250000, period: 'bulan', features: ['Akses gym', 'Locker', '1x PT / bulan'], ctaLabel: 'Pilih Basic' }"
                color="primary"
              />
              <DPricingCard
                :plan="{ name: 'Premium', price: 500000, period: 'bulan', features: ['Semua fitur Basic', 'Akses semua kelas', '4x PT / bulan', 'Akses sauna'], ctaLabel: 'Pilih Premium', popular: true }"
                color="gold"
                selected
              />
              <DPricingCard
                :plan="{ name: 'Ultimate', price: 1000000, period: 'bulan', features: ['Semua fitur Premium', 'Personal trainer', 'Akses VIP lounge', 'Parkir gratis'], ctaLabel: 'Pilih Ultimate' }"
                color="gym"
              />
            </div>
          </div>

          <!-- AlertBanner -->
          <div>
            <h3 class="text-lg font-semibold mb-1">AlertBanner</h3>
            <div class="space-y-3 max-w-2xl">
              <DAlertBanner type="success" message="Transaksi berhasil disimpan" dismissible />
              <DAlertBanner type="warning" message="Stok bahan baku menipis" description="3 item mendekati batas minimum." dismissible />
              <DAlertBanner type="error" message="Gagal memproses pembayaran" description="Silakan coba lagi atau gunakan metode lain." />
              <DAlertBanner type="info" message="Sistem akan maintenance" description="Minggu, 12 Juni 2026 pukul 02:00 - 04:00 WIB." />
            </div>
          </div>

          <!-- NotificationItem -->
          <div>
            <h3 class="text-lg font-semibold mb-1">NotificationItem</h3>
            <div class="space-y-2 max-w-md">
              <DNotificationItem
                :notification="{ id: 1, title: 'Pembayaran Diterima', description: 'Pembayaran membership dari John Doe senilai Rp 500.000 telah diterima.', time: '5 menit lalu', type: 'payment', read: false }"
              />
              <DNotificationItem
                :notification="{ id: 2, title: 'Check-In Anggota', description: 'Jane Smith melakukan check-in di Gym.', time: '1 jam lalu', type: 'checkin', read: true }"
              />
              <DNotificationItem
                :notification="{ id: 3, title: 'Pesanan Baru', description: 'Pesanan #ORD-089 masuk dari Restoran.', time: '2 jam lalu', type: 'order', read: false }"
              />
            </div>
          </div>

          <!-- ProgressBar -->
          <div>
            <h3 class="text-lg font-semibold mb-1">ProgressBar</h3>
            <div class="space-y-4 max-w-md p-4 rounded-xl bg-base-100 border border-base-200">
              <DProgressBar :value="75" label="Target Bulanan" color="primary" />
              <DProgressBar :value="45" label="Kapasitas Gym" color="gym" striped />
              <DProgressBar :value="90" label="Okupansi Resto" color="restaurant" show-percentage />
              <DProgressBar :value="30" label="Low Stock" color="warning" size="sm" />
              <DProgressBar :value="100" label="Completed" color="success" size="lg" />
            </div>
          </div>

          <!-- StepIndicator -->
          <div>
            <h3 class="text-lg font-semibold mb-1">StepIndicator</h3>
            <div class="space-y-8 p-4 rounded-xl bg-base-100 border border-base-200">
              <DStepIndicator
                :steps="[{ label: 'Data Pribadi' }, { label: 'Keanggotaan' }, { label: 'Pembayaran' }]"
                :current-step="1"
              />
              <DStepIndicator
                :steps="[{ label: 'Pilih Menu', description: 'Pilih item dari katalog' }, { label: 'Checkout', description: 'Review pesanan' }, { label: 'Bayar', description: 'Selesaikan transaksi' }]"
                :current-step="2"
                orientation="vertical"
              />
            </div>
          </div>

          <!-- EmptyState -->
          <div>
            <h3 class="text-lg font-semibold mb-1">EmptyState</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DEmptyState
                icon="i-tabler-inbox"
                title="Belum ada data"
                description="Data akan muncul setelah transaksi pertama."
              />
              <DEmptyState
                icon="i-tabler-users"
                title="Anggota kosong"
                description="Tambahkan anggota baru untuk memulai."
                action-label="Tambah Anggota"
                action-icon="i-tabler-user-plus"
              />
              <DEmptyState icon="i-tabler-tools-kitchen-2" title="Menu kosong" size="sm" />
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════ ORGANISMS ════════════ -->
      <section>
        <h2 class="text-2xl font-bold mb-6 pb-2 border-b-2 border-base-300">ORGANISMS</h2>
        <div class="space-y-12">
          <!-- Sidebar Nav -->
          <div>
            <h3 class="text-lg font-semibold mb-1">Sidebar Navigation</h3>
            <div class="flex h-[500px] rounded-xl overflow-hidden border border-base-300">
              <DSidebarNav
                :nav-items="demoNav"
                :bottom-links="[{ label: 'Bantuan', icon: 'i-tabler-help-circle', path: '#' }, { label: 'Pengaturan', icon: 'i-tabler-settings', path: '#' }]"
                :module-context="activeModule"
                :user-profile="demoUser"
                brand-name="Dynasty Fitness"
              />
              <div class="flex-1 bg-base-200 flex items-center justify-center text-base-content/20">
                <span class="text-lg">Main Content Area</span>
              </div>
            </div>
          </div>

          <!-- TopBar -->
          <div>
            <h3 class="text-lg font-semibold mb-1">TopBar / Header</h3>
            <div class="rounded-xl overflow-hidden border border-base-300">
              <DTopBar
                page-title="Dashboard"
                :breadcrumbs="[{ label: 'Home', path: '#' }, { label: 'Dashboard' }]"
                :notification-count="5"
                :user-profile="demoUser"
                :module-context="activeModule"
              />
            </div>
          </div>

          <!-- DataTable -->
          <div>
            <h3 class="text-lg font-semibold mb-1">DataTable</h3>
            <div class="p-4 rounded-xl bg-base-100 border border-base-200">
              <DDataTable
                :columns="tableCols"
                :rows="tableRows"
                :pagination="{ page: 1, perPage: 10, total: 3, perPageOptions: [5, 10, 25] }"
                sort-by="name"
                sort-dir="asc"
                selectable
                show-column-toggle
                :export-formats="['csv', 'excel']"
                :row-actions="[{ label: 'Edit', icon: 'i-tabler-edit', action: 'edit' }, { label: 'Hapus', icon: 'i-tabler-trash', action: 'delete', color: 'error' }]"
              >
                <template #cell-tier="{ value }">
                  <DBadge :variant="value" size="xs">{{ value?.toUpperCase() }}</DBadge>
                </template>
                <template #cell-status="{ value }">
                  <DBadge :variant="value === 'active' ? 'active' : 'expired'" size="xs">{{ value === 'active' ? 'Aktif' : 'Expired' }}</DBadge>
                </template>
              </DDataTable>
            </div>
          </div>

          <!-- MemberFormModal Trigger -->
          <div>
            <h3 class="text-lg font-semibold mb-1">MemberFormModal</h3>
            <div class="flex gap-2">
              <DButton variant="primary" @click="modalVisible = true">Buka Form Anggota</DButton>
            </div>
          </div>

          <!-- PointOfSalePanel -->
          <div>
            <h3 class="text-lg font-semibold mb-1">PointOfSalePanel (Restaurant)</h3>
            <div class="p-4 rounded-xl bg-base-100 border border-base-200">
              <DPointOfSalePanel
                :menu-items="demoMenuItems"
                :order-items="demoOrderItems"
                @add-item="() => {}"
                @remove-item="() => {}"
                @update-qty="() => {}"
                @checkout="() => {}"
              />
            </div>
          </div>

          <!-- CheckInWidget -->
          <div>
            <h3 class="text-lg font-semibold mb-1">CheckInWidget (Gym)</h3>
            <div class="max-w-md">
              <DCheckInWidget
                check-in-status="idle"
                :recent-check-ins="[{ id: 'c1', name: 'John Doe', tier: 'gold', checkInTime: '06 Jun 2026, 08:30' }]"
                :today-stats="{ totalVisits: 89, activeNow: 12 }"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="text-center py-8 text-xs text-base-content/30">
        Dynasty Fitness Design System v1.0 &middot; Built with Vue 3 + Tailwind CSS + DaisyUI
      </div>
    </div>

    <!-- MemberFormModal -->
    <DMemberFormModal
      :visible="modalVisible"
      title="Tambah Anggota Baru"
      @close="modalVisible = false"
      @update:visible="(v) => modalVisible = v"
      @submit="() => { modalVisible = false }"
    />
  </div>
</template>

<style>
.font-display {
  font-family: 'Bebas Neue', Impact, sans-serif;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}
</style>
