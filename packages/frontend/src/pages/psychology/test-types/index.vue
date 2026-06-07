<route lang="yaml">
meta:
  title: Jenis Tes
  layout: default
  requiresModule: psychology
</route>

<template>
  <div>
    <!-- Page Header -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-3xl font-bold">Jenis Tes</h1>
        <p class="text-base-content/60 mt-1">Kelola jenis tes psikologi</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-primary" @click="openImportModal()">
          <IconUpload class="w-5 h-5" />
          Import
        </button>
        <button class="btn btn-primary" @click="openFormModal()">
          <IconPlus class="w-5 h-5" />
          Tambah Jenis Tes
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <!-- Search Input -->
          <div class="form-control lg:col-span-5">
            <label class="label">
              <span class="label-text font-medium">Pencarian</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Cari nama atau kode tes..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Category Filter -->
          <div class="form-control lg:col-span-3">
            <label class="label">
              <span class="label-text font-medium">Kategori</span>
            </label>
            <select
              v-model="filters.category"
              class="select select-bordered w-full"
              @change="handleSearch"
            >
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select
              v-model="filters.status"
              class="select select-bordered w-full"
              @change="handleSearch"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Non-aktif</option>
            </select>
          </div>

          <!-- Limit -->
          <div class="form-control lg:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Tampil</span>
            </label>
            <select
              v-model="filters.limit"
              class="select select-bordered w-full"
              @change="handleSearch"
            >
              <option :value="12">12</option>
              <option :value="24">24</option>
              <option :value="48">48</option>
            </select>
          </div>
        </div>

        <!-- Active Filters Info -->
        <div
          v-if="hasActiveFilters"
          class="flex items-center gap-2 mt-4 pt-4 border-t border-base-300"
        >
          <span class="text-sm text-base-content/60">Filter aktif:</span>
          <div class="flex flex-wrap gap-2">
            <div
              v-if="filters.search"
              class="badge badge-primary badge-outline gap-1"
            >
              Cari: "{{ filters.search }}"
              <button
                class="btn btn-ghost btn-xs btn-circle"
                @click="clearFilter('search')"
              >
                ✕
              </button>
            </div>

            <div
              v-if="filters.category"
              class="badge badge-primary badge-outline gap-1"
            >
              Kategori: {{ filters.category }}
              <button
                class="btn btn-ghost btn-xs btn-circle"
                @click="clearFilter('category')"
              >
                ✕
              </button>
            </div>
            <div
              v-if="filters.status"
              class="badge badge-primary badge-outline gap-1"
            >
              Status: {{ filters.status === "active" ? "Aktif" : "Non-aktif" }}
              <button
                class="btn btn-ghost btn-xs btn-circle"
                @click="clearFilter('status')"
              >
                ✕
              </button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="clearAllFilters">
              Hapus Semua
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Types Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Loading -->
      <template v-if="loading">
        <div
          v-for="i in 6"
          :key="i"
          class="card bg-base-100 shadow-xl animate-pulse"
        >
          <div class="card-body">
            <div class="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-base-300 rounded w-1/2 mb-4"></div>
            <div class="space-y-2">
              <div class="h-4 bg-base-300 rounded"></div>
              <div class="h-4 bg-base-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Test Types List -->
      <template v-else-if="testTypes?.length > 0">
        <div
          v-for="testType in testTypes"
          :key="testType.id"
          class="card bg-base-100 shadow-xl"
        >
          <div class="card-body">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h3 class="card-title">{{ testType.name }}</h3>
                <p class="text-sm text-base-content/60">{{ testType.code }}</p>
              </div>
              <div
                class="badge"
                :class="testType.isActive ? 'badge-success' : 'badge-ghost'"
              >
                {{ testType.isActive ? "Aktif" : "Non-aktif" }}
              </div>
            </div>

            <div v-if="testType.category" class="mb-2">
              <span class="badge badge-outline badge-sm">{{
                testType.category
              }}</span>
            </div>

            <p class="text-base-content/70 text-sm line-clamp-2 mb-4">
              {{ testType.description || "Tidak ada deskripsi" }}
            </p>

            <div class="flex items-center gap-4 text-sm mb-4">
              <div class="flex items-center gap-2">
                <IconClock class="w-4 h-4 text-base-content/60" />
                <span>{{ testType.estimatedDuration }} menit</span>
              </div>
              <div class="flex items-center gap-2">
                <IconListCheck class="w-4 h-4 text-base-content/60" />
                <span>{{ testType.questionCount }} soal</span>
              </div>
            </div>

            <div class="card-actions justify-end">
              <button
                class="btn btn-ghost btn-sm"
                @click="exportTestType(testType)"
                :disabled="exportingId === testType.id"
              >
                <span v-if="exportingId === testType.id" class="loading loading-spinner loading-xs"></span>
                <IconDownload v-else class="w-4 h-4" />
                Export
              </button>
              <button
                class="btn btn-ghost btn-sm"
                @click="openConfigModal(testType)"
              >
                <IconSettings class="w-4 h-4" />
                Config
              </button>
              <button
                class="btn btn-ghost btn-sm"
                @click="openFormModal(testType)"
              >
                <IconEdit class="w-4 h-4" />
                Edit
              </button>
              <button
                class="btn btn-ghost btn-sm text-error"
                @click="confirmDelete(testType)"
              >
                <IconTrash class="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="col-span-full">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body text-center py-12">
            <IconClipboardOff
              class="w-16 h-16 mx-auto text-base-content/30 mb-4"
            />
            <h3 class="text-lg font-semibold mb-2">Tidak ada jenis tes</h3>
            <p class="text-base-content/60 mb-4">
              Tambahkan jenis tes baru untuk memulai
            </p>
            <button class="btn btn-primary" @click="openFormModal()">
              <IconPlus class="w-5 h-5" />
              Tambah Jenis Tes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="testTypes?.length > 0" class="flex justify-center mt-6">
      <div class="join">
        <button
          class="join-item btn btn-sm"
          :disabled="pagination.page <= 1"
          @click="changePage(pagination.page - 1)"
        >
          <IconChevronLeft class="w-4 h-4" />
        </button>
        <button
          v-for="page in visiblePages"
          :key="page"
          class="join-item btn btn-sm"
          :class="{ 'btn-active': page === pagination.page }"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
        <button
          class="join-item btn btn-sm"
          :disabled="pagination.page >= pagination.totalPages"
          @click="changePage(pagination.page + 1)"
        >
          <IconChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Form Modal -->
    <dialog ref="formModal" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ selectedTestType ? "Edit Jenis Tes" : "Tambah Jenis Tes" }}
        </h3>

        <form @submit.prevent="saveTestType">
          <div class="space-y-4">
            <!-- Row 1: Nama & Kode -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Nama Tes <span class="text-error">*</span></span
                  >
                </label>
                <input
                  type="text"
                  v-model="form.name"
                  class="input input-bordered w-full"
                  placeholder="Masukkan nama tes"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Kode <span class="text-error">*</span></span
                  >
                </label>
                <input
                  type="text"
                  v-model="form.code"
                  class="input input-bordered w-full"
                  placeholder="Contoh: MMPI, DISC, PAPI"
                  required
                />
              </div>
            </div>

            <!-- Row 2: Kategori & Deskripsi -->
            <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Kategori</span>
                </label>
                <select
                  v-model="form.category"
                  class="select select-bordered w-full"
                >
                  <option value="">Pilih Kategori</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Row 3: Durasi & Jumlah Soal -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Estimasi Durasi (menit)
                    <span class="text-error">*</span></span
                  >
                </label>
                <input
                  type="number"
                  v-model.number="form.estimatedDuration"
                  class="input input-bordered w-full"
                  min="1"
                  placeholder="30"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Jumlah Soal <span class="text-error">*</span></span
                  >
                </label>
                <input
                  type="number"
                  v-model.number="form.questionCount"
                  class="input input-bordered w-full"
                  min="1"
                  placeholder="90"
                  required
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Deskripsi</span>
              </label>
              <textarea
                v-model="form.description"
                class="textarea textarea-bordered w-full"
                rows="2"
                placeholder="Deskripsi singkat tentang jenis tes ini"
              ></textarea>
            </div>

            <!-- JSONB Fields - Only show for create -->
            <template v-if="!selectedTestType">
              <!-- Tabs for JSONB data -->
              <div role="tablist" class="tabs tabs-bordered">
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  :class="{ 'tab-active': createTab === 'questions' }"
                  @click="createTab = 'questions'"
                >
                  Soal <span class="text-error">*</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  :class="{ 'tab-active': createTab === 'config' }"
                  @click="createTab = 'config'"
                >
                  Config
                </button>
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  :class="{ 'tab-active': createTab === 'scoring' }"
                  @click="createTab = 'scoring'"
                >
                  Scoring
                </button>
                <button
                  type="button"
                  role="tab"
                  class="tab"
                  :class="{ 'tab-active': createTab === 'schema' }"
                  @click="createTab = 'schema'"
                >
                  Schema
                </button>
              </div>

              <!-- Questions Tab -->
              <div v-show="createTab === 'questions'" class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Data Soal (JSON) <span class="text-error">*</span></span
                  >
                </label>
                <textarea
                  v-model="createJsonData.questions"
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  :class="{ 'textarea-error': createJsonErrors.questions }"
                  rows="8"
                  placeholder='[{"id": 1, "textA": "...", "textB": "...", "scaleA": "G", "scaleB": "E"}, ...]'
                ></textarea>
                <label class="label">
                  <span
                    v-if="createJsonErrors.questions"
                    class="label-text-alt text-error"
                    >{{ createJsonErrors.questions }}</span
                  >
                  <span v-else class="label-text-alt text-base-content/60">
                    Paste array JSON berisi data soal. Jumlah:
                    {{ parsedQuestionsCount }}
                  </span>
                </label>
              </div>

              <!-- Config Tab -->
              <div v-show="createTab === 'config'" class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Config (JSON)</span>
                </label>
                <textarea
                  v-model="createJsonData.config"
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  :class="{ 'textarea-error': createJsonErrors.config }"
                  rows="8"
                  placeholder='{
  "allowBack": true,
  "showProgress": true,
  "randomizeQuestions": false,
  "timeLimit": null
}'
                ></textarea>
                <label class="label">
                  <span
                    v-if="createJsonErrors.config"
                    class="label-text-alt text-error"
                    >{{ createJsonErrors.config }}</span
                  >
                  <span v-else class="label-text-alt text-base-content/60"
                    >Konfigurasi tes (opsional)</span
                  >
                </label>
              </div>

              <!-- Scoring Config Tab -->
              <div v-show="createTab === 'scoring'" class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Scoring Config (JSON)</span
                  >
                </label>
                <textarea
                  v-model="createJsonData.scoringConfig"
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  :class="{ 'textarea-error': createJsonErrors.scoringConfig }"
                  rows="8"
                  placeholder='{
  "scales": ["G", "E", "A", ...],
  "maxPerScale": 9,
  "scaleLabels": {"G": "Hard Working", ...}
}'
                ></textarea>
                <label class="label">
                  <span
                    v-if="createJsonErrors.scoringConfig"
                    class="label-text-alt text-error"
                    >{{ createJsonErrors.scoringConfig }}</span
                  >
                  <span v-else class="label-text-alt text-base-content/60"
                    >Konfigurasi penilaian (opsional)</span
                  >
                </label>
              </div>

              <!-- Answer Schema Tab -->
              <div v-show="createTab === 'schema'" class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Answer Schema (JSON)</span
                  >
                </label>
                <textarea
                  v-model="createJsonData.answerSchema"
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  :class="{ 'textarea-error': createJsonErrors.answerSchema }"
                  rows="8"
                  placeholder="{}"
                ></textarea>
                <label class="label">
                  <span
                    v-if="createJsonErrors.answerSchema"
                    class="label-text-alt text-error"
                    >{{ createJsonErrors.answerSchema }}</span
                  >
                  <span v-else class="label-text-alt text-base-content/60"
                    >Skema jawaban (opsional)</span
                  >
                </label>
              </div>
            </template>

            <!-- Status -->
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  v-model="form.isActive"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text font-medium">{{
                  form.isActive ? "Aktif" : "Non-aktif"
                }}</span>
              </label>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeFormModal">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span
                v-if="saving"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ selectedTestType ? "Simpan" : "Tambah" }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Config Modal -->
    <dialog ref="configModal" class="modal">
      <div class="modal-box max-w-6xl w-full h-[90vh] max-h-[90vh] flex flex-col p-0">
        <div class="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-lg">
              Konfigurasi: {{ configData?.name }}
            </h3>
            <span
              v-if="savingConfig"
              class="loading loading-spinner loading-sm text-primary"
            ></span>
            <span v-if="configSaved" class="text-success text-sm"
              >✓ Tersimpan</span
            >
          </div>
          <button
            class="btn btn-ghost btn-sm btn-circle"
            @click="closeConfigModal"
          >
            ✕
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loadingConfig" class="flex justify-center py-8 flex-1">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Config Content -->
        <div v-else-if="configData" class="flex flex-col flex-1 overflow-hidden">
          <!-- Basic Info -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-4 shrink-0">
            <div class="stat bg-base-200 rounded-lg p-4">
              <div class="stat-title text-xs">Kode</div>
              <div class="stat-value text-lg">{{ configData.code }}</div>
            </div>
            <div class="stat bg-base-200 rounded-lg p-4">
              <div class="stat-title text-xs">Jumlah Soal</div>
              <div class="stat-value text-lg">
                {{ configData.questionCount }}
              </div>
            </div>
            <div class="stat bg-base-200 rounded-lg p-4">
              <div class="stat-title text-xs">Durasi</div>
              <div class="stat-value text-lg">
                {{ configData.estimatedDuration }} min
              </div>
            </div>
            <div class="stat bg-base-200 rounded-lg p-4">
              <div class="stat-title text-xs">Versi</div>
              <div class="stat-value text-lg">{{ configData.version }}</div>
            </div>
          </div>

          <!-- Tabs -->
          <div role="tablist" class="tabs tabs-bordered px-6 shrink-0">
            <button
              role="tab"
              class="tab"
              :class="{ 'tab-active': configTab === 'questions' }"
              @click="configTab = 'questions'"
            >
              Soal ({{ actualQuestionCount }})
            </button>
            <button
              role="tab"
              class="tab"
              :class="{ 'tab-active': configTab === 'scoring' }"
              @click="configTab = 'scoring'"
            >
              Scoring Config
            </button>
            <button
              role="tab"
              class="tab"
              :class="{ 'tab-active': configTab === 'settings' }"
              @click="configTab = 'settings'"
            >
              Settings
            </button>
            <button
              role="tab"
              class="tab"
              :class="{ 'tab-active': configTab === 'schema' }"
              @click="configTab = 'schema'"
            >
              Answer Schema
            </button>
          </div>

          <!-- Tab Content - Scrollable Area -->
          <div class="flex-1 overflow-auto px-6 py-4">
            <!-- Questions Tab -->
            <div v-if="configTab === 'questions'">
              <div
                v-if="configData.questions?.length > 0"
              >
                <table class="table table-zebra table-sm">
                  <thead class="sticky top-0 bg-base-100 z-10 shadow-sm">
                    <tr>
                      <th
                        v-for="col in questionColumns"
                        :key="col.key"
                        :class="col.class"
                      >
                        {{ col.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(q, idx) in configData.questions"
                      :key="q.id || idx"
                      :class="{ 'bg-info/10': q.type === 'instruction', 'bg-warning/10': q.type === 'example' }"
                    >
                      <td
                        v-for="col in questionColumns"
                        :key="col.key"
                        :class="col.cellClass"
                      >
                        <!-- ID column (readonly) -->
                        <span v-if="col.key === 'id'" class="font-mono text-xs">{{
                          q[col.key]
                        }}</span>
                        <!-- Empty value -->
                        <span v-else-if="q[col.key] === undefined || q[col.key] === null" class="text-base-content/30">-</span>
                        <!-- Array fields (options) - show items horizontally -->
                        <div v-else-if="Array.isArray(q[col.key])" class="flex flex-wrap gap-1">
                          <span 
                            v-for="(item, itemIdx) in q[col.key]" 
                            :key="itemIdx"
                            class="badge badge-outline badge-xs font-mono"
                          >
                            {{ item }}
                          </span>
                        </div>
                        <!-- Object fields - show edit button for instruction content -->
                        <button 
                          v-else-if="typeof q[col.key] === 'object'" 
                          class="btn btn-ghost btn-xs"
                          @click="openInstructionEditor(idx)"
                          :title="JSON.stringify(q[col.key], null, 2)"
                        >
                          <IconEdit class="w-3 h-3 mr-1" />
                          Edit
                        </button>
                        <!-- Boolean fields -->
                        <input
                          v-else-if="col.type === 'boolean'"
                          type="checkbox"
                          v-model="configData.questions[idx][col.key]"
                          class="checkbox checkbox-sm"
                          @change="saveConfigDebounced('questions')"
                        />
                        <!-- Number fields -->
                        <input
                          v-else-if="col.type === 'number'"
                          type="number"
                          v-model.number="configData.questions[idx][col.key]"
                          class="input input-bordered input-sm w-20 text-center"
                          @change="saveConfigDebounced('questions')"
                        />
                        <!-- Short text (scale, code, type, answer, etc) -->
                        <input
                          v-else-if="col.isShort"
                          type="text"
                          v-model="configData.questions[idx][col.key]"
                          class="input input-bordered input-sm w-16 text-center"
                          @change="saveConfigDebounced('questions')"
                        />
                        <!-- Long text (imagePath, text, etc) -->
                        <input
                          v-else
                          type="text"
                          v-model="configData.questions[idx][col.key]"
                          class="input input-bordered input-sm w-full min-w-[200px]"
                          @change="saveConfigDebounced('questions')"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                Tidak ada data soal
              </div>
            </div>

            <!-- Scoring Config Tab -->
            <div v-else-if="configTab === 'scoring'">
              <div v-if="configData.scoringConfig" class="space-y-4">
                <!-- Scoring Type -->
                <div v-if="configData.scoringConfig.type" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Scoring Type</span>
                  </label>
                  <input
                    type="text"
                    v-model="configData.scoringConfig.type"
                    class="input input-bordered w-64"
                    @change="saveConfigDebounced('scoringConfig')"
                  />
                </div>

                <!-- Max Score Config (various field names) -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div v-if="configData.scoringConfig.maxPerScale" class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Max Per Scale</span>
                    </label>
                    <input
                      type="number"
                      v-model.number="configData.scoringConfig.maxPerScale"
                      class="input input-bordered"
                      min="1"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                  <div v-if="configData.scoringConfig.maxScorePerScale" class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Max Score Per Scale</span>
                    </label>
                    <input
                      type="number"
                      v-model.number="configData.scoringConfig.maxScorePerScale"
                      class="input input-bordered"
                      min="1"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                  <div v-if="configData.scoringConfig.maxScorePerNeed" class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Max Score Per Need</span>
                    </label>
                    <input
                      type="number"
                      v-model.number="configData.scoringConfig.maxScorePerNeed"
                      class="input input-bordered"
                      min="1"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                  <div v-if="configData.scoringConfig.maxRawScore" class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Max Raw Score</span>
                    </label>
                    <input
                      type="number"
                      v-model.number="configData.scoringConfig.maxRawScore"
                      class="input input-bordered"
                      min="1"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                </div>

                <!-- Scales (PAPI) -->
                <div v-if="configData.scoringConfig.scales?.length" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Scales ({{ configData.scoringConfig.scales.length }})</span
                    >
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="scale in configData.scoringConfig.scales"
                      :key="scale"
                      class="badge badge-primary badge-outline"
                    >
                      {{ scale }}
                    </span>
                  </div>
                </div>

                <!-- Needs (EPPS) -->
                <div v-if="configData.scoringConfig.needs?.length" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Needs ({{ configData.scoringConfig.needs.length }})</span
                    >
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="need in configData.scoringConfig.needs"
                      :key="need"
                      class="badge badge-secondary badge-outline"
                    >
                      {{ need.toUpperCase() }}
                    </span>
                  </div>
                </div>

                <!-- Consistency (EPPS) -->
                <div v-if="configData.scoringConfig.consistency?.length" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Consistency Scales</span>
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="cons in configData.scoringConfig.consistency"
                      :key="cons"
                      class="badge badge-accent badge-outline"
                    >
                      {{ cons }}
                    </span>
                  </div>
                </div>

                <!-- Subtests Array (IST) -->
                <div v-if="Array.isArray(configData.scoringConfig.subtests)" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Subtests ({{ configData.scoringConfig.subtests.length }})</span
                    >
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="subtest in configData.scoringConfig.subtests"
                      :key="subtest"
                      class="badge badge-info badge-outline"
                    >
                      {{ subtest }}
                    </span>
                  </div>
                </div>

                <!-- Subtests Object (CFIT) -->
                <div v-if="configData.scoringConfig.subtests && !Array.isArray(configData.scoringConfig.subtests)">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Subtests ({{ Object.keys(configData.scoringConfig.subtests).length }})</span
                    >
                  </label>
                  <div class="overflow-x-auto">
                    <table class="table table-sm table-zebra">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Questions</th>
                          <th>Examples</th>
                          <th>Time (s)</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(subtest, key) in configData.scoringConfig.subtests" :key="key">
                          <td><span class="badge badge-info">{{ subtest.code || key }}</span></td>
                          <td>{{ subtest.name }}</td>
                          <td class="text-center">{{ subtest.questionCount }}</td>
                          <td class="text-center">{{ subtest.exampleCount }}</td>
                          <td class="text-center">{{ subtest.timeLimit }}</td>
                          <td class="text-sm text-base-content/70">{{ subtest.description }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Scale Descriptions (PAPI) -->
                <div v-if="configData.scoringConfig.scaleDescriptions">
                  <label class="label">
                    <span class="label-text font-medium">Scale Descriptions</span>
                  </label>
                  <div class="overflow-x-auto">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th class="w-20">Scale</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(desc, scale) in configData.scoringConfig.scaleDescriptions"
                          :key="scale"
                        >
                          <td>
                            <span class="badge badge-primary">{{ scale }}</span>
                          </td>
                          <td>
                            <input
                              type="text"
                              v-model="configData.scoringConfig.scaleDescriptions[scale]"
                              class="input input-bordered input-sm w-full"
                              @change="saveConfigDebounced('scoringConfig')"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Scale Labels (alternative field name) -->
                <div v-if="configData.scoringConfig.scaleLabels">
                  <label class="label">
                    <span class="label-text font-medium">Scale Labels</span>
                  </label>
                  <div class="overflow-x-auto">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th class="w-20">Scale</th>
                          <th>Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(label, scale) in configData.scoringConfig.scaleLabels"
                          :key="scale"
                        >
                          <td>
                            <span class="badge badge-primary">{{ scale }}</span>
                          </td>
                          <td>
                            <input
                              type="text"
                              v-model="configData.scoringConfig.scaleLabels[scale]"
                              class="input input-bordered input-sm w-full"
                              @change="saveConfigDebounced('scoringConfig')"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Need Descriptions (EPPS) -->
                <div v-if="configData.scoringConfig.needDescriptions">
                  <label class="label">
                    <span class="label-text font-medium">Need Descriptions</span>
                  </label>
                  <div class="overflow-x-auto">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th class="w-20">Need</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(desc, need) in configData.scoringConfig.needDescriptions"
                          :key="need"
                        >
                          <td>
                            <span class="badge badge-secondary">{{ need.toUpperCase() }}</span>
                          </td>
                          <td>
                            <input
                              type="text"
                              v-model="configData.scoringConfig.needDescriptions[need]"
                              class="input input-bordered input-sm w-full"
                              @change="saveConfigDebounced('scoringConfig')"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Subtest Descriptions (IST) -->
                <div v-if="configData.scoringConfig.subtestDescriptions">
                  <label class="label">
                    <span class="label-text font-medium">Subtest Descriptions</span>
                  </label>
                  <div class="overflow-x-auto">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th class="w-20">Subtest</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(desc, subtest) in configData.scoringConfig.subtestDescriptions"
                          :key="subtest"
                        >
                          <td>
                            <span class="badge badge-info">{{ subtest }}</span>
                          </td>
                          <td>
                            <input
                              type="text"
                              v-model="configData.scoringConfig.subtestDescriptions[subtest]"
                              class="input input-bordered input-sm w-full"
                              @change="saveConfigDebounced('scoringConfig')"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- Other Boolean Flags -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div v-if="'iqCalculation' in configData.scoringConfig" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="text-sm">IQ Calculation</span>
                    <input
                      type="checkbox"
                      v-model="configData.scoringConfig.iqCalculation"
                      class="toggle toggle-primary toggle-sm"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                  <div v-if="'ageBasedNorms' in configData.scoringConfig" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="text-sm">Age Based Norms</span>
                    <input
                      type="checkbox"
                      v-model="configData.scoringConfig.ageBasedNorms"
                      class="toggle toggle-primary toggle-sm"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                  <div v-if="'requiresBirthDate' in configData.scoringConfig" class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="text-sm">Requires Birth Date</span>
                    <input
                      type="checkbox"
                      v-model="configData.scoringConfig.requiresBirthDate"
                      class="toggle toggle-primary toggle-sm"
                      @change="saveConfigDebounced('scoringConfig')"
                    />
                  </div>
                </div>

                <!-- Scoring Method -->
                <div v-if="configData.scoringConfig.scoringMethod" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Scoring Method</span>
                  </label>
                  <input
                    type="text"
                    v-model="configData.scoringConfig.scoringMethod"
                    class="input input-bordered w-64"
                    @change="saveConfigDebounced('scoringConfig')"
                  />
                </div>
                <div v-else-if="configData.scoringConfig.scoring" class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Scoring Method</span>
                  </label>
                  <input
                    type="text"
                    v-model="configData.scoringConfig.scoring"
                    class="input input-bordered w-64"
                    @change="saveConfigDebounced('scoringConfig')"
                  />
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                Tidak ada scoring config
              </div>
            </div>

            <!-- Settings Tab -->
            <div v-else-if="configTab === 'settings'">
              <div v-if="configData.config" class="space-y-4">
                <!-- Boolean Settings Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Allow Back</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.allowBack"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Allow Skip</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.allowSkip"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Show Progress</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.showProgress"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Randomize Questions</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.randomizeQuestions"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Has Subtests</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.hasSubtests"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Subtest Time Limit</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.subtestTimeLimit"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Requires Age</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.requiresAge"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Requires Birth Date</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.requiresBirthDate"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                  <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <span class="font-medium">Auto Submit on Timeout</span>
                    <input
                      type="checkbox"
                      v-model="configData.config.autoSubmitOnTimeout"
                      class="toggle toggle-primary"
                      @change="saveConfigDebounced('config')"
                    />
                  </div>
                </div>

                <!-- Time Limit -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Time Limit (menit)</span>
                    <span class="label-text-alt text-base-content/60">0 = tidak ada batas waktu</span>
                  </label>
                  <input
                    type="number"
                    v-model.number="configData.config.timeLimit"
                    class="input input-bordered w-32"
                    min="0"
                    placeholder="0"
                    @change="saveConfigDebounced('config')"
                  />
                </div>

                <!-- Instruction Text -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Instruction Text</span>
                    <span class="label-text-alt text-base-content/60">Instruksi untuk peserta tes</span>
                  </label>
                  <textarea
                    v-model="configData.config.instructionText"
                    class="textarea textarea-bordered w-full"
                    rows="3"
                    placeholder="Masukkan instruksi tes..."
                    @change="saveConfigDebounced('config')"
                  ></textarea>
                </div>
              </div>
              <div v-else class="text-center py-8 text-base-content/60">
                Tidak ada config
              </div>
            </div>

            <!-- Answer Schema Tab -->
            <div v-else-if="configTab === 'schema'">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium"
                    >Answer Schema (JSON)</span
                  >
                </label>
                <textarea
                  v-model="answerSchemaJson"
                  class="textarea textarea-bordered w-full font-mono text-sm"
                  :class="{ 'textarea-error': answerSchemaError }"
                  rows="10"
                  @change="saveAnswerSchema"
                ></textarea>
                <label class="label">
                  <span
                    v-if="answerSchemaError"
                    class="label-text-alt text-error"
                    >{{ answerSchemaError }}</span
                  >
                  <span v-else class="label-text-alt text-base-content/60"
                    >Edit JSON dan perubahan akan disimpan otomatis</span
                  >
                </label>
              </div>
            </div>
          </div>
          
          <!-- Modal Action at bottom -->
          <div class="px-6 py-4 border-t shrink-0">
            <button class="btn" @click="closeConfigModal">Tutup</button>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Import Modal -->
    <dialog ref="importModal" class="modal">
      <div class="modal-box max-w-4xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">Import Test Type</h3>
          <button
            class="btn btn-ghost btn-sm btn-circle"
            @click="closeImportModal"
          >
            ✕
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loadingImportFiles" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Import Files List -->
        <div v-else-if="importFiles?.length > 0" class="space-y-4">
          <div class="alert alert-info">
            <IconInfoCircle class="w-5 h-5" />
            <span>Pilih file test type yang ingin diimport. File yang dipilih akan diimport ke database.</span>
          </div>

          <div class="overflow-x-auto max-h-96">
            <table class="table table-sm">
              <thead class="sticky top-0 bg-base-100">
                <tr>
                  <th>Test</th>
                  <th>Code</th>
                  <th>Version</th>
                  <th>Category</th>
                  <th>Questions</th>
                  <th>Size</th>
                  <th>Modified</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in importFiles" :key="file.filename">
                  <td>
                    <div class="font-semibold">{{ file.name }}</div>
                    <div class="text-xs text-base-content/60">{{ file.filename }}</div>
                  </td>
                  <td>
                    <span class="badge badge-primary badge-sm">{{ file.code }}</span>
                  </td>
                  <td>{{ file.version }}</td>
                  <td>
                    <span class="badge badge-outline badge-sm">{{ file.category }}</span>
                  </td>
                  <td class="text-center">{{ file.questionCount }}</td>
                  <td class="text-sm">{{ file.sizeFormatted }}</td>
                  <td class="text-sm">{{ formatImportDate(file.modifiedAt) }}</td>
                  <td>
                    <button
                      class="btn btn-sm btn-primary"
                      @click="confirmImport(file)"
                      :disabled="importing"
                    >
                      <span v-if="importing && selectedImportFile?.filename === file.filename" class="loading loading-spinner loading-xs"></span>
                      <IconDownload v-else class="w-4 h-4" />
                      Import
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <IconClipboardOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/60">Tidak ada file export yang tersedia</p>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeImportModal">Tutup</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Instruction Editor Modal -->
    <dialog ref="instructionEditorModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-full max-w-5xl">
        <h3 class="font-bold text-lg mb-4">Edit Instruction</h3>
        
        <div v-if="instructionForm" class="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          <!-- Basic Info -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">ID</span>
              </label>
              <input 
                v-model="instructionForm.id" 
                type="text" 
                class="input input-bordered input-sm w-full"
                readonly
              />
            </div>
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">Type</span>
              </label>
              <select v-model="instructionForm.type" class="select select-bordered select-sm w-full">
                <option value="instruction">instruction</option>
                <option value="example">example</option>
              </select>
            </div>
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">Subtest</span>
              </label>
              <input 
                v-model="instructionForm.subtest" 
                type="number" 
                class="input input-bordered input-sm w-full"
                min="1"
              />
            </div>
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">Time Limit (detik)</span>
              </label>
              <input 
                v-model.number="instructionForm.content.timeLimit" 
                type="number" 
                class="input input-bordered input-sm w-full"
                min="0"
              />
            </div>
          </div>

          <!-- Title & Subtitle -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">Title</span>
              </label>
              <input 
                v-model="instructionForm.title" 
                type="text" 
                class="input input-bordered input-sm w-full"
                placeholder="Judul instruksi"
              />
            </div>
            <div class="form-control w-full">
              <label class="label py-1">
                <span class="label-text text-sm font-medium">Subtitle</span>
              </label>
              <input 
                v-model="instructionForm.subtitle" 
                type="text" 
                class="input input-bordered input-sm w-full"
                placeholder="Sub judul instruksi"
              />
            </div>
          </div>

          <!-- Intro -->
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text text-sm font-medium">Intro</span>
            </label>
            <textarea 
              v-model="instructionForm.content.intro" 
              class="textarea textarea-bordered textarea-sm h-20 w-full"
              placeholder="Teks pengantar instruksi..."
            ></textarea>
          </div>

          <!-- Examples Section -->
          <div class="card bg-base-200 w-full">
            <div class="card-body p-3">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-sm">Contoh Soal</h4>
                <button 
                  type="button" 
                  class="btn btn-xs btn-primary"
                  @click="addExample"
                >
                  <IconPlus class="w-3 h-3" />
                  Tambah
                </button>
              </div>
              
              <div v-if="instructionForm.content.examples.length === 0" class="text-center py-3 text-sm text-base-content/60">
                Belum ada contoh soal
              </div>
              
              <div v-else class="space-y-3">
                <div 
                  v-for="(example, idx) in instructionForm.content.examples" 
                  :key="idx"
                  class="card bg-base-100 shadow-sm w-full"
                >
                  <div class="card-body p-3">
                    <div class="flex items-center justify-between mb-2">
                      <span class="badge badge-primary badge-xs">Contoh #{{ example.number }}</span>
                      <button 
                        type="button" 
                        class="btn btn-ghost btn-xs text-error"
                        @click="removeExample(idx)"
                      >
                        <IconTrash class="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div class="form-control w-full">
                        <label class="label py-0">
                          <span class="label-text text-xs">Image Path</span>
                        </label>
                        <input 
                          v-model="example.imagePath" 
                          type="text" 
                          class="input input-bordered input-xs w-full"
                          placeholder="/images/cfit/example1.png"
                        />
                      </div>
                      <div class="form-control w-full">
                        <label class="label py-0">
                          <span class="label-text text-xs">Answer</span>
                        </label>
                        <input 
                          v-model="example.answer" 
                          type="text" 
                          class="input input-bordered input-xs w-full"
                          placeholder="A"
                        />
                      </div>
                    </div>
                    
                    <div class="form-control w-full">
                      <label class="label py-0">
                        <span class="label-text text-xs">Description</span>
                      </label>
                      <textarea 
                        v-model="example.description" 
                        class="textarea textarea-bordered textarea-xs h-14 w-full"
                        placeholder="Deskripsi contoh soal..."
                      ></textarea>
                    </div>
                    
                    <div class="form-control w-full">
                      <label class="label py-0">
                        <span class="label-text text-xs">Explanation</span>
                      </label>
                      <textarea 
                        v-model="example.explanation" 
                        class="textarea textarea-bordered textarea-xs h-14 w-full"
                        placeholder="Penjelasan jawaban benar..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rules Section -->
          <div class="card bg-base-200 w-full">
            <div class="card-body p-3">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-sm">Aturan</h4>
                <button 
                  type="button" 
                  class="btn btn-xs btn-primary"
                  @click="addRule"
                >
                  <IconPlus class="w-3 h-3" />
                  Tambah
                </button>
              </div>
              
              <div v-if="instructionForm.content.rules.length === 0" class="text-center py-3 text-sm text-base-content/60">
                Belum ada aturan
              </div>
              
              <div v-else class="space-y-2">
                <div 
                  v-for="(rule, idx) in instructionForm.content.rules" 
                  :key="idx"
                  class="flex items-center gap-2 w-full"
                >
                  <span class="badge badge-outline badge-xs shrink-0">{{ idx + 1 }}</span>
                  <input 
                    v-model="instructionForm.content.rules[idx]" 
                    type="text" 
                    class="input input-bordered input-xs flex-1 min-w-0"
                    placeholder="Aturan..."
                  />
                  <button 
                    type="button" 
                    class="btn btn-ghost btn-xs text-error shrink-0"
                    @click="removeRule(idx)"
                  >
                    <IconTrash class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Warnings Section -->
          <div class="card bg-base-200 w-full">
            <div class="card-body p-3">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-sm">Peringatan</h4>
                <button 
                  type="button" 
                  class="btn btn-xs btn-warning"
                  @click="addWarning"
                >
                  <IconPlus class="w-3 h-3" />
                  Tambah
                </button>
              </div>
              
              <div v-if="instructionForm.content.warnings.length === 0" class="text-center py-3 text-sm text-base-content/60">
                Belum ada peringatan
              </div>
              
              <div v-else class="space-y-2">
                <div 
                  v-for="(warning, idx) in instructionForm.content.warnings" 
                  :key="idx"
                  class="flex items-center gap-2 w-full"
                >
                  <span class="badge badge-warning badge-xs shrink-0">!</span>
                  <input 
                    v-model="instructionForm.content.warnings[idx]" 
                    type="text" 
                    class="input input-bordered input-xs flex-1 min-w-0"
                    placeholder="Peringatan..."
                  />
                  <button 
                    type="button" 
                    class="btn btn-ghost btn-xs text-error shrink-0"
                    @click="removeWarning(idx)"
                  >
                    <IconTrash class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action pt-4">
          <button class="btn btn-sm btn-ghost" @click="closeInstructionEditor">Batal</button>
          <button class="btn btn-sm btn-primary" @click="saveInstructionEditor">
            Simpan
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, inject } from "vue";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClock,
  IconListCheck,
  IconChevronLeft,
  IconSettings,
  IconChevronRight,
  IconClipboardOff,
  IconDownload,
  IconUpload,
  IconInfoCircle,
} from "@tabler/icons-vue";
import { useTestTypes } from "@/composables/psychology";
import { useDialog } from "@/composables/core/useApi";
import { useDebounceFn } from "@vueuse/core";

const dialog = useDialog();
const api = inject('api');

const {
  testTypes,
  loading,
  pagination,
  getTestTypes,
  getTestTypeById,
  createTestType,
  updateTestType,
  deleteTestType,
} = useTestTypes();

const formModal = ref(null);
const configModal = ref(null);
const instructionEditorModal = ref(null);
const selectedTestType = ref(null);
const selectedInstructionIdx = ref(null);
const instructionForm = ref(null);
const saving = ref(false);
const configData = ref(null);
const loadingConfig = ref(false);
const configTab = ref("questions");
const createTab = ref("questions");
const savingConfig = ref(false);
const configSaved = ref(false);
const answerSchemaJson = ref("");
const answerSchemaError = ref("");
const exportingId = ref(null);
const importModal = ref(null);
const importFiles = ref([]);
const loadingImportFiles = ref(false);
const importing = ref(false);
const selectedImportFile = ref(null);

// Dynamic question columns computed from data - collect all unique keys from all questions
const questionColumns = computed(() => {
  if (!configData.value?.questions?.length) return [];

  // Collect all unique keys from ALL questions (not just first)
  const allKeys = new Set();
  configData.value.questions.forEach(q => {
    Object.keys(q).forEach(key => allKeys.add(key));
  });
  
  // Filter out fields that should only be shown in instruction editor
  const hiddenFields = ['title', 'subtitle'];
  const keys = Array.from(allKeys).filter(key => !hiddenFields.includes(key));

  // Define preferred column order
  const columnOrder = ['id', 'type', 'subtest', 'answer', 'options', 'imagePath', 'content'];
  
  // Sort keys: ordered columns first, then alphabetically
  keys.sort((a, b) => {
    const aIdx = columnOrder.indexOf(a);
    const bIdx = columnOrder.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  // Short field patterns (scale, code, type, etc.)
  const shortPatterns = [
    "scale",
    "code",
    "type",
    "category",
    "key",
    "number",
    "no",
    "score",
    "answer",
    "id",
  ];

  return keys.map((key) => {
    // Find first question that has this key to determine type
    const sampleQuestion = configData.value.questions.find(q => q[key] !== undefined);
    const value = sampleQuestion ? sampleQuestion[key] : null;
    const keyLower = key.toLowerCase();

    // Detect field type
    let type = "text";
    if (typeof value === "boolean") type = "boolean";
    else if (typeof value === "number") type = "number";
    else if (Array.isArray(value)) type = "array";
    else if (typeof value === "object" && value !== null) type = "object";

    // Check if it's a short field (for display width)
    const isShort =
      type === "number" ||
      type === "boolean" ||
      shortPatterns.some((p) => keyLower.includes(p)) ||
      (typeof value === "string" && value.length <= 3);

    // Generate readable label from key
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim()
      .replace(/^./, (str) => str.toUpperCase());

    return {
      key,
      label,
      type,
      isShort,
      class: key === "id" ? "w-16" : isShort ? "w-20" : "",
      cellClass: key === "id" ? "font-mono" : "",
    };
  });
});

// Create form JSON data
const createJsonData = reactive({
  questions: "",
  config: "",
  scoringConfig: "",
  answerSchema: "",
});

const createJsonErrors = reactive({
  questions: "",
  config: "",
  scoringConfig: "",
  answerSchema: "",
});

const categories = [
  "personality",
  "aptitude",
  "interest",
  "cognitive",
  "others",
];

const filters = ref({
  search: "",
  category: "",
  status: "",
  limit: 12,
});

// Calculate actual question count (exclude instruction and example for CFIT)
const actualQuestionCount = computed(() => {
  if (!configData.value?.questions?.length) return 0
  
  // For CFIT, exclude instruction and example items
  const isCfit = configData.value.code === 'CFIT' || configData.value.name?.includes('CFIT')
  
  if (isCfit) {
    return configData.value.questions.filter(q => 
      q.type !== 'instruction' && q.type !== 'example'
    ).length
  }
  
  // For other tests, count all questions
  return configData.value.questions.length
})

const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.category || filters.value.status;
});

// Parse questions JSON and count
const parsedQuestionsCount = computed(() => {
  if (!createJsonData.questions.trim()) return 0;
  try {
    const parsed = JSON.parse(createJsonData.questions);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
});

// Validate JSON on change
watch(
  () => createJsonData.questions,
  (val) => {
    if (!val.trim()) {
      createJsonErrors.questions = "";
      return;
    }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        createJsonErrors.questions = "Data harus berupa array JSON";
      } else {
        createJsonErrors.questions = "";
      }
    } catch {
      createJsonErrors.questions = "Format JSON tidak valid";
    }
  }
);

