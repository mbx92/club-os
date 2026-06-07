<route lang="yaml">
name: psychology-results-papi-index
meta:
  title: Hasil PAPI Kostick
  layout: default
  requiresModule: psychology
</route>

<template>
  <div class="w-full space-y-6 px-4 pb-12">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Hasil Tes PAPI Kostick</h1>
        <p class="text-sm text-base-content/60">Daftar hasil tes PAPI Kostick</p>
      </div>
      <router-link to="/psychology/sessions" class="btn btn-outline btn-sm">
        <IconArrowLeft class="w-4 h-4" />
        Kembali ke Sesi
      </router-link>
    </header>

    <!-- Info Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-start gap-4">
          <div class="p-3 bg-primary/10 rounded-lg">
            <IconClipboardList class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg">PAPI Kostick</h3>
            <p class="text-sm text-base-content/70">
              Personality and Preference Inventory adalah alat ukur kepribadian yang digunakan untuk menilai 
              perilaku dan gaya kerja seseorang di lingkungan profesional. Mengukur 20 aspek kepribadian 
              yang terbagi menjadi 10 needs (kebutuhan) dan 10 roles (peran).
            </p>
            <div class="flex flex-wrap gap-2 mt-3">
              <span class="badge badge-outline">90 Soal</span>
              <span class="badge badge-outline">20 Skala</span>
              <span class="badge badge-outline">Forced Choice</span>
              <span class="badge badge-outline">~30 Menit</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scales Overview -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">Skala yang Diukur</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <div 
            v-for="(desc, code) in scaleDescriptions" 
            :key="code"
            class="p-3 bg-base-200 rounded-lg text-center"
          >
            <div class="text-lg font-bold text-primary">{{ code }}</div>
            <div class="text-xs text-base-content/60 line-clamp-2">{{ desc.split('(')[0].trim() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigate to session to see results -->
    <div class="text-center py-8">
      <p class="text-base-content/60 mb-4">
        Untuk melihat hasil tes PAPI Kostick, silakan pilih sesi dari halaman Sesi Tes.
      </p>
      <router-link to="/psychology/sessions" class="btn btn-primary">
        <IconList class="w-4 h-4" />
        Lihat Daftar Sesi
      </router-link>
    </div>
  </div>
</template>

<script setup>
import {
  IconArrowLeft,
  IconClipboardList,
  IconList,
} from '@tabler/icons-vue'
import { scaleDescriptions } from '@/data/papikostick'
</script>
