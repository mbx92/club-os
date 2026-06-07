<route lang="yaml">
meta:
  title: PT Packages Calendar
  layout: default
</route>

<template>
  <ServiceCalendarView
    service-type="pt_package"
    title="PT Packages Calendar"
    subtitle="Monthly view of PT package start and end dates"
    list-view-link="/gym/personal-training/active"
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
