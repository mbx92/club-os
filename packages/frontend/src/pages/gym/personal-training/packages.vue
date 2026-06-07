<route lang="yaml">
meta:
  title: PT Packages
  layout: default
</route>

<template>
  <ServicePlansView
    service-type="pt_package"
    title="Personal Training Packages"
    subtitle="Manage personal training session packages and pricing"
    add-button-text="Add PT Package"
    empty-state-title="No PT Packages Found"
    empty-state-message="Create your first personal training package to offer one-on-one sessions."
    empty-state-button="Create First PT Package"
  />
</template>

<script setup>
import ServicePlansView from '@/components/gym/services/ServicePlansView.vue'
</script>
