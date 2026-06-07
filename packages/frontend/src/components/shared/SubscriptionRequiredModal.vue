<template>
  <div v-if="shouldShowModal" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-2xl font-bold">Subscription Required</h2>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="icon-subscription">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        
        <p class="message">
          Anda memerlukan subscription aktif untuk menggunakan fitur ini.
        </p>
        
        <div class="info-box">
          <p class="font-semibold mb-2">Mengapa perlu subscription?</p>
          <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Akses ke semua module dan fitur</li>
            <li>Support prioritas</li>
            <li>Update dan maintenance berkala</li>
            <li>Data backup dan security</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn btn-ghost">Tutup</button>
        <button @click="subscribe" class="btn btn-primary ml-2">Lihat Paket</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useRouter } from 'vue-router'

const subscriptionStore = useSubscriptionStore()
const router = useRouter()

// Double-check: only show if modal is visible AND tenant truly doesn't have subscription
const shouldShowModal = computed(() => {
  return subscriptionStore.subscriptionRequiredModal.visible && 
         !subscriptionStore.hasSubscription && 
         !subscriptionStore.isTrialActive
})

function close() {
  subscriptionStore.hideSubscriptionRequiredModal()
}

function subscribe() {
  close()
  router.push('/subscription')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  min-height: 2rem;
  padding: 0;
  background: none;
  border: none;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
  background: rgb(0 0 0 / 0.06);
}

.modal-body {
  padding: 24px;
}

.icon-subscription {
  text-align: center;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.message {
  text-align: center;
  font-size: 16px;
  color: #374151;
  margin-bottom: 24px;
}

.info-box {
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 16px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}
</style>