// Validate other JSON fields
const validateOptionalJson = (field) => {
  const val = createJsonData[field];
  if (!val.trim()) {
    createJsonErrors[field] = "";
    return true;
  }
  try {
    JSON.parse(val);
    createJsonErrors[field] = "";
    return true;
  } catch {
    createJsonErrors[field] = "Format JSON tidak valid";
    return false;
  }
};

watch(
  () => createJsonData.config,
  () => validateOptionalJson("config")
);
watch(
  () => createJsonData.scoringConfig,
  () => validateOptionalJson("scoringConfig")
);
watch(
  () => createJsonData.answerSchema,
  () => validateOptionalJson("answerSchema")
);

const handleSearch = () => {
  pagination.value.page = 1;
  loadTestTypes();
};

const clearFilter = (filterName) => {
  filters.value[filterName] = "";
  handleSearch();
};

const clearAllFilters = () => {
  filters.value.search = "";
  filters.value.category = "";
  filters.value.status = "";
  handleSearch();
};

const initialForm = {
  name: "",
  code: "",
  category: "",
  description: "",
  estimatedDuration: 30,
  questionCount: 90,
  isActive: true,
};

const form = reactive({ ...initialForm });

const resetForm = () => {
  Object.assign(form, initialForm);
  createTab.value = "questions";
  createJsonData.questions = "";
  createJsonData.config = "";
  createJsonData.scoringConfig = "";
  createJsonData.answerSchema = "";
  createJsonErrors.questions = "";
  createJsonErrors.config = "";
  createJsonErrors.scoringConfig = "";
  createJsonErrors.answerSchema = "";
};

