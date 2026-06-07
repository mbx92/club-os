<route lang="yaml">
name: psychology-results-epps
meta:
  title: Hasil EPPS
  layout: default
  public: false
  requiresModule: psychology
  action: read
  subject: Result
</route>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconChartBarOff class="w-16 h-16 mx-auto text-error mb-4" />
        <h3 class="text-xl font-semibold mb-2">Gagal Memuat Hasil</h3>
        <p class="text-base-content/60 mb-4">{{ error }}</p>
        <button class="btn btn-primary" @click="goBack">
          <IconArrowLeft class="w-4 h-4 mr-2" />
          Kembali
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <button class="btn btn-ghost btn-circle" @click="goBack">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold">Hasil: EPPS</h1>
          <p class="text-base-content/60 mt-1">{{ resultData?.subject?.name || resultData?.patient?.fullName || '-' }} - Edwards Personal Preference Schedule</p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <!-- Export XLSX Button -->
          <button
            v-if="canExportReport"
            class="btn btn-success btn-sm"
            @click="handleExportXlsx"
            :disabled="exportingXlsx"
          >
            <span v-if="exportingXlsx" class="loading loading-spinner loading-sm"></span>
            <IconFileSpreadsheet v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ exportingXlsx ? 'Exporting...' : 'Export XLSX' }}</span>
          </button>

          <!-- Export PDF Button -->
          <button
            v-if="canExportReport"
            class="btn btn-error btn-sm"
            @click="handleExportPdf"
            :disabled="exportingPdf"
          >
            <span v-if="exportingPdf" class="loading loading-spinner loading-sm"></span>
            <IconFileTypePdf v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ exportingPdf ? 'Exporting...' : 'Export PDF' }}</span>
          </button>

          <!-- Generate Report Button -->
          <button 
            v-if="!reportInfo?.cacheId || isReportExpired()"
            class="btn btn-primary btn-sm" 
            @click="handleGenerateReport"
            :disabled="generatingReport"
          >
            <span v-if="generatingReport" class="loading loading-spinner loading-sm"></span>
            <IconFileReport v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ generatingReport ? 'Generating...' : 'Generate Report' }}</span>
          </button>
          
          <!-- Download Report Button (shown after generate success) -->
          <button 
            v-if="reportInfo?.cacheId && !isReportExpired()"
            class="btn btn-outline btn-success btn-sm" 
            @click="handleDownloadReport"
            :disabled="downloadingReport"
          >
            <span v-if="downloadingReport" class="loading loading-spinner loading-sm"></span>
            <IconDownload v-else class="w-4 h-4" />
            <span class="hidden sm:inline">{{ downloadingReport ? 'Downloading...' : 'Download PDF' }}</span>
          </button>
          
          <!-- Report Info -->
          <div v-if="reportInfo?.expiresAt && !isReportExpired()" class="tooltip tooltip-left" :data-tip="`Berlaku: ${formatReportExpiry(reportInfo.expiresAt)}`">
            <span class="badge badge-ghost text-xs">
              <IconClock class="w-3 h-3 mr-1" />
              <span class="hidden sm:inline">{{ formatReportExpiry(reportInfo.expiresAt) }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content (Left 2 columns) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Test Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Informasi Tes</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p class="text-base-content/60 text-sm">Jenis Tes</p>
                  <p class="font-semibold">EPPS</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Kategori</p>
                  <p class="font-semibold capitalize">Personality</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Mulai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData?.session?.startedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Waktu Selesai</p>
                  <p class="font-semibold">{{ formatDateTime(resultData?.session?.completedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Durasi</p>
                  <p class="font-semibold">{{ calculateDuration(resultData?.session?.startedAt, resultData?.session?.completedAt) }}</p>
                </div>
                <div>
                  <p class="text-base-content/60 text-sm">Total Jawaban</p>
                  <p class="font-semibold">{{ totalQuestions }} soal</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Top & Low Needs -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Top Needs -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-success mb-4">
                  <IconTrendingUp class="w-5 h-5" />
                  Skor Tertinggi
                </h2>
                <div class="space-y-3">
                  <div 
                    v-for="need in topNeeds" 
                    :key="need.label"
                    class="flex items-center justify-between p-3 bg-success/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-success">{{ need.label }}</span>
                      <span class="text-sm ml-2">{{ getNeedName(need.label) }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ typeof need.s === 'number' ? need.s.toFixed(0) : need.s }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ Math.round((need.s / radar.maxVal) * 100) }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Low Needs -->
            <div class="card bg-base-100 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-warning mb-4">
                  <IconTrendingDown class="w-5 h-5" />
                  Skor Terendah
                </h2>
                <div class="space-y-3">
                  <div 
                    v-for="need in lowNeeds" 
                    :key="need.label"
                    class="flex items-center justify-between p-3 bg-warning/10 rounded-lg"
                  >
                    <div>
                      <span class="font-bold text-warning">{{ need.label }}</span>
                      <span class="text-sm ml-2">{{ getNeedName(need.label) }}</span>
                    </div>
                    <div class="text-right">
                      <span class="font-bold text-lg">{{ typeof need.s === 'number' ? need.s.toFixed(0) : need.s }}</span>
                      <span class="text-xs text-base-content/60 ml-1">({{ Math.round((need.s / radar.maxVal) * 100) }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 9 Blok Matriks 5x5 -->
      <section class="card bg-base-100 shadow">
        <div class="card-body">
          <div class="relative">
            <h2 class="card-title mb-2">
              EPPS Matrix - 9 Blok Terpisah (5x5 setiap blok)
            </h2>

            <!-- gear button top-right -->
            <div class="absolute top-2 right-2">
              <button
                type="button"
                class="btn btn-ghost btn-circle btn-sm"
                @click="showMatrixMenu = !showMatrixMenu"
                aria-label="Menu Matriks"
              >
                <IconSettings class="h-4 w-4" />
              </button>
              <div
                v-if="showMatrixMenu"
                class="absolute right-0 mt-2 transform -translate-x-2 origin-top-right min-w-[150px] p-4 bg-base-100 rounded-lg shadow-lg border border-base-200 z-50"
              >
                <div class="flex flex-col gap-3">
                  <div class="form-control">
                    <div class="flex items-center justify-between">
                      <div class="text-sm">Mode Putih</div>
                      <input type="checkbox" class="toggle" v-model="useWhiteTheme" />
                    </div>
                  </div>
                  <div class="form-control">
                    <div class="flex items-center justify-between">
                      <div class="text-sm">Kunci Matriks</div>
                      <input type="checkbox" class="toggle" v-model="matrixLocked" />
                    </div>
                  </div>
                  <div class="form-control">
                    <div class="flex items-center justify-between">
                      <div class="text-sm">Mode Compact</div>
                      <input type="checkbox" class="toggle" v-model="compactMode" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid 3x3 untuk 9 blok dengan 1 kolom ringkasan per grup -->
          <div class="space-y-4 md:space-y-5 max-w-6xl mx-auto">
            <div
              v-for="groupIndex in [0, 1, 2]"
              :key="`row-group-${groupIndex}`"
              class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
            >
              <!-- 3 blok dalam satu grup -->
              <div
                v-for="block in getBlocksByGroup(groupIndex)"
                :key="block.block"
                class="rounded-xl border-2 shadow-sm space-y-2"
                :class="[block.cardClass, 'epps-block-card', compactMode ? 'p-1 md:p-2' : 'p-2 md:p-3']"
              >
                <div class="flex justify-between items-center">
                  <h3
                    class="text-[10px] md:text-xs font-bold tracking-wide text-center flex-1 truncate"
                    :class="block.headerClass"
                  >
                    {{ block.title }}
                  </h3>
                  <span
                    class="badge badge-xs border-none text-[8px] md:text-[10px] font-semibold uppercase ml-1"
                    :class="block.badgeClass"
                  >
                    {{ block.block }}
                  </span>
                </div>

                <div class="space-y-1">
                  <div
                    v-for="(row, rowIndex) in getBlockMatrix(block.block)"
                    :key="`block-${block.block}-row-${rowIndex}`"
                    class="grid grid-cols-5 gap-1"
                  >
                    <div
                      v-for="questionNum in row"
                      :key="`block-${block.block}-q-${questionNum}`"
                      class="flex items-center justify-center rounded font-semibold transition-colors"
                      :class="[
                        compactMode ? 'w-[1.25rem] h-[1.25rem] text-[7px]' : 'w-8 h-8 md:w-9 md:h-9 text-[10px] md:text-xs',
                        block.cellClass,
                        'epps-matrix-cell',
                        isAnswered(questionNum) ? 'ring-2 ring-offset-1 ring-black/30' : '',
                        diagonalVisualClass(questionNum, block.block),
                        matrixLocked ? 'cursor-default pointer-events-none opacity-90' : 'cursor-pointer',
                      ]"
                      :title="`Soal ${questionNum} - Blok ${block.block}${
                        isExcludedFromCounts(questionNum) ? ' (tidak dihitung)' :
                        isIncludedBlueDiagonal(questionNum) ? ' (diagonal dihitung)' : ''
                      }${matrixLocked ? ' [TERKUNCI]' : ''}`"
                      @click="handleQuestionClick(questionNum)"
                    >
                      {{ getCellDisplay(questionNum) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Kolom ringkasan -->
              <div 
                class="rounded-xl border-2 shadow-sm space-y-2 bg-base-100 border-base-300 text-base-content"
                :class="compactMode ? 'p-1 md:p-2' : 'p-2 md:p-3'"
              >
                <div class="flex justify-between items-center">
                  <h3 class="text-[10px] md:text-xs font-bold tracking-wide text-center text-base-content/70 flex-1">
                    Ringkasan
                  </h3>
                  <span class="badge badge-xs border-none bg-base-200 text-base-content text-[8px] md:text-[10px] font-semibold uppercase">S</span>
                </div>
                <div class="grid grid-cols-5 gap-1">
                  <div
                    v-for="col in summaryColumnCount"
                    :key="`sum-col-${groupIndex}-${col}`"
                    class="grid grid-cols-1 gap-1"
                  >
                    <div
                      v-for="rowIndex in 5"
                      :key="`row-sum-${groupIndex}-${col}-${rowIndex}`"
                      class="flex items-center justify-center rounded font-semibold bg-base-100 text-base-content border border-base-300"
                      :class="compactMode ? 'w-[1.25rem] h-[1.25rem] text-[7px]' : 'w-8 h-8 md:w-9 md:h-9 text-[10px] md:text-xs'"
                    >
                      {{
                        col === labelSummaryColumnIndex
                          ? getRowGroupLabel(groupIndex, rowIndex - 1)
                          : col === aCountColumnIndex
                          ? getRowGroupAnswerCountSummary(groupIndex, rowIndex - 1, "A")
                          : col === bCountColumnIndex
                          ? getColumnGroupAnswerCountSummary(groupIndex, rowIndex - 1, "B")
                          : col === 4
                          ? getRowGroupABSumSummary(groupIndex, rowIndex - 1)
                          : col === 5
                          ? getNeedCategoryByGroupRow(groupIndex, rowIndex - 1)
                          : getRowGroupAnsweredCountSummary(groupIndex, rowIndex - 1)
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Informasi 9 Blok Matriks</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="i in 9" :key="i" class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                  :class="blockLegendClass(i)"
                >{{ i }}</div>
                <span class="text-sm">Blok {{ i }}: Soal {{ (i-1)*25+1 }}-{{ i*25 }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Ringkasan Skor Need -->
      <section class="card bg-base-100 shadow">
        <div class="card-body">
          <header class="flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
            <div>
              <h2 class="card-title">Skor Need EPPS</h2>
              <p class="text-sm opacity-70">R = hitung A (baris), C = hitung B (kolom), S = BD + BH</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm">Sex</label>
              <select v-model="sex" class="select select-bordered select-sm w-40">
                <option value="male">male</option>
                <option value="female">female</option>
              </select>
            </div>
          </header>

          <div class="overflow-auto">
            <table class="table table-zebra table-sm">
              <thead>
                <tr>
                  <th>Need</th>
                  <th>R</th>
                  <th>C</th>
                  <th>S</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="n in needsSummary" :key="n.label">
                  <td class="font-semibold">{{ n.label }}</td>
                  <td class="font-mono">{{ n.bb }}</td>
                  <td class="font-mono">{{ n.bj }}</td>
                  <td class="font-mono">{{ typeof n.s === "number" ? n.s.toFixed(2) : n.s }}</td>
                  <td class="font-mono">{{ n.category }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Grafik Radar -->
      <section class="card bg-base-100 shadow">
        <div class="card-body">
          <header class="mb-2 flex items-center justify-between">
            <div>
              <h2 class="card-title">Grafik Radar Need EPPS</h2>
              <p class="text-sm opacity-70">Visualisasi skor S per Need</p>
            </div>
            <div class="badge badge-outline badge-sm">Max S: {{ radar.maxVal }}</div>
          </header>

          <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            <div class="overflow-auto flex justify-center">
              <svg 
                :width="compactMode ? radar.size * 0.65 : radar.size" 
                :height="compactMode ? radar.size * 0.65 : radar.size" 
                :viewBox="`0 0 ${radar.size} ${radar.size}`"
              >
                <polygon v-for="(pts, i) in radar.rings" :key="`ring-${i}`" :points="pts" fill="none" stroke="#e5e7eb" stroke-width="1" />
                <line v-for="(ax, i) in radar.axes" :key="`ax-${i}`" :x1="radar.cx" :y1="radar.cy" :x2="ax.x" :y2="ax.y" stroke="#e5e7eb" stroke-width="1" />
                <polygon :points="radar.polygonPoints" fill="rgba(59,130,246,0.20)" stroke="#3b82f6" stroke-width="2" />
                <circle v-for="(pt, i) in radar.points" :key="`pt-${i}`" :cx="pt.x" :cy="pt.y" r="3" fill="#3b82f6" />
                <g v-for="(lbl, i) in radar.labels" :key="`lbl-${i}`">
                  <text :x="radar.labelPositions[i].x" :y="radar.labelPositions[i].y" :text-anchor="radar.labelPositions[i].anchor" alignment-baseline="middle" font-size="10" fill="#6b7280">{{ lbl }}</text>
                </g>
              </svg>
            </div>
            <div 
              class="grid gap-2"
              :class="compactMode ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'"
            >
              <div 
                v-for="(n, i) in needsSummary" 
                :key="n.label" 
                class="flex items-center justify-between gap-2 rounded border bg-base-50"
                :class="compactMode ? 'p-1 flex-col text-center' : 'p-2 gap-3'"
              >
                <div class="flex items-center gap-1" :class="compactMode ? 'flex-col' : 'gap-2'">
                  <span class="badge badge-ghost" :class="compactMode ? 'badge-xs' : 'badge-xs'">{{ i + 1 }}</span>
                  <span :class="compactMode ? 'text-xs font-medium' : 'font-medium'">{{ n.label }}</span>
                </div>
                <div :class="compactMode ? 'text-xs font-mono' : 'font-mono text-sm'">{{ typeof n.s === "number" ? n.s.toFixed(compactMode ? 0 : 2) : n.s }}</div>
              </div>
            </div>
          </div>

          <!-- Narrative conclusions -->
          <div class="mt-6">
            <h3 :class="compactMode ? 'text-base font-semibold mb-2' : 'text-lg font-semibold mb-2'">Kesimpulan Narasi EPPS</h3>
            <p class="text-sm text-base-content/70 mb-4">Ringkasan narasi berdasarkan skor Need teratas (S)</p>
            <div 
              class="grid gap-4"
              :class="compactMode ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2'"
            >
              <div 
                v-for="item in topEppsNarratives" 
                :key="item.label" 
                class="rounded-lg border bg-base-50"
                :class="compactMode ? 'p-2' : 'p-4'"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div :class="compactMode ? 'text-xs font-semibold' : 'text-sm font-semibold'">{{ item.title }}</div>
                    <div :class="compactMode ? 'text-[10px] opacity-70' : 'text-xs opacity-70'">Level: <span class="font-medium">{{ item.level }}</span> — {{ Math.round((item.percent || 0) * 100) }}%</div>
                  </div>
                  <div :class="compactMode ? 'text-[10px] font-mono' : 'text-xs font-mono'">S: {{ typeof item.s === "number" ? item.s.toFixed(compactMode ? 0 : 2) : item.s }}</div>
                </div>
                <div :class="compactMode ? 'mt-1 text-xs text-base-content/80 line-clamp-3' : 'mt-2 text-sm text-base-content/80'">{{ item.narrative }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Konsistensi Diagonal -->
      <section class="card bg-base-100 shadow">
        <div class="card-body">
          <header class="mb-2">
            <h2 class="card-title">Konsistensi Diagonal</h2>
            <p class="text-sm opacity-70">Membandingkan pasangan blok 1:7, 2:5, 3:9</p>
          </header>
          <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="p in consistencyPairs" :key="p.label" class="p-4 rounded-xl border space-y-2">
              <div class="flex items-center justify-between">
                <div class="font-semibold">Pair {{ p.label }}</div>
                <div class="badge badge-sm">{{ p.matches }}/{{ p.total }}</div>
              </div>
              <div class="w-full bg-base-200 h-2 rounded">
                <div class="bg-primary h-2 rounded" :style="{ width: (p.total ? (100 * p.matches) / p.total : 0) + '%' }"></div>
              </div>
              <div class="text-xs text-gray-500">{{ p.percent }}% sama</div>
            </div>
          </div>
        </div>
      </section>
        </div>

        <!-- Sidebar (Right column) -->
        <div class="space-y-6">
          <!-- Patient Info -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Pasien</h2>
              <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-full bg-primary text-primary-content flex items-center justify-center shrink-0">
                  <span class="text-xl font-bold leading-none">{{ (resultData?.subject?.name || resultData?.patient?.fullName || 'X').charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <h3 class="font-bold uppercase">{{ resultData?.subject?.name || resultData?.patient?.fullName || '-' }}</h3>
                  <p class="text-sm text-base-content/60">{{ resultData?.patient?.email || resultData?.subject?.email || '-' }}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Telepon</span>
                  <span>{{ resultData?.patient?.phone || resultData?.subject?.phone || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Tanggal Lahir</span>
                  <span>{{ resultData?.patient?.birthDate ? formatDate(resultData.patient.birthDate) : (resultData?.subject?.birthDate ? formatDate(resultData.subject.birthDate) : '-') }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Jenis Kelamin</span>
                  <span>{{ getSexLabel(resultData?.patient?.sex || resultData?.subject?.sex) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Verification Status -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Status Verifikasi</h2>
              <div 
                class="alert"
                :class="resultData?.session?.verifiedAt ? 'alert-success' : 'alert-warning'"
              >
                <IconShieldCheck v-if="resultData?.session?.verifiedAt" class="w-6 h-6" />
                <IconAlertTriangle v-else class="w-6 h-6" />
                <div>
                  <p class="font-medium">
                    {{ resultData?.session?.verifiedAt ? 'Terverifikasi' : 'Belum Diverifikasi' }}
                  </p>
                  <p v-if="resultData?.session?.verifiedAt" class="text-sm">
                    {{ formatDateTime(resultData.session.verifiedAt) }}
                  </p>
                </div>
              </div>
              <button 
                v-if="!resultData?.session?.verifiedAt"
                class="btn btn-primary btn-block mt-4"
                @click="verifyResult"
                :disabled="verifying"
              >
                <span v-if="verifying" class="loading loading-spinner loading-sm"></span>
                <IconShieldCheck v-else class="w-4 h-4" />
                Verifikasi Hasil
              </button>
            </div>
          </div>

          <!-- Raw Scores (Skor Mentah) -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Skor Mentah</h2>
              <div class="grid grid-cols-4 gap-2 text-center">
                <div 
                  v-for="n in needsSummary" 
                  :key="n.label"
                  class="p-2 bg-base-200 rounded-lg"
                >
                  <div class="font-bold text-primary text-xs">{{ n.label }}</div>
                  <div class="text-lg font-bold">{{ typeof n.s === 'number' ? n.s.toFixed(0) : n.s }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title mb-4">Aksi Cepat</h2>
              <div class="space-y-2">
                <router-link 
                  v-if="resultData?.patient?.id"
                  :to="`/psychology/patients/${resultData.patient.id}`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconUser class="w-4 h-4" />
                  Lihat Profil Pasien
                </router-link>
                <router-link 
                  :to="`/psychology/sessions`"
                  class="btn btn-ghost btn-block justify-start"
                >
                  <IconClipboard class="w-4 h-4" />
                  Kembali ke Daftar Sesi
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch, inject, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { blockConfigsColored, blockConfigsWhite } from "@/data/epps/blockConfig.js";
import { rowGroupLabels, needsConfig, allNeeds } from "@/data/epps/eppsNeedsConfig.js";
import EppsNarratives from "@/data/epps/eppsNarratives.js";
import { computeBD, computeBH } from "@/data/epps/eppsSumif.js";
import { getTraitCategory } from "@/data/epps/eppsScoring.js";
import {
  IconArrowLeft,
  IconDownload,
  IconFileReport,
  IconClock,
  IconShieldCheck,
  IconAlertTriangle,
  IconUser,
  IconClipboard,
  IconChartBarOff,
  IconTrendingUp,
  IconTrendingDown,
  IconBriefcase,
  IconCrown,
  IconUsers,
  IconTarget,
  IconSettings,
  IconFileSpreadsheet,
  IconFileTypePdf
} from '@tabler/icons-vue'
import { usePsychologyReport } from '@/composables/psychology'

const api = inject("api");
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref(null);
const resultData = ref(null);
const verifying = ref(false);
const sex = ref("female");

// PDF Report
const { 
  generating: generatingReport, 
  downloading: downloadingReport, 
  reportInfo, 
  generateReport, 
  downloadReport, 
  checkReportStatus,
  isReportExpired,
  formatExpiry: formatReportExpiry 
} = usePsychologyReport();

const totalQuestions = 225;
const totalBlocks = 9;
const summaryColumnCount = 5;
const labelSummaryColumnIndex = 3;
const aCountColumnIndex = 1;
const bCountColumnIndex = 2;

const showMatrixMenu = ref(false);
const matrixLocked = ref(true);
const useWhiteTheme = ref(false);
const compactMode = ref(false);

const loadResult = async () => {
  const sessionId = route.params.id;
  if (!sessionId) {
    error.value = "Session ID tidak ditemukan";
    loading.value = false;
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    const response = await api(`/psychology/sessions/${sessionId}/result`);
    resultData.value = response?.data || response;
    
    const subjectSex = resultData.value?.subject?.sex || resultData.value?.patient?.sex;
    if (subjectSex) sex.value = subjectSex.toLowerCase();
    
    applyBackendResult(resultData.value);
  } catch (e) {
    console.error("Failed to load EPPS result:", e);
    error.value = e?.message || "Gagal memuat hasil tes EPPS";
  } finally {
    loading.value = false;
  }
};

const goBack = () => router.push('/psychology/sessions');

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const calculateDuration = (startedAt, completedAt) => {
  if (!startedAt || !completedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  return `${diffMins} menit`;
};

const getSexLabel = (sex) => {
  if (sex === 'male' || sex === 'M') return 'Laki-laki';
  if (sex === 'female' || sex === 'F') return 'Perempuan';
  return '-';
};

const needNames = {
  'ach': 'Need for Achievement',
  'def': 'Need for Deference',
  'ord': 'Need for Order',
  'exh': 'Need for Exhibition',
  'aut': 'Need for Autonomy',
  'aff': 'Need for Affiliation',
  'int': 'Need for Intraception',
  'suc': 'Need for Succorance',
  'dom': 'Need for Dominance',
  'aba': 'Need for Abasement',
  'nur': 'Need for Nurturance',
  'chg': 'Need for Change',
  'end': 'Need for Endurance',
  'het': 'Need for Heterosexuality',
  'agg': 'Need for Aggression'
};

const getNeedName = (label) => needNames[label?.toLowerCase()] || label;

// Generate Report
const handleGenerateReport = async () => {
  const sessionId = route.params.id;
  await generateReport(sessionId);
};

// Download Report
const handleDownloadReport = async () => {
  await downloadReport();
};

// Check report status on load
const checkExistingReport = async () => {
  const sessionId = route.params.id;
  await checkReportStatus(sessionId);
};

// Export functionality
const exportingXlsx = ref(false);
const exportingPdf = ref(false);

const canExportReport = computed(() => {
  const session = resultData.value?.session || resultData.value;
  if (!session) return false;
  
  const status = session.status || session.sessionStatus;
  return status === 'completed' || status === 'verified';
});

const handleExportXlsx = async () => {
  const sessionId = route.params.id;
  exportingXlsx.value = true;
  try {
    const response = await api(`/psychology/reports/session/${sessionId}/export/xlsx`, {
      responseType: 'blob'
    });

    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epps-report-${sessionId}-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export XLSX error:', err);
    error.value = 'Gagal mengexport laporan XLSX';
  } finally {
    exportingXlsx.value = false;
  }
};

const handleExportPdf = async () => {
  const sessionId = route.params.id;
  exportingPdf.value = true;
  try {
    const response = await api(`/psychology/reports/session/${sessionId}/export/pdf`, {
      responseType: 'blob'
    });

    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epps-report-${sessionId}-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export PDF error:', err);
    error.value = 'Gagal mengexport laporan PDF';
  } finally {
    exportingPdf.value = false;
  }
};

onMounted(() => {
  const savedTheme = localStorage.getItem('epps-white-theme');
  if (savedTheme !== null) useWhiteTheme.value = savedTheme === 'true';
  const savedCompact = localStorage.getItem('epps-compact-mode');
  if (savedCompact !== null) compactMode.value = savedCompact === 'true';
  loadResult();
  checkExistingReport();
});

watch(useWhiteTheme, (newValue) => {
  localStorage.setItem('epps-white-theme', newValue.toString());
  if (newValue) document.body.classList.add('white-theme');
  else document.body.classList.remove('white-theme');
});

watch(compactMode, (newValue) => {
  localStorage.setItem('epps-compact-mode', newValue.toString());
});

const activeBlockConfigs = computed(() => useWhiteTheme.value ? blockConfigsWhite : blockConfigsColored);
const getBlocksByGroup = (groupIndex) => activeBlockConfigs.value.slice(groupIndex * 3, groupIndex * 3 + 3);

const blockLegendClass = (i) => {
  const colors = [
    'bg-yellow-300 border border-yellow-400',
    'bg-blue-300 border border-blue-400',
    'bg-purple-300 border border-purple-400',
    'bg-green-300 border border-green-400',
    'bg-cyan-300 border border-cyan-400',
    'bg-indigo-400 border border-indigo-500 text-white',
    'bg-orange-300 border border-orange-400',
    'bg-gray-400 border border-gray-500 text-white',
    'bg-red-400 border border-red-500 text-white'
  ];
  return colors[i - 1] || '';
};

const getBlockMatrix = (blockNumber) => {
  const normalizedBlock = blockNumber - 1;
  const rowGroupIndex = Math.floor(normalizedBlock / 3);
  const colGroupIndex = normalizedBlock % 3;
  const colStart = colGroupIndex * 5 + 1;
  const rows = [];

  for (let rowOffset = 0; rowOffset < 5; rowOffset++) {
    const rowInGroup = rowOffset + 1;
    const rowCells = [];
    for (let colOffset = 0; colOffset < 5; colOffset++) {
      const colIdx = colStart + colOffset;
      const questionNumber = rowGroupIndex * 75 + (colIdx - 1) * 5 + rowInGroup;
      rowCells.push(questionNumber);
    }
    rows.push(rowCells);
  }
  return rows;
};

const getBlockDiagonalQuestions = (blockNumber) => {
  const m = getBlockMatrix(blockNumber);
  return [0, 1, 2, 3, 4].map(i => m[i]?.[i]);
};

const EXCLUDED_DIAGONAL_BLOCKS = [1, 5, 9];
const EXCLUDED_DIAGONAL_SET = new Set(EXCLUDED_DIAGONAL_BLOCKS.flatMap(b => getBlockDiagonalQuestions(b)));

const DIAG_BY_BLOCK = Object.fromEntries([1,2,3,4,5,6,7,8,9].map(b => [b, new Set(getBlockDiagonalQuestions(b))]));

const getBlockFromQuestion = (q) => Math.ceil(q / 25);
const isIncludedBlueDiagonal = (q) => {
  const b = getBlockFromQuestion(q);
  return (b === 2 || b === 3 || b === 7) && DIAG_BY_BLOCK[b]?.has(q);
};
const isExcludedFromCounts = (questionNumber) => EXCLUDED_DIAGONAL_SET.has(questionNumber);

const diagonalVisualClass = (q, b) => {
  if (isExcludedFromCounts(q)) return "border-2 border-red-500 text-red-600 ring-1 ring-red-300";
  if (isIncludedBlueDiagonal(q)) return "border-2 border-blue-500 text-blue-600 ring-1 ring-blue-300";
  return "";
};

const answersMap = reactive({});

const normalizeAnswer = (v) => {
  // Support new format: { answer: "A", duration: 8, timestamp: "..." }
  if (v && typeof v === 'object' && v.answer) {
    v = v.answer;
  }
  
  if (v === "A" || v === "B") return v;
  if (v === 1 || v === "1") return "A";
  if (v === 2 || v === "2") return "B";
  return "";
};

const clearAnswers = () => Object.keys(answersMap).forEach(k => (answersMap[k] = ""));

const applyBackendResult = (resp) => {
  if (!resp) return;
  const answers = resp.answers || resp.rawAnswers || {};
  clearAnswers();
  for (let q = 1; q <= 225; q++) answersMap[q] = normalizeAnswer(answers[q]);
};

const isAnswered = (questionNumber) => !!answersMap[questionNumber];
const getCellDisplay = (questionNumber) => answersMap[questionNumber] || questionNumber;

const handleQuestionClick = (questionNumber) => {
  if (matrixLocked.value) return;
  const cur = answersMap[questionNumber];
  answersMap[questionNumber] = cur === "A" ? "B" : cur === "B" ? "" : "A";
};

const getRowGroupRowQuestionsRaw = (groupIndex, rowIndex) => {
  const blocks = [groupIndex * 3 + 1, groupIndex * 3 + 2, groupIndex * 3 + 3];
  return blocks.flatMap(b => getBlockMatrix(b)[rowIndex] || []);
};

const getColumnGroupColumnQuestionsRaw = (colGroupIndex, colIndex) => {
  const blocks = [1 + colGroupIndex, 4 + colGroupIndex, 7 + colGroupIndex];
  return blocks.flatMap(b => getBlockMatrix(b).map(row => row[colIndex]).filter(v => v !== undefined));
};

const getRowGroupLabel = (groupIndex, rowIndex) => rowGroupLabels[groupIndex]?.[rowIndex] || "";

const filterSummaryExclusions = (nums) => nums.filter(q => !EXCLUDED_DIAGONAL_SET.has(q));

const getRowGroupAnswerCountSummary = (groupIndex, rowIndex, answer = "A") => 
  filterSummaryExclusions(getRowGroupRowQuestionsRaw(groupIndex, rowIndex)).reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);

const getColumnGroupAnswerCountSummary = (colGroupIndex, colIndex, answer = "B") => 
  filterSummaryExclusions(getColumnGroupColumnQuestionsRaw(colGroupIndex, colIndex)).reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);

const getRowGroupAnsweredCountSummary = (groupIndex, rowIndex) => 
  filterSummaryExclusions(getRowGroupRowQuestionsRaw(groupIndex, rowIndex)).reduce((sum, q) => sum + (answersMap[q] ? 1 : 0), 0);

const getRowGroupABSumSummary = (groupIndex, rowIndex) => 
  getRowGroupAnswerCountSummary(groupIndex, rowIndex, "A") + getColumnGroupAnswerCountSummary(groupIndex, rowIndex, "B");

const getNeedBB = (label) => {
  const parts = needsConfig[label] || [];
  const rowPart = parts.find(p => p.type === "row");
  if (!rowPart) return 0;
  return getRowGroupAnswerCountSummary(rowPart.groupIndex, rowPart.rowIndex, rowPart.answer || "A");
};

const getNeedBJ = (label) => {
  const parts = needsConfig[label] || [];
  const colPart = parts.find(p => p.type === "col");
  if (!colPart) return 0;
  return getColumnGroupAnswerCountSummary(colPart.colGroupIndex, colPart.colIndex, colPart.answer || "B");
};

const needsSummary = computed(() => 
  allNeeds.map(label => {
    const bb = getNeedBB(label);
    const bj = getNeedBJ(label);
    const bd = computeBD(bj);
    const bh = computeBH(bb, bd);
    const s = (typeof bd === "number" ? bd : 0) + (typeof bh === "number" ? bh : 0);
    const category = getTraitCategory(sex.value, String(label || "").toLowerCase(), s) || "-";
    return { label, bb, bj, bd, bh, s, category };
  })
);

// Top 5 needs (highest scores)
const topNeeds = computed(() => {
  return [...needsSummary.value]
    .sort((a, b) => (b.s || 0) - (a.s || 0))
    .slice(0, 5);
});

// Low 5 needs (lowest scores)
const lowNeeds = computed(() => {
  return [...needsSummary.value]
    .sort((a, b) => (a.s || 0) - (b.s || 0))
    .slice(0, 5);
});

const getNeedCategoryByGroupRow = (groupIndex, rowIndex) => {
  const label = getRowGroupLabel(groupIndex, rowIndex);
  return needsSummary.value.find(x => x.label === label)?.category ?? "-";
};

const radar = computed(() => {
  const labels = needsSummary.value.map(n => n.label);
  const vals = needsSummary.value.map(n => typeof n.s === "number" ? n.s : parseFloat(n.s) || 0);
  const maxVal = Math.max(1, ...vals);

  const size = 380, padding = 48;
  const cx = size / 2, cy = size / 2, radius = size / 2 - padding;
  const N = Math.max(1, labels.length);
  const step = (Math.PI * 2) / N;
  const start = -Math.PI / 2;

  const pointFor = (ratio, idx) => {
    const ang = start + idx * step;
    const r = Math.max(0, Math.min(1, ratio)) * radius;
    return { x: +(cx + r * Math.cos(ang)).toFixed(2), y: +(cy + r * Math.sin(ang)).toFixed(2), ang };
  };

  const axes = [], labelPositions = [];
  for (let i = 0; i < N; i++) {
    axes.push(pointFor(1, i));
    const lp = pointFor(1.1, i);
    const cos = Math.cos(start + i * step);
    labelPositions.push({ ...lp, anchor: cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle" });
  }

  const rings = [0.25, 0.5, 0.75, 1].map(f => 
    Array.from({ length: N }, (_, i) => pointFor(f, i)).map(p => `${p.x},${p.y}`).join(" ")
  );

  const pts = vals.map((v, i) => pointFor(v / maxVal, i));
  const polygonPoints = pts.map(p => `${p.x},${p.y}`).join(" ");

  return { size, cx, cy, radius, labels, maxVal: +maxVal.toFixed(2), axes, rings, polygonPoints, points: pts, labelPositions };
});

const eppsLevelThresholds = { low: 0.33, high: 0.66 };
const interpretEppsLevel = (s, max) => {
  const pct = max > 0 ? s / max : 0;
  return pct <= eppsLevelThresholds.low ? "low" : pct > eppsLevelThresholds.high ? "high" : "medium";
};

const eppsNarrativeDetails = computed(() => {
  const max = radar.value.maxVal || 1;
  return needsSummary.value
    .map(n => {
      const level = interpretEppsLevel(typeof n.s === "number" ? n.s : parseFloat(n.s) || 0, max);
      const base = EppsNarratives[n.label] || {};
      return {
        ...n,
        percent: max > 0 ? n.s / max : 0,
        level,
        narrative: base.levels?.[level] || base.description || "",
        title: base.name || n.label,
      };
    })
    .sort((a, b) => (b.s || 0) - (a.s || 0));
});

const topEppsNarratives = computed(() => eppsNarrativeDetails.value.slice(0, 5));

const computeConsistencyPair = (blockA, blockB) => {
  const dA = getBlockDiagonalQuestions(blockA);
  const dB = getBlockDiagonalQuestions(blockB);
  let matches = 0, total = 0;
  for (let i = 0; i < 5; i++) {
    const va = answersMap[dA[i]], vb = answersMap[dB[i]];
    if (va && vb) { total++; if (va === vb) matches++; }
  }
  return { matches, total, percent: total ? Math.round((matches / total) * 100) : 0 };
};

const consistencyPairs = computed(() => [
  { label: "1:7", ...computeConsistencyPair(1, 7) },
  { label: "2:5", ...computeConsistencyPair(2, 5) },
  { label: "3:9", ...computeConsistencyPair(3, 9) },
]);

const verifyResult = async () => {
  const orderItemId = resultData.value?.orderItemId;
  if (!orderItemId) return;
  verifying.value = true;
  try {
    await api(`/outpatient/test-orders/result-verifications/${orderItemId}`, { method: 'POST' });
    await loadResult();
  } catch (e) {
    console.error('Gagal memverifikasi hasil test EPPS:', e);
  } finally {
    verifying.value = false;
  }
};
</script>

<style scoped>
.epps-block-card { transition: none !important; }
.epps-matrix-cell { transition: colors !important; }

@media (prefers-color-scheme: dark) { .epps-block-card, .epps-matrix-cell { filter: none !important; } }
@media (min-width: 768px) { .epps-block-card, .epps-matrix-cell { filter: none !important; } }
@media (min-width: 1024px) { .epps-block-card, .epps-matrix-cell { filter: none !important; } }

.badge[class*="bg-yellow"] { background-color: rgb(254 240 138) !important; border-color: rgb(250 204 21) !important; color: rgb(113 63 18) !important; }
.badge[class*="bg-blue"] { background-color: rgb(147 197 253) !important; border-color: rgb(96 165 250) !important; color: rgb(30 58 138) !important; }
.badge[class*="bg-purple"] { background-color: rgb(196 181 253) !important; border-color: rgb(167 139 250) !important; color: rgb(88 28 135) !important; }
.badge[class*="bg-green"] { background-color: rgb(134 239 172) !important; border-color: rgb(74 222 128) !important; color: rgb(22 101 52) !important; }
.badge[class*="bg-cyan"] { background-color: rgb(165 243 252) !important; border-color: rgb(103 232 249) !important; color: rgb(21 94 117) !important; }
.badge[class*="bg-indigo"] { background-color: rgb(129 140 248) !important; border-color: rgb(99 102 241) !important; color: rgb(255 255 255) !important; }
.badge[class*="bg-orange"] { background-color: rgb(253 186 116) !important; border-color: rgb(251 146 60) !important; color: rgb(154 52 18) !important; }
.badge[class*="bg-gray"] { background-color: rgb(156 163 175) !important; border-color: rgb(107 114 128) !important; color: rgb(255 255 255) !important; }
.badge[class*="bg-red"] { background-color: rgb(248 113 113) !important; border-color: rgb(239 68 68) !important; color: rgb(255 255 255) !important; }

::v-deep(.white-theme) .badge[class*="bg-yellow"], ::v-deep(.white-theme) .badge[class*="bg-blue"],
::v-deep(.white-theme) .badge[class*="bg-purple"], ::v-deep(.white-theme) .badge[class*="bg-green"],
::v-deep(.white-theme) .badge[class*="bg-cyan"], ::v-deep(.white-theme) .badge[class*="bg-indigo"],
::v-deep(.white-theme) .badge[class*="bg-orange"], ::v-deep(.white-theme) .badge[class*="bg-gray"],
::v-deep(.white-theme) .badge[class*="bg-red"] { filter: none !important; }
</style>
