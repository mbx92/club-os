<script setup>
/**
 * DMemberFormModal — Full create/edit member form modal with photo upload, personal data, membership,
 * tier selector, package selector, payment method, and notes.
 *
 * Props:
 * - visible: boolean — open/close modal
 * - title: string — modal title (e.g., "Tambah Anggota Baru" or "Edit Anggota")
 * - member: object|null — initial data for edit mode
 * - loading: boolean — submitting
 * - tiers: Array<{ value, label }> — membership tier options
 * - packages: Array<{ value, label, price }> — package options
 * - paymentMethods: Array<{ value, label }>
 *
 * Events: @submit, @close, @update:visible
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: 'Tambah Anggota' },
  member: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  tiers: { type: Array, default: () => [
    { value: 'bronze', label: 'Bronze' },
    { value: 'silver', label: 'Silver' },
    { value: 'gold', label: 'Gold' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'vip', label: 'VIP' },
  ]},
  packages: { type: Array, default: () => [
    { value: 'basic', label: 'Basic', price: 250000 },
    { value: 'premium', label: 'Premium', price: 500000 },
    { value: 'ultimate', label: 'Ultimate', price: 1000000 },
  ]},
  paymentMethods: { type: Array, default: () => [
    { value: 'cash', label: 'Tunai' },
    { value: 'midtrans', label: 'Midtrans' },
    { value: 'xendit', label: 'Xendit' },
    { value: 'transfer', label: 'Transfer Bank' },
    { value: 'qris', label: 'QRIS' },
  ]},
})

const emit = defineEmits(['submit', 'close', 'update:visible'])

import { ref, reactive, watch, computed } from 'vue'
import { useFormatIDR } from '../../composables/useFormatIDR.js'

const { format } = useFormatIDR()

const currentStep = ref(0)
const stepLabels = ['Data Pribadi', 'Keanggotaan', 'Pembayaran']

const form = reactive({
  photo: '',
  name: '',
  phone: '',
  email: '',
  gender: '',
  birthDate: '',
  address: '',
  tier: 'bronze',
  package: '',
  startDate: new Date().toISOString().slice(0, 10),
  durationMonths: 12,
  paymentMethod: 'cash',
  notes: '',
})

const selectedPackage = computed(() => {
  return props.packages.find((p) => p.value === form.package)
})

const totalAmount = computed(() => {
  const pkg = selectedPackage.value
  if (!pkg) return 0
  return pkg.price * form.durationMonths
})

// Populate for edit mode
watch(() => props.member, (val) => {
  if (val) {
    Object.keys(form).forEach((key) => {
      if (val[key] !== undefined) form[key] = val[key]
    })
  }
}, { immediate: true })

watch(() => props.visible, (val) => {
  if (val) currentStep.value = 0
})

function close() {
  emit('update:visible', false)
  emit('close')
}

function nextStep() {
  if (currentStep.value < stepLabels.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function handleSubmit() {
  emit('submit', { ...form })
}

function handlePhotoUpload(e) {
  const file = e.target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (ev) => { form.photo = ev.target.result }
    reader.readAsDataURL(file)
  }
}
</script>

<template>
  <!-- Modal backdrop -->
  <Transition name="fade">
    <div v-if="visible" class="modal modal-open" @click.self="close">
      <div class="modal-box max-w-2xl w-full p-0 overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b border-base-200">
          <div>
            <h2 class="text-lg font-bold">{{ title }}</h2>
            <p class="text-xs text-base-content/40 mt-0.5">Lengkapin semua informasi anggota.</p>
          </div>
          <button class="btn btn-ghost btn-sm btn-circle" @click="close">
            <span class="i-tabler-x size-5" />
          </button>
        </div>

        <!-- Steps -->
        <div class="px-5 pt-4">
          <DStepIndicator
            :steps="stepLabels.map(l => ({ label: l }))"
            :current-step="currentStep"
            size="sm"
          />
        </div>

        <!-- Form body -->
        <div class="p-5 max-h-[55vh] overflow-y-auto">
          <!-- Step 1: Personal Data -->
          <div v-if="currentStep === 0" class="space-y-4">
            <!-- Photo -->
            <div class="flex items-center gap-4">
              <DAvatar
                :src="form.photo"
                :name="form.name || 'Nama'"
                size="xl"
              />
              <div>
                <p class="text-sm font-semibold">Foto Profil</p>
                <label class="btn btn-sm btn-outline mt-1.5 cursor-pointer">
                  <span class="i-tabler-upload size-3.5" />
                  Upload
                  <input type="file" accept="image/*" class="hidden" @change="handlePhotoUpload" />
                </label>
              </div>
            </div>

            <DDivider />

            <div class="grid grid-cols-2 gap-4">
              <DInput v-model="form.name" label="Nama Lengkap" placeholder="Nama anggota" />
              <DInput v-model="form.phone" label="No. Telepon" type="tel" placeholder="0812-xxxx-xxxx" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <DInput v-model="form.email" label="Email" type="email" placeholder="email@contoh.com" />
              <div>
                <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Jenis Kelamin</span></label>
                <div class="flex gap-4 mt-1">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="form.gender" type="radio" value="male" class="radio radio-sm radio-primary" />
                    <span class="text-sm">Pria</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="form.gender" type="radio" value="female" class="radio radio-sm radio-primary" />
                    <span class="text-sm">Wanita</span>
                  </label>
                </div>
              </div>
            </div>

            <DInput v-model="form.birthDate" label="Tanggal Lahir" type="date" />
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Alamat</span></label>
              <textarea v-model="form.address" class="textarea textarea-bordered text-sm h-20" placeholder="Alamat lengkap" />
            </div>
          </div>

          <!-- Step 2: Membership -->
          <div v-if="currentStep === 1" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Tier Keanggotaan</span></label>
                <select v-model="form.tier" class="select select-bordered w-full text-sm">
                  <option v-for="tier in tiers" :key="tier.value" :value="tier.value">{{ tier.label }}</option>
                </select>
              </div>
              <DInput v-model="form.startDate" label="Tanggal Mulai" type="date" />
            </div>

            <div>
              <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Paket</span></label>
              <div class="grid grid-cols-1 gap-2">
                <label
                  v-for="pkg in packages"
                  :key="pkg.value"
                  :class="[
                    'flex items-center p-3 rounded-xl border cursor-pointer transition-colors',
                    form.package === pkg.value
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-base-400',
                  ]"
                >
                  <input v-model="form.package" type="radio" :value="pkg.value" class="radio radio-sm radio-primary mr-3" />
                  <div class="flex-1">
                    <p class="text-sm font-semibold">{{ pkg.label }}</p>
                    <p class="text-xs text-base-content/50">{{ format(pkg.price) }} / bulan</p>
                  </div>
                </label>
              </div>
            </div>

            <DInput v-model="form.durationMonths" label="Durasi (bulan)" type="number" />
          </div>

          <!-- Step 3: Payment -->
          <div v-if="currentStep === 2" class="space-y-4">
            <!-- Summary -->
            <div class="rounded-xl border border-base-300 bg-base-200/50 p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-base-content/60">Paket</span>
                <span class="font-semibold">{{ selectedPackage?.label || '—' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-base-content/60">Durasi</span>
                <span class="font-semibold">{{ form.durationMonths }} bulan</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-base-content/60">Harga / bulan</span>
                <span class="font-semibold">{{ format(selectedPackage?.price || 0) }}</span>
              </div>
              <DDivider />
              <div class="flex justify-between text-base">
                <span class="font-bold">Total</span>
                <span class="font-bold font-mono">{{ format(totalAmount) }}</span>
              </div>
            </div>

            <div>
              <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Metode Pembayaran</span></label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="pm in paymentMethods"
                  :key="pm.value"
                  :class="[
                    'flex items-center p-3 rounded-xl border cursor-pointer transition-colors',
                    form.paymentMethod === pm.value
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-base-400',
                  ]"
                >
                  <input v-model="form.paymentMethod" type="radio" :value="pm.value" class="radio radio-sm radio-primary mr-2.5" />
                  <span class="text-sm">{{ pm.label }}</span>
                </label>
              </div>
            </div>

            <div class="form-control">
              <label class="label py-1"><span class="label-text font-medium text-xs uppercase tracking-wide opacity-70">Catatan</span></label>
              <textarea v-model="form.notes" class="textarea textarea-bordered text-sm h-20" placeholder="Catatan tambahan (opsional)" />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between p-5 border-t border-base-200">
          <button
            v-if="currentStep > 0"
            class="btn btn-ghost btn-sm"
            @click="prevStep"
          >
            <span class="i-tabler-chevron-left size-4" />
            Sebelumnya
          </button>
          <div v-else />

          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" @click="close">Batal</button>
            <button
              v-if="currentStep < stepLabels.length - 1"
              class="btn btn-primary btn-sm"
              @click="nextStep"
            >
              Selanjutnya
              <span class="i-tabler-chevron-right size-4" />
            </button>
            <DButton
              v-else
              variant="gold"
              size="sm"
              :loading="loading"
              :disabled="loading"
              @click="handleSubmit"
            >
              Simpan Anggota
              <span class="i-tabler-check size-4" />
            </DButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
