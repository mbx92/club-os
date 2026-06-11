<template>
  <div class="space-y-6">
    <!-- Step indicator -->
    <ul class="steps steps-horizontal w-full text-xs">
      <li class="step" :class="{ 'step-primary': step >= 1 }">Pilih Backup</li>
      <li class="step" :class="{ 'step-primary': step >= 2 }">Analisis</li>
      <li class="step" :class="{ 'step-primary': step >= 3 }">Bersihkan</li>
      <li class="step" :class="{ 'step-primary': step >= 4 }">Selesai</li>
    </ul>

    <!-- Step 1: Select source -->
    <div class="card bg-base-200 shadow">
      <div class="card-body gap-4">
        <h3 class="card-title text-lg">
          <IconFileDatabase class="w-5 h-5" />
          1. Pilih File Backup Production
        </h3>
        <p class="text-sm text-base-content/70">
          File SQL dari folder <code class="text-xs">packages/</code>, <code class="text-xs">db_bak/</code>, atau <code class="text-xs">backups/</code>.
        </p>

        <div v-if="loadingSources" class="flex justify-center py-6">
          <span class="loading loading-spinner loading-md text-primary" />
        </div>

        <div v-else-if="sources.length === 0" class="alert alert-info">
          <IconInfoCircle class="w-5 h-5" />
          <span>Tidak ada file .sql ditemukan. Letakkan backup di folder packages atau db_bak.</span>
        </div>

        <div v-else class="grid gap-3">
          <label
            v-for="source in sources"
            :key="source.id"
            class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
            :class="selectedSourceId === source.id ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'"
          >
            <input
              v-model="selectedSourceId"
              type="radio"
              name="import-source"
              class="radio radio-primary radio-sm mt-1"
              :value="source.id"
            >
            <div class="min-w-0 flex-1">
              <div class="font-mono text-sm break-all">{{ source.filename }}</div>
              <div class="mt-1 flex flex-wrap gap-2 text-xs text-base-content/60">
                <span class="badge badge-ghost badge-sm">{{ source.location }}</span>
                <span>{{ source.sizeLabel }}</span>
                <span>{{ formatDate(source.modifiedAt) }}</span>
              </div>
            </div>
          </label>
        </div>

        <div class="card-actions justify-end">
          <button
            class="btn btn-primary btn-sm"
            :disabled="!selectedSourceId || loadingAnalysis"
            @click="handleAnalyze"
          >
            <span v-if="loadingAnalysis" class="loading loading-spinner loading-sm" />
            <IconSearch v-else class="w-4 h-4" />
            Analisis Backup
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Analysis results -->
    <div v-if="analysis" class="card bg-base-200 shadow">
      <div class="card-body gap-4">
        <h3 class="card-title text-lg">
          <IconChartBar class="w-5 h-5" />
          2. Hasil Analisis
        </h3>

        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div class="stat rounded-lg bg-success/10 p-3">
            <div class="stat-title text-xs">KEEP</div>
            <div class="stat-value text-2xl text-success">{{ analysis.summary.keep }}</div>
            <div class="stat-desc text-xs">Data bisnis inti</div>
          </div>
          <div class="stat rounded-lg bg-error/10 p-3">
            <div class="stat-title text-xs">DROP</div>
            <div class="stat-value text-2xl text-error">{{ analysis.summary.drop }}</div>
            <div class="stat-desc text-xs">Modul lama</div>
          </div>
          <div class="stat rounded-lg bg-warning/10 p-3">
            <div class="stat-title text-xs">SKIP</div>
            <div class="stat-value text-2xl text-warning">{{ analysis.summary.skip }}</div>
            <div class="stat-desc text-xs">SequelizeMeta</div>
          </div>
          <div class="stat rounded-lg bg-base-100 p-3">
            <div class="stat-title text-xs">TOTAL</div>
            <div class="stat-value text-2xl">{{ analysis.tableCount }}</div>
            <div class="stat-desc text-xs">Tabel di backup</div>
          </div>
        </div>

        <div class="space-y-2">
          <details class="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg" open>
            <summary class="collapse-title font-medium text-sm">
              KEEP — simpan data ({{ analysis.groups.keep.length }})
            </summary>
            <div class="collapse-content">
              <div class="flex flex-wrap gap-1 pb-2">
                <span v-for="t in analysis.groups.keep" :key="t" class="badge badge-success badge-outline badge-sm">{{ t }}</span>
              </div>
            </div>
          </details>
          <details class="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg">
            <summary class="collapse-title font-medium text-sm">
              DROP — hapus setelah restore ({{ analysis.groups.drop.length }})
            </summary>
            <div class="collapse-content">
              <div class="flex flex-wrap gap-1 pb-2">
                <span v-for="t in analysis.groups.drop" :key="t" class="badge badge-error badge-outline badge-sm">{{ t }}</span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Step 3: Actions -->
    <div v-if="analysis" class="card bg-base-200 shadow">
      <div class="card-body gap-4">
        <h3 class="card-title text-lg">
          <IconTool class="w-5 h-5" />
          3. Aksi Database
        </h3>

        <div v-if="dbStatus" class="alert" :class="dbStatus.environment === 'production' ? 'alert-error' : 'alert-info'">
          <IconDatabase class="w-5 h-5" />
          <div class="text-sm">
            <div><strong>{{ dbStatus.database }}</strong> · {{ dbStatus.environment }} · {{ dbStatus.tableCount }} tabel</div>
            <div v-if="dbStatus.legacyTableCount > 0" class="mt-1 text-error">
              {{ dbStatus.legacyTableCount }} tabel legacy masih ada di database aktif
            </div>
            <div v-if="dbStatus.pendingMigrationCount > 0" class="mt-1 text-warning">
              {{ dbStatus.pendingMigrationCount }} migrasi belum dijalankan
            </div>
          </div>
        </div>

        <div v-if="dbStatus?.environment === 'production'" class="alert alert-error">
          <IconAlertTriangle class="w-5 h-5" />
          <span>Restore & drop legacy diblokir di environment production.</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <!-- Restore -->
          <div class="rounded-xl border border-base-300 bg-base-100 p-4">
            <div class="font-semibold">Restore Backup Penuh</div>
            <p class="mt-1 text-xs text-base-content/60">
              Drop DB dev → restore file SQL. Hanya untuk development.
            </p>
            <button
              class="btn btn-warning btn-sm mt-3 w-full"
              :disabled="runningAction || dbStatus?.environment === 'production'"
              @click="openRestoreConfirm"
            >
              <IconRestore class="w-4 h-4" />
              Restore ke DB Dev
            </button>
          </div>

          <!-- Drop legacy -->
          <div class="rounded-xl border border-base-300 bg-base-100 p-4">
            <div class="font-semibold">Hapus Tabel Legacy</div>
            <p class="mt-1 text-xs text-base-content/60">
              Hapus Psychology, HD, Tickets, Membership lama dari DB aktif.
            </p>
            <button
              class="btn btn-error btn-outline btn-sm mt-3 w-full"
              :disabled="runningAction || !dbStatus?.legacyTableCount || dbStatus?.environment === 'production'"
              @click="openDropConfirm"
            >
              <IconTrash class="w-4 h-4" />
              Drop {{ dbStatus?.legacyTableCount || 0 }} Tabel Legacy
            </button>
          </div>

          <!-- Migrate -->
          <div class="rounded-xl border border-base-300 bg-base-100 p-4">
            <div class="font-semibold">Jalankan Migrasi</div>
            <p class="mt-1 text-xs text-base-content/60">
              Selaraskan skema DB dengan codebase terbaru.
            </p>
            <button
              class="btn btn-primary btn-outline btn-sm mt-3 w-full"
              :disabled="runningAction || dbStatus?.environment === 'production'"
              @click="handleMigrate"
            >
              <IconPlayerPlay class="w-4 h-4" />
              db:migrate
            </button>
          </div>

          <!-- Copy SQL -->
          <div class="rounded-xl border border-base-300 bg-base-100 p-4">
            <div class="font-semibold">Salin SQL Drop Legacy</div>
            <p class="mt-1 text-xs text-base-content/60">
              Untuk dijalankan manual di psql jika diperlukan.
            </p>
            <button
              class="btn btn-ghost btn-sm mt-3 w-full"
              @click="copyDropSql"
            >
              <IconCopy class="w-4 h-4" />
              Copy DROP SQL
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 4: Workflow guide -->
    <div v-if="analysis" class="alert alert-success">
      <IconCircleCheck class="w-5 h-5" />
      <div class="text-sm">
        <div class="font-semibold">Alur yang disarankan:</div>
        <ol class="mt-2 list-decimal list-inside space-y-1">
          <li>Restore backup penuh ke DB dev</li>
          <li>Hapus tabel legacy ({{ analysis.summary.drop }} tabel)</li>
          <li>Jalankan migrasi</li>
          <li>Restart backend + login ulang di frontend</li>
        </ol>
      </div>
    </div>

    <!-- Restore confirm modal -->
    <dialog ref="restoreModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-warning">Restore Database</h3>
        <p class="py-3 text-sm">
          Semua data di <strong>{{ dbStatus?.database }}</strong> akan diganti dengan isi backup:
        </p>
        <p class="font-mono text-xs bg-base-200 p-2 rounded break-all">{{ selectedSourceId }}</p>
        <p class="mt-3 text-sm">Ketik <strong>RESTORE</strong> untuk konfirmasi:</p>
        <input v-model="restoreConfirmText" type="text" class="input input-bordered w-full mt-2" placeholder="RESTORE">
        <div class="modal-action">
          <button class="btn btn-ghost" @click="closeRestoreModal">Batal</button>
          <button
            class="btn btn-warning"
            :disabled="restoreConfirmText !== 'RESTORE' || runningAction"
            @click="handleRestore"
          >
            <span v-if="runningAction" class="loading loading-spinner loading-sm" />
            Restore
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeRestoreModal">close</button></form>
    </dialog>

    <!-- Drop confirm modal -->
    <dialog ref="dropModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error">Hapus Tabel Legacy</h3>
        <p class="py-3 text-sm">
          {{ dbStatus?.legacyTableCount }} tabel legacy akan dihapus permanen dari database aktif.
        </p>
        <p class="text-sm">Ketik <strong>DROP-LEGACY</strong> untuk konfirmasi:</p>
        <input v-model="dropConfirmText" type="text" class="input input-bordered w-full mt-2" placeholder="DROP-LEGACY">
        <div class="modal-action">
          <button class="btn btn-ghost" @click="closeDropModal">Batal</button>
          <button
            class="btn btn-error"
            :disabled="dropConfirmText !== 'DROP-LEGACY' || runningAction"
            @click="handleDropLegacy"
          >
            <span v-if="runningAction" class="loading loading-spinner loading-sm" />
            Hapus
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button @click="closeDropModal">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useProductionImport } from '@/composables/admin/useProductionImport'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconAlertTriangle,
  IconChartBar,
  IconCircleCheck,
  IconCopy,
  IconDatabase,
  IconFileDatabase,
  IconInfoCircle,
  IconPlayerPlay,
  IconRestore,
  IconSearch,
  IconTool,
  IconTrash,
} from '@tabler/icons-vue'

