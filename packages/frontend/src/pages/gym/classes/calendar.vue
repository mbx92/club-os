<route lang="yaml">
meta:
  title: Class Packages Calendar
  layout: default
</route>

<template>
  <ServiceCalendarView
    service-type="class_package"
    title="Class Packages Calendar"
    subtitle="Monthly view of class package start and end dates"
    list-view-link="/gym/classes/active"
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
