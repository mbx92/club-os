<route lang="yaml">
meta:
  title: Hasil CFIT
  layout: public
  requiresModule: psychology
  public: true
</route>

<template>
  <div class="min-h-screen bg-base-200 py-8">
    <div class="container mx-auto px-4 max-w-2xl">
      <!-- Loading -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-16"
      >
        <span class="loading loading-spinner loading-lg mb-4"></span>
        <p class="text-base-content/60">Memuat hasil...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
          <h2 class="text-2xl font-bold mb-2">Error</h2>
          <p class="text-base-content/60">{{ error }}</p>
          <button class="btn btn-primary mt-4" @click="goBack">Kembali</button>
        </div>
      </div>

      <!-- Result Content -->
      <div v-else-if="resultData">
        <!-- Header -->
        <div class="text-center mb-8">
          <IconCircleCheck class="w-16 h-16 mx-auto mb-4 text-success" />
          <h1 class="text-3xl font-bold mb-2">Tes Selesai!</h1>
          <p class="text-base-content/60">
            Terima kasih telah menyelesaikan tes CFIT
          </p>
        </div>

        <!-- Test Info -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Informasi Tes</h2>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-base-content/60">Jenis Tes</p>
                <p class="font-medium">CFIT</p>
              </div>
              <div>
                <p class="text-base-content/60">Kode</p>
                <p class="font-medium">CFIT</p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Mulai</p>
                <p class="font-medium">
                  {{ formatDateTime(resultData.session?.startedAt) }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Selesai</p>
                <p class="font-medium">
                  {{ formatDateTime(resultData.session?.completedAt) }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Durasi Pengerjaan</p>
                <p class="font-medium">
                  {{
                    calculateDuration(
                      resultData.session?.startedAt,
                      resultData.session?.completedAt
                    )
                  }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Soal Terjawab</p>
                <p class="font-medium">46/46</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Verification Notice (show if not verified) -->
        <div
          v-if="!resultData.session?.verifiedAt"
          class="card bg-info/10 border border-info shadow-xl mb-6"
        >
          <div class="card-body">
            <div class="flex items-center gap-4">
              <IconClock class="w-10 h-10 text-info" />
              <div>
                <h3 class="font-bold">Menunggu Verifikasi</h3>
                <p class="text-base-content/60">
                  Hasil tes Anda sedang dalam proses verifikasi oleh psikolog.
                  Hasil lengkap akan tersedia setelah diverifikasi.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Processing Notice -->
        <div
          v-if="!resultData.isProcessed"
          class="card bg-warning/10 border border-warning shadow-xl mb-6"
        >
          <div class="card-body">
            <div class="flex items-center gap-4">
              <IconClock class="w-10 h-10 text-warning" />
              <div>
                <h3 class="font-bold">Hasil Sedang Diproses</h3>
                <p class="text-base-content/60">
                  Hasil lengkap akan tersedia dalam beberapa waktu. Silakan
                  kembali lagi nanti.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <button class="btn btn-primary btn-block" @click="backToTestList">
            <IconArrowLeft class="w-5 h-5" />
            Kembali ke Daftar Tes
          </button>

          <button
            class="btn btn-outline btn-block"
            @click="downloadResult"
            disabled
          >
            <IconDownload class="w-5 h-5" />
            Download Hasil (PDF)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconClock,
  IconArrowLeft,
  IconDownload,
} from "@tabler/icons-vue";
import { usePsychologyPublic } from "@/composables/psychology";

const route = useRoute();
const router = useRouter();
const { getResult } = usePsychologyPublic();

const resultData = ref(null);
const loading = ref(true);
const error = ref(null);

const token = computed(() => route.params.token);
const sessionId = computed(() => route.params.sessionId);

// Load result data
const loadResult = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await getResult(token.value, sessionId.value);
    resultData.value = data;
  } catch (err) {
    console.error("Error loading CFIT result:", err);
    error.value = err.message || "Terjadi kesalahan saat memuat data";
  } finally {
    loading.value = false;
  }
};

const formatDateTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return "-";

  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);

  return `${diffMins} menit ${diffSecs} detik`;
};

const backToTestList = () => {
  router.push(`/psychology/public/access/${token.value}`);
};

const goBack = () => {
  router.push(`/psychology/public/access/${token.value}`);
};

const downloadResult = () => {
  // TODO: Implement PDF download
  alert("Fitur download PDF akan segera tersedia");
};

onMounted(() => {
  loadResult();
});
</script>
