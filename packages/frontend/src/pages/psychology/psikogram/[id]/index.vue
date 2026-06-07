<route lang="yaml">
meta:
  title: Detail Psikogram
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Content -->
    <div v-else-if="psikogram" class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-2xl font-bold">Detail Psikogram</h1>
          <p class="text-base-content/60">{{ psikogram.participant?.name }}</p>
        </div>
        <div class="flex gap-2">
          <router-link 
            :to="`/psychology/psikogram/${psikogram.id}/edit`"
            class="btn btn-outline btn-sm"
          >
            <IconEdit class="w-4 h-4" />
            Edit
          </router-link>
          <router-link 
            :to="`/psychology/psikogram/${psikogram.id}/print`"
            class="btn btn-primary btn-sm"
            target="_blank"
          >
            <IconPrinter class="w-4 h-4" />
            Print
          </router-link>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="mb-6">
        <span 
          class="badge"
          :class="psikogram.status === 'final' ? 'badge-success' : 'badge-warning'"
        >
          {{ psikogram.status === 'final' ? 'Final' : 'Draft' }}
        </span>
      </div>

      <!-- Biodata Peserta -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">
            <IconUser class="w-5 h-5" />
            Biodata Peserta
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-base-content/60">Nama</span>
              <p class="font-medium">{{ psikogram.participant?.name || '-' }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Tanggal Lahir</span>
              <p class="font-medium">{{ formatDate(psikogram.participant?.birthDate) }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Tanggal Pemeriksaan</span>
              <p class="font-medium">{{ formatDate(psikogram.examDate) }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Pendidikan</span>
              <p class="font-medium">{{ psikogram.participant?.education || '-' }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Perusahaan</span>
              <p class="font-medium">{{ psikogram.participant?.corporate || '-' }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Pemeriksa</span>
              <p class="font-medium">{{ psikogram.examiner?.name || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections -->
      <div class="space-y-6">
        <!-- A. Kecerdasan -->
        <SectionCard
          title="A. Kecerdasan"
          icon="brain"
          :items="psikogram.sections?.kecerdasan?.items || []"
          :conclusion="psikogram.sections?.kecerdasan?.conclusion"
        />

        <!-- B. Sikap dan Cara Kerja -->
        <SectionCard
          title="B. Sikap dan Cara Kerja"
          icon="briefcase"
          :items="psikogram.sections?.sikapKerja?.items || []"
          :conclusion="psikogram.sections?.sikapKerja?.conclusion"
        />

        <!-- C. Kepribadian -->
        <SectionCard
          title="C. Kepribadian"
          icon="heart"
          :items="psikogram.sections?.kepribadian?.items || []"
          :conclusion="psikogram.sections?.kepribadian?.conclusion"
        />

        <!-- D. Kemampuan Belajar -->
        <SectionCard
          title="D. Kemampuan Belajar"
          icon="school"
          :items="psikogram.sections?.kemampuanBelajar?.items || []"
          :conclusion="psikogram.sections?.kemampuanBelajar?.conclusion"
        />
      </div>

      <!-- Rekomendasi -->
      <div class="card bg-base-100 shadow-xl mt-6">
        <div class="card-body">
          <h2 class="card-title mb-4">Rekomendasi</h2>
          <div class="flex gap-4">
            <div 
              class="badge badge-lg gap-2 p-4"
              :class="psikogram.recommendation === 'recommended' ? 'badge-success' : 'badge-ghost'"
            >
              <IconCheck class="w-4 h-4" />
              Disarankan
            </div>
            <div 
              class="badge badge-lg gap-2 p-4"
              :class="psikogram.recommendation === 'not_recommended' ? 'badge-error' : 'badge-ghost'"
            >
              <IconX class="w-4 h-4" />
              Tidak Disarankan
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
      <p class="text-base-content/60">Psikogram tidak ditemukan</p>
      <button class="btn btn-primary btn-sm mt-4" @click="goBack">
        Kembali
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconArrowLeft,
  IconEdit,
  IconPrinter,
  IconUser,
  IconCheck,
  IconX,
  IconFileOff
} from '@tabler/icons-vue'
import { usePsikogram } from '@/composables/psychology'
import SectionCard from '@/components/psychology/psikogram/SectionCard.vue'

const { getPsikogramById, loading } = usePsikogram()

const route = useRoute()
const router = useRouter()

const psikogram = ref(null)

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const goBack = () => {
  router.push('/psychology/psikogram')
}

const loadPsikogram = async () => {
  const id = route.params.id
  
  try {
    const data = await getPsikogramById(id)
    psikogram.value = data
  } catch (error) {
    console.error('Error loading psikogram:', error)
    psikogram.value = null
  }
}

onMounted(() => {
  loadPsikogram()
})
</script>
