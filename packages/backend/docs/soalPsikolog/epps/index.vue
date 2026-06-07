<route lang="yaml">
name: results-epps
meta:
  layout: DefaultLayout
  public: false
  action: read
  subject: Result
</route>

<template>
  <div class="space-y-6">
    <section class="card bg-base-100 shadow">
      <div class="card-body">
        <header
          class="flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 class="card-title">EPPS Matrix Test</h1>
            <p class="text-sm opacity-70">
              Matriks 15x15 EPPS dengan 9 grup blok dan nomor soal 1-225
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <div class="badge badge-outline badge-lg">
              {{ totalQuestions }} soal
            </div>
            <div class="badge badge-outline badge-lg">15x15 matriks</div>
            <div class="badge badge-outline badge-lg">
              {{ totalBlocks }} blok
            </div>
          </div>
        </header>
      </div>
    </section>

    <!-- Patient card (separate) -->
    <section v-if="selectedDataset" class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="grid grid-cols-1 sm:grid-cols-8 md:grid-cols-12 gap-4 items-center">
          <div class="sm:col-span-5 md:col-span-8 flex items-center gap-4">
            <div class="avatar">
              <div
                class="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0 relative"
              >
                <i-tabler-user
                  class="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                />
              </div>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold flex items-center gap-2">
                <span class="truncate">{{ selectedDataset.__name || selectedDataset?.subject?.name || '—' }}</span>
                <span v-if="(selectedDataset?.subject?.sex || '').toLowerCase() === 'male'" title="Male">
                  <i-tabler-mars class="h-4 w-4 text-blue-600" />
                </span>
                <span v-else-if="(selectedDataset?.subject?.sex || '').toLowerCase() === 'female'" title="Female">
                  <i-tabler-venus class="h-4 w-4 text-pink-500" />
                </span>
                <span v-else title="Unknown">
                  <i-tabler-user class="h-4 w-4 text-gray-400" />
                </span>
              </div>
              <div class="text-xs text-muted mt-1">
                <span class="mr-3">ID: {{ selectedDataset?.subject?.id || selectedDataset?.subject?.subjectId || selectedDataset?.subject?.patientId || '-' }}</span>
                <span class="mr-3">Reg: {{ selectedDataset.__regCode || selectedDataset?.subject?.registration?.code || '-' }}</span>
                <span>Age: {{ selectedDataset?.subject?.age || selectedDataset?.subject?.age_years || '-' }}</span>
              </div>
            </div>
          </div>
          <div class="sm:col-span-3 md:col-span-4 text-right">
            <div class="font-mono">Test ID: {{ selectedDataset.testId || selectedDataset.__key }}</div>
            <div class="text-xs opacity-70">Sumber: {{ selectedDataset.source || selectedDataset?.result?.source || '-' }}</div>
            <div class="mt-3">
              <button class="btn btn-xs btn-outline" @click="() => { navigator.clipboard?.writeText(selectedDataset?.subject?.id || '') }">Copy ID</button>
              <button class="btn btn-xs btn-primary ml-2">View Details</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 9 Blok Matriks 5x5 dengan spacing -->
    <section class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="relative">
          <h2 class="card-title mb-2">
            EPPS Matrix - 9 Blok Terpisah (5x5 setiap blok)
          </h2>
          <div
            v-if="!loadingResults && datasets.length === 0"
            class="alert alert-warning mb-4"
          >
            <i-tabler-alert-circle class="h-5 w-5" />
            <span> Tidak ada hasil yang ditemukan.</span>
            <span v-if="route.query?.code" class="ml-1"
              >Kode registrasi: {{ String(route.query.code) }}</span
            >
          </div>

          <!-- gear button top-right -->
          <div class="absolute top-2 right-2">
            <!-- circular ghost gear button -->
            <button
              type="button"
              class="btn btn-ghost btn-circle btn-sm"
              @click="showMatrixMenu = !showMatrixMenu"
              aria-label="Menu Matriks"
            >
              <i-tabler-settings class="h-4 w-4" />
            </button>
            <!-- popover is absolutely positioned and anchored so it does not cause layout shift -->
            <div
              v-if="showMatrixMenu"
              class="absolute right-0 mt-2 transform -translate-x-2 origin-top-right min-w-[150px] sm:min-w-[150px] md:min-w-[60px] w-auto max-w-[60vw] p-4 bg-base-100 rounded-lg shadow-lg border border-base-200 z-50"
            >
              <!-- simplified control block: only theme mode and matrix lock -->
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
              </div>
            </div>
          </div>
        </div>

        <!-- Grid 3x3 untuk 9 blok dengan 1 kolom ringkasan per grup (kanan) -->
        <div class="space-y-6 md:space-y-8 xl:space-y-10 max-w-12xl mx-auto px-2 md:px-4 xl:px-6">
          <!-- render per grup baris (3 grup) -->
          <div
            v-for="groupIndex in [0, 1, 2]"
            :key="`row-group-${groupIndex}`"
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 xl:gap-8"
          >
            <!-- 3 blok dalam satu grup -->
            <div
              v-for="block in getBlocksByGroup(groupIndex)"
              :key="block.block"
              class="p-4 rounded-2xl border-2 shadow-md space-y-4"
              :class="[block.cardClass, 'epps-block-card']"
            >
              <div class="flex justify-between items-center">
                <h3
                  class="text-xs font-bold tracking-wide text-center flex-1"
                  :class="block.headerClass"
                >
                  {{ block.title }}
                </h3>
                <span
                  class="badge badge-sm border-none text-[10px] font-semibold uppercase"
                  :class="block.badgeClass"
                >
                  {{ block.block }}
                </span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="(row, rowIndex) in getBlockMatrix(block.block)"
                  :key="`block-${block.block}-row-${rowIndex}`"
                  class="grid grid-cols-5 gap-2 md:gap-3 xl:gap-3"
                >
                  <div
                    v-for="questionNum in row"
                    :key="`block-${block.block}-q-${questionNum}`"
                    class="w-8 h-8 md:w-12 md:h-12 xl:w-12 xl:h-12 flex items-center justify-center rounded-lg text-xs md:text-sm xl:text-sm font-semibold transition-colors shadow-sm"
                    :class="[
                      block.cellClass,
                      'epps-matrix-cell',
                      isAnswered(questionNum)
                        ? 'ring-2 ring-offset-1 ring-black/30'
                        : '',
                      diagonalVisualClass(questionNum, block.block),
                      matrixLocked
                        ? 'cursor-default pointer-events-none opacity-90'
                        : 'cursor-pointer',
                    ]"
                    :title="`Soal ${questionNum} - Blok ${block.block}${
                      isExcludedFromCounts(questionNum)
                        ? ' (tidak dihitung)'
                        : isIncludedBlueDiagonal(questionNum)
                        ? ' (diagonal dihitung)'
                        : ''
                    }${matrixLocked ? ' [TERKUNCI]' : ''}`"
                    @click="handleQuestionClick(questionNum)"
                  >
                    {{ getCellDisplay(questionNum) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Kolom ringkasan di sebelah kanan grup -->
            <div
              class="p-4 rounded-2xl border-2 shadow-md space-y-4 bg-base-100 border-base-300 text-base-content"
            >
              <div class="flex justify-between items-center">
                <h3
                  class="text-xs font-bold tracking-wide text-center text-base-content/70 flex-1"
                >
                  Ringkasan Baris
                </h3>
                <span
                  class="badge badge-sm border-none bg-base-200 text-base-content text-[10px] font-semibold uppercase"
                  >S</span
                >
              </div>
              <div class="grid grid-cols-5 gap-2 md:gap-3 xl:gap-3">
                <div
                  v-for="col in summaryColumnCount"
                  :key="`sum-col-${groupIndex}-${col}`"
                  class="grid grid-cols-1 gap-2"
                >
                  <div
                    v-for="rowIndex in 5"
                    :key="`row-sum-${groupIndex}-${col}-${rowIndex}`"
                    class="w-8 h-8 md:w-12 md:h-12 xl:w-12 xl:h-12 flex items-center justify-center rounded-lg text-xs md:text-sm xl:text-sm font-semibold bg-base-100 text-base-content border border-base-300 shadow-sm"
                    :title="
                      col === labelSummaryColumnIndex
                        ? `Label baris ${rowIndex} di grup ${groupIndex + 1}`
                        : col === aCountColumnIndex
                        ? `Jumlah A pada baris ${rowIndex} (blok ${
                            groupIndex * 3 + 1
                          }-${groupIndex * 3 + 3})`
                        : col === bCountColumnIndex
                        ? `Jumlah B pada kolom ${rowIndex} (blok ${
                            groupIndex + 1
                          },${groupIndex + 4},${groupIndex + 7})`
                        : col === 4
                        ? `Jumlah A + B untuk baris ${rowIndex}`
                        : col === 5
                        ? `Kategori need (hasil Skor Need EPPS)`
                        : `Jumlah jawaban baris ${rowIndex} kolom ${col} di grup ${
                            groupIndex + 1
                          }`
                    "
                  >
                    {{
                      col === labelSummaryColumnIndex
                        ? getRowGroupLabel(groupIndex, rowIndex - 1)
                        : col === aCountColumnIndex
                        ? getRowGroupAnswerCountSummary(
                            groupIndex,
                            rowIndex - 1,
                            "A"
                          )
                        : col === bCountColumnIndex
                        ? getColumnGroupAnswerCountSummary(
                            groupIndex,
                            rowIndex - 1,
                            "B"
                          )
                        : col === 4
                        ? getRowGroupABSumSummary(groupIndex, rowIndex - 1)
                        : col === 5
                        ? getNeedCategoryByGroupRow(groupIndex, rowIndex - 1)
                        : getRowGroupAnsweredCountSummary(
                            groupIndex,
                            rowIndex - 1
                          )
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend dengan nomor grup -->
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-4">Informasi 9 Blok Matriks</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-yellow-300 border border-yellow-400 rounded flex items-center justify-center text-xs font-bold"
              >
                1
              </div>
              <span class="text-sm">Blok 1: Soal 1-25</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-blue-300 border border-blue-400 rounded flex items-center justify-center text-xs font-bold"
              >
                2
              </div>
              <span class="text-sm">Blok 2: Soal 26-50</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-purple-300 border border-purple-400 rounded flex items-center justify-center text-xs font-bold"
              >
                3
              </div>
              <span class="text-sm">Blok 3: Soal 51-75</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-green-300 border border-green-400 rounded flex items-center justify-center text-xs font-bold"
              >
                4
              </div>
              <span class="text-sm">Blok 4: Soal 76-100</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-cyan-300 border border-cyan-400 rounded flex items-center justify-center text-xs font-bold"
              >
                5
              </div>
              <span class="text-sm">Blok 5: Soal 101-125</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-indigo-400 border border-indigo-500 rounded flex items-center justify-center text-xs font-bold text-white"
              >
                6
              </div>
              <span class="text-sm">Blok 6: Soal 126-150</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-orange-300 border border-orange-400 rounded flex items-center justify-center text-xs font-bold"
              >
                7
              </div>
              <span class="text-sm">Blok 7: Soal 151-175</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-gray-400 border border-gray-500 rounded flex items-center justify-center text-xs font-bold text-white"
              >
                8
              </div>
              <span class="text-sm">Blok 8: Soal 176-200</span>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-red-400 border border-red-500 rounded flex items-center justify-center text-xs font-bold text-white"
              >
                9
              </div>
              <span class="text-sm">Blok 9: Soal 201-225</span>
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-4">
            Setiap blok berisi 25 soal (5x5). Total 225 soal EPPS. Klik pada
            nomor soal untuk melihat detail.
          </p>
        </div>
      </div>
    </section>

    <!-- Ringkasan Skor Need (R, C, S) + Kategori -->
    <section class="card bg-base-100 shadow">
      <div class="card-body">
        <header
          class="flex flex-col sm:flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2"
        >
          <div>
            <h2 class="card-title">Skor Need EPPS</h2>
            <p class="text-sm opacity-70">
              R = hitung A (baris), C = hitung B (kolom), S = BD + BH (dari ringkasan, kolom BD & BH disembunyikan)
            </p>
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
                <th title="R: Jumlah A pada baris (ringkasan, exclude diagonal)">R</th>
                <th title="C: Jumlah B pada kolom (ringkasan, exclude diagonal)">C</th>
                <!-- <th>BD</th> -->
                <!-- <th>BH</th> -->
                <th>S</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in needsSummary" :key="n.label">
                <td class="font-semibold">{{ n.label }}</td>
                <td class="font-mono">{{ n.bb }}</td>
                <td class="font-mono">{{ n.bj }}</td>
                <!-- <td class="font-mono">{{ typeof n.bd === 'number' ? n.bd.toFixed(2) : n.bd }}</td> -->
                <!-- <td class="font-mono">{{ typeof n.bh === 'number' ? n.bh.toFixed(2) : n.bh }}</td> -->
                <td class="font-mono">
                  {{ typeof n.s === "number" ? n.s.toFixed(2) : n.s }}
                </td>
                <td class="font-mono">{{ n.category }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Grafik Radar Need EPPS (S) -->
    <section class="card bg-base-100 shadow">
      <div class="card-body">
        <header class="mb-2 flex items-center justify-between">
          <div>
            <h2 class="card-title">Grafik Radar Need EPPS</h2>
            <p class="text-sm opacity-70">
              Visualisasi skor S per Need (diskalakan terhadap nilai maksimum saat ini).
            </p>
          </div>
          <div class="badge badge-outline badge-sm">Max S: {{ radar.maxVal }}</div>
        </header>

        <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <div class="overflow-auto">
            <svg
              :width="radar.size"
              :height="radar.size"
              :viewBox="`0 0 ${radar.size} ${radar.size}`"
            >
              <!-- Rings -->
              <polygon
                v-for="(pts, i) in radar.rings"
                :key="`ring-${i}`"
                :points="pts"
                fill="none"
                stroke="#e5e7eb"
                stroke-width="1"
              />
              <!-- Axes -->
              <line
                v-for="(ax, i) in radar.axes"
                :key="`ax-${i}`"
                :x1="radar.cx"
                :y1="radar.cy"
                :x2="ax.x"
                :y2="ax.y"
                stroke="#e5e7eb"
                stroke-width="1"
              />
              <!-- Polygon -->
              <polygon
                :points="radar.polygonPoints"
                fill="rgba(59,130,246,0.20)"
                stroke="#3b82f6"
                stroke-width="2"
              />
              <!-- Points -->
              <circle
                v-for="(pt, i) in radar.points"
                :key="`pt-${i}`"
                :cx="pt.x"
                :cy="pt.y"
                r="3"
                fill="#3b82f6"
              />
              <!-- Labels -->
              <g v-for="(lbl, i) in radar.labels" :key="`lbl-${i}`">
                <text
                  :x="radar.labelPositions[i].x"
                  :y="radar.labelPositions[i].y"
                  :text-anchor="radar.labelPositions[i].anchor"
                  alignment-baseline="middle"
                  font-size="10"
                  fill="#6b7280"
                >
                  {{ lbl }}
                </text>
              </g>
            </svg>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="(n, i) in needsSummary"
              :key="n.label"
              class="flex items-center justify-between gap-3 p-2 rounded border bg-base-50"
            >
              <div class="flex items-center gap-2">
                <span class="badge badge-ghost badge-xs">{{ i + 1 }}</span>
                <span class="font-medium">{{ n.label }}</span>
              </div>
              <div class="font-mono text-sm">
                S: {{ typeof n.s === "number" ? n.s.toFixed(2) : n.s }}
              </div>
            </div>
          </div>
        </div>

        <!-- Narrative conclusions (top needs) - moved below radar -->
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">Kesimpulan Narasi EPPS</h3>
          <p class="text-sm text-base-content/70 mb-4">
            Ringkasan narasi berdasarkan skor Need teratas (S). Narasi diambil
            dari data base EPPS narratives.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="item in topEppsNarratives"
              :key="item.label"
              class="p-4 rounded-lg border bg-base-50"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="text-sm font-semibold">{{ item.title }}</div>
                  <div class="text-xs opacity-70">
                    Level: <span class="font-medium">{{ item.level }}</span> —
                    {{ Math.round((item.percent || 0) * 100) }}%
                  </div>
                </div>
                <div class="text-xs font-mono">
                  S:
                  {{ typeof item.s === "number" ? item.s.toFixed(2) : item.s }}
                </div>
              </div>
              <div class="mt-2 text-sm text-base-content/80">
                {{ item.narrative }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Konsistensi Diagonal 1:7, 2:5, 3:9 -->
    <section class="card bg-base-100 shadow">
      <div class="card-body">
        <header class="mb-2">
          <h2 class="card-title">Konsistensi Diagonal</h2>
          <p class="text-sm opacity-70">
            Membandingkan pasangan blok 1:7, 2:5, 3:9. Diagonal dikecualikan
            dari perhitungan skor.
          </p>
        </header>
        <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="p in consistencyPairs"
            :key="p.label"
            class="p-4 rounded-xl border space-y-2"
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold">Pair {{ p.label }}</div>
              <div class="badge badge-sm">{{ p.matches }}/{{ p.total }}</div>
            </div>
            <div class="w-full bg-base-200 h-2 rounded">
              <div
                class="bg-primary h-2 rounded"
                :style="{
                  width: (p.total ? (100 * p.matches) / p.total : 0) + '%',
                }"
              ></div>
            </div>
            <div class="text-xs text-gray-500">{{ p.percent }}% sama</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, computed, ref, watch, inject, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { blockConfigsColored, blockConfigsWhite } from "@/data/epps/blockConfig.js";
import {
  rowGroupLabels,
  needsConfig,
  allNeeds,
} from "@/data/epps/eppsNeedsConfig.js";
import EppsNarratives from "@/data/epps/eppsNarratives.js";
import { sumifMinusExclude, computeBD, computeBH } from "@/data/epps/eppsSumif.js";
import { getTraitCategory } from "@/data/epps/eppsScoring.js";
import dummyData from "@/data/epps/eppsDummyAnswers.json";

// API & routing
const api = inject("$api");
const route = useRoute();
const router = useRouter();

// Datasets dari endpoint result_list
const resultsPayload = ref(null);
const datasets = ref([]);
const loadingResults = ref(false);
const q = ref("");
const selectedKey = ref("");

const normalizeQueryValue = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const routeTestId = computed(() => normalizeQueryValue(route.query?.testId));
const routeRegCode = computed(() => normalizeQueryValue(route.query?.code));
const routeTestKey = computed(() => normalizeQueryValue(route.query?.testKey));

// One-time selection hint storage (set by results list page)
const PREFERRED_STORAGE_KEY = 'epps:preferred-selection';
const popPreferredSelectionForCode = (code) => {
  const c = normalizeQueryValue(code);
  if (!c) return null;
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(PREFERRED_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const entry = map?.[c];
    // consume it once
    delete map[c];
    window.sessionStorage.setItem(PREFERRED_STORAGE_KEY, JSON.stringify(map));
    if (!entry || typeof entry !== 'object') return null;
    const key = entry.__key ? String(entry.__key) : '';
    const testId = entry.testId ? String(entry.testId) : '';
    return { key: key || null, testId: testId || null };
  } catch (e) {
    console.debug('[epps] popPreferredSelectionForCode error', e);
    return null;
  }
};

const buildDatasetQuery = (ds) => {
  // Keep URL clean: only expose registration code
  const query = {};
  const code = normalizeQueryValue(ds?.__regCode);
  if (code) query.code = code;
  return query;
};

const syncRouteQueryToDataset = (ds, { replace = true } = {}) => {
  if (!ds) return;
  const datasetQuery = buildDatasetQuery(ds);
  const needsTestIdUpdate =
    normalizeQueryValue(route.query?.testId) !==
    normalizeQueryValue(datasetQuery.testId);
  const needsCodeUpdate =
    normalizeQueryValue(route.query?.code) !==
    normalizeQueryValue(datasetQuery.code);
  if (!needsTestIdUpdate && !needsCodeUpdate) return;
  const preserved = { ...route.query };
  // enforce code-only URLs: drop any existing id/key
  delete preserved.testId;
  delete preserved.testKey;
  delete preserved.code;
  const nextQuery = Object.keys(datasetQuery).length
    ? { ...preserved, ...datasetQuery }
    : preserved;
  const nav = { query: nextQuery };
  if (replace) router.replace(nav);
  else router.push(nav);
};

const findDatasetByTestId = (value) => {
  const target = normalizeQueryValue(value);
  if (!target) return null;
  return (
    datasets.value.find(
      (ds) =>
        normalizeQueryValue(ds.testId) === target ||
        normalizeQueryValue(ds.__key) === target
    ) || null
  );
};

const findDatasetByRegCode = (value) => {
  const target = normalizeQueryValue(value);
  if (!target) return null;
  return (
    datasets.value.find(
      (ds) => normalizeQueryValue(ds.__regCode) === target
    ) || null
  );
};

const findDatasetByKey = (value) => {
  const target = normalizeQueryValue(value).toLowerCase();
  if (!target) return null;
  const found = datasets.value.find((ds) => {
    const key = normalizeQueryValue(ds.__key).toLowerCase();
    return key === target;
  }) || null;
  console.debug('[epps] findDatasetByKey', { target, found });
  return found;
};

// Currently selected dataset (from backend response). Prefer selectedKey, else first dataset.
const selectedDataset = computed(() => {
  if (!datasets.value || datasets.value.length === 0) return null;
  console.log(datasets);
  
  if (selectedKey.value) {
    return (
      datasets.value.find(
        (d) => String(d.__key) === String(selectedKey.value)
      ) || datasets.value[0]
    );
  }
  return datasets.value[0];
});

const normalizeDataset = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const reg = raw?.subject?.registration || {};
  const code = reg.code || reg.registrationCode || raw.registrationCode || "";
  const name =
    raw?.subject?.name ||
    raw?.subject?.full_name ||
    raw?.subject?.patient_name ||
    "-";
  const regId = reg.id || raw.registrationId || "";
  const subjectId = raw?.subject?.id || raw?.subject?.subjectId || raw?.subject?.patientId || "";
  const testInstanceId = raw?.id || raw?.resultId || raw?.testResultId || raw?.testOrderId || "";
  const testId = raw?.testId || "";
  const makeKey = () => {
    const first = regId || testInstanceId;
    if (first) return String(first).trim();
    const combos = [
      [code, subjectId, testId],
      [code, subjectId],
      [testId, subjectId],
      [code, testId],
    ];
    for (const parts of combos) {
      const joined = parts.filter(Boolean).join('|');
      if (joined) return joined;
    }
    return String(code || testId || subjectId || Math.random()).trim();
  };
  return {
    ...raw,
    __key: makeKey(),
    __label: `${code || "N/A"} — ${name}`,
    __regCode: code,
    __name: name,
  };
};

const extractDatasets = (payload) => {
  if (!payload) return [];
  // unwrap common wrappers
  let p = payload;
  if (p && typeof p === "object" && "data" in p && p.data) p = p.data;
  // candidates in order
  const candidates = [];
  if (Array.isArray(p)) candidates.push(p);
  if (Array.isArray(p?.datasets)) candidates.push(p.datasets);
  if (Array.isArray(p?.result?.datasets)) candidates.push(p.result.datasets);
  if (Array.isArray(p?.items)) candidates.push(p.items);
  const list = candidates.find((x) => Array.isArray(x)) || [];
  return list.map(normalizeDataset).filter(Boolean);
};

const fetchResultList = async () => {
  if (!api) return;
  loadingResults.value = true;
  try {
    const resp = await api("/outpatient/test-orders/result_list");
    resultsPayload.value = resp;
    datasets.value = extractDatasets(resp);
    // Debug: log what we received and the current route query so we can
    // correlate list -> detail navigation when reproducing the bug.
    console.debug('[epps] fetchResultList', {
      routeQuery: route.query,
      datasets: datasets.value.map((d) => ({ testId: d.testId, __regCode: d.__regCode, __key: d.__key, __name: d.__name })),
    });
  } catch (e) {
    console.error("Gagal memuat result_list:", e);
    resultsPayload.value = null;
    datasets.value = [];
  } finally {
    loadingResults.value = false;
  }
};

const filteredDatasets = computed(() => {
  const term = q.value.trim().toLowerCase();
  if (!term) return datasets.value;
  return datasets.value.filter((ds) => {
    return (
      String(ds.__regCode || "")
        .toLowerCase()
        .includes(term) ||
      String(ds.__name || "")
        .toLowerCase()
        .includes(term) ||
      String(ds.testId || "")
        .toLowerCase()
        .includes(term)
    );
  });
});

const selectDataset = (ds, { syncQuery = false } = {}) => {
  if (!ds) return false;
  selectedKey.value = ds.__key;
  applyBackendResult(ds);
  if (syncQuery) syncRouteQueryToDataset(ds);
  return true;
};

const selectDatasetFromRoute = ({ syncQuery = true } = {}) => {
  // Debug: print all route params and all dataset keys
  console.debug('[epps] selectDatasetFromRoute', {
    routeTestKey: routeTestKey.value,
    routeTestId: routeTestId.value,
    routeRegCode: routeRegCode.value,
    datasetKeys: datasets.value.map(ds => ds.__key),
    datasetRegCodes: datasets.value.map(ds => ds.__regCode),
  });
  // Priority: preferred (from sessionStorage) -> explicit testKey -> testId -> reg code
  const preferred = routeRegCode.value ? popPreferredSelectionForCode(routeRegCode.value) : null;
  const matchByPreferredKey = preferred?.key ? findDatasetByKey(preferred.key) : null;
  const matchByPreferredId = !matchByPreferredKey && preferred?.testId ? findDatasetByTestId(preferred.testId) : null;
  const matchByKey = !matchByPreferredKey && !matchByPreferredId && routeTestKey.value ? findDatasetByKey(routeTestKey.value) : null;
  const matchByTestId = !matchByKey && routeTestId.value
    ? findDatasetByTestId(routeTestId.value)
    : null;
  const matchByCode =
    !matchByPreferredKey && !matchByPreferredId && !matchByKey && !matchByTestId && routeRegCode.value
      ? findDatasetByRegCode(routeRegCode.value)
      : null;
  const target = matchByPreferredKey || matchByPreferredId || matchByKey || matchByTestId || matchByCode;
  console.debug('[epps] selectDatasetFromRoute result', { preferred, matchByPreferredKey, matchByPreferredId, matchByKey, matchByTestId, matchByCode, target });
  if (!target) return false;
  return selectDataset(target, { syncQuery });
};

const ensureSelection = ({ preferRoute = true } = {}) => {
  if (!datasets.value.length) return false;
  if (selectedKey.value) {
    const current = datasets.value.find((ds) => ds.__key === selectedKey.value);
    if (current) return selectDataset(current, { syncQuery: true });
  }
  if (preferRoute && selectDatasetFromRoute({ syncQuery: true })) return true;
  return selectDataset(datasets.value[0], { syncQuery: true });
};

const handleSelectChange = () => {
  const ds = filteredDatasets.value.find((x) => x.__key === selectedKey.value);
  if (ds) selectDataset(ds, { syncQuery: true });
};

const refreshResults = () => fetchResultList();

onMounted(async () => {
  await fetchResultList();
  const ensured = ensureSelection({ preferRoute: true });
  // Debug: report which dataset was selected after initial load
  console.debug('[epps] ensureSelection result', {
    routeQuery: route.query,
    ensured,
    selectedKey: selectedKey.value,
    selectedDataset: selectedDataset.value
      ? { testId: selectedDataset.value.testId, __regCode: selectedDataset.value.__regCode, __key: selectedDataset.value.__key, __name: selectedDataset.value.__name }
      : null,
  });
});

watch(
  () => [routeTestId.value, routeRegCode.value],
  () => {
    if (!datasets.value.length) return;
    selectDatasetFromRoute({ syncQuery: true });
  }
);

watch(
  () => datasets.value,
  (newList) => {
    if (!newList || newList.length === 0) return;
    ensureSelection({ preferRoute: true });
  }
);

const getBlockMatrix = (blockNumber) => {
  const normalizedBlock = blockNumber - 1;
  const rowGroupIndex = Math.floor(normalizedBlock / 3);
  const colGroupIndex = normalizedBlock % 3;
  const rowStart = rowGroupIndex * 5 + 1;
  const colStart = colGroupIndex * 5 + 1;
  const rows = [];

  // Isi 5x5 grid mengikuti mapping row_idx dan col_idx seperti referensi
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

// Ambil 5 angka diagonal dalam satu blok (5x5)
const getBlockDiagonalQuestions = (blockNumber) => {
  const m = getBlockMatrix(blockNumber);
  const list = [];
  for (let i = 0; i < 5; i++) list.push(m[i]?.[i]);
  return list;
};

// Set soal diagonal yang dikecualikan dari perhitungan (dipakai untuk konsistensi)
// Diagonal rules:
// - Blocks 1,5,9: excluded from calculations (ringkasan + needs)
// - Blocks 2,3,7: included in calculations
const EXCLUDED_DIAGONAL_BLOCKS = [1, 5, 9];
const EXCLUDED_DIAGONAL_SET = new Set(
  EXCLUDED_DIAGONAL_BLOCKS.flatMap((b) => getBlockDiagonalQuestions(b))
);

// Fungsi untuk mendapatkan nomor soal dalam setiap blok
const getBlockQuestions = (blockNumber) => {
  return getBlockMatrix(blockNumber).flat();
};

// Ambil 3 blok yang berada pada satu grup baris (0..2)
const useWhiteTheme = ref(false);

// Pastikan tema konsisten dengan localStorage
onMounted(() => {
  const savedTheme = localStorage.getItem('epps-white-theme');
  if (savedTheme !== null) {
    useWhiteTheme.value = savedTheme === 'true';
  }
});

// Watch untuk menyimpan perubahan tema
watch(useWhiteTheme, (newValue) => {
  localStorage.setItem('epps-white-theme', newValue.toString());
});

// Sync body class for white theme (for badge color override)
watch(useWhiteTheme, (val) => {
  if (val) {
    document.body.classList.add('white-theme');
  } else {
    document.body.classList.remove('white-theme');
  }
});
// Set initial state on mount
onMounted(() => {
  if (useWhiteTheme.value) {
    document.body.classList.add('white-theme');
  } else {
    document.body.classList.remove('white-theme');
  }
});

const activeBlockConfigs = computed(() =>
  useWhiteTheme.value ? blockConfigsWhite : blockConfigsColored
);
const getBlocksByGroup = (groupIndex) => {
  const start = groupIndex * 3;
  return activeBlockConfigs.value.slice(start, start + 3);
};

const showMatrixMenu = ref(false);

// Fungsi untuk handle click pada soal
const matrixLocked = ref(false);

const handleQuestionClick = (questionNumber) => {
  if (matrixLocked.value) return;
  // Toggle siklus: '' -> 'A' -> 'B' -> '' (untuk uji hitung A/B)
  const cur = answersMap[questionNumber];
  answersMap[questionNumber] = cur === "A" ? "B" : cur === "B" ? "" : "A";
  console.log("Question toggled:", {
    questionNumber,
    answer: answersMap[questionNumber],
  });
};

// Data dan statistik
const totalQuestions = 225;
const totalBlocks = 9;
const summaryColumnCount = 5;
const labelSummaryColumnIndex = 3; // kolom ke-3 berisi kata statis
const aCountColumnIndex = 1; // kolom ke-1 menghitung jumlah 'A'
const aCountExcludeFirst = true; // kecualikan sel pertama pada baris (mirip Excel)
const bCountColumnIndex = 2; // kolom ke-2 menghitung jumlah 'B'
const bCountExcludeFirst = true; // konsisten dengan Excel: minus sel pertama

// rowGroupLabels diimpor dari data/eppsNeedsConfig.js

// Debug: Log untuk melihat struktur setiap blok
console.log("Block Questions Preview:");
for (let block = 1; block <= 9; block++) {
  const questions = getBlockQuestions(block);
  console.log(`Block ${block}:`, questions);
}

// ----------------------------
// Perhitungan jawaban per baris
// ----------------------------
// Map sederhana untuk menandai soal yang sudah dijawab
// Key: nomor soal (1..225), Value: boolean
const answersMap = reactive({});

// Cek apakah sebuah soal telah dijawab (untuk styling/calc)
const isAnswered = (questionNumber) => !!answersMap[questionNumber];
const isExcludedFromCounts = (questionNumber) =>
  EXCLUDED_DIAGONAL_SET.has(questionNumber);
const DIAG_BY_BLOCK = {
  1: new Set(getBlockDiagonalQuestions(1)),
  2: new Set(getBlockDiagonalQuestions(2)),
  3: new Set(getBlockDiagonalQuestions(3)),
  4: new Set(getBlockDiagonalQuestions(4)),
  5: new Set(getBlockDiagonalQuestions(5)),
  6: new Set(getBlockDiagonalQuestions(6)),
  7: new Set(getBlockDiagonalQuestions(7)),
  8: new Set(getBlockDiagonalQuestions(8)),
  9: new Set(getBlockDiagonalQuestions(9)),
};
const getBlockFromQuestion = (q) => Math.ceil(q / 25);
const isIncludedBlueDiagonal = (q) => {
  const b = getBlockFromQuestion(q);
  if (!(b in DIAG_BY_BLOCK)) return false;
  return (b === 2 || b === 3 || b === 7) && DIAG_BY_BLOCK[b].has(q);
};
const diagonalVisualClass = (q, b) => {
  // Apply same red/blue styling in both themes
  if (isExcludedFromCounts(q))
    return "border-2 border-red-500 text-red-600 ring-1 ring-red-300";
  if (isIncludedBlueDiagonal(q))
    return "border-2 border-blue-500 text-blue-600 ring-1 ring-blue-300";
  return "";
};

// Teks yang ditampilkan pada sel matriks
// Jika ada jawaban untuk nomor soal tsb, tampilkan jawabannya (A/B),
// jika belum ada, tampilkan nomor soal seperti biasa.
const getCellDisplay = (questionNumber) => {
  const ans = answersMap[questionNumber];
  return ans ? ans : questionNumber;
};

// Hitung jumlah jawaban pada baris (row) tertentu dalam suatu blok
// rowIndex berbasis 0
const getRowAnsweredCount = (blockNumber, rowIndex) => {
  const rows = getBlockMatrix(blockNumber);
  const row = rows[rowIndex] || [];
  return row.reduce((sum, q) => sum + (answersMap[q] ? 1 : 0), 0);
};

// Kumpulkan nomor soal untuk satu baris (rowIndex) di dalam satu grup baris (3 blok)
const getRowGroupRowQuestionsRaw = (groupIndex, rowIndex) => {
  const blocks = [groupIndex * 3 + 1, groupIndex * 3 + 2, groupIndex * 3 + 3];
  const combined = [];
  for (const b of blocks) {
    const rows = getBlockMatrix(b);
    const row = rows[rowIndex] || [];
    combined.push(...row);
  }
  return combined;
};
const getRowGroupRowQuestions = (groupIndex, rowIndex) => {
  const blocks = [groupIndex * 3 + 1, groupIndex * 3 + 2, groupIndex * 3 + 3];
  const combined = [];
  for (const b of blocks) {
    const rows = getBlockMatrix(b);
    const row = rows[rowIndex] || [];
    combined.push(...row);
  }
  // Kecualikan diagonal (blok 1,5,9) dari perhitungan
  return combined.filter((q) => !EXCLUDED_DIAGONAL_SET.has(q));
};

// Kumpulkan nomor soal untuk satu kolom (colIndex) pada satu kolom-group vertikal (3 blok: (1,4,7) atau (2,5,8) atau (3,6,9))
const getColumnGroupColumnQuestionsRaw = (colGroupIndex, colIndex) => {
  const blocks = [1 + colGroupIndex, 4 + colGroupIndex, 7 + colGroupIndex];
  const combined = [];
  for (const b of blocks) {
    const matrix = getBlockMatrix(b);
    for (let r = 0; r < 5; r++) {
      const row = matrix[r] || [];
      if (row[colIndex] !== undefined) combined.push(row[colIndex]);
    }
  }
  return combined;
};
const getColumnGroupColumnQuestions = (colGroupIndex, colIndex) => {
  // Tentukan blok sesuai kolom grup: [1,4,7], [2,5,8], [3,6,9]
  const blocks = [1 + colGroupIndex, 4 + colGroupIndex, 7 + colGroupIndex];
  const combined = [];
  for (const b of blocks) {
    const matrix = getBlockMatrix(b);
    for (let r = 0; r < 5; r++) {
      const row = matrix[r] || [];
      if (row[colIndex] !== undefined) combined.push(row[colIndex]);
    }
  }
  // Kecualikan diagonal (blok 1,5,9) dari perhitungan
  return combined.filter((q) => !EXCLUDED_DIAGONAL_SET.has(q));
};

// Hitung jumlah jawaban pada satu baris di seluruh 3 blok dalam grup baris
const getRowGroupAnsweredCount = (groupIndex, rowIndex) => {
  const nums = getRowGroupRowQuestions(groupIndex, rowIndex);
  return nums.reduce((sum, q) => sum + (answersMap[q] ? 1 : 0), 0);
};

// Ambil label statis untuk kolom kata (kolom 3)
const getRowGroupLabel = (groupIndex, rowIndex) => {
  const g = rowGroupLabels[groupIndex] || [];
  return g[rowIndex] || "";
};

// Hitung jumlah jawaban tertentu (mis. 'A') pada satu baris di grup
// excludeFirst=true akan mengabaikan sel pertama pada baris tsb
const getRowGroupAnswerCount = (
  groupIndex,
  rowIndex,
  answer = "A",
  excludeFirst = false
) => {
  const nums = getRowGroupRowQuestions(groupIndex, rowIndex);
  const range = excludeFirst ? nums.slice(1) : nums;
  return range.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};

// Hitung jumlah jawaban tertentu (mis. 'B') pada kolom vertikal (3 blok sejajar)
// colGroupIndex: 0 ? blok (1,4,7); 1 ? (2,5,8); 2 ? (3,6,9)
// colIndex: 0..4 untuk kolom dalam blok; excludeFirst=true mengabaikan sel teratas
const getColumnGroupAnswerCount = (
  colGroupIndex,
  colIndex,
  answer = "B",
  excludeFirst = true
) => {
  const nums = getColumnGroupColumnQuestions(colGroupIndex, colIndex);
  const range = excludeFirst ? nums.slice(1) : nums;
  return range.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};

// Versi Summary untuk ringkasan baris (exclude diagonal blok 1,5,9)
const filterSummaryExclusions = (nums) =>
  nums.filter((q) => !EXCLUDED_DIAGONAL_SET.has(q));
const getRowGroupAnswerCountSummary = (groupIndex, rowIndex, answer = "A") => {
  const nums = filterSummaryExclusions(
    getRowGroupRowQuestionsRaw(groupIndex, rowIndex)
  );
  return nums.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};
const getColumnGroupAnswerCountSummary = (
  colGroupIndex,
  colIndex,
  answer = "B"
) => {
  const nums = filterSummaryExclusions(
    getColumnGroupColumnQuestionsRaw(colGroupIndex, colIndex)
  );
  return nums.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};
const getRowGroupAnsweredCountSummary = (groupIndex, rowIndex) => {
  const nums = filterSummaryExclusions(
    getRowGroupRowQuestionsRaw(groupIndex, rowIndex)
  );
  return nums.reduce((sum, q) => sum + (answersMap[q] ? 1 : 0), 0);
};
const getRowGroupABSumSummary = (groupIndex, rowIndex) => {
  return (
    getRowGroupAnswerCountSummary(groupIndex, rowIndex, "A") +
    getColumnGroupAnswerCountSummary(groupIndex, rowIndex, "B")
  );
};

// ----------------------------
// Implementasi via needsConfig
// ----------------------------
const getNeedLabelByGroupRow = (groupIndex, rowIndex) => {
  return getRowGroupLabel(groupIndex, rowIndex);
};

const getNeedPartsByGroupRow = (groupIndex, rowIndex) => {
  const label = getNeedLabelByGroupRow(groupIndex, rowIndex);
  return needsConfig[label] || [];
};

// Part 1 (BARIS, hitung A) sesuai konfigurasi
const getNeedRowCountByGroupRow = (groupIndex, rowIndex) => {
  const parts = getNeedPartsByGroupRow(groupIndex, rowIndex);
  const rowPart = parts.find((p) => p.type === "row");
  if (!rowPart) return 0;
  const answer = rowPart.answer || "A";
  const nums = getRowGroupRowQuestions(groupIndex, rowIndex);
  const range = rowPart.excludeFirst ? nums.slice(1) : nums;
  return range.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};

// Part 2 (KOLOM, hitung B) sesuai konfigurasi
const getNeedColCountByGroupRow = (groupIndex, rowIndex) => {
  const parts = getNeedPartsByGroupRow(groupIndex, rowIndex);
  const colPart = parts.find((p) => p.type === "col");
  if (!colPart) return 0;
  const answer = colPart.answer || "B";
  const nums = getColumnGroupColumnQuestions(
    colPart.colGroupIndex,
    colPart.colIndex
  );
  const range = colPart.excludeFirst ? nums.slice(1) : nums;
  return range.reduce((sum, q) => sum + (answersMap[q] === answer ? 1 : 0), 0);
};

// Tools uji: acak baris pertama (rowIndex 0) hanya untuk grup 0 (Blok 1-3)
const randomizeFirstRowAB = (groupIndex = 0) => {
  const nums = getRowGroupRowQuestions(groupIndex, 0);
  nums.forEach((q) => {
    answersMap[q] = Math.random() < 0.5 ? "A" : "B";
  });
};

// Acak semua jawaban untuk 225 soal (A/B)
const randomizeAllAnswers = () => {
  for (let q = 1; q <= totalQuestions; q++) {
    answersMap[q] = Math.random() < 0.5 ? "A" : "B";
  }
};

// Tools uji: kosongkan semua jawaban
const clearAnswers = () => {
  Object.keys(answersMap).forEach((k) => (answersMap[k] = ""));
};

// ----------------------------
// Ringkasan per-Need (BB, BJ, BD, BH) + Kategori
// ----------------------------
const sex = ref("female"); // default; dapat diubah via UI

// ----------------------------
// Loader hasil backend (dummy JSON) + parser API result_list
// ----------------------------
const selectedDummyId = ref("");
const pastedJson = ref("");

const normalizeAnswer = (v) => {
  if (v === "A" || v === "B") return v;
  if (v === 1 || v === "1") return "A";
  if (v === 2 || v === "2") return "B";
  return "";
};

const lcg = (seed = 1) => {
  let x = seed >>> 0;
  return () => {
    x = (1103515245 * x + 12345) >>> 0;
    return (x & 0xffffffff) / 0x100000000;
  };
};

const buildAnswersFromPattern = (pattern, options = {}) => {
  const map = {};
  if (pattern === "oddA_evenB") {
    for (let q = 1; q <= 225; q++) map[q] = q % 2 === 1 ? "A" : "B";
    return map;
  }
  if (pattern === "block_sequence") {
    const seq = options.sequence || [
      "A",
      "B",
      "A",
      "B",
      "A",
      "B",
      "A",
      "B",
      "A",
    ];
    const blockSize = options.blockSize || 25;
    for (let b = 0; b < 9; b++) {
      const val = normalizeAnswer(seq[b] || "A") || "A";
      for (let i = 1; i <= blockSize; i++) {
        const q = b * blockSize + i;
        map[q] = val;
      }
    }
    return map;
  }
  if (pattern === "random_seed") {
    const rnd = lcg(options.seed || 1);
    const pA = typeof options.pA === "number" ? options.pA : 0.5;
    for (let q = 1; q <= 225; q++) map[q] = rnd() < pA ? "A" : "B";
    return map;
  }
  if (pattern === "pure_random") {
    const pA = typeof options.pA === "number" ? options.pA : 0.5;
    for (let q = 1; q <= 225; q++) map[q] = Math.random() < pA ? "A" : "B";
    return map;
  }
  return map;
};

const makeAnswersMap = (ds) => {
  // Prefer explicit map if provided
  if (ds && ds.answers && typeof ds.answers === "object") {
    const m = {};
    for (const k of Object.keys(ds.answers))
      m[+k] = normalizeAnswer(ds.answers[k]);
    return m;
  }
  // Array form (index 0 => Q1)
  if (Array.isArray(ds?.answersArray)) {
    const m = {};
    ds.answersArray.forEach((v, idx) => (m[idx + 1] = normalizeAnswer(v)));
    return m;
  }
  // Compressed string of 225 chars (A/B)
  if (typeof ds?.answersCompressed === "string") {
    const s = ds.answersCompressed;
    const m = {};
    for (let i = 0; i < Math.min(225, s.length); i++)
      m[i + 1] = normalizeAnswer(s[i]);
    return m;
  }
  // Pattern-based
  if (ds?.answersPattern) {
    return buildAnswersFromPattern(ds.answersPattern, ds.patternOptions || {});
  }
  return {};
};

const applyBackendResult = (resp) => {
  if (!resp) return;
  sex.value = resp?.subject?.sex || sex.value;
  const m = makeAnswersMap(resp);
  // clear first
  clearAnswers();
  for (let q = 1; q <= 225; q++) answersMap[q] = normalizeAnswer(m[q]);
  // Lock matrix when applying official backend result
  matrixLocked.value = true;
};

const applyDummyById = (id) => {
  const ds = (dummyData?.datasets || []).find((x) => x.testId === id);
  if (ds) applyBackendResult(ds);
};

watch(selectedDummyId, (id) => {
  if (id) applyDummyById(id);
});

// Parse payload dari endpoint /outpatient/test-orders/result_list
// Bentuk contoh:
// { status:'success', datasets:[ { testId, subject, description, answers:{ '1':'A', ... } } ] }
const applyResultListPayload = (payload) => {
  if (!payload) return;
  const list = Array.isArray(payload?.datasets) ? payload.datasets : [];
  if (list.length > 0) {
    // Ambil dataset pertama; atau bisa difilter berdasarkan testId
    const target = list[0];
    applyBackendResult(target);
  } else {
    // Jika payload langsung berupa dataset tunggal
    applyBackendResult(payload);
  }
};

const parsePastedJson = () => {
  try {
    const obj = JSON.parse(pastedJson.value);
    applyResultListPayload(obj);
  } catch (e) {
    alert("JSON tidak valid: " + (e?.message || e));
  }
};

const importFromClipboardJson = async () => {
  try {
    const text = await navigator.clipboard.readText();
    pastedJson.value = text;
    parsePastedJson();
  } catch (e) {
    alert("Gagal membaca clipboard atau parse JSON");
    console.error(e);
  }
};

// Ekspos helper ke window untuk debugging cepat di console
if (typeof window !== "undefined") {
  window.applyEppsResultPayload = applyResultListPayload;
}

// Dapatkan range QN untuk need berdasarkan row-part
const getNeedRowRangeByLabel = (label) => {
  const parts = needsConfig[label] || [];
  const rowPart = parts.find((p) => p.type === "row");
  if (!rowPart) return [];
  return getRowGroupRowQuestions(rowPart.groupIndex, rowPart.rowIndex);
};

// Dapatkan range QN untuk need berdasarkan col-part
const getNeedColRangeByLabel = (label) => {
  const parts = needsConfig[label] || [];
  const colPart = parts.find((p) => p.type === "col");
  if (!colPart) return [];
  return getColumnGroupColumnQuestions(colPart.colGroupIndex, colPart.colIndex);
};

// Ambil BB dari ringkasan baris (sudah menghitung dan exclude diagonal)
const getNeedBB = (label) => {
  const parts = needsConfig[label] || [];
  const rowPart = parts.find((p) => p.type === "row");
  if (!rowPart) return 0;
  const answer = rowPart?.answer || "A";
  return getRowGroupAnswerCountSummary(rowPart.groupIndex, rowPart.rowIndex, answer);
};

// Ambil BJ dari ringkasan kolom (sudah menghitung dan exclude diagonal)
const getNeedBJ = (label) => {
  const parts = needsConfig[label] || [];
  const colPart = parts.find((p) => p.type === "col");
  if (!colPart) return 0;
  const answer = colPart?.answer || "B";
  return getColumnGroupAnswerCountSummary(colPart.colGroupIndex, colPart.colIndex, answer);
};

const needsSummary = computed(() =>
  allNeeds.map((label) => {
    const bb = getNeedBB(label); // R
    const bj = getNeedBJ(label); // C
    const bd = computeBD(bj);
    const bh = computeBH(bb, bd);
    const s = (typeof bd === "number" ? bd : 0) + (typeof bh === "number" ? bh : 0);
    const traitId = String(label || "").toLowerCase();
    const category = getTraitCategory(sex.value, traitId, s) || "-";
    return { label, bb, bj, bd, bh, s, category };
  })
);

const getNeedCategoryByGroupRow = (groupIndex, rowIndex) => {
  const label = getRowGroupLabel(groupIndex, rowIndex);
  const item = needsSummary.value.find((x) => x.label === label);
  return item?.category ?? "-";
};

// Radar chart (S per need)
const radar = computed(() => {
  const labels = needsSummary.value.map((n) => n.label);
  const vals = needsSummary.value.map((n) =>
    typeof n.s === "number" ? n.s : parseFloat(n.s) || 0
  );
  const maxVal = Math.max(1, ...vals);

  const size = 380;
  const padding = 48;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;
  const N = Math.max(1, labels.length);
  const step = (Math.PI * 2) / N;
  const start = -Math.PI / 2;

  const pointFor = (ratio, idx) => {
    const ang = start + idx * step;
    const r = Math.max(0, Math.min(1, ratio)) * radius;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    return { x: +x.toFixed(2), y: +y.toFixed(2), ang };
  };

  // Axes and labels
  const axes = [];
  const labelPositions = [];
  for (let i = 0; i < N; i++) {
    const end = pointFor(1, i);
    axes.push({ x: end.x, y: end.y });
    const lp = pointFor(1.1, i);
    const cos = Math.cos(start + i * step);
    const anchor = cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle";
    labelPositions.push({ x: lp.x, y: lp.y, anchor });
  }

  // Rings (25%, 50%, 75%, 100%)
  const frac = [0.25, 0.5, 0.75, 1];
  const rings = frac.map((f) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const p = pointFor(f, i);
      pts.push(`${p.x},${p.y}`);
    }
    return pts.join(" ");
  });

  // Data polygon
  const pts = [];
  const polygonPoints = vals
    .map((v, i) => {
      const p = pointFor(v / maxVal, i);
      pts.push({ x: p.x, y: p.y });
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return {
    size,
    cx,
    cy,
    radius,
    labels,
    maxVal: +maxVal.toFixed(2),
    axes,
    rings,
    polygonPoints,
    points: pts,
    labelPositions,
  };
});

// Interpretasi level sederhana untuk EPPS berdasarkan proporsi S terhadap maksimum
const eppsLevelThresholds = { low: 0.33, high: 0.66 };
const interpretEppsLevel = (s, max) => {
  const pct = max > 0 ? s / max : 0;
  if (pct <= eppsLevelThresholds.low) return "low";
  if (pct > eppsLevelThresholds.high) return "high";
  return "medium";
};

// Gabungkan kebutuhan dengan narasi dari eppsNarratives
const eppsNarrativeDetails = computed(() => {
  const max = radar.value.maxVal || 1;
  return needsSummary.value
    .map((n) => {
      const level = interpretEppsLevel(typeof n.s === "number" ? n.s : parseFloat(n.s) || 0, max);
      const base = EppsNarratives[n.label] || {};
      const narrative =
        (base.levels && base.levels[level]) || base.description || "";
      const title = base.name || n.label;
      return {
        ...n,
        percent: max > 0 ? n.s / max : 0,
        level,
        narrative,
        title,
      };
    })
    .sort((a, b) => (b.s || 0) - (a.s || 0));
});

const topEppsNarratives = computed(() =>
  eppsNarrativeDetails.value.slice(0, 5)
);

// Konsistensi diagonal antar pasangan blok: 1:7, 2:5, 3:9
const computeConsistencyPair = (blockA, blockB) => {
  const dA = getBlockDiagonalQuestions(blockA);
  const dB = getBlockDiagonalQuestions(blockB);
  let matches = 0;
  let total = 0;
  const items = [];
  for (let i = 0; i < 5; i++) {
    const qa = dA[i];
    const qb = dB[i];
    const va = answersMap[qa];
    const vb = answersMap[qb];
    const both = !!va && !!vb;
    const match = both && va === vb;
    if (both) {
      total++;
      if (match) matches++;
    }
    items.push({ qa, qb, va, vb, both, match });
  }
  const percent = total ? Math.round((matches / total) * 100) : 0;
  return { matches, total, percent, items };
};

const consistencyPairs = computed(() => [
  { label: "1:7", a: 1, b: 7, ...computeConsistencyPair(1, 7) },
  { label: "2:5", a: 2, b: 5, ...computeConsistencyPair(2, 5) },
  { label: "3:9", a: 3, b: 9, ...computeConsistencyPair(3, 9) },
]);
</script>

<style scoped>
/* Ensure consistent colors across all devices */
.epps-block-card {
  /* Let card use default colors from blockConfig */
  transition: none !important;
}

.epps-matrix-cell {
  /* Let cell use colors from blockConfig */
  transition: colors !important;
}

/* Prevent any automatic color changes */
@media (prefers-color-scheme: dark) {
  .epps-block-card,
  .epps-matrix-cell {
    /* Don't let dark mode override colors */
    filter: none !important;
  }
}

/* Prevent responsive color changes */
@media (min-width: 768px) {
  .epps-block-card,
  .epps-matrix-cell {
    /* No color changes on tablet breakpoint */
    filter: none !important;
  }
}

@media (min-width: 1024px) {
  .epps-block-card,
  .epps-matrix-cell {
    /* No color changes on desktop breakpoint */
    filter: none !important;
  }
}

/* Badge colors sesuai legend - hanya badge yang berwarna */
.badge[class*="bg-yellow"] {
  background-color: rgb(254 240 138) !important; /* yellow-300 */
  border-color: rgb(250 204 21) !important; /* yellow-400 */
  color: rgb(113 63 18) !important; /* yellow-800 */
}

.badge[class*="bg-blue"] {
  background-color: rgb(147 197 253) !important; /* blue-300 */
  border-color: rgb(96 165 250) !important; /* blue-400 */
  color: rgb(30 58 138) !important; /* blue-800 */
}

.badge[class*="bg-purple"] {
  background-color: rgb(196 181 253) !important; /* purple-300 */
  border-color: rgb(167 139 250) !important; /* purple-400 */
  color: rgb(88 28 135) !important; /* purple-800 */
}

.badge[class*="bg-green"] {
  background-color: rgb(134 239 172) !important; /* green-300 */
  border-color: rgb(74 222 128) !important; /* green-400 */
  color: rgb(22 101 52) !important; /* green-800 */
}

.badge[class*="bg-cyan"] {
  background-color: rgb(165 243 252) !important; /* cyan-300 */
  border-color: rgb(103 232 249) !important; /* cyan-400 */
  color: rgb(21 94 117) !important; /* cyan-800 */
}

.badge[class*="bg-indigo"] {
  background-color: rgb(129 140 248) !important; /* indigo-400 */
  border-color: rgb(99 102 241) !important; /* indigo-500 */
  color: rgb(255 255 255) !important; /* white text */
}

.badge[class*="bg-orange"] {
  background-color: rgb(253 186 116) !important; /* orange-300 */
  border-color: rgb(251 146 60) !important; /* orange-400 */
  color: rgb(154 52 18) !important; /* orange-800 */
}

.badge[class*="bg-gray"] {
  background-color: rgb(156 163 175) !important; /* gray-400 */
  border-color: rgb(107 114 128) !important; /* gray-500 */
  color: rgb(255 255 255) !important; /* white text */
}

.badge[class*="bg-red"] {
  background-color: rgb(248 113 113) !important; /* red-400 */
  border-color: rgb(239 68 68) !important; /* red-500 */
  color: rgb(255 255 255) !important; /* white text */
}

/* Badge colors sesuai legend - hanya badge yang berwarna, override untuk mode putih */
::v-deep(.white-theme) .badge[class*="bg-yellow"],
::v-deep(.white-theme) .badge[class*="bg-blue"],
::v-deep(.white-theme) .badge[class*="bg-purple"],
::v-deep(.white-theme) .badge[class*="bg-green"],
::v-deep(.white-theme) .badge[class*="bg-cyan"],
::v-deep(.white-theme) .badge[class*="bg-indigo"],
::v-deep(.white-theme) .badge[class*="bg-orange"],
::v-deep(.white-theme) .badge[class*="bg-gray"],
::v-deep(.white-theme) .badge[class*="bg-red"] {
  filter: none !important;
  /* force color legend in white mode */
}

::v-deep(.white-theme) .badge[class*="bg-yellow"] {
  background-color: rgb(254 240 138) !important;
  border-color: rgb(250 204 21) !important;
  color: rgb(113 63 18) !important;
}
::v-deep(.white-theme) .badge[class*="bg-blue"] {
  background-color: rgb(147 197 253) !important;
  border-color: rgb(96 165 250) !important;
  color: rgb(30 58 138) !important;
}
::v-deep(.white-theme) .badge[class*="bg-purple"] {
  background-color: rgb(196 181 253) !important;
  border-color: rgb(167 139 250) !important;
  color: rgb(88 28 135) !important;
}
::v-deep(.white-theme) .badge[class*="bg-green"] {
  background-color: rgb(134 239 172) !important;
  border-color: rgb(74 222 128) !important;
  color: rgb(22 101 52) !important;
}
::v-deep(.white-theme) .badge[class*="bg-cyan"] {
  background-color: rgb(165 243 252) !important;
  border-color: rgb(103 232 249) !important;
  color: rgb(21 94 117) !important;
}
::v-deep(.white-theme) .badge[class*="bg-indigo"] {
  background-color: rgb(129 140 248) !important;
  border-color: rgb(99 102 241) !important;
  color: rgb(255 255 255) !important;
}
::v-deep(.white-theme) .badge[class*="bg-orange"] {
  background-color: rgb(253 186 116) !important;
  border-color: rgb(251 146 60) !important;
  color: rgb(154 52 18) !important;
}
::v-deep(.white-theme) .badge[class*="bg-gray"] {
  background-color: rgb(156 163 175) !important;
  border-color: rgb(107 114 128) !important;
  color: rgb(255 255 255) !important;
}
::v-deep(.white-theme) .badge[class*="bg-red"] {
  background-color: rgb(248 113 113) !important;
  border-color: rgb(239 68 68) !important;
  color: rgb(255 255 255) !important;
}
</style>
