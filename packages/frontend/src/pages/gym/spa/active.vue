<route lang="yaml">
meta:
  title: Active Spa Packages
  layout: default
</route>

<template>
  <ActiveServicesView
    service-type="spa_package"
    title="Active Spa Packages"
    subtitle="Monitor active spa and wellness service packages"
    :show-alert-button="true"
    :show-calendar-button="true"
    empty-state-title="No Active Spa Packages"
    empty-state-message="Active spa packages will appear here once members purchase wellness treatments."
  />
</template>

<script setup>
import ActiveServicesView from '@/components/gym/services/ActiveServicesView.vue'
</script>
