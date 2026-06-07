<route lang="yaml">
meta:
  title: Membership Calendar
  layout: default
</route>

<template>
  <ServiceCalendarView
    service-type="membership"
    title="Membership Calendar"
    subtitle="Monthly view of membership start and end dates"
    list-view-link="/gym/memberships/active"
    @view-member="viewMember"
  />
</template>

<script setup>
import { useRouter } from 'vue-router'
import ServiceCalendarView from '@/components/gym/services/ServiceCalendarView.vue'

const router = useRouter()

const viewMember = (memberId) => {
  router.push(`/gym/active-services/member/${memberId}`)
}
</script>
