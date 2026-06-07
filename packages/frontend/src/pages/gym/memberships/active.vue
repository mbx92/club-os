<route lang="yaml">
meta:
  title: Active Memberships
  layout: default
</route>

<template>
  <ActiveServicesView
    service-type="membership"
    title="Active Memberships"
    subtitle="Monitor and manage all active membership subscriptions"
    :show-alert-button="true"
    :show-calendar-button="true"
    empty-state-title="No Active Memberships"
    empty-state-message="Active memberships will appear here once members subscribe to membership plans."
  />
</template>

<script setup>
import ActiveServicesView from '@/components/gym/services/ActiveServicesView.vue'
</script>
