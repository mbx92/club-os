<route lang="yaml">
meta:
  title: Petty Cash (Deprecated)
  layout: default
</route>

<script setup>
/**
 * Petty Cash module is deprecated.
 * Use Finances → Akun (type Petty Cash / Modal) instead.
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace({
    path: '/finances/accounts',
    query: { deprecated: 'petty-cash' },
  })
})
</script>

<template>
  <div class="flex justify-center py-16">
    <span class="loading loading-spinner loading-md"></span>
  </div>
</template>
