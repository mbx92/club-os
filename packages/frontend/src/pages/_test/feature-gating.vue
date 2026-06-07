<route lang="yaml">
meta:
  title: Test Feature Gating
  layout: default
</route>

<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">🧪 Feature Gating Test</h1>
    
    <!-- Subscription Info -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">📊 Subscription Status</h2>
        
        <div v-if="subscriptionStore.loading" class="flex items-center gap-2">
          <span class="loading loading-spinner"></span>
          <span>Loading subscription...</span>
        </div>
        
        <div v-else-if="subscriptionStore.error" class="space-y-4">
          <div class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <div class="font-bold">No Active Subscription</div>
              <div class="text-sm">{{ subscriptionStore.error }}</div>
            </div>
          </div>
          
          <div class="space-y-2">
            <p><strong>Plan:</strong> {{ subscriptionStore.currentPlan }}</p>
            <p><strong>Active:</strong> {{ subscriptionStore.isActive ? '✅' : '❌' }}</p>
            <p><strong>Trial:</strong> {{ subscriptionStore.isTrialActive ? '✅' : '❌' }}</p>
            <p><strong>Has Subscription:</strong> {{ subscriptionStore.hasSubscription ? '✅' : '❌' }}</p>
          </div>
          
          <button @click="goToSubscription" class="btn btn-primary">
            View Subscription Plans
          </button>
        </div>
        
        <div v-else class="space-y-4">
          <!-- Subscription Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Plan</div>
                <div class="stat-value text-2xl">{{ subscriptionStore.currentPlan }}</div>
                <div class="stat-desc">{{ subscriptionStore.subscription?.plan?.description }}</div>
              </div>
            </div>
            
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Status</div>
                <div class="stat-value text-2xl">
                  <span :class="subscriptionStore.isActive ? 'text-success' : 'text-warning'">
                    {{ subscriptionStore.subscription?.status || 'N/A' }}
                  </span>
                </div>
                <div class="stat-desc">
                  {{ subscriptionStore.isActive ? 'Subscription Active' : 'Pending' }}
                </div>
              </div>
            </div>
            
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Trial Status</div>
                <div class="stat-value text-xl">
                  {{ subscriptionStore.isTrialActive ? '✅ Active' : '❌ Inactive' }}
                </div>
                <div class="stat-desc" v-if="subscriptionStore.subscription?.trialEndDate">
                  Ends: {{ formatDate(subscriptionStore.subscription.trialEndDate) }}
                </div>
              </div>
            </div>
            
            <div class="stats shadow">
              <div class="stat">
                <div class="stat-title">Subscription Period</div>
                <div class="stat-value text-sm">
                  {{ formatDate(subscriptionStore.subscription?.startDate) }}
                </div>
                <div class="stat-desc">
                  to {{ formatDate(subscriptionStore.subscription?.endDate) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="divider">Raw Features Data</div>
          
          <div class="overflow-x-auto">
            <pre class="bg-base-200 p-4 rounded text-xs max-h-96 overflow-y-auto">{{ JSON.stringify(subscriptionStore.features, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Module Access Tests -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">🔐 Module Access</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="module in modules" :key="module" class="stat border rounded">
            <div class="stat-title">{{ module }}</div>
            <div class="stat-value text-lg">
              {{ canAccessModule(module).value ? '✅ Allowed' : '🔒 Locked' }}
            </div>
            <div class="stat-actions">
              <button 
                @click="testModule(module)" 
                class="btn btn-sm"
                :class="canAccessModule(module).value ? 'btn-success' : 'btn-error'"
              >
                Test Access
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Features Breakdown by Category -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">🎯 Features Breakdown</h2>
        
        <div class="space-y-6" v-if="subscriptionStore.features">
          <!-- Modules -->
          <div v-if="subscriptionStore.features.modules">
            <h3 class="font-bold text-lg mb-2">📦 Modules</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.modules" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
          
          <!-- Payments -->
          <div v-if="subscriptionStore.features.payments">
            <h3 class="font-bold text-lg mb-2">💳 Payment Methods</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.payments" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
          
          <!-- Transactions -->
          <div v-if="subscriptionStore.features.transactions">
            <h3 class="font-bold text-lg mb-2">🧾 Transaction Features</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.transactions" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
          
          <!-- Limits -->
          <div v-if="subscriptionStore.features.limits">
            <h3 class="font-bold text-lg mb-2">📊 Limits</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div v-for="(value, key) in subscriptionStore.features.limits" :key="key" class="stat bg-base-200 rounded">
                <div class="stat-title">{{ key }}</div>
                <div class="stat-value text-2xl">{{ value === -1 ? '∞' : value }}</div>
                <div class="stat-desc">{{ value === -1 ? 'Unlimited' : 'Maximum allowed' }}</div>
              </div>
            </div>
          </div>
          
          <!-- Reporting -->
          <div v-if="subscriptionStore.features.reporting">
            <h3 class="font-bold text-lg mb-2">📈 Reporting</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.reporting" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
          
          <!-- Integrations -->
          <div v-if="subscriptionStore.features.integrations">
            <h3 class="font-bold text-lg mb-2">🔗 Integrations</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.integrations" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
          
          <!-- Support -->
          <div v-if="subscriptionStore.features.support">
            <h3 class="font-bold text-lg mb-2">🎧 Support</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div v-for="(value, key) in subscriptionStore.features.support" :key="key" 
                   class="badge badge-lg" :class="value ? 'badge-success' : 'badge-ghost'">
                {{ key }}: {{ value ? '✓' : '✗' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Feature Guard Tests -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">🎯 FeatureGuard Component Test</h2>
        
        <div class="space-y-4">
          <!-- Test POS Module -->
          <div class="border p-4 rounded">
            <h3 class="font-bold mb-2">POS Module (FeatureGuard)</h3>
            <FeatureGuard module="pos">
              <div class="alert alert-success">
                ✅ POS Module is AVAILABLE! You can see this content.
              </div>
            </FeatureGuard>
          </div>
          
          <!-- Test Restaurant Module -->
          <div class="border p-4 rounded">
            <h3 class="font-bold mb-2">Restaurant Module (FeatureGuard)</h3>
            <FeatureGuard module="restaurant">
              <div class="alert alert-success">
                ✅ Restaurant Module is AVAILABLE! You can see this content.
              </div>
            </FeatureGuard>
          </div>
          
          <!-- Test Advanced Reports -->
          <div class="border p-4 rounded">
            <h3 class="font-bold mb-2">Advanced Reports (FeatureGuard)</h3>
            <FeatureGuard module="advancedReports">
              <div class="alert alert-success">
                ✅ Advanced Reports is AVAILABLE! You can see this content.
              </div>
            </FeatureGuard>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Limits Test -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">📊 Limits Testing</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-for="limitKey in Object.keys(subscriptionStore.features?.limits || {})" 
               :key="limitKey" 
               class="stat border rounded">
            <div class="stat-title">{{ limitKey }}</div>
            <div class="stat-value">{{ getLimit(limitKey).value === -1 ? '∞' : getLimit(limitKey).value }}</div>
            <div class="stat-desc">
              <span v-if="getLimit(limitKey).value === -1" class="text-success">🟢 Unlimited</span>
              <span v-else>
                {{ isAtLimit(limitKey, getLimit(limitKey).value).value ? '🔴 At Limit' : '🟢 Available' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Manual Modal Triggers -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">🎨 Manual Modal Tests</h2>
        
        <div class="flex gap-2 flex-wrap">
          <button @click="showUpgradeModalTest" class="btn btn-warning">
            Show Upgrade Modal
          </button>
          
          <button @click="showLimitModalTest" class="btn btn-error">
            Show Limit Modal
          </button>
          
          <button @click="showSubRequiredModalTest" class="btn btn-info">
            Show Subscription Required
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSubscriptionStore } from '@/stores/subscription'
import { useFeatureGate } from '@/composables/subscription/useFeatureGate'
import { useRouter } from 'vue-router'
import FeatureGuard from '@/components/shared/FeatureGuard.vue'

const subscriptionStore = useSubscriptionStore()
const router = useRouter()
const { canAccessModule, getLimit, isAtLimit } = useFeatureGate()

const modules = ['gym', 'pos', 'restaurant', 'classes', 'reports', 'advancedReports']

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function testModule(module) {
  const hasAccess = canAccessModule(module).value
  
  if (hasAccess) {
    alert(`✅ You have access to ${module} module!`)
  } else {
    subscriptionStore.showUpgradeModal({
      type: 'module',
      module: module,
      message: `Module ${module} tidak tersedia di plan Anda`,
      currentPlan: subscriptionStore.currentPlan
    })
  }
}

function showUpgradeModalTest() {
  subscriptionStore.showUpgradeModal({
    type: 'module',
    module: 'pos',
    message: 'This is a test upgrade modal',
    currentPlan: subscriptionStore.currentPlan
  })
}

function showLimitModalTest() {
  subscriptionStore.showLimitModal({
    limit: 10,
    current: 10,
    message: 'You have reached your user limit',
    currentPlan: subscriptionStore.currentPlan
  })
}

function showSubRequiredModalTest() {
  subscriptionStore.showSubscriptionRequiredModal()
}

function goToSubscription() {
  router.push('/subscription')
}
</script>
