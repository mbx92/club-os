<template>
  <div v-if="subscriptionStore.limitModal.visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-2xl font-bold">Limit Tercapai</h2>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="icon-limit">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <p class="message">{{ subscriptionStore.limitModal.message }}</p>
        
        <div class="limit-details">
          <div class="limit-bar">
            <div class="limit-progress" :style="{ width: progressPercentage + '%' }"></div>
          </div>
          <p class="limit-text">
            <strong>{{ subscriptionStore.limitModal.current }}</strong> / 
            {{ subscriptionStore.limitModal.limit }} 
            ({{ progressPercentage }}%)
          </p>
        </div>
        
        <div class="alert-box">
          <p>
            Anda sudah mencapai batas maksimal di plan 
            <strong>{{ subscriptionStore.limitModal.currentPlan }}</strong>.
          </p>
          <p class="mt-2">Upgrade ke plan yang lebih tinggi untuk meningkatkan limit Anda.</p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn btn-ghost">Tutup</button>
        <button @click="upgrade" class="btn btn-primary ml-2">Upgrade Plan</button>
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

const progressPercentage = computed(() => {
  const { current, limit } = subscriptionStore.limitModal
  if (limit === 0) return 0
  return Math.min(Math.round((current / limit) * 100), 100)
})

function close() {
  subscriptionStore.hideLimitModal()
}

function upgrade() {
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
  max-width: 600px;
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

.icon-limit {
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

.limit-details {
  margin-bottom: 24px;
}

.limit-bar {
  width: 100%;
  height: 24px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 0;
}

.limit-progress {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  transition: width 0.3s ease;
}

.limit-text {
  text-align: center;
  font-size: 18px;
  color: #374151;
  margin: 8px 0;
}

.alert-box {
  background: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}
</style>
