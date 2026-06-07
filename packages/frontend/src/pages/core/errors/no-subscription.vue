<route lang="yaml">
meta:
  layout: public
  public: true
  allowAuthenticated: true
</route>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
    <div class="max-w-2xl w-full">
      <!-- Card -->
      <div class="card bg-base-100 shadow-2xl">
        <div class="card-body items-center text-center p-8 md:p-12">
          <!-- Icon -->
          <div class="mb-6">
            <div class="w-32 h-32 mx-auto bg-warning/10 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-3xl md:text-4xl font-bold text-base-content mb-4">
            Subscription Required
          </h1>

          <!-- Description -->
          <p class="text-lg text-base-content/70 mb-2">
            Your login was successful, but your account doesn't have an active subscription.
          </p>
          <p class="text-base text-base-content/60 mb-8">
            Please subscribe to a plan to access the system features.
          </p>

          <!-- User Info Card -->
          <div v-if="authStore.user" class="alert alert-info w-full mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left">
              <div class="font-semibold">{{ authStore.user.name }}</div>
              <div class="text-sm opacity-75">{{ authStore.user.email }}</div>
              <div v-if="authStore.user.tenant" class="text-sm opacity-75">
                Tenant: {{ authStore.user.tenant.name }}
              </div>
            </div>
          </div>

          <!-- Benefits -->
          <div class="w-full mb-8">
            <h3 class="font-semibold text-lg mb-4">With an active subscription, you'll get:</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Access to all features</span>
              </div>
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Member management</span>
              </div>
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Class scheduling</span>
              </div>
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Payment processing</span>
              </div>
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Reports & analytics</span>
              </div>
              <div class="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">Priority support</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              @click="viewPlans" 
              class="btn btn-primary btn-lg flex-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              View Subscription Plans
            </button>
            <button 
              @click="handleLogout" 
              class="btn btn-outline btn-lg flex-1"
              :disabled="loggingOut"
            >
              <span v-if="loggingOut" class="loading loading-spinner loading-sm"></span>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {{ loggingOut ? 'Logging out...' : 'Logout' }}
            </button>
          </div>

          <!-- Help Text -->
          <div class="mt-6 text-sm text-base-content/60">
            <p>Need help? Contact your system administrator or support team.</p>
          </div>
        </div>
      </div>

      <!-- Back to Login (if logged out) -->
      <div class="text-center mt-6">
        <button @click="backToLogin" class="link link-hover text-base-content/70">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Login
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'

const router = useRouter()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const loggingOut = ref(false)

// View subscription plans
const viewPlans = () => {
  router.push('/subscription')
}

// Logout
const handleLogout = async () => {
  loggingOut.value = true
  try {
    await authStore.logout()
    
    // Hide any open modals
    subscriptionStore.hideSubscriptionRequiredModal()
    
    // Redirect to login with proper route
    await router.push({ name: 'auth.login' })
  } catch (error) {
    console.error('Logout error:', error)
    // Fallback
    window.location.href = '/auth/login'
  } finally {
    loggingOut.value = false
  }
}

// Back to login
const backToLogin = () => {
  router.push({ name: 'auth.login' })
}
</script>

<style scoped>
/* Optional: Add custom animations */
.card {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
