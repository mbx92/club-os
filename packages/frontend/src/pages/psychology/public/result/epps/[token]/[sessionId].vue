<route lang="yaml">
meta:
  title: Hasil EPPS
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
      <div v-else-if="result">
        <!-- Header -->
        <div class="text-center mb-8">
          <IconCircleCheck class="w-16 h-16 mx-auto mb-4 text-success" />
          <h1 class="text-3xl font-bold mb-2">Tes Selesai!</h1>
          <p class="text-base-content/60">
            Terima kasih telah menyelesaikan tes EPPS
          </p>
        </div>

        <!-- Test Info -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Informasi Tes</h2>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-base-content/60">Jenis Tes</p>
                <p class="font-medium">EPPS</p>
              </div>
              <div>
                <p class="text-base-content/60">Kode</p>
                <p class="font-medium">EPPS</p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Mulai</p>
                <p class="font-medium">
                  {{ formatDateTime(result.session?.startedAt) }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Waktu Selesai</p>
                <p class="font-medium">
                  {{ formatDateTime(result.session?.completedAt) }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Durasi Pengerjaan</p>
                <p class="font-medium">
                  {{
                    calculateDuration(
                      result.session?.startedAt,
                      result.session?.completedAt
                    )
                  }}
                </p>
              </div>
              <div>
                <p class="text-base-content/60">Soal Terjawab</p>
                <p class="font-medium">225/225</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Verification Notice -->
        <div
          v-if="!result.session?.verifiedAt"
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
          v-if="!result.isProcessed"
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

        <!-- EPPS Profile Chart (only show if verified) -->
        <div
          v-if="result.session?.verifiedAt"
          class="card bg-base-100 shadow-xl mb-6"
        >
          <div class="card-body">
            <h2 class="card-title mb-4">Profil EPPS</h2>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th class="w-24">Need</th>
                    <th class="text-center">- - -</th>
                    <th class="text-center">- -</th>
                    <th class="text-center">-</th>
                    <th class="text-center">0</th>
                    <th class="text-center">+</th>
                    <th class="text-center">+ +</th>
                    <th class="text-center">+ + +</th>
                    <th class="text-center w-16">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="scale in eppsScales" :key="scale.id">
                    <td class="font-medium">
                      <div class="tooltip" :data-tip="scale.description">
                        {{ scale.id.toUpperCase() }}
                      </div>
                    </td>
                    <td
                      v-for="cat in categories"
                      :key="cat"
                      class="text-center"
                    >
                      <div
                        v-if="getScaleCategory(scale.id) === cat"
                        class="w-4 h-4 rounded-full mx-auto"
                        :class="getCategoryDotClass(cat)"
                      ></div>
                    </td>
                    <td class="text-center font-bold">
                      {{ result.scores?.[scale.id] ?? "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 mt-4 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-error"></div>
                <span>Sangat Rendah (- - -)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-warning"></div>
                <span>Rendah (- -, -)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-info"></div>
                <span>Rata-rata (0)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-success"></div>
                <span>Tinggi (+, + +, + + +)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Top & Low Needs (only show if verified) -->
        <div
          v-if="result.session?.verifiedAt"
          class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
        >
          <!-- Dominant Needs -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-success mb-4">
                <IconTrendingUp class="w-5 h-5" />
                Need Dominan
              </h2>
              <div class="space-y-3">
                <div
                  v-for="need in dominantNeeds"
                  :key="need.id"
                  class="p-3 bg-success/10 rounded-lg"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-success">{{
                      need.id.toUpperCase()
                    }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-bold">{{ need.score }}</span>
                      <span class="badge badge-success badge-sm">{{
                        need.category
                      }}</span>
                    </div>
                  </div>
                  <p class="text-sm text-base-content/70">{{ need.name }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Low Needs -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title text-warning mb-4">
                <IconTrendingDown class="w-5 h-5" />
                Need Rendah
              </h2>
              <div class="space-y-3">
                <div
                  v-for="need in lowNeeds"
                  :key="need.id"
                  class="p-3 bg-warning/10 rounded-lg"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-warning">{{
                      need.id.toUpperCase()
                    }}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-lg font-bold">{{ need.score }}</span>
                      <span class="badge badge-warning badge-sm">{{
                        need.category
                      }}</span>
                    </div>
                  </div>
                  <p class="text-sm text-base-content/70">{{ need.name }}</p>
                </div>
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

const { result, loading, error, getResult } = usePsychologyPublic();

const token = computed(() => route.params.token);
const sessionId = computed(() => route.params.sessionId);

const loadResult = async () => {
  await getResult(token.value, sessionId.value);
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
