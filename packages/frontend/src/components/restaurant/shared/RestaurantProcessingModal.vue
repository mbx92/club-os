<script setup>
/**
 * RestaurantProcessingModal
 *
 * Menampilkan modal loading animasi bertahap saat transaksi resto diproses.
 * Tidak memerlukan perubahan backend — langkah disimulasikan di frontend
 * berdasarkan data yang dikirim (voucher, metode pembayaran, dll).
 *
 * Props:
 *   show         – boolean, apakah modal ditampilkan
 *   steps        – string[], daftar label langkah yang akan ditampilkan secara berurutan
 *   currentStep  – number, indeks langkah yang sedang aktif (0-based)
 *   error        – string|null, pesan error jika ada
 *
 * Events:
 *   close-error  – ketika user klik "Tutup" pada state error
 */
defineProps({
  show: { type: Boolean, default: false },
  steps: { type: Array, default: () => [] },
  currentStep: { type: Number, default: 0 },
  error: { type: String, default: null },
})

defineEmits(['close-error'])
</script>

<template>
  <Teleport to="body">
    <dialog :class="['modal', { 'modal-open': show }]">
      <div class="modal-box max-w-sm flex flex-col items-center text-center gap-5 py-10 px-8">

        <!-- ── Error state ── -->
        <template v-if="error">
          <div class="text-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-bold text-lg text-error">Transaksi Gagal</h3>
          <p class="text-base-content/60 text-sm">{{ error }}</p>
          <button class="btn btn-error btn-sm" @click="$emit('close-error')">Tutup</button>
        </template>

        <!-- ── Loading state ── -->
        <template v-else>
          <!-- Spinner -->
          <span class="loading loading-spinner loading-lg text-primary"></span>

          <!-- Title -->
          <h3 class="font-bold text-lg">Mohon Tunggu</h3>

          <!-- Steps list -->
          <ul v-if="steps.length" class="w-full space-y-2 text-left mt-1">
            <li
              v-for="(step, i) in steps"
              :key="i"
              class="flex items-center gap-3 text-sm transition-all duration-300"
              :class="{
                'text-primary font-semibold': i === currentStep,
                'text-success': i < currentStep,
                'text-base-content/30': i > currentStep,
              }"
            >
              <!-- done -->
              <svg v-if="i < currentStep" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <!-- active -->
              <span v-else-if="i === currentStep" class="loading loading-spinner loading-xs shrink-0"></span>
              <!-- pending -->
              <span v-else class="w-4 h-4 shrink-0 rounded-full border-2 border-base-content/20 inline-block"></span>

              <span>{{ step }}</span>
            </li>
          </ul>

          <!-- Fallback subtitle bila steps kosong -->
          <p v-else class="text-base-content/60 text-sm">
            Transaksi Anda sedang diproses, harap tunggu...
          </p>
        </template>

      </div>
    </dialog>
  </Teleport>
</template>