const loadTestTypes = async () => {
  const params = {
    page: pagination.value.page,
    limit: filters.value.limit,
    ...filters.value,
  };
  await getTestTypes(params);
};

const debouncedSearch = useDebounceFn(() => {
  pagination.value.page = 1;
  loadTestTypes();
}, 300);

const changePage = async (page) => {
  pagination.value.page = page;
  await loadTestTypes();
};

const visiblePages = computed(() => {
  const pages = [];
  const total = pagination.value.totalPages;
  const current = pagination.value.page;

  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);

  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(total, 5);
    } else if (end === total) {
      start = Math.max(1, total - 4);
    }
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

const openFormModal = (testType = null) => {
  selectedTestType.value = testType;
  if (testType) {
    Object.assign(form, {
      name: testType.name,
      code: testType.code,
      category: testType.category || "",
      description: testType.description || "",
      estimatedDuration: testType.estimatedDuration,
      questionCount: testType.questionCount,
      isActive: testType.isActive,
    });
  } else {
    resetForm();
  }
  formModal.value?.showModal();
};

const closeFormModal = () => {
  formModal.value?.close();
  resetForm();
  selectedTestType.value = null;
};

const openConfigModal = async (testType) => {
  configData.value = null;
  configTab.value = "questions";
  loadingConfig.value = true;
  configSaved.value = false;
  answerSchemaJson.value = "";
  answerSchemaError.value = "";
  configModal.value?.showModal();

  try {
    const data = await getTestTypeById(testType.id);
    configData.value = data;
    // Initialize answer schema JSON
    answerSchemaJson.value = JSON.stringify(data.answerSchema || {}, null, 2);
  } catch (error) {
    console.error("Error loading config:", error);
  } finally {
    loadingConfig.value = false;
  }
};

