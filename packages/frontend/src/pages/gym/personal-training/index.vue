<route lang="yaml">
meta:
  title: Personal Training
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Personal Training</h1>
      <p class="text-base-content/60 mt-1">Manage personal training packages and active sessions</p>
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <router-link
        to="/gym/personal-training/packages"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-primary/10 rounded-xl">
              <IconPackage class="w-8 h-8 text-primary" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">PT Packages</h2>
              <p class="text-base-content/60">
                Manage personal training session packages and pricing
              </p>
            </div>
            <IconChevronRight class="w-6 h-6 text-base-content/40" />
          </div>
        </div>
      </router-link>

      <router-link
        to="/gym/personal-training/active"
        class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
      >
        <div class="card-body">
          <div class="flex items-center gap-4">
            <div class="p-4 bg-success/10 rounded-xl">
              <IconCalendarCheck class="w-8 h-8 text-success" />
            </div>
            <div class="flex-1">
              <h2 class="card-title">Active PT Packages</h2>
              <p class="text-base-content/60">
                Monitor active personal training packages and usage
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
