<route lang="yaml">
meta:
  title: Membership Plans
  layout: default
  action: read
  subject: MembershipPlan
</route>

<template>
  <ServicePlansView
    service-type="membership"
    title="Membership Plans"
    subtitle="Manage and configure membership subscription plans for your gym"
    add-button-text="Add Membership Plan"
    empty-state-title="No Membership Plans Found"
    empty-state-message="Create your first membership plan to start offering subscriptions to members."
    empty-state-button="Create First Membership Plan"
  />
</template>

<script setup>
import ServicePlansView from '@/components/gym/services/ServicePlansView.vue'
</script>