const closeConfigModal = () => {
  configModal.value?.close();
  configData.value = null;
  loadTestTypes(); // Refresh list after config changes
};

// Increment version (1 -> 1.1 -> 1.2 ... 1.9 -> 2 -> 2.1 ...)
const incrementVersion = (currentVersion) => {
  const version = parseFloat(currentVersion) || 1;
  const major = Math.floor(version);
  const minor = Math.round((version - major) * 10);

  if (minor >= 9) {
    return major + 1;
  }
  return parseFloat((major + (minor + 1) / 10).toFixed(1));
};

// Debounced save config function
const saveConfigDebounced = useDebounceFn(async (field) => {
  if (!configData.value) return;

  savingConfig.value = true;
  configSaved.value = false;

  try {
    const payload = {
      version: incrementVersion(configData.value.version),
    };

    if (field === "questions") {
      payload.questions = configData.value.questions;
    } else if (field === "scoringConfig") {
      payload.scoringConfig = configData.value.scoringConfig;
    } else if (field === "config") {
      payload.config = configData.value.config;
      // Auto-sync estimatedDuration with config.timeLimit
      if (configData.value.config?.timeLimit) {
        payload.estimatedDuration = configData.value.config.timeLimit;
        configData.value.estimatedDuration = configData.value.config.timeLimit;
      }
    } else if (field === "answerSchema") {
      payload.answerSchema = configData.value.answerSchema;
    }

    await updateTestType(configData.value.id, payload);

    // Update local version
    configData.value.version = payload.version;

    configSaved.value = true;

    // Hide saved indicator after 2 seconds
    setTimeout(() => {
      configSaved.value = false;
    }, 2000);
  } catch (error) {
    console.error("Error saving config:", error);
  } finally {
    savingConfig.value = false;
  }
}, 500);

