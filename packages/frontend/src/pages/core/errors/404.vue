
<route lang="yaml">
path: /404
name: errors.404
meta:
  title: Page Not Found
  layout: public
  public: true
</route>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
    <div class="text-center max-w-md">
      <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 class="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p class="text-base-content/70 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="flex gap-3 justify-center">
        <RouterLink to="/" class="btn btn-primary">
          Go to Dashboard
        </RouterLink>
        <button @click="goBack" class="btn btn-outline">
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.go(-1)
}
</script>