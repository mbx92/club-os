<route lang="yaml">
path: /403
name: errors.403
meta:
  title: Access Forbidden
  layout: public
  public: true
</route>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center max-w-md px-4">
      <div class="mb-8">
        <IconLock class="w-24 h-24 mx-auto text-error opacity-80" />
      </div>
      
      <h1 class="text-6xl font-bold text-error mb-4">403</h1>
      <h2 class="text-2xl font-semibold mb-4">Access Forbidden</h2>
      <p class="text-base-content/60 mb-8">
        You don't have permission to access this page. This area is restricted to authorized users only.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button @click="goBack" class="btn btn-ghost gap-2">
          <IconArrowLeft class="w-4 h-4" />
          Go Back
        </button>
        <RouterLink to="/" class="btn btn-primary gap-2">
          <IconHome class="w-4 h-4" />
          Go to Home
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { IconLock, IconArrowLeft, IconHome } from '@tabler/icons-vue'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>