const saveAnswerSchema = () => {
  if (!answerSchemaJson.value.trim()) {
    configData.value.answerSchema = {};
    answerSchemaError.value = "";
    saveConfigDebounced("answerSchema");
    return;
  }

  try {
    const parsed = JSON.parse(answerSchemaJson.value);
    configData.value.answerSchema = parsed;
    answerSchemaError.value = "";
    saveConfigDebounced("answerSchema");
  } catch {
    answerSchemaError.value = "Format JSON tidak valid";
  }
};

// Instruction Editor Functions
const openInstructionEditor = (questionIdx) => {
  selectedInstructionIdx.value = questionIdx;
  const question = configData.value.questions[questionIdx];
  
  // Initialize form with current data
  instructionForm.value = {
    id: question.id || questionIdx + 1,
    type: question.type || 'instruction',
    title: question.title || '',
    subtitle: question.subtitle || '',
    subtest: question.subtest || '',
    content: {
      intro: question.content?.intro || '',
      examples: question.content?.examples ? [...question.content.examples] : [],
      rules: question.content?.rules ? [...question.content.rules] : [],
      warnings: question.content?.warnings ? [...question.content.warnings] : [],
      timeLimit: question.content?.timeLimit || 0
    }
  };
  
  instructionEditorModal.value?.showModal();
};

