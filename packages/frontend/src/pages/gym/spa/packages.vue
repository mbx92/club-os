<route lang="yaml">
meta:
  title: Spa Packages
  layout: default
</route>

<template>
  <ServicePlansView
    service-type="spa_package"
    title="Spa & Wellness Packages"
    subtitle="Manage spa treatments and wellness service packages"
    add-button-text="Add Spa Package"
    empty-state-title="No Spa Packages Found"
    empty-state-message="Create your first spa package to offer wellness treatments to members."
    empty-state-button="Create First Spa Package"
  />
</template>

<script setup>
import ServicePlansView from '@/components/gym/services/ServicePlansView.vue'
</script>
