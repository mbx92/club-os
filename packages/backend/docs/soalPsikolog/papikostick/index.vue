<route lang="yaml">
name: results-papikostick
meta:
  layout: DefaultLayout
  public: false
  action: read
  subject: Result
</route>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { interpretPapiScale } from '@/data/papikostick/papiKostick_narratives.js'
import papiNorms from '@/data/papikostick/papiKostick_norms.json'

// Ambil hasil dari route query atau props (payload hasil test)
const route = useRoute()
let resultData = {}
try {
  if (route.query.result) {
    // base64 decode + JSON parse
    const json = atob(route.query.result)
    resultData = JSON.parse(json)
  } else if (route.query.answers) {
    // base64 decode + JSON parse untuk answers saja
    const answersArr = JSON.parse(atob(route.query.answers))
    // Format ulang ke bentuk yang bisa di-skoring
    resultData = {
      answers: answersArr,
      test_code: 'PSY-TENANTA-001',
    }
  }
} catch (e) {
  resultData = {}
}

// Ambil data soal papikostick
import rawItems from '@/data/papikostick/papiKostick_test.json'
const items = computed(() => {
  const src = Array.isArray(rawItems) ? rawItems : []
  return src.map((x, idx) => {
    if (!x || typeof x !== 'object') return null
    const id = x.id ?? idx + 1
    return {
      id,
      number: x.id ?? idx + 1,
      a: String(x.pair?.A ?? x.A ?? '').trim(),
      b: String(x.pair?.B ?? x.B ?? '').trim(),
      scaleA: String(x.scaleA ?? '').trim(),
      scaleB: String(x.scaleB ?? '').trim(),
    }
  }).filter(Boolean)
})

// Skoring ulang jika hanya ada answers
const scaleDetails = computed(() => {
  if (resultData.details && resultData.details.length) return resultData.details
  // Skoring manual dari answers
  const answersArr = resultData.answers || []
  if (!Array.isArray(answersArr) || !answersArr.length) return []
  // Map id->jawaban
  const answerMap = Object.create(null)
  for (const ans of answersArr) {
    if (ans && ans.id != null && ans.answer) answerMap[ans.id] = ans.answer || ans.pair
  }
  // Hitung skor per skala
  const counts = Object.create(null)
  for (const it of items.value) {
    const ans = answerMap[it.id]
    if (ans === 'A') counts[it.scaleA] = (counts[it.scaleA] || 0) + 1
    else if (ans === 'B') counts[it.scaleB] = (counts[it.scaleB] || 0) + 1
  }
  // Hitung maksimum per skala
  const maxes = Object.create(null)
  for (const it of items.value) {
    if (it.scaleA) maxes[it.scaleA] = (maxes[it.scaleA] || 0) + 1
    if (it.scaleB) maxes[it.scaleB] = (maxes[it.scaleB] || 0) + 1
  }
  // Gabungkan skor, maksimum, persentase dan narasi per skala
  const allKeys = new Set([...Object.keys(counts), ...Object.keys(maxes)])
  const list = []
  for (const code of allKeys) {
    const score = counts[code] || 0
    const max = maxes[code] || 0
    const { level, percent, label, title, narrative } = interpretPapiScale({ score, max, code })
    list.push({ code, score, max, percent, level, label, title, narrative })
  }
  list.sort((a, b) => (b.score - a.score) || String(a.code).localeCompare(String(b.code)))
  return list
})

const normsByAspect = computed(() => {
  const detailsMap = new Map((scaleDetails.value || []).map((d) => [String(d.code), d]))
  const map = new Map()
  for (const entry of papiNorms) {
    if (!map.has(entry.aspect)) map.set(entry.aspect, [])
    const det = detailsMap.get(String(entry.code)) || null
    map.get(entry.aspect).push({
      code: entry.code,
      description: entry.description,
      score: det?.score ?? 0,
      percent: det?.percent ?? 0,
      level: det?.level ?? null,
      label: det?.label ?? null,
    })
  }
  return Array.from(map.entries()).map(([aspect, codes]) => ({ aspect, codes }))
})

