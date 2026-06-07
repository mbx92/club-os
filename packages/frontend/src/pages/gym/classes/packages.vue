<route lang="yaml">
meta:
  title: Class Packages
  layout: default
</route>

<template>
  <ServicePlansView
    service-type="class_package"
    title="Class Packages"
    subtitle="Manage class packages and session bundles for your gym"
    add-button-text="Add Class Package"
    empty-state-title="No Class Packages Found"
    empty-state-message="Create your first class package to offer bundled sessions to members."
    empty-state-button="Create First Class Package"
  />
</template>

<script setup>
import ServicePlansView from '@/components/gym/services/ServicePlansView.vue'
</script>
