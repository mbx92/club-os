<template>
  <div>
    <div class="flex justify-between items-start mb-6">
      <div>
        <h1 class="text-2xl font-bold">Personal Training Alerts</h1>
        <p class="text-base-content/70">Monitor expiring PT packages and low session warnings</p>
      </div>
      <router-link to="/gym/personal-training/calendar" class="btn btn-primary btn-outline btn-sm gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        View Calendar
      </router-link>
    </div>
    <ServiceAlertsView
      serviceType="pt_package"
      title=""
      subtitle=""
    />
  </div>
</template>

<script setup>
import ServiceAlertsView from '@/components/gym/services/ServiceAlertsView.vue'
</script>
