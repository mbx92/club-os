<route lang="yaml">
meta:
  title: Spa & Wellness
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Spa & Wellness</h1>
      <p class="text-base-content/60 mt-1">Manage spa treatments and wellness service packages</p>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <router-link
        to="/gym/spa/packages"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-primary/10 rounded-xl">
              <IconPackage class="w-8 h-8 text-primary" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Spa Packages</h2>
              <p class="text-base-content/60">
                Manage spa treatments and wellness service packages
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>

      <router-link
        to="/gym/spa/active"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-success/10 rounded-xl">
              <IconCalendarCheck class="w-8 h-8 text-success" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Active Spa Packages</h2>
              <p class="text-base-content/60">
                Monitor active spa and wellness service packages
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
import { IconPackage, IconCalendarCheck, IconChevronRight } from '@tabler/icons-vue'
</script>