const closeInstructionEditor = () => {
  instructionEditorModal.value?.close();
  selectedInstructionIdx.value = null;
  instructionForm.value = null;
};

const addExample = () => {
  if (!instructionForm.value?.content?.examples) {
    instructionForm.value.content.examples = [];
  }
  instructionForm.value.content.examples.push({
    number: instructionForm.value.content.examples.length + 1,
    imagePath: '',
    description: '',
    answer: '',
    explanation: ''
  });
};

const removeExample = (index) => {
  instructionForm.value.content.examples.splice(index, 1);
  // Re-number examples
  instructionForm.value.content.examples.forEach((ex, idx) => {
    ex.number = idx + 1;
  });
};

const addRule = () => {
  if (!instructionForm.value?.content?.rules) {
    instructionForm.value.content.rules = [];
  }
  instructionForm.value.content.rules.push('');
};

const removeRule = (index) => {
  instructionForm.value.content.rules.splice(index, 1);
};

const addWarning = () => {
  if (!instructionForm.value?.content?.warnings) {
    instructionForm.value.content.warnings = [];
  }
  instructionForm.value.content.warnings.push('');
};

const removeWarning = (index) => {
  instructionForm.value.content.warnings.splice(index, 1);
};

const saveInstructionEditor = () => {
  if (selectedInstructionIdx.value === null || !instructionForm.value) return;
  
  // Update the question data
  const question = configData.value.questions[selectedInstructionIdx.value];
  
  question.id = instructionForm.value.id;
  question.type = instructionForm.value.type;
  question.title = instructionForm.value.title;
  question.subtitle = instructionForm.value.subtitle;
  question.subtest = instructionForm.value.subtest;
  question.content = {
    intro: instructionForm.value.content.intro,
    examples: instructionForm.value.content.examples.filter(ex => ex.imagePath || ex.description),
    rules: instructionForm.value.content.rules.filter(r => r.trim()),
    warnings: instructionForm.value.content.warnings.filter(w => w.trim()),
    timeLimit: instructionForm.value.content.timeLimit
  };
  
  // Save to backend
  saveConfigDebounced('questions');
  
  closeInstructionEditor();
};

