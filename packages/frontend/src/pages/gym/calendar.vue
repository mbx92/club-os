<route lang="yaml">
meta:
  title: Service Calendar
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Service Calendar</h1>
      <p class="text-base-content/60 mt-1">Choose a service type to view its calendar</p>
    </div>

    <!-- Service Type Selection -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <router-link
        to="/gym/memberships/calendar"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-primary/10 rounded-xl">
              <IconCalendar class="w-8 h-8 text-primary" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Membership Calendar</h2>
              <p class="text-base-content/60">
                View membership start and expiration dates
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>

      <router-link
        to="/gym/classes/calendar"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-success/10 rounded-xl">
              <IconCalendar class="w-8 h-8 text-success" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Class Packages Calendar</h2>
              <p class="text-base-content/60">
                View class package schedules and expiration dates
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>

      <router-link
        to="/gym/personal-training/calendar"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-warning/10 rounded-xl">
              <IconCalendar class="w-8 h-8 text-warning" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">PT Packages Calendar</h2>
              <p class="text-base-content/60">
                View personal training session schedules
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>

      <router-link
        to="/gym/spa/calendar"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-info/10 rounded-xl">
              <IconCalendar class="w-8 h-8 text-info" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Spa Packages Calendar</h2>
              <p class="text-base-content/60">
                View spa and wellness service schedules
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { IconCalendar, IconChevronRight } from '@tabler/icons-vue'
</script>
