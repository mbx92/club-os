<route lang="yaml">
path: /auth/login
name: auth.login
meta:
  public: true
  layout: auth
  title: Login
</route>

<template>
  <div class="flex h-full items-center justify-center">
    <div class="grid w-full max-w-6xl items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
      <section class="hidden h-full overflow-hidden rounded-box border border-base-300 bg-neutral text-neutral-content lg:flex lg:flex-col">
        <div class="flex h-full flex-col justify-between p-8 xl:p-10">
          <div class="space-y-5">
            <div class="inline-flex items-center gap-3 rounded-full border border-white/12 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/72 xl:text-sm">
              <span class="h-2 w-2 rounded-full bg-primary"></span>
              Club OS
            </div>

            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <img
                  :src="brandLogo"
                  alt="Dynasty Fitness"
                  class="h-20 w-20 rounded-[1.25rem] object-cover ring-1 ring-white/15 xl:h-24 xl:w-24"
                />
                <div>
                  <p class="text-sm uppercase tracking-[0.34em] text-white/55">Dynasty Fitness</p>
                  <h1 class="mt-2 text-xl font-black leading-none text-white xl:text-[3.1rem]">
                    Operational System
                  </h1>
                </div>
              </div>

              <p class="max-w-xl text-sm leading-6 text-white/68 xl:text-base xl:leading-7">
                Member, billing, kelas, POS, dan operasional harian dalam workspace.
              </p>
            </div>
          </div>

          <div class="grid gap-3 xl:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-xs uppercase tracking-[0.22em] text-white/40">Members</div>
              <div class="mt-2 text-xl font-black text-white">Active</div>
              <div class="mt-1 text-xs text-white/56 xl:text-sm">Status membership dan check-in tetap terlihat jelas.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-xs uppercase tracking-[0.22em] text-white/40">Billing</div>
              <div class="mt-2 text-xl font-black text-white">Unified</div>
              <div class="mt-1 text-xs text-white/56 xl:text-sm">POS, invoice, dan pembayaran tetap dalam satu alur.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-xs uppercase tracking-[0.22em] text-white/40">Workspace</div>
              <div class="mt-2 text-xl font-black text-white">Focused</div>
              <div class="mt-1 text-xs text-white/56 xl:text-sm">Surface flat, hierarki lebih jelas, dan kontras lebih aman.</div>
            </div>
          </div>
        </div>
      </section>

      <section class="card mx-auto flex w-full max-w-xl overflow-hidden border border-base-300 bg-base-100 shadow-sm lg:min-h-[36rem] lg:max-w-none">
        <div class="flex w-full flex-col justify-center p-5 sm:p-6 lg:p-8 xl:p-10">
          <div class="flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              :src="brandLogo"
              alt="Dynasty Fitness"
              class="h-16 w-16 rounded-[1.15rem] object-cover ring-1 ring-base-300 sm:h-20 sm:w-20 sm:rounded-[1.4rem]"
            />
            <p class="mt-4 text-xs font-semibold uppercase tracking-[0.34em] text-primary/80">
              Welcome back
            </p>
            <h2 class="mt-2 text-2xl font-black tracking-tight text-base-content sm:text-[2rem]">
              {{ appTitle }}
            </h2>
          </div>

          <form class="mt-8 space-y-4" @submit.prevent="handleLogin">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-base-content/80">Email</label>
              <div class="relative isolate">
                <IconMail
                  class="pointer-events-none absolute left-4 top-1/2 z-20 h-5 w-5 -translate-y-1/2 text-base-content/55"
                />
                <input
                  v-model="email"
                  type="email"
                  class="input input-bordered h-14 w-full rounded-2xl pl-12 focus:outline-none focus:ring-0"
                  placeholder="Masukan email"
                  autocomplete="username"
                  required
                />
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <label class="text-sm font-semibold text-base-content/80">Password</label>
                <label
                  class="label p-0 text-sm link link-hover cursor-pointer"
                  role="link"
                  tabindex="0"
                  @click="goForgot"
                  @keydown.enter.space="goForgot"
                >
                  Lupa password?
                </label>
              </div>

              <div class="relative isolate">
                <IconLock
                  class="pointer-events-none absolute left-4 top-1/2 z-20 h-5 w-5 -translate-y-1/2 text-base-content/55"
                />
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="input input-bordered h-14 w-full rounded-2xl pl-12 pr-12 focus:outline-none focus:ring-0"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl hover:bg-base-200/70 focus:outline-none"
                  @click="showPassword = !showPassword"
                  aria-label="toggle password"
                  tabindex="-1"
                >
                  <IconEye
                    v-if="!showPassword"
                    class="h-5 w-5 text-base-content/70"
                  />
                  <IconEyeOff v-else class="h-5 w-5 text-base-content/70" />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 pt-1">
              <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-base-300 bg-base-200 px-3 py-3">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-md"
                />
                <span class="label-text text-sm font-medium text-base-content">Tetap masuk di perangkat ini</span>
              </label>
            </div>

            <button
              type="submit"
              class="btn btn-primary mt-3 h-14 w-full rounded-xl border text-base font-semibold tracking-[0.01em]"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="loading loading-spinner"></span>
              <span v-else>Masuk ke Dashboard</span>
            </button>

            <div v-if="isDev" class="grid gap-2 pt-2 sm:grid-cols-2">
              <button type="button" class="btn btn-outline btn-sm rounded-xl" @click="fillDevCredentials">
                Fill Dev Credentials
              </button>

              <button type="button" class="btn btn-outline btn-sm rounded-xl" @click="fillTenantCredentials">
                Fill Tenant Credentials
              </button>
            </div>
          </form>

          <Transition name="fade">
            <div v-if="errorMessage" class="alert alert-error mt-6 relative pr-10 shadow-lg">
              <div class="flex w-full items-center gap-3">
                <IconAlertCircle class="h-5 w-5 shrink-0" />
                <div class="min-w-0 flex-1 pr-2">
                  <p class="text-sm font-semibold">{{ errorTitle }}</p>
                  <p class="text-xs opacity-90">{{ errorMessage }}</p>
                </div>
              </div>

              <button
                @click="clearError"
                class="absolute right-2 top-1/2 rounded-full border-0 bg-transparent p-1 text-base-content/80 ring-0 -translate-y-1/2 hover:bg-transparent focus:bg-transparent active:bg-transparent"
                aria-label="Close error"
              >
                <IconX class="h-4 w-4" />
              </button>
            </div>
          </Transition>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import brandLogo from '@/assets/dynasty-logo.jpg';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotification } from '@/composables/core/useNotification';