const saveTestType = async () => {
  // For create, validate and parse all JSONB fields
  if (!selectedTestType.value) {
    // Validate questions (required)
    if (!createJsonData.questions.trim()) {
      createJsonErrors.questions = "Data soal wajib diisi";
      createTab.value = "questions";
      return;
    }

    let questions;
    try {
      questions = JSON.parse(createJsonData.questions);
      if (!Array.isArray(questions)) {
        createJsonErrors.questions = "Data soal harus berupa array";
        createTab.value = "questions";
        return;
      }
    } catch {
      createJsonErrors.questions = "Format JSON tidak valid";
      createTab.value = "questions";
      return;
    }

    // Validate optional JSON fields
    if (!validateOptionalJson("config")) {
      createTab.value = "config";
      return;
    }
    if (!validateOptionalJson("scoringConfig")) {
      createTab.value = "scoring";
      return;
    }
    if (!validateOptionalJson("answerSchema")) {
      createTab.value = "schema";
      return;
    }

    saving.value = true;
    try {
      const payload = {
        ...form,
        questions,
      };

      // Add optional JSONB fields if provided
      if (createJsonData.config.trim()) {
        payload.config = JSON.parse(createJsonData.config);
      }
      if (createJsonData.scoringConfig.trim()) {
        payload.scoringConfig = JSON.parse(createJsonData.scoringConfig);
      }
      if (createJsonData.answerSchema.trim()) {
        payload.answerSchema = JSON.parse(createJsonData.answerSchema);
      }

      await createTestType(payload);
      closeFormModal();
      await loadTestTypes();
    } catch (error) {
      console.error("Error creating test type:", error);
    } finally {
      saving.value = false;
    }
  } else {
    // For edit, just update basic fields
    saving.value = true;
    try {
      await updateTestType(selectedTestType.value.id, form);
      closeFormModal();
      await loadTestTypes();
    } catch (error) {
      console.error("Error updating test type:", error);
    } finally {
      saving.value = false;
    }
  }
};

