<route lang="yaml">
meta:
  title: Active Class Packages
  layout: default
</route>

<template>
  <ActiveServicesView
    service-type="class_package"
    title="Active Class Packages"
    subtitle="Monitor active class packages and session usage"
    :show-alert-button="true"
    :show-calendar-button="true"
    empty-state-title="No Active Class Packages"
    empty-state-message="Active class packages will appear here once members purchase class bundles."
  />
</template>

<script setup>
import ActiveServicesView from '@/components/gym/services/ActiveServicesView.vue'
</script>
