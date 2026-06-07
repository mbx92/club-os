<route lang="yaml">
meta:
  title: Rekap Penjualan Harian
  layout: default
</route>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useReports } from "@/composables/shared/useReports";
import dayjs from "dayjs";
import {
  IconArrowLeft,
  IconCalendarStats,
  IconDownload,
  IconCalendarEvent,
} from "@tabler/icons-vue";

const router = useRouter();
const { getDailySummaryExport, loading } = useReports();

const startDate = ref(dayjs().startOf("month").format("YYYY-MM-DD"));
const endDate = ref(dayjs().format("YYYY-MM-DD"));

const handleDownload = () => {
  getDailySummaryExport({ startDate: startDate.value, endDate: endDate.value });
};

const setThisMonth = () => {
  startDate.value = dayjs().startOf("month").format("YYYY-MM-DD");
  endDate.value = dayjs().endOf("month").format("YYYY-MM-DD");
};

const setLastMonth = () => {
  startDate.value = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  endDate.value = dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
};
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <button class="btn btn-circle btn-ghost" @click="router.back()">
        <IconArrowLeft class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-3">
          <IconCalendarStats class="w-8 h-8 text-primary" />
          Rekap Penjualan
        </h1>
        <p class="text-base-content/60 mt-1">
          Unduh laporan total penjualan harian dalam format Excel/CSV
        </p>
      </div>
    </div>

    <!-- Main Card -->
    <div class="card bg-base-100 border border-base-200 shadow-sm" style="border-top: 4px solid oklch(var(--p))">
      <div class="card-body p-6 sm:p-8">
        <h2 class="card-title text-lg mb-5 flex items-center gap-2">
          <IconCalendarEvent class="w-5 h-5 text-base-content/70" />
          Filter Rentang Waktu
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div class="form-control">
            <label class="label pt-0">
              <span class="label-text font-medium">Tanggal Mulai</span>
            </label>
            <input
              v-model="startDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
          <div class="form-control">
            <label class="label pt-0">
              <span class="label-text font-medium">Tanggal Akhir</span>
            </label>
            <input
              v-model="endDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Quick Filters -->
        <div class="flex gap-2 mt-4">
          <span class="text-xs text-base-content/50 self-center mr-1">Cepat:</span>
          <button class="btn btn-xs btn-ghost bg-base-200" @click="setThisMonth">Bulan Ini</button>
          <button class="btn btn-xs btn-ghost bg-base-200" @click="setLastMonth">Bulan Lalu</button>
        </div>

        <div class="divider my-4"></div>

        <div class="flex justify-end">
          <button
            class="btn btn-primary gap-2 min-w-[180px]"
            :disabled="loading || !startDate || !endDate"
            @click="handleDownload"
          >
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
            <IconDownload v-else class="w-5 h-5" />
            {{ loading ? "Memproses..." : "Unduh Laporan" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