import { IconEye, IconEyeOff, IconMail, IconLock, IconAlertCircle, IconX } from '@tabler/icons-vue';

const router = useRouter();
const authStore = useAuthStore();
const { showSuccess, parseErrorConfig } = useNotification();

const appTitle = import.meta.env.VITE_APP_TITLE || 'Dynasty Fitness';
const isDev = import.meta.env.DEV;
const isDebug = isDev && import.meta.env.VITE_DEBUG === 'true';

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const isLoading = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');
const errorTitle = ref('');

const fillDevCredentials = () => {
  email.value = 'superadmin@gym-system.com';
  password.value = 'Dynastygym2026!';
  rememberMe.value = true;
};
const fillTenantCredentials = () => {
  email.value = 'admin@dynastygym.id';
  password.value = 'dynasty2026!';
  rememberMe.value = true;
};

const goForgot = () => {
  // Navigate to forgot password page (implement later)
  if (isDebug) {
    console.log('Navigate to forgot password');
  }
};

const clearError = () => {
  errorMessage.value = '';
  errorTitle.value = '';
};

const setError = (title, message) => {
  errorTitle.value = title;
  errorMessage.value = message;
};

const handleLogin = async () => {
  if (isLoading.value) return;
  
  clearError();
  isLoading.value = true;
  
  if (isDebug) {
    console.log('🔐 LOGIN ATTEMPT:', { email: email.value });
    console.log('📍 Current location:', window.location.href);
  }
  
  try {
    if (isDebug) {
      console.log('Attempting login with:', {
        email: email.value,
        rememberMe: rememberMe.value
      });
    }
    
    const result = await authStore.login({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value
    });
    
    if (isDebug) {
      console.log('Login result:', result);
      console.log('Token in localStorage after login:', localStorage.getItem('token'));
      console.log('Token in sessionStorage after login:', sessionStorage.getItem('token'));
      console.log('Auth user after login:', !!authStore.user);
    }
    
    if (result.success) {
      if (isDebug) {
        console.log('✅ LOGIN SUCCESS - redirecting in 500ms');
      }
      showSuccess('Login berhasil! Selamat datang.')
      
      // Check if user is kasir — redirect to floor plan POS
      const roleName = (result.user?.role?.name || '').toLowerCase()
      const isKasir = roleName === 'kasir' || roleName === 'cashier'
      const redirectTarget = isKasir ? '/restaurant/pos/floor-plan-pos' : '/'
      
      if (isDebug) {
        console.log('🔑 Role:', roleName, 'isKasir:', isKasir, 'redirectTo:', redirectTarget)
      }
      
      setTimeout(() => {
        if (isDebug) {
          console.log('🚀 Now redirecting to', redirectTarget);
        }
        router.push(redirectTarget);
      }, 500)
    } else {
      // Handle error - set error immediately and don't do any navigation
      const errorConfig = parseErrorConfig(result)
      
      if (isDebug) {
        console.log('⚠️ ERROR CONFIG:', errorConfig);
        console.log('🛑 STOPPING EXECUTION - No redirect should happen');
        console.log('📍 Should stay at:', window.location.href);
      }
      
      // Stop loading BEFORE setting error to ensure UI is ready
      isLoading.value = false;
      
      // Wait a tick for Vue to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Set error
      setError(errorConfig.title, errorConfig.message)
      
      if (isDebug) {
        console.log('✋ ERROR DISPLAYED - Error message set:', {
          title: errorTitle.value,
          message: errorMessage.value
        });
        console.log('Login failed, showing error:', errorConfig);
        console.log('Tokens after failed login:', {
          localStorage: localStorage.getItem('token'),
          sessionStorage: sessionStorage.getItem('token'),
          authUser: authStore.user
        });
      }
      
      // Prevent any navigation
      if (isDebug) {
        console.log('🔒 Execution stopped. Staying on login page.');
      }
      return;
    }
  } catch (error) {
    if (isDebug) {
      console.error('Login error:', error);
      console.log('Error structure:', {
        data: error.data,
        response: error.response,
        message: error.message,
        code: error.code
      });
    }
    
    // Parse error config dynamically
    const errorConfig = parseErrorConfig(error)
    
    if (isDebug) {
      console.log('Parsed error config:', errorConfig);
    }
    
    setError(errorConfig.title, errorConfig.message)
    
    // Ensure we stay on login page
    isLoading.value = false;
    return;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
