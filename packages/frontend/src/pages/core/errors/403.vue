<route lang="yaml">
path: /403
name: errors.403
meta:
  title: Akses Ditolak
  layout: default
</route>

<template>
  <AccessDeniedPanel />
</template>

<script setup>
import AccessDeniedPanel from '@/components/shared/AccessDeniedPanel.vue'
</script>
