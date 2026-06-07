<script setup>
import { ref, computed } from 'vue'
import { getTraitCategory, totalScore } from './eppsScoring.js'
import { computeGridTallies } from './eppsSumif.js'

// Demo inputs
const sex = ref('male')
const traitId = ref('chg')
const rawScore = ref(12)

// 17×17 grid (AJ..AZ columns, 17 rows) – empty by default
const mkGrid = (rows = 17, cols = 17) => Array.from({ length: rows }, () => Array(cols).fill(''))
const grid = ref(mkGrid())

// Example exclusion-column mapping per row (0-based index relative to AJ)
// NOTE: Fill this using your Excel column mapping (e.g., AN→index 4 for row 0, AP→6 for row 1, ...)
// Here we provide a simple demo pattern: [4,6,8,10,12,14,16, 4,6,8,10,12,14,16, 4,6,8]
const excludeColIndexByRow = ref([
  4, 6, 8, 10, 12, 14, 16,
  4, 6, 8, 10, 12, 14, 16,
  4, 6, 8,
])

// Category (score → symbol)
const category = computed(() => getTraitCategory(sex.value, traitId.value, rawScore.value))

// Example: total score from multiple raw scores (F25 = SUM(F7:F24))
const exampleScores = ref([12, 13, 8, 5, 22, 11, 10, 9, 7, 6, 14, 12, 8, 1, 2, 3, 4])
const total = computed(() => totalScore(exampleScores.value))

// Tallies (BB, BJ, BD, BH) based on current grid and exclusion mapping
const tallies = computed(() => computeGridTallies(grid.value, { excludeColIndexByRow: excludeColIndexByRow.value }))

// Small helpers to interact
const cycleCell = (r, c) => {
  const v = grid.value[r][c]
  grid.value[r][c] = v === 'A' ? 'B' : v === 'B' ? '' : 'A'
}
const randomizeRow = (r) => {
  for (let c = 0; c < (grid.value[r]?.length || 0); c++) grid.value[r][c] = Math.random() < 0.5 ? 'A' : 'B'
}
const clearGrid = () => {
  grid.value = mkGrid()
}
</script>

<template>
  <section class="p-4 border rounded-lg space-y-4">
    <h2 class="text-lg font-semibold">EPPS Scoring Demo (Data Utilities)</h2>

    <div class="flex flex-wrap gap-3 items-end">
      <div class="form-control">
        <label class="label">Sex</label>
        <select v-model="sex" class="select select-bordered select-sm w-40">
          <option value="male">male</option>
          <option value="female">female</option>
        </select>
      </div>
      <div class="form-control">
        <label class="label">Trait</label>
        <select v-model="traitId" class="select select-bordered select-sm w-40">
          <option value="ach">ach</option>
          <option value="def">def</option>
          <option value="ord">ord</option>
          <option value="exh">exh</option>
          <option value="aut">aut</option>
          <option value="aff">aff</option>
          <option value="int">int</option>
          <option value="suc">suc</option>
          <option value="dom">dom</option>
          <option value="aba">aba</option>
          <option value="nur">nur</option>
          <option value="chg">chg</option>
          <option value="end">end</option>
          <option value="het">het</option>
          <option value="agg">agg</option>
        </select>
      </div>
      <div class="form-control">
        <label class="label">Raw score</label>
        <input v-model.number="rawScore" type="number" class="input input-bordered input-sm w-40" />
      </div>
      <div>
        <div class="text-sm">Category</div>
        <div class="text-xl font-bold">{{ category ?? '—' }}</div>
      </div>
      <div>
        <div class="text-sm">Total (F25)</div>
        <div class="text-xl font-bold">{{ total }}</div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button class="btn btn-xs" @click="randomizeRow(0)">Randomize Row 1</button>
      <button class="btn btn-xs btn-ghost" @click="clearGrid">Clear Grid</button>
    </div>

    <div class="overflow-auto border rounded-lg p-2">
      <table class="table table-zebra table-sm w-max">
        <tbody>
          <tr v-for="(row, r) in grid" :key="r">
            <td v-for="(v, c) in row" :key="c">
              <button class="btn btn-ghost btn-xs" @click="cycleCell(r,c)">{{ v || '' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
      <div>
        <div class="font-semibold">BB (row A minus excl)</div>
        <div class="font-mono">{{ tallies.bbPerRow }}</div>
      </div>
      <div>
        <div class="font-semibold">BJ (col B minus excl)</div>
        <div class="font-mono">{{ tallies.bjPerRow }}</div>
      </div>
      <div>
        <div class="font-semibold">BD = BJ / 2</div>
        <div class="font-mono">{{ tallies.bdPerRow }}</div>
      </div>
      <div>
        <div class="font-semibold">BH = BB + BD</div>
        <div class="font-mono">{{ tallies.bhPerRow }}</div>
      </div>
    </div>
  </section>
</template>