const {
  sources,
  analysis,
  dbStatus,
  loadingSources,
  loadingAnalysis,
  runningAction,
  fetchSources,
  analyzeSource,
  fetchDbStatus,
  dropLegacyTables,
  runMigrations,
  restoreSource,
} = useProductionImport()

const { showSuccess } = useNotification()

const step = ref(1)
const selectedSourceId = ref('')
const restoreModal = ref(null)
const dropModal = ref(null)
const restoreConfirmText = ref('')
const dropConfirmText = ref('')

const formatDate = (iso) => new Date(iso).toLocaleString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const handleAnalyze = async () => {
  await analyzeSource(selectedSourceId.value)
  if (analysis.value) {
    step.value = 2
    await fetchDbStatus()
  }
}

const openRestoreConfirm = () => {
  restoreConfirmText.value = ''
  restoreModal.value?.showModal()
}

const closeRestoreModal = () => {
  restoreModal.value?.close()
  restoreConfirmText.value = ''
}

const handleRestore = async () => {
  try {
    await restoreSource(selectedSourceId.value)
    closeRestoreModal()
    step.value = 3
    await fetchDbStatus()
  } catch {
    // error shown by composable
  }
}

const openDropConfirm = () => {
  dropConfirmText.value = ''
  dropModal.value?.showModal()
}

const closeDropModal = () => {
  dropModal.value?.close()
  dropConfirmText.value = ''
}

const handleDropLegacy = async () => {
  try {
    await dropLegacyTables()
    closeDropModal()
    step.value = 4
  } catch {
    // error shown by composable
  }
}

const handleMigrate = async () => {
  await runMigrations()
  step.value = 4
}

const copyDropSql = async () => {
  if (!analysis.value?.dropSql) return
  await navigator.clipboard.writeText(analysis.value.dropSql)
  showSuccess('DROP SQL disalin ke clipboard')
}

watch(selectedSourceId, () => {
  if (step.value > 1) step.value = 1
  analysis.value = null
})

onMounted(async () => {
  await Promise.all([fetchSources(), fetchDbStatus()])
  if (sources.value.length > 0) {
    selectedSourceId.value = sources.value[0].id
  }
})
</script>
