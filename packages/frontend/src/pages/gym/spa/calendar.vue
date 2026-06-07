<route lang="yaml">
meta:
  title: Spa Packages Calendar
  layout: default
</route>

<template>
  <ServiceCalendarView
    service-type="spa_package"
    title="Spa Packages Calendar"
    subtitle="Monthly view of spa package start and end dates"
    list-view-link="/gym/spa/active"
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