// Mapping kode test
const TEST_LABELS = {
  'PSY-TENANTA-001': 'PAPI Kostick',
  'PSY-TENANTA-002': 'EPPS',
}
const testLabel = computed(() => {
  const code = resultData.test_code
  return TEST_LABELS[code] || code || 'Hasil Test'
})
</script>

<template>
    <div class="w-full space-y-6 px-4 pb-12">
      <header>
        <h1 class="text-2xl font-semibold">Hasil {{ testLabel }}</h1>
        <p class="text-sm text-base-content/70">Berikut adalah hasil test {{ testLabel }} Anda.</p>
      </header>
      <div v-if="!scaleDetails.length" class="alert alert-warning mt-6">Data hasil tidak ditemukan atau tidak valid.</div>
      <div v-else class="space-y-6">
        <div class="card bg-base-100 shadow">
          <div class="card-body space-y-4">
            <div class="flex items-center justify-between gap-4">
              <h2 class="card-title">Ringkasan Skala</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Skala</th>
                    <th>Skor</th>
                    <th>Maks</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in scaleDetails" :key="row.code">
                    <td class="font-semibold">{{ row.code }}</td>
                    <td class="font-mono">{{ row.score }}</td>
                    <td class="font-mono">{{ row.max }}</td>
                    <td class="font-mono">{{ (row.percent * 100).toFixed(0) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="scaleDetails.length" class="text-sm text-base-content/70">
              <div class="font-medium text-base-content mb-1">Skala dominan</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="(row, idx) in scaleDetails.slice(0,5)" :key="row.code" class="badge badge-lg">
                  {{ idx + 1 }}. {{ row.code }} ({{ row.score }}/{{ row.max }})
                </span>
              </div>
            </div>
            <div v-if="scaleDetails.length" class="space-y-4 mt-4">
              <h3 class="text-base font-semibold">Interpretasi Skala Dominan</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="row in scaleDetails.slice(0,5)"
                  :key="`interp-${row.code}`"
                  class="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="badge badge-sm">{{ row.code }}</span>
                      <span class="font-semibold">{{ row.title }}</span>
                    </div>
                    <div class="text-xs opacity-70">
                      {{ row.score }}/{{ row.max }} • {{ (row.percent * 100).toFixed(0) }}% • {{ row.label }}
                    </div>
                  </div>
                  <p class="text-sm text-base-content/80">{{ row.narrative }}</p>
                </div>
              </div>
              <p class="text-xs text-base-content/60">Catatan: Narasi ini bersifat template dan dapat disesuaikan pada file data.</p>
            </div>
          </div>
        </div>
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title">Norma & Pasangan Skala (Referensi)</h3>
            <p class="text-sm text-base-content/70">Pasangan skala dan keterangan yang relevan dengan hasil di atas.</p>
            <div class="overflow-x-auto mt-3">
              <table class="table table-compact w-full">
                <thead>
                  <tr>
                    <th>Aspek</th>
                    <th>Kode</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in normsByAspect" :key="row.aspect">
                    <td class="align-top font-semibold">{{ row.aspect }}</td>
                    <td>
                      <div v-for="c in row.codes" :key="c.code" class="flex items-center gap-2 mb-1">
                        <span class="badge">{{ c.code }}</span>
                        <small class="text-xs text-base-content/60">{{ c.score ?? 0 }} ({{ ((c.percent || 0) * 100).toFixed(0) }}%)</small>
                      </div>
                    </td>
                    <td>
                      <div v-for="c in row.codes" :key="c.code + '-d'" class="text-sm mb-1">
                        <div class="font-semibold">{{ c.description }}</div>
                        <div class="text-xs text-base-content/60">Level: {{ c.label ?? '-' }} {{ c.level ? '(' + c.level + ')' : '' }}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>
