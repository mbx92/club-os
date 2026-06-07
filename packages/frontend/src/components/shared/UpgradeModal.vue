<template>
  <div v-if="subscriptionStore.upgradeModal.visible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-2xl font-bold">{{ title }}</h2>
        <button @click="close" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="icon-warning">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <p class="message">{{ subscriptionStore.upgradeModal.message }}</p>
        
        <div v-if="subscriptionStore.upgradeModal.type === 'module'" class="details">
          <p>
            Module <strong>{{ subscriptionStore.upgradeModal.module }}</strong> tidak tersedia 
            di plan <strong>{{ subscriptionStore.upgradeModal.currentPlan }}</strong>.
          </p>
        </div>
        
        <div v-else-if="subscriptionStore.upgradeModal.type === 'feature'" class="details">
          <p>
            Fitur <strong>{{ subscriptionStore.upgradeModal.feature }}</strong> tidak tersedia 
            di plan <strong>{{ subscriptionStore.upgradeModal.currentPlan }}</strong>.
          </p>
        </div>
        
        <div class="plans-comparison">
          <h3 class="text-lg font-semibold mb-4">Upgrade ke plan yang lebih tinggi:</h3>
          <div class="plans-grid">
            <div class="plan-card">
              <h4 class="font-bold text-lg">Professional</h4>
              <p class="price">Rp 500.000/bulan</p>
              <ul class="feature-list">
                <li>✓ POS Module</li>
                <li>✓ Restaurant Module</li>
                <li>✓ Combined Billing</li>
                <li>✓ Unlimited Products</li>
              </ul>
              <button @click="upgradeToPlan('professional')" class="btn-upgrade">
                Upgrade Now
              </button>
            </div>
            
            <div class="plan-card featured">
              <span class="badge">Recommended</span>
              <h4 class="font-bold text-lg">Enterprise</h4>
              <p class="price">Rp 1.000.000/bulan</p>
              <ul class="feature-list">
                <li>✓ All Professional features</li>
                <li>✓ Advanced Analytics</li>
                <li>✓ Priority Support</li>
                <li>✓ Custom Integrations</li>
              </ul>
              <button @click="upgradeToPlan('enterprise')" class="btn-upgrade primary">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn btn-ghost">Nanti Saja</button>
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

const title = computed(() => {
  if (subscriptionStore.upgradeModal.type === 'module') {
    return 'Module Tidak Tersedia'
  }
  return 'Fitur Tidak Tersedia'
})

function close() {
  subscriptionStore.hideUpgradeModal()
}

function upgradeToPlan(plan) {
  close()
  router.push(`/subscription?plan=${plan}`)
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
  max-width: 800px;
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

.icon-warning {
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

.details {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.plan-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  position: relative;
}

.plan-card.featured {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  margin: 8px 0;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 16px 0;
}

.feature-list li {
  padding: 8px 0;
  color: #4b5563;
}

.btn-upgrade {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: #6b7280;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-upgrade:hover {
  background: #4b5563;
}

.btn-upgrade.primary {
  background: #3b82f6;
}

.btn-upgrade.primary:hover {
  background: #2563eb;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}
</style>