const exportTestType = async (testType) => {
  exportingId.value = testType.id;
  try {
    const response = await api.get(`/psychology/test-types/${testType.id}/export`);
    
    if (response.success && response.data) {
      const { filepath, filename } = response.data;
      
      if (filepath) {
        // Use API base URL (strip /api/v1 suffix if present)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
        const downloadUrl = `${baseUrl}${filepath}`;
        
        // Fetch file as blob to force download
        const fileResponse = await fetch(downloadUrl);
        const blob = await fileResponse.blob();
        
        // Create download link
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename || 'export.json');
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Cleanup
        window.URL.revokeObjectURL(blobUrl);
      }
    }
  } catch (error) {
    console.error('Error exporting test type:', error);
    await dialog.alert({
      title: 'Export Gagal',
      message: error.message || 'Terjadi kesalahan saat export test type',
      type: 'error'
    });
  } finally {
    exportingId.value = null;
  }
};

const openImportModal = async () => {
  importModal.value?.showModal();
  await loadImportFiles();
};

const closeImportModal = () => {
  importModal.value?.close();
  importFiles.value = [];
  selectedImportFile.value = null;
};

const loadImportFiles = async () => {
  loadingImportFiles.value = true;
  try {
    const response = await api.get('/psychology/test-types/export-files');
    if (response.success && response.data) {
      importFiles.value = response.data.files || [];
      
      // DEBUG: Log what backend sends for each file
      console.log('📁 Import files from backend:', {
        totalFiles: importFiles.value.length,
        files: importFiles.value.map(f => ({
          filename: f.filename,
          name: f.name,
          code: f.code,
          questionCount: f.questionCount,
          hasQuestionCountField: 'questionCount' in f
        }))
      });
    }
  } catch (error) {
    console.error('Error loading import files:', error);
    await dialog.alert({
      title: 'Gagal Memuat File',
      message: error.message || 'Terjadi kesalahan saat memuat daftar file export',
      type: 'error'
    });
  } finally {
    loadingImportFiles.value = false;
  }
};

const formatImportDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const confirmImport = async (file) => {
  const confirmed = await dialog.confirm({
    title: 'Import Test Type',
    message: `Apakah Anda yakin ingin import "${file.name}" (${file.code} v${file.version})?\n\nJika test type dengan kode yang sama sudah ada, data akan ditimpa.`,
    type: 'warning',
    confirmText: 'Import',
    cancelText: 'Batal'
  });

  if (confirmed) {
    await importTestType(file);
  }
};

const importTestType = async (file) => {
  selectedImportFile.value = file;
  importing.value = true;
  
  console.log('🔄 Importing test type:', {
    filename: file.filename,
    name: file.name,
    code: file.code,
    questionCountFromList: file.questionCount,
    version: file.version
  });
  
  try {
    const response = await api.post(
      `/psychology/test-types/import?filename=${encodeURIComponent(file.filename)}&overwrite=true`
    );
    
    console.log('✅ Import response:', {
      success: response.success,
      testType: response.data?.name,
      questionCountAfterImport: response.data?.questionCount,
      data: response.data
    });
    
    // Check if question count matches
    if (response.data?.questionCount && file.questionCount) {
      if (response.data.questionCount !== file.questionCount) {
        console.warn(`⚠️ Question count mismatch! File had ${file.questionCount}, but imported ${response.data.questionCount}`);
      }
    }
    
    if (response.success) {
      await dialog.alert({
        title: 'Import Berhasil',
        message: `Test type "${file.name}" berhasil diimport dengan ${response.data?.questionCount || '?'} soal.`,
        type: 'success'
      });
      
      closeImportModal();
      await loadTestTypes();
    }
  } catch (error) {
    console.error('❌ Error importing test type:', error);
    await dialog.alert({
      title: 'Import Gagal',
      message: error.message || 'Terjadi kesalahan saat import test type',
      type: 'error'
    });
  } finally {
    importing.value = false;
    selectedImportFile.value = null;
  }
};

const confirmDelete = async (testType) => {
  const confirmed = await dialog.confirm({
    title: "Hapus Jenis Tes",
    message: `Apakah Anda yakin ingin menghapus jenis tes "${testType.name}"?`,
    type: "warning",
    confirmText: "Hapus",
    cancelText: "Batal",
  });

  if (confirmed) {
    try {
      await deleteTestType(testType.id);
      await loadTestTypes();
    } catch (error) {
      console.error("Error deleting test type:", error);
    }
  }
};

onMounted(() => {
  loadTestTypes();
});
</script>
