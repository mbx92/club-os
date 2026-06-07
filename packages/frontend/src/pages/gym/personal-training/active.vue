<route lang="yaml">
meta:
  title: Active PT Packages
  layout: default
</route>

<template>
  <ActiveServicesView
    service-type="pt_package"
    title="Active PT Packages"
    subtitle="Monitor active personal training packages and session usage"
    :show-alert-button="true"
    :show-calendar-button="true"
    empty-state-title="No Active PT Packages"
    empty-state-message="Active PT packages will appear here once members purchase personal training sessions."
  />
</template>

<script setup>
import ActiveServicesView from '@/components/gym/services/ActiveServicesView.vue'
</script>
