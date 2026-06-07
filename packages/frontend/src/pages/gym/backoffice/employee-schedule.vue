<route lang="yaml">
meta:
  title: Employee Schedule
  layout: default
</route>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><router-link to="/">Dashboard</router-link></li>
        <li>Employee Schedule</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Employee Schedule</h1>
        <p class="text-base-content/60 mt-1">Kelola template jadwal & terapkan ke karyawan</p>
      </div>
    </div>

    <!-- Tabs -->
    <div role="tablist" class="tabs tabs-bordered mb-6">
      <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'periods' }" @click="activeTab = 'periods'">
        <IconCalendar class="w-4 h-4 mr-2" /> Periode Jadwal
      </a>
      <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'presets' }" @click="activeTab = 'presets'">
        <IconTemplate class="w-4 h-4 mr-2" /> Template Jadwal
      </a>
      <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'shifts' }" @click="activeTab = 'shifts'">
        <IconClock class="w-4 h-4 mr-2" /> Master Shift
      </a>
      <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'assign' }" @click="activeTab = 'assign'">
        <IconUsersGroup class="w-4 h-4 mr-2" /> Assign ke Karyawan
      </a>
      <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'schedules' }" @click="activeTab = 'schedules'; loadSchedules()">
        <IconCalendarStats class="w-4 h-4 mr-2" /> Jadwal Karyawan
      </a>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAB: Periode Jadwal                            -->
    <!-- ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'periods'">

      <!-- ── Detail view (period selected) ─────────────────── -->
      <template v-if="selectedPeriodId">
        <div class="flex flex-wrap items-start gap-4 mb-5">
          <button class="btn btn-ghost btn-sm" @click="closePeriodDetail">
            <IconArrowLeft class="w-4 h-4 mr-1" /> Kembali
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-2xl font-bold">{{ periodDetailData?.period?.name }}</h2>
              <span class="badge badge-sm font-medium" :class="{
                'badge-warning': periodDetailData?.period?.status === 'draft',
                'badge-success': periodDetailData?.period?.status === 'active',
                'badge-ghost': periodDetailData?.period?.status === 'closed',
              }">
                {{ periodDetailData?.period?.status === 'draft' ? 'Draft' : periodDetailData?.period?.status === 'active' ? 'Active' : 'Closed' }}
              </span>
            </div>
            <p class="text-base-content/60 text-sm mt-0.5">
              {{ formatDate(periodDetailData?.period?.startDate) }} — {{ formatDate(periodDetailData?.period?.endDate) }}
              <span v-if="periodDetailData?.summary" class="ml-2">
                · {{ periodDetailData.summary.totalStaff }} staff
                · {{ periodDetailData.summary.totalAssignments }} assignment
              </span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-sm btn-outline" @click="openAssignStaffModal">
              <IconUsersGroup class="w-4 h-4 mr-1" /> Assign Staff
            </button>
            <button class="btn btn-sm btn-outline" @click="openGenerateModal">
              <IconWand class="w-4 h-4 mr-1" /> Generate dari Template
            </button>
            <button class="btn btn-sm btn-success btn-outline" @click="handleExportExcel" :disabled="exportLoading">
              <span v-if="exportLoading" class="loading loading-spinner loading-xs"></span>
              <IconFileSpreadsheet v-else class="w-4 h-4 mr-1" /> Export Excel
            </button>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-sm btn-outline">
                Status <IconChevronDown class="w-4 h-4 ml-1" />
              </div>
              <ul tabindex="0" class="dropdown-content z-[1] menu p-1 shadow bg-base-100 rounded-box w-40">
                <li v-for="s in periodStatuses" :key="s.value">
                  <a @click="handleChangeStatus(s.value)"
                    :class="periodDetailData?.period?.status === s.value ? 'bg-base-200 font-semibold' : ''">
                    <span :class="s.dotClass">●</span> {{ s.label }}
                  </a>
                </li>
              </ul>
            </div>
            <button class="btn btn-sm btn-ghost" @click="openEditPeriod(periodDetailData?.period)" title="Edit">
              <IconEdit class="w-4 h-4" />
            </button>
            <button class="btn btn-sm btn-ghost text-error" @click="confirmDeletePeriod(periodDetailData?.period)" title="Hapus">
              <IconTrash class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="periodsLoading" class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="periodDetailData" class="overflow-x-auto">
          <div class="min-w-[700px]">
            <div v-for="(week, wi) in calendarWeeks" :key="wi" class="mb-3">
              <div v-if="wi === 0" class="grid grid-cols-7 gap-1 mb-1 text-xs font-semibold text-center text-base-content/50 px-0.5">
                <span v-for="d in ['Sen','Sel','Rab','Kam','Jum','Sab','Min']" :key="d">{{ d }}</span>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <div
                  v-for="cell in week" :key="cell.date"
                  class="rounded-lg border p-1.5 min-h-[90px] cursor-pointer hover:border-primary/40 transition-colors"
                  :class="cell.inPeriod
                    ? (cell.dayOfWeek === 0 || cell.dayOfWeek === 6 ? 'border-base-300 bg-base-200/40' : 'border-base-300 bg-base-100')
                    : 'border-base-200 bg-base-200/20 opacity-40 pointer-events-none'"
                  @click="cell.inPeriod && openDateAssignModal(cell.date)"
                >
                  <div class="text-xs font-bold mb-1 flex items-center justify-between"
                    :class="cell.dayOfWeek === 0 || cell.dayOfWeek === 6 ? 'text-error/70' : 'text-base-content/70'">
                    <span>{{ cell.dayNum }}</span>
                    <button v-if="cell.inPeriod"
                      class="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle text-primary"
                      @click.stop="openDateAssignModal(cell.date)" title="Tambah assignment">
                      <IconPlus class="w-3 h-3" />
                    </button>
                  </div>
                  <div v-if="cell.inPeriod" class="space-y-1">
                    <template v-for="group in groupAssignmentsByShift(cell.assignments)" :key="group.key">
                      <!-- OFF group -->
                      <div v-if="group.isOff" class="rounded px-1 py-0.5" style="background-color: #fee2e2; color: #991b1b;">
                        <div class="text-[9px] font-bold leading-none mb-0.5">OFF</div>
                        <div v-for="a in group.items" :key="a.id" class="flex items-center justify-between gap-0.5 group">
                          <span class="text-[10px] truncate leading-tight">{{ a.deviceEmployee?.name || a.user?.name || '?' }}</span>
                          <button class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 text-[#991b1b]/40 hover:text-error text-[10px]"
                            @click.stop="handleRemoveAssignment(a)" title="Hapus">×</button>
                        </div>
                      </div>
                      <!-- Shift group -->
                      <div v-else class="rounded px-1 py-0.5"
                        :style="{ backgroundColor: (group.shift?.color || '#e5e7eb') + '33', borderLeft: '2px solid ' + (group.shift?.color || '#9ca3af') }">
                        <div class="text-[9px] font-bold leading-none mb-0.5" :style="{ color: group.shift?.color || '#555' }">
                          {{ group.shift?.code || group.shift?.name || '—' }}
                          <span class="font-normal opacity-60">{{ formatTime(group.shift?.shiftStart) }}–{{ formatTime(group.shift?.shiftEnd) }}</span>
                        </div>
                        <div v-for="a in group.items" :key="a.id" class="flex items-center justify-between gap-0.5 group">
                          <span class="text-[10px] font-medium truncate leading-tight">{{ a.deviceEmployee?.name || a.user?.name || '?' }}</span>
                          <button class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 text-base-content/40 hover:text-error text-[10px]"
                            @click.stop="handleRemoveAssignment(a)" title="Hapus">×</button>
                        </div>
                      </div>
                    </template>
                    <button
                      v-if="cell.assignments.length > 6"
                      class="text-[10px] text-primary font-semibold hover:underline w-full text-left px-1"
                      @click.stop="openDateListModal(cell.date, cell.assignments)"
                    >Lihat semua ({{ cell.assignments.length }})…</button>
                    <div v-if="cell.assignments.length === 0" class="text-[10px] text-base-content/25 italic">kosong</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="periodDetailData && calendarShifts.length" class="flex flex-wrap gap-2 mt-4">
          <span class="text-xs text-base-content/50 mr-1">Legend:</span>
          <span v-for="s in calendarShifts" :key="s.id"
            class="badge badge-sm text-xs font-medium"
            :style="{ backgroundColor: (s.color || '#888') + '22', borderColor: s.color || '#888', color: s.color || '#555' }">
            {{ s.name }} ({{ formatTime(s.shiftStart) }}–{{ formatTime(s.shiftEnd) }})
          </span>
          <span class="badge badge-sm badge-error badge-outline text-xs">OFF = Libur</span>
        </div>
      </template>

      <!-- ── List view (no period selected) ─────────────────── -->
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2">
            <select v-model="periodFilter.status" @change="loadPeriods" class="select select-bordered select-sm w-40">
              <option value="">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <button class="btn btn-ghost btn-sm" @click="loadPeriods" :disabled="periodsLoading">
              <IconRefresh class="w-4 h-4" />
            </button>
          </div>
          <button class="btn btn-primary btn-sm" @click="openCreatePeriod">
            <IconPlus class="w-4 h-4 mr-1" /> Buat Periode
          </button>
        </div>

        <div v-if="periodsLoading && periods.length === 0" class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="periods.length === 0" class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center py-16">
            <IconCalendar class="w-16 h-16 text-base-content/30 mb-4" />
            <h3 class="text-lg font-semibold mb-2">Belum ada periode jadwal</h3>
            <p class="text-base-content/60 mb-4">Buat periode (misal "Maret 2026") lalu assign karyawan ke dalamnya.</p>
            <button class="btn btn-primary btn-sm" @click="openCreatePeriod">
              <IconPlus class="w-4 h-4 mr-1" /> Buat Periode Pertama
            </button>
          </div>
        </div>

        <div v-else class="card bg-base-100 shadow-xl">
          <div class="card-body p-0">
            <div class="overflow-x-auto">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Nama Periode</th>
                    <th>Rentang Tanggal</th>
                    <th class="text-center">Staff</th>
                    <th class="text-center">Assignments</th>
                    <th class="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in periods" :key="p.id" class="hover cursor-pointer" @click="openPeriodDetail(p.id)">
                    <td>
                      <span class="badge badge-sm font-medium" :class="{
                        'badge-warning': p.status === 'draft',
                        'badge-success': p.status === 'active',
                        'badge-ghost': p.status === 'closed',
                      }">
                        {{ p.status === 'draft' ? 'Draft' : p.status === 'active' ? 'Active' : 'Closed' }}
                      </span>
                    </td>
                    <td class="font-medium">{{ p.name }}</td>
                    <td class="text-sm">{{ formatDate(p.startDate) }} — {{ formatDate(p.endDate) }}</td>
                    <td class="text-center"><span class="badge badge-ghost badge-sm">{{ p.staffCount ?? 0 }}</span></td>
                    <td class="text-center"><span class="badge badge-ghost badge-sm">{{ p.assignmentCount ?? 0 }}</span></td>
                    <td class="text-right" @click.stop>
                      <div class="flex justify-end gap-1">
                        <button class="btn btn-xs btn-ghost" @click="openPeriodDetail(p.id)" title="Detail">
                          <IconEye class="w-3.5 h-3.5" />
                        </button>
                        <button class="btn btn-xs btn-ghost" @click="openEditPeriod(p)" title="Edit">
                          <IconEdit class="w-3.5 h-3.5" />
                        </button>
                        <button v-if="p.status !== 'active'" class="btn btn-xs btn-ghost text-error" @click="confirmDeletePeriod(p)" title="Hapus">
                          <IconTrash class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="periodsPagination && periodsPagination.totalPages > 1" class="flex justify-center p-4">
              <div class="join">
                <button class="join-item btn btn-sm" :disabled="periodsPagination.page <= 1" @click="loadPeriods({ page: periodsPagination.page - 1 })">«</button>
                <button class="join-item btn btn-sm">{{ periodsPagination.page }} / {{ periodsPagination.totalPages }}</button>
                <button class="join-item btn btn-sm" :disabled="periodsPagination.page >= periodsPagination.totalPages" @click="loadPeriods({ page: periodsPagination.page + 1 })">»</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAB 1: Template Jadwal (Presets)               -->
    <!-- ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'presets'">
      <div class="flex justify-end mb-4">
        <button class="btn btn-primary btn-sm" @click="openCreatePreset">
          <IconPlus class="w-4 h-4 mr-1" /> Buat Template Baru
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="presets.length === 0" class="card bg-base-100 shadow-xl">
        <div class="card-body items-center text-center py-16">
          <IconTemplate class="w-16 h-16 text-base-content/30 mb-4" />
          <h3 class="text-lg font-semibold mb-2">Belum ada template jadwal</h3>
          <p class="text-base-content/60 mb-4">Buat template jadwal dulu, lalu assign ke karyawan.</p>
          <button @click="openCreatePreset" class="btn btn-primary btn-sm">
            <IconPlus class="w-4 h-4 mr-1" /> Buat Template Pertama
          </button>
        </div>
      </div>

      <!-- Preset Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="preset in presets" :key="preset.id" class="card bg-base-100 shadow-xl">
          <div class="card-body p-5">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="card-title text-base">{{ preset.name }}</h3>
                <p v-if="preset.description" class="text-xs text-base-content/60 mt-1">{{ preset.description }}</p>
              </div>
              <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost btn-xs btn-square">
                  <IconDotsVertical class="w-4 h-4" />
                </div>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-1 shadow bg-base-100 rounded-box w-36">
                  <li><a @click="openEditPreset(preset)"><IconEdit class="w-4 h-4" /> Edit</a></li>
                  <li><a @click="openDuplicatePreset(preset)"><IconCopy class="w-4 h-4" /> Duplikat</a></li>
                  <li><a class="text-error" @click="confirmDeletePreset(preset)"><IconTrash class="w-4 h-4" /> Hapus</a></li>
                </ul>
              </div>
            </div>

            <!-- 7-day schedule summary -->
            <div class="mt-3 space-y-1">
              <div v-for="s in preset.schedules" :key="s.dayOfWeek"
                class="flex items-center gap-2 text-xs py-1 px-2 rounded"
                :class="s.isOff ? 'bg-error/5 text-error' : 'bg-success/5 text-success'"
              >
                <span class="w-14 font-semibold text-base-content">{{ getDayLabel(s.dayOfWeek) }}</span>
                <span v-if="s.isOff" class="font-medium">LIBUR</span>
                <span v-else class="font-mono">{{ s.shiftStart }} — {{ s.shiftEnd }}</span>
                <span v-if="s.notes" class="text-base-content/50 ml-auto truncate max-w-[80px]">{{ s.notes }}</span>
              </div>
            </div>

            <div class="text-[10px] text-base-content/40 mt-2">
              Dibuat: {{ formatDate(preset.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAB: Master Shift                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'shifts'">
      <div class="flex justify-end mb-4">
        <button class="btn btn-primary btn-sm" @click="openAddShift">
          <IconPlus class="w-4 h-4 mr-1" /> Tambah Shift
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="shiftsLoading && shifts.length === 0" class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
      <div v-else-if="shifts.length === 0" class="text-center py-12">
        <IconClock class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">Belum ada shift</h3>
        <p class="text-base-content/60 mb-4">Buat shift untuk mengatur jam kerja karyawan.</p>
        <button class="btn btn-primary btn-sm" @click="openAddShift">
          <IconPlus class="w-4 h-4 mr-1" /> Tambah Shift Pertama
        </button>
      </div>

      <!-- Shift Table -->
      <div v-else class="card bg-base-100 shadow-xl">
        <div class="flex items-center justify-between px-5 pt-4 pb-0">
          <h3 class="font-semibold text-base">Daftar Shift</h3>
          <span class="badge badge-ghost">{{ shifts.length }} shift</span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Warna</th>
                  <th>Nama</th>
                  <th>Kode</th>
                  <th>Jam Mulai</th>
                  <th>Jam Selesai</th>
                  <th>Durasi</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shift in shifts" :key="shift.id">
                  <td>
                    <div class="w-6 h-6 rounded-full border border-base-300" :style="{ backgroundColor: shift.color || '#888888' }"></div>
                  </td>
                  <td class="font-medium">{{ shift.name }}</td>
                  <td>
                    <span class="badge badge-outline font-mono">{{ shift.code || '—' }}</span>
                  </td>
                  <td class="font-mono">{{ formatTime(shift.shiftStart) }}</td>
                  <td class="font-mono">{{ formatTime(shift.shiftEnd) }}</td>
                  <td class="text-base-content/70">{{ calcShiftDuration(shift.shiftStart, shift.shiftEnd) }}</td>
                  <td>
                    <span class="badge badge-sm" :class="shift.isActive ? 'badge-success' : 'badge-ghost'">
                      {{ shift.isActive ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="flex justify-end gap-2">
                      <button class="btn btn-xs btn-ghost btn-square" @click="openEditShift(shift)" title="Edit">
                        <IconEdit class="w-4 h-4" />
                      </button>
                      <button class="btn btn-xs btn-ghost btn-square text-error" @click="confirmDeleteShift(shift)" title="Hapus">
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAB 2: Assign ke Karyawan                      -->
    <!-- ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'assign'">
      <!-- Sub-tabs -->
      <div class="flex gap-2 mb-5">
        <button
          class="btn btn-sm"
          :class="assignMode === 'shift' ? 'btn-primary' : 'btn-outline'"
          @click="assignMode = 'shift'"
        >
          <IconCalendarTime class="w-4 h-4 mr-1" /> Via Shift
        </button>
        <button
          class="btn btn-sm"
          :class="assignMode === 'template' ? 'btn-primary' : 'btn-outline'"
          @click="assignMode = 'template'"
        >
          <IconTemplate class="w-4 h-4 mr-1" /> Via Template
        </button>
      </div>

      <!-- ─── Mode: Via Shift ─────────────────────────────────────── -->
      <div v-show="assignMode === 'shift'" class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body pb-3">

          <!-- No shifts warning -->
          <div v-if="shifts.length === 0" class="alert alert-warning mb-4">
            <IconAlertTriangle class="w-4 h-4" />
            <span class="text-sm">Belum ada master shift. <button class="link font-semibold" @click="activeTab = 'shifts'">Buat shift dulu.</button></span>
          </div>

          <!-- Row 1: Date range -->
          <div class="flex flex-wrap items-end gap-4 mb-4">
            <div class="form-control">
              <label class="label py-1"><span class="label-text">Tanggal Mulai <span class="text-error">*</span></span></label>
              <input type="date" v-model="shiftAssignRange.startDate" class="input input-bordered input-sm" />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text">Tanggal Selesai <span class="text-error">*</span></span></label>
              <input type="date" v-model="shiftAssignRange.endDate" class="input input-bordered input-sm" />
            </div>
            <div v-if="shiftAssignRangeDays !== null" class="text-sm text-base-content/60 pb-2">
              <span v-if="shiftAssignRangeDays > 0">{{ shiftAssignRangeDays }} hari</span>
              <span v-else class="text-error">Tanggal akhir harus setelah tanggal mulai</span>
            </div>
          </div>

          <!-- Row 2: Bulk-fill bar — pilih shift + pilih hari yang akan diisi -->
          <div class="bg-base-200 rounded-lg px-3 py-2 flex flex-wrap items-center gap-3 mb-3 text-sm">
            <span class="font-semibold shrink-0">Isi ke yang dipilih:</span>
            <select v-model="bulkShiftId" class="select select-bordered select-xs w-44">
              <option value="">Libur / Kosong</option>
              <option v-for="s in activeShifts" :key="s.id" :value="s.id">
                {{ s.name }} ({{ formatTime(s.shiftStart) }}–{{ formatTime(s.shiftEnd) }})
              </option>
            </select>
            <span class="text-base-content/50 text-xs shrink-0">pada hari:</span>
            <div class="flex gap-1 flex-wrap">
              <label v-for="d in dayOptions" :key="d.value"
                class="flex items-center gap-1 px-2 py-0.5 rounded border cursor-pointer text-xs transition-colors"
                :class="bulkApplyDays.includes(d.value) ? 'bg-primary/10 border-primary text-primary' : 'border-base-300'"
              >
                <input type="checkbox" :value="d.value" v-model="bulkApplyDays" class="checkbox checkbox-xs" />
                {{ d.short }}
              </label>
            </div>
            <button class="btn btn-xs btn-neutral" :disabled="!bulkApplyDays.length" @click="applyBulkFill">Terapkan</button>
            <span class="text-base-content/50 ml-auto">{{ shiftAssignSelectedCount }} dipilih</span>
          </div>

          <!-- Spreadsheet table: 1 baris = 1 karyawan, 7 kolom = shift per hari -->
          <div class="overflow-x-auto border border-base-200 rounded-lg">
            <table class="table table-sm">
              <thead class="bg-base-200 sticky top-0 z-10">
                <tr>
                  <th class="w-8">
                    <input type="checkbox" class="checkbox checkbox-xs checkbox-primary"
                      :checked="shiftAssignAllSelected"
                      :indeterminate="shiftAssignSomeSelected && !shiftAssignAllSelected"
                      @change="toggleAllShiftAssign"
                    />
                  </th>
                  <th class="whitespace-nowrap min-w-[160px]">Nama Staff</th>
                  <th v-for="d in dayOptions" :key="d.value" class="text-center px-1 min-w-[110px]">
                    <span :class="[0,6].includes(d.value) ? 'text-error' : ''">{{ d.label }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="shiftAssignRows.length === 0">
                  <td colspan="9" class="text-center py-8 text-base-content/40">Tidak ada data staff</td>
                </tr>
                <tr
                  v-for="row in shiftAssignRows"
                  :key="row.userId"
                  class="hover"
                  :class="row.selected ? 'bg-primary/5' : 'opacity-50'"
                >
                  <td>
                    <input type="checkbox" v-model="row.selected" class="checkbox checkbox-xs checkbox-primary" />
                  </td>
                  <td class="whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <div class="shrink-0 w-6 h-6 rounded-full bg-base-300 text-base-content flex items-center justify-center">
                        <span class="text-[10px] font-bold leading-none">{{ getInitials(row) }}</span>
                      </div>
                      <div>
                        <div class="font-medium text-sm leading-tight">{{ row.name }}</div>
                        <div class="text-xs text-base-content/50">{{ row.employeeNo ? 'No: ' + row.employeeNo : '' }}</div>
                      </div>
                    </div>
                  </td>
                  <!-- Satu kolom per hari — dropdown shift atau Libur -->
                  <td v-for="d in dayOptions" :key="d.value" class="px-0.5">
                    <select
                      v-model="row.dayShifts[d.value]"
                      class="select select-xs w-full"
                      :class="row.dayShifts[d.value]
                        ? 'select-bordered'
                        : [0,6].includes(d.value) ? 'select-ghost text-error/50' : 'select-ghost text-base-content/30'"
                      :disabled="!row.selected"
                    >
                      <option value="">Libur</option>
                      <option v-for="s in activeShifts" :key="s.id" :value="s.id">
                        {{ s.name }}
                      </option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Legend shifts -->
          <div v-if="activeShifts.length" class="flex flex-wrap gap-2 mt-2 mb-1">
            <span v-for="s in activeShifts" :key="s.id"
              class="badge badge-outline badge-sm text-xs font-medium">
              {{ s.name }}: {{ formatTime(s.shiftStart) }}–{{ formatTime(s.shiftEnd) }}
            </span>
            <span class="badge badge-ghost badge-sm text-xs">Libur = kosong</span>
          </div>

          <!-- Submit bar -->
          <div class="flex items-center justify-between mt-3 pt-2 border-t border-base-200">
            <span class="text-sm text-base-content/60">
              {{ shiftAssignSelectedCount }} karyawan akan dibuat jadwal
            </span>
            <button
              class="btn btn-primary btn-sm"
              :disabled="saving || !shiftAssignRange.startDate || !shiftAssignRange.endDate || shiftAssignSelectedCount === 0"
              @click="handleAssignShifts"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs mr-1"></span>
              <IconCalendarTime class="w-4 h-4 mr-1" />
              Buat Jadwal ({{ shiftAssignSelectedCount }} karyawan)
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Mode: Via Template (existing) ─────────────────────────── -->
      <div v-show="assignMode === 'template'">
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body py-4">
          <h3 class="font-semibold mb-3">Terapkan Template ke Karyawan</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div class="form-control">
              <label class="label"><span class="label-text">Template Jadwal <span class="text-error">*</span></span></label>
              <select v-model="assignForm.presetId" class="select select-bordered select-sm w-full">
                <option value="" disabled>Pilih template</option>
                <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"><span class="label-text">Preview</span></label>
              <div v-if="selectedPresetPreview" class="flex items-center gap-2 flex-wrap">
                <span v-for="s in selectedPresetPreview.schedules" :key="s.dayOfWeek"
                  class="badge badge-sm gap-1"
                  :class="s.isOff ? 'badge-error badge-outline' : 'badge-success badge-outline'"
                >
                  {{ getDayShort(s.dayOfWeek) }}:
                  <span v-if="s.isOff">OFF</span>
                  <span v-else class="font-mono">{{ s.shiftStart }}-{{ s.shiftEnd }}</span>
                </span>
              </div>
              <div v-else class="text-sm text-base-content/40 py-2">Pilih template untuk melihat preview</div>
            </div>
          </div>

          <!-- Employee multi-select -->
          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Pilih Karyawan <span class="text-error">*</span></span>
              <span class="label-text-alt">
                {{ assignForm.userIds.length }} dipilih
                <button v-if="assignForm.userIds.length > 0" class="btn btn-ghost btn-xs ml-1" @click="assignForm.userIds = []">Reset</button>
                <button v-if="assignForm.userIds.length < staffList.length" class="btn btn-ghost btn-xs ml-1" @click="selectAllStaff">Pilih Semua</button>
              </span>
            </label>
            <div class="border border-base-200 rounded-lg p-3 max-h-52 overflow-y-auto space-y-1">
              <label v-for="u in staffList" :key="u.id"
                class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-colors"
                :class="{ 'bg-primary/5': assignForm.userIds.includes(u.id) }"
              >
                <input type="checkbox" :value="u.id" v-model="assignForm.userIds" class="checkbox checkbox-sm checkbox-primary" />
                <div class="w-7 h-7 rounded-full bg-base-300 text-base-content flex items-center justify-center">
                  <span class="text-xs font-bold leading-none">{{ getInitials(u) }}</span>
                </div>
                <div>
                  <span class="font-medium text-sm">{{ u.name }}</span>
                  <span v-if="u.employeeNo" class="text-xs text-base-content/50 block">No: {{ u.employeeNo }}</span>
                </div>
              </label>
              <div v-if="staffList.length === 0" class="text-center text-base-content/50 py-4 text-sm">
                Tidak ada karyawan
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-4">
            <button class="btn btn-primary btn-sm"
              :disabled="saving || !assignForm.presetId || assignForm.userIds.length === 0"
              @click="handleApplyPreset"
            >
              <span v-if="saving" class="loading loading-spinner loading-xs mr-1"></span>
              <IconCheck class="w-4 h-4 mr-1" />
              Terapkan ke {{ assignForm.userIds.length }} Karyawan
            </button>
          </div>
        </div>
      </div>
      </div><!-- end via template -->

      <!-- Current templates grouped by user -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-0">
          <div class="flex items-center justify-between p-4 pb-0">
            <h3 class="font-semibold">Jadwal Terpasang per Karyawan</h3>
            <button class="btn btn-ghost btn-xs" @click="loadTemplates">
              <IconRefresh class="w-4 h-4 mr-1" /> Refresh
            </button>
          </div>
          <div v-if="loading" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="groupedTemplates.length === 0" class="text-center py-12">
            <IconUsers class="w-12 h-12 mx-auto text-base-content/30 mb-3" />
            <p class="text-base-content/60">Belum ada karyawan yang memiliki template jadwal.</p>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Sen</th>
                  <th>Sel</th>
                  <th>Rab</th>
                  <th>Kam</th>
                  <th>Jum</th>
                  <th>Sab</th>
                  <th>Min</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="group in groupedTemplates" :key="group.userId" class="hover">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-base-300 text-base-content flex items-center justify-center shrink-0">
                        <span class="text-xs font-bold leading-none">{{ getInitials(group.deviceEmployee || group.user) }}</span>
                      </div>
                      <div>
                        <span class="font-medium text-sm">{{ group.deviceEmployee?.name || group.user?.name || [group.user?.firstName, group.user?.lastName].filter(Boolean).join(' ') }}</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in [1,2,3,4,5,6,0]" :key="day" class="text-center">
                    <template v-if="group.days[day]">
                      <span v-if="group.days[day].isOff" class="badge badge-error badge-xs">OFF</span>
                      <span v-else class="text-[11px] font-mono leading-tight">
                        {{ formatTime(group.days[day].shiftStart) }}<br>{{ formatTime(group.days[day].shiftEnd) }}
                      </span>
                    </template>
                    <span v-else class="text-base-content/30">—</span>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-ghost btn-xs text-error" @click="confirmDeleteUserTemplates(group)" title="Hapus semua template jadwal karyawan ini">
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- TAB 3: Jadwal Karyawan (full list + CRUD)      -->
    <!-- ═══════════════════════════════════════════════ -->
    <div v-show="activeTab === 'schedules'">
      <!-- Filters -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body py-4">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div class="form-control">
              <label class="label"><span class="label-text">Karyawan</span></label>
              <select v-model="schedFilters.userId" class="select select-bordered select-sm w-full">
                <option value="">Semua</option>
                <option v-for="u in staffList" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Start Date</span></label>
              <input type="date" v-model="schedFilters.startDate" class="input input-bordered input-sm w-full" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">End Date</span></label>
              <input type="date" v-model="schedFilters.endDate" class="input input-bordered input-sm w-full" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Status</span></label>
              <select v-model="schedFilters.isOff" class="select select-bordered select-sm w-full">
                <option value="">Semua</option>
                <option value="true">Libur</option>
                <option value="false">Kerja</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-primary btn-sm flex-1" @click="loadSchedules" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-xs mr-1"></span>
                <IconRefresh class="w-4 h-4 mr-1" /> Filter
              </button>
              <button class="btn btn-secondary btn-sm flex-1" @click="handleExport" :disabled="loading">
                <IconCalendarStats class="w-4 h-4 mr-1" /> Export Excel
              </button>
              <button class="btn btn-ghost btn-sm flex-1" @click="openCreateSchedule">
                <IconPlus class="w-4 h-4 mr-1" /> Tambah
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Schedule Table -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-0">
          <div v-if="loading" class="flex items-center justify-center py-16">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else-if="schedules.length === 0" class="text-center py-16">
            <IconCalendarStats class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <h3 class="text-lg font-semibold mb-2">Belum ada data jadwal</h3>
            <p class="text-base-content/60 mb-4">Tambah jadwal baru atau assign template ke karyawan.</p>
            <button @click="openCreateSchedule" class="btn btn-primary btn-sm">
              <IconPlus class="w-4 h-4 mr-1" /> Tambah Jadwal
            </button>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Hari</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Keluar</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in schedules" :key="s.id" class="hover">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-base-300 text-base-content flex items-center justify-center shrink-0">
                        <span class="text-xs font-bold leading-none">{{ getInitials(s.deviceEmployee || s.user) }}</span>
                      </div>
                      <span class="font-medium text-sm">{{ s.deviceEmployee?.name || s.user?.name || [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') }}</span>
                    </div>
                  </td>
                  <td>
                    <span v-if="s.dayOfWeek !== undefined && s.dayOfWeek !== null" class="badge badge-outline badge-sm">{{ getDayLabel(s.dayOfWeek) }}</span>
                    <span v-else class="text-base-content/40">—</span>
                  </td>
                  <td>
                    <span v-if="s.date" class="font-mono text-sm">{{ s.date }}</span>
                    <span v-else class="text-base-content/40">—</span>
                  </td>
                  <td>
                    <span v-if="!s.isOff" class="font-mono text-sm">{{ formatTime(s.shiftStart) }}</span>
                    <span v-else class="text-base-content/40">—</span>
                  </td>
                  <td>
                    <span v-if="!s.isOff" class="font-mono text-sm">{{ formatTime(s.shiftEnd) }}</span>
                    <span v-else class="text-base-content/40">—</span>
                  </td>
                  <td>
                    <span v-if="s.isOff" class="badge badge-error badge-sm gap-1">
                      <IconCalendarOff class="w-3 h-3" /> Libur
                    </span>
                    <span v-else class="badge badge-success badge-sm gap-1">
                      <IconClock class="w-3 h-3" /> Kerja
                    </span>
                  </td>
                  <td class="text-xs text-base-content/60 max-w-[150px] truncate">{{ s.notes || '—' }}</td>
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button class="btn btn-ghost btn-xs" @click="openEditSchedule(s)" title="Edit">
                        <IconEdit class="w-4 h-4" />
                      </button>
                      <button class="btn btn-ghost btn-xs text-error" @click="confirmDeleteSchedule(s)" title="Hapus">
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="meta && meta.totalPages > 1" class="flex justify-center p-4">
            <div class="join">
              <button class="join-item btn btn-sm" :disabled="meta.page <= 1" @click="goToPage(meta.page - 1)">«</button>
              <button class="join-item btn btn-sm">{{ meta.page }} / {{ meta.totalPages }}</button>
              <button class="join-item btn btn-sm" :disabled="meta.page >= meta.totalPages" @click="goToPage(meta.page + 1)">»</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Create / Edit Preset                    -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="presetModal" class="modal">
      <div class="modal-box w-11/12 max-w-2xl">
        <h3 class="font-bold text-lg mb-4">{{ isEditingPreset ? 'Edit Template Jadwal' : 'Buat Template Jadwal' }}</h3>
        <form @submit.prevent="handleSavePreset">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Nama Template <span class="text-error">*</span></span></label>
              <input type="text" v-model="presetForm.name" class="input input-bordered w-full" placeholder="e.g. Shift Pagi" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Deskripsi</span></label>
              <input type="text" v-model="presetForm.description" class="input input-bordered w-full" placeholder="Opsional" />
            </div>
          </div>

          <!-- Quick fill -->
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm text-base-content/60">Isi cepat:</span>
            <button type="button" class="btn btn-ghost btn-xs" @click="quickFill('08:00', '17:00')">Pagi (08-17)</button>
            <button type="button" class="btn btn-ghost btn-xs" @click="quickFill('14:00', '22:00')">Sore (14-22)</button>
            <button type="button" class="btn btn-ghost btn-xs" @click="quickFill('22:00', '06:00')">Malam (22-06)</button>
            <button type="button" class="btn btn-ghost btn-xs" @click="quickFillAllOff">Semua Libur</button>
          </div>

          <!-- 7-day schedule -->
          <div class="space-y-2">
            <div v-for="(day, idx) in presetForm.schedules" :key="idx"
              class="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg border border-base-200"
              :class="{ 'bg-error/5': day.isOff }"
            >
              <div class="w-14 font-semibold text-sm shrink-0">{{ getDayLabel(day.dayOfWeek) }}</div>
              <label class="flex items-center gap-2 shrink-0 cursor-pointer">
                <input type="checkbox" v-model="day.isOff" class="toggle toggle-error toggle-sm" />
                <span class="text-xs text-base-content/60">Libur</span>
              </label>
              <template v-if="!day.isOff">
                <input type="time" v-model="day.shiftStart" class="input input-bordered input-sm w-full sm:w-32" required />
                <span class="text-base-content/40 hidden sm:inline">—</span>
                <input type="time" v-model="day.shiftEnd" class="input input-bordered input-sm w-full sm:w-32" required />
              </template>
              <input type="text" v-model="day.notes" class="input input-bordered input-sm w-full sm:flex-1" placeholder="Catatan" />
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="presetModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditingPreset ? 'Simpan Perubahan' : 'Buat Template' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Create / Edit Schedule Entry            -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="scheduleModal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">{{ isEditingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal' }}</h3>
        <form @submit.prevent="handleSaveSchedule">
          <div class="form-control mb-3">
            <label class="label"><span class="label-text">Karyawan <span class="text-error">*</span></span></label>
            <select v-model="schedForm.userId" class="select select-bordered w-full" required :disabled="isEditingSchedule">
              <option value="" disabled>Pilih karyawan</option>
              <option v-for="u in staffList" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="form-control">
              <label class="label"><span class="label-text">Hari (dayOfWeek)</span></label>
              <select v-model="schedForm.dayOfWeek" class="select select-bordered w-full">
                <option :value="null">— Tidak —</option>
                <option v-for="d in dayOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Tanggal (opsional)</span></label>
              <input type="date" v-model="schedForm.date" class="input input-bordered w-full" />
            </div>
          </div>
          <div class="form-control mb-3">
            <label class="label cursor-pointer">
              <span class="label-text">Hari Libur</span>
              <input type="checkbox" v-model="schedForm.isOff" class="toggle toggle-error" />
            </label>
          </div>
          <div v-if="!schedForm.isOff" class="grid grid-cols-2 gap-3 mb-3">
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Masuk <span class="text-error">*</span></span></label>
              <input type="time" v-model="schedForm.shiftStart" class="input input-bordered w-full" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Keluar <span class="text-error">*</span></span></label>
              <input type="time" v-model="schedForm.shiftEnd" class="input input-bordered w-full" required />
            </div>
          </div>
          <div class="form-control mb-4">
            <label class="label"><span class="label-text">Catatan</span></label>
            <textarea v-model="schedForm.notes" class="textarea textarea-bordered w-full" rows="2" placeholder="Opsional"></textarea>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="scheduleModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner loading-xs mr-1"></span>
              {{ isEditingSchedule ? 'Simpan' : 'Tambah' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Delete Confirm                          -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg text-error mb-2">{{ deleteTitle }}</h3>
        <p class="text-base-content/70">{{ deleteMessage }}</p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="deleteModal?.close()">Batal</button>
          <button class="btn btn-error" :disabled="saving" @click="handleDelete">
            <span v-if="saving" class="loading loading-spinner loading-xs mr-1"></span>
            Hapus
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- MODAL: Add / Edit Shift                        -->
    <!-- ═══════════════════════════════════════════════ -->
    <dialog ref="shiftModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ editingShift ? 'Edit Shift' : 'Tambah Shift' }}</h3>
        <form @submit.prevent="handleSaveShift" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Shift <span class="text-error">*</span></span></label>
            <input v-model="shiftForm.name" type="text" placeholder="Contoh: Pagi" class="input input-bordered w-full" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Kode</span></label>
              <input v-model="shiftForm.code" type="text" placeholder="Contoh: P" maxlength="20" class="input input-bordered w-full uppercase" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Warna</span></label>
              <div class="flex items-center gap-2">
                <input v-model="shiftForm.color" type="color" class="w-10 h-10 rounded cursor-pointer border border-base-300" />
                <input v-model="shiftForm.color" type="text" placeholder="#4CAF50" class="input input-bordered flex-1 font-mono" />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Mulai <span class="text-error">*</span></span></label>
              <input v-model="shiftForm.shiftStart" type="time" class="input input-bordered w-full font-mono" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Jam Selesai <span class="text-error">*</span></span></label>
              <input v-model="shiftForm.shiftEnd" type="time" class="input input-bordered w-full font-mono" required />
            </div>
          </div>
          <div v-if="shiftForm.shiftStart && shiftForm.shiftEnd" class="alert alert-info py-2">
            <IconClock class="w-4 h-4" />
            <span class="text-sm">Durasi: {{ calcShiftDuration(shiftForm.shiftStart, shiftForm.shiftEnd) }}</span>
          </div>
          <div v-if="editingShift" class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input type="checkbox" v-model="shiftForm.isActive" class="checkbox checkbox-primary" />
              <span class="label-text">Shift Aktif</span>
            </label>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="shiftModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="shiftsLoading">
              <span v-if="shiftsLoading" class="loading loading-spinner loading-sm"></span>
              {{ editingShift ? 'Simpan Perubahan' : 'Tambah Shift' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- ═══════════════════════════ MODALS: Periode Jadwal ═══════════════════════════ -->

    <!-- Create / Edit Period -->
    <dialog ref="periodModal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">{{ isEditingPeriod ? 'Edit Periode Jadwal' : 'Buat Periode Jadwal' }}</h3>
        <form @submit.prevent="handleSavePeriod" class="space-y-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Periode <span class="text-error">*</span></span></label>
            <input v-model="periodForm.name" type="text" placeholder="Contoh: Maret 2026" class="input input-bordered w-full" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label"><span class="label-text">Tanggal Mulai <span class="text-error">*</span></span></label>
              <input v-model="periodForm.startDate" type="date" class="input input-bordered w-full" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Tanggal Selesai <span class="text-error">*</span></span></label>
              <input v-model="periodForm.endDate" type="date" class="input input-bordered w-full" required />
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Catatan</span></label>
            <textarea v-model="periodForm.notes" class="textarea textarea-bordered w-full" rows="2" placeholder="Opsional"></textarea>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="periodModal?.close()">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="periodsSaving">
              <span v-if="periodsSaving" class="loading loading-spinner loading-xs mr-1"></span>
              {{ isEditingPeriod ? 'Simpan Perubahan' : 'Buat Periode' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Assign Staff to Period -->
    <dialog ref="assignStaffModal" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <h3 class="font-bold text-lg mb-1">Assign Staff — {{ periodDetailData?.period?.name }}</h3>
        <p class="text-sm text-base-content/60 mb-4">Pilih staff, shift, dan hari libur untuk seluruh periode.</p>
        <div class="overflow-x-auto border border-base-200 rounded-lg">
          <table class="table table-sm">
            <thead class="bg-base-200">
              <tr>
                <th class="w-8">
                  <input type="checkbox" class="checkbox checkbox-xs checkbox-primary"
                    :checked="assignAllSelected"
                    :indeterminate="assignSomeSelected && !assignAllSelected"
                    @change="toggleAllAssign"
                  />
                </th>
                <th>Karyawan</th>
                <th>Shift</th>
                <th>Hari Libur</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="assignRows.length === 0">
                <td colspan="4" class="text-center py-8 text-base-content/40">Tidak ada karyawan</td>
              </tr>
              <tr v-for="row in assignRows" :key="row.userId" class="hover" :class="row.selected ? '' : 'opacity-50'">
                <td><input type="checkbox" v-model="row.selected" class="checkbox checkbox-xs checkbox-primary" /></td>
                <td class="whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="shrink-0 w-6 h-6 rounded-full bg-base-300 text-base-content flex items-center justify-center">
                      <span class="text-[10px] font-bold leading-none">{{ getInitials(row) }}</span>
                    </div>
                    <span class="font-medium text-sm">{{ row.name }}</span>
                  </div>
                </td>
                <td>
                  <select v-model="row.shiftId" class="select select-sm select-bordered w-44" :disabled="!row.selected">
                    <option value="">— Pilih Shift —</option>
                    <option v-for="s in activeShifts" :key="s.id" :value="s.id">
                      {{ s.name }} ({{ formatTime(s.shiftStart) }}–{{ formatTime(s.shiftEnd) }})
                    </option>
                  </select>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <label v-for="d in dayOptions" :key="d.value"
                      class="flex items-center gap-1 cursor-pointer text-xs"
                      :class="!row.selected ? 'opacity-50 pointer-events-none' : ''"
                    >
                      <input type="checkbox" :value="d.value" v-model="row.offDays" class="checkbox checkbox-xs" />
                      <span :class="[0,6].includes(d.value) ? 'text-error' : ''">{{ d.short }}</span>
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="assignStaffModal?.close()">Batal</button>
          <button class="btn btn-primary" :disabled="periodsSaving || assignSelectedCount === 0" @click="handleAssignStaff">
            <span v-if="periodsSaving" class="loading loading-spinner loading-xs mr-1"></span>
            Assign {{ assignSelectedCount }} Staff
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Date List Modal (lihat semua assignment di tanggal tertentu) -->
    <dialog ref="dateListModal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-1">Assignment — {{ formatDate(dateListDate) }}</h3>
        <p class="text-sm text-base-content/60 mb-4">{{ dateListItems.length }} staff di tanggal ini.</p>
        <div class="space-y-3 max-h-[400px] overflow-y-auto">
          <div v-for="group in groupAssignmentsByShift(dateListItems)" :key="group.key">
            <!-- Group header -->
            <div class="flex items-center gap-2 mb-1">
              <span v-if="group.isOff" class="badge badge-error badge-sm text-xs font-bold">OFF / Libur</span>
              <template v-else>
                <span class="badge badge-sm text-xs font-bold"
                  :style="{ backgroundColor: (group.shift?.color || '#888') + '22', borderColor: group.shift?.color || '#888', color: group.shift?.color || '#555' }">
                  {{ group.shift?.name || '—' }}
                </span>
                <span class="text-xs text-base-content/50">{{ formatTime(group.shift?.shiftStart) }}–{{ formatTime(group.shift?.shiftEnd) }}</span>
              </template>
              <span class="text-xs text-base-content/40">({{ group.items.length }})</span>
            </div>
            <!-- Staff items -->
            <div class="space-y-1 ml-1">
              <div v-for="a in group.items" :key="a.id"
                class="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm"
                :style="group.isOff
                  ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                  : { backgroundColor: (group.shift?.color || '#e5e7eb') + '15', borderLeft: '3px solid ' + (group.shift?.color || '#9ca3af') }">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="shrink-0 w-7 h-7 rounded-full bg-base-300 text-base-content flex items-center justify-center">
                    <span class="text-[10px] font-bold leading-none">{{ getInitials(a.deviceEmployee || a.user) }}</span>
                  </div>
                  <span class="font-semibold truncate">{{ a.deviceEmployee?.name || a.user?.name || '?' }}</span>
                </div>
                <button class="btn btn-ghost btn-xs btn-circle text-error shrink-0" @click="handleRemoveDateListAssignment(a)" title="Hapus">
                  <IconTrash class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="dateListModal?.close()">Tutup</button>
          <button class="btn btn-primary btn-sm" @click="dateListModal?.close(); openDateAssignModal(dateListDate)">
            <IconPlus class="w-4 h-4 mr-1" /> Tambah Staff
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Per-Date Assign Modal (klik tanggal di kalender) -->
    <dialog ref="dateAssignModal" class="modal">
      <div class="modal-box w-11/12 max-w-2xl">
        <h3 class="font-bold text-lg mb-1">Assign Shift — {{ formatDate(dateAssignDate) }}</h3>
        <p class="text-sm text-base-content/60 mb-4">Pilih staff dan shift untuk tanggal ini. Bisa menambahkan beberapa staff sekaligus.</p>

        <!-- Existing assignments for this date -->
        <div v-if="dateAssignExisting.length > 0" class="mb-4">
          <div class="text-xs font-semibold text-base-content/50 mb-2">Assignment saat ini:</div>
          <div class="space-y-2">
            <div v-for="group in groupAssignmentsByShift(dateAssignExisting)" :key="group.key">
              <div class="text-[11px] font-bold mb-1"
                :style="group.isOff ? { color: '#991b1b' } : { color: group.shift?.color || '#555' }">
                {{ group.isOff ? 'OFF' : (group.shift?.code || group.shift?.name || '—') }}
                <span v-if="!group.isOff" class="font-normal opacity-60">{{ formatTime(group.shift?.shiftStart) }}–{{ formatTime(group.shift?.shiftEnd) }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <div v-for="a in group.items" :key="a.id"
                  class="badge badge-lg gap-1.5 pr-1"
                  :style="group.isOff
                    ? { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
                    : { backgroundColor: (group.shift?.color || '#888') + '22', border: '1px solid ' + (group.shift?.color || '#ccc'), color: group.shift?.color || '#555' }">
                  <span class="font-semibold">{{ a.deviceEmployee?.name || a.user?.name || '?' }}</span>
                  <button class="btn btn-ghost btn-xs btn-circle" @click="handleRemoveDateAssignment(a)" title="Hapus">
                    <IconTrash class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add new assignments -->
        <div class="border border-base-200 rounded-lg p-3">
          <div class="text-xs font-semibold text-base-content/50 mb-2">Tambah assignment baru:</div>
          <div class="space-y-2">
            <div v-for="(entry, idx) in dateAssignEntries" :key="idx" class="flex items-center gap-2">
              <select v-model="entry.userId" class="select select-sm select-bordered flex-1">
                <option value="">— Pilih Staff —</option>
                <option v-for="u in availableDateStaff(idx)" :key="u.id" :value="u.id">
                  {{ u.name }}
                </option>
              </select>
              <select v-model="entry.shiftId" class="select select-sm select-bordered w-48" :disabled="entry.isOff">
                <option value="">— Shift —</option>
                <option v-for="s in activeShifts" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ formatTime(s.shiftStart) }}–{{ formatTime(s.shiftEnd) }})
                </option>
              </select>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" v-model="entry.isOff" class="checkbox checkbox-xs checkbox-error" @change="entry.isOff ? entry.shiftId = '' : null" />
                <span class="text-xs text-error">OFF</span>
              </label>
              <button v-if="dateAssignEntries.length > 1" class="btn btn-ghost btn-xs btn-circle text-error" @click="dateAssignEntries.splice(idx, 1)">
                <IconTrash class="w-3 h-3" />
              </button>
            </div>
          </div>
          <button class="btn btn-ghost btn-xs mt-2" @click="dateAssignEntries.push({ userId: '', shiftId: '', isOff: false })">
            <IconPlus class="w-3 h-3 mr-1" /> Tambah Staff
          </button>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="dateAssignModal?.close()">Batal</button>
          <button class="btn btn-primary" :disabled="periodsSaving || !dateAssignValid" @click="handleDateAssign">
            <span v-if="periodsSaving" class="loading loading-spinner loading-xs mr-1"></span>
            Simpan Assignment
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <!-- Generate dari Template -->
    <dialog ref="generateModal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-2">Generate dari Template</h3>
        <p class="text-sm text-base-content/60 mb-4">
          Otomatis expand template mingguan menjadi assignment per tanggal untuk periode
          <strong>{{ periodDetailData?.period?.name }}</strong>.
        </p>
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Karyawan</span>
            <span class="label-text-alt text-xs">Kosong = semua yang punya template</span>
          </label>
          <div class="border border-base-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
            <label v-for="u in staffList" :key="u.id"
              class="flex items-center gap-3 p-1.5 rounded cursor-pointer hover:bg-base-200"
              :class="{ 'bg-primary/5': generateUserIds.includes(u.id) }"
            >
              <input type="checkbox" :value="u.id" v-model="generateUserIds" class="checkbox checkbox-sm checkbox-primary" />
              <span class="text-sm">{{ u.name }}</span>
            </label>
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="generateModal?.close()">Batal</button>
          <button class="btn btn-primary" :disabled="periodsSaving" @click="handleGenerate">
            <span v-if="periodsSaving" class="loading loading-spinner loading-xs mr-1"></span>
            <IconWand class="w-4 h-4 mr-1" /> Generate Jadwal
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEmployeeSchedule } from '@/composables/gym/useEmployeeSchedule'
import { useShifts } from '@/composables/gym/useShifts'
import { useHikvisionEmployees } from '@/composables/gym/hikvision/useHikvisionEmployees'
import { useSchedulePeriods } from '@/composables/gym/useSchedulePeriods'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconCalendarOff,
  IconCalendarStats,
  IconCalendarTime,
  IconClock,
  IconTemplate,
  IconUsersGroup,
  IconDotsVertical,
  IconCopy,
  IconCheck,
  IconUsers,
  IconAlertTriangle,
  IconCalendar,
  IconArrowLeft,
  IconChevronDown,
  IconEye,
  IconWand,
  IconFileSpreadsheet,
} from '@tabler/icons-vue'

const { deviceEmployees: _rawStaffList, loading: staffLoading, fetchDeviceEmployees: loadStaff } = useHikvisionEmployees()
const staffList = computed(() => _rawStaffList.value.filter(e => String(e.employeeNo) !== '1'))
const {
  shifts,
  loading: shiftsLoading,
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
} = useShifts()
const {
  schedules,
  templates,
  presets,
  loading,
  saving,
  meta,
  loadPresets,
  createPreset,
  updatePreset: updatePresetFn,
  deletePreset: deletePresetFn,
  applyPresetToUsers,
  fetchTemplates,
  deleteUserTemplates,
  fetchSchedules,
  downloadExcel,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  deleteUserSchedules,
  assignShifts,
} = useEmployeeSchedule()

const {
  periods,
  periodDetail,
  loading: periodsLoading,
  saving: periodsSaving,
  pagination: periodsPagination,
  fetchPeriods,
  fetchPeriodDetail,
  createPeriod,
  updatePeriod,
  deletePeriod,
  updatePeriodStatus,
  assignStaff: assignStaffToPeriod,
  generateFromTemplate,
  removeAssignment: removePeriodAssignment,
} = useSchedulePeriods()

// ─── Constants ──────────────────────────────────────────────────

const dayOptions = [
  { value: 0, label: 'Minggu', short: 'Min' },
  { value: 1, label: 'Senin', short: 'Sen' },
  { value: 2, label: 'Selasa', short: 'Sel' },
  { value: 3, label: 'Rabu', short: 'Rab' },
  { value: 4, label: 'Kamis', short: 'Kam' },
  { value: 5, label: 'Jumat', short: 'Jum' },
  { value: 6, label: 'Sabtu', short: 'Sab' },
]

const getDayLabel = (val) => dayOptions.find((d) => d.value === val)?.label || '-'
const getDayShort = (val) => dayOptions.find((d) => d.value === val)?.short || '-'
const getInitials = (user) => {
  if (!user) return '?'
  const f = user.firstName || user.name || ''
  const l = user.lastName || ''
  return (f[0] || '') + (l[0] || '') || '?'
}
const formatTime = (t) => (t ? t.slice(0, 5) : '—')

// ─── Export Excel ──────────────────────────────────────────────
const exportLoading = ref(false)

const handleExportExcel = async () => {
  if (!periodDetailData.value?.period) return
  exportLoading.value = true
  try {
    const { startDate, endDate, name } = periodDetailData.value.period
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const tenantId = localStorage.getItem('tenantId')

    const params = new URLSearchParams({ startDate, endDate })
    const url = `${baseURL}/gym/employee-schedules/export?${params}`

    const headers = { 'X-Client-Name': 'Gym FE Web App' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (tenantId) headers['X-Tenant-ID'] = tenantId

    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Export gagal: ${res.status}`)

    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const safeName = (name || 'jadwal').replace(/[^a-zA-Z0-9_\- ]/g, '_')
    a.download = `${safeName}_${startDate}_${endDate}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (err) {
    console.error('Export Excel error:', err)
  } finally {
    exportLoading.value = false
  }
}
const formatDate = (d) => {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
}

const makeDefaultSchedules = () => [
  { dayOfWeek: 1, shiftStart: '08:00', shiftEnd: '17:00', isOff: false, notes: '' },
  { dayOfWeek: 2, shiftStart: '08:00', shiftEnd: '17:00', isOff: false, notes: '' },
  { dayOfWeek: 3, shiftStart: '08:00', shiftEnd: '17:00', isOff: false, notes: '' },
  { dayOfWeek: 4, shiftStart: '08:00', shiftEnd: '17:00', isOff: false, notes: '' },
  { dayOfWeek: 5, shiftStart: '08:00', shiftEnd: '17:00', isOff: false, notes: '' },
  { dayOfWeek: 6, shiftStart: null, shiftEnd: null, isOff: true, notes: 'Weekend' },
  { dayOfWeek: 0, shiftStart: null, shiftEnd: null, isOff: true, notes: 'Weekend' },
]

// ─── Staff list (from useUsers composable) ─────────────────────

// ─── Shift helpers ─────────────────────────────────────────────

function calcShiftDuration(start, end) {
  if (!start || !end) return '—'
  const toMins = (t) => {
    const parts = t.split(':').map(Number)
    return parts[0] * 60 + (parts[1] || 0)
  }
  let mins = toMins(end) - toMins(start)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}j ${m}m` : `${h} jam`
}

const periodStatuses = [
  { value: 'draft', label: 'Draft', dotClass: 'text-warning' },
  { value: 'active', label: 'Active', dotClass: 'text-success' },
  { value: 'closed', label: 'Closed', dotClass: 'text-error' },
]

// ─── Tab state ──────────────────────────────────────────────────

const activeTab = ref('periods')

// ─────────────────────────────────────────────────────────────────
// TAB: Periode Jadwal
// ─────────────────────────────────────────────────────────────────

const selectedPeriodId = ref(null)
const periodDetailData = computed(() => periodDetail.value)
const periodFilter = ref({ status: '' })

// Calendar: group dates into Mon-first weeks
const calendarWeeks = computed(() => {
  if (!periodDetailData.value?.byDate || !periodDetailData.value?.period) return []
  const { startDate, endDate } = periodDetailData.value.period
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const weekStart = new Date(start)
  const dow = weekStart.getDay()
  const daysToMon = dow === 0 ? -6 : 1 - dow
  weekStart.setDate(weekStart.getDate() + daysToMon)
  const weeks = []
  const cursor = new Date(weekStart)
  while (cursor <= end) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      const cursorDate = new Date(cursor)
      const inPeriod = cursorDate >= start && cursorDate <= end
      week.push({
        date: dateStr,
        dayNum: cursor.getDate(),
        dayOfWeek: cursor.getDay(),
        inPeriod,
        assignments: inPeriod ? (periodDetailData.value.byDate[dateStr] || []) : [],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
})

/**
 * Group assignments by shift for calendar cell display.
 * Returns array of { key, shift, isOff, items[] } sorted by shiftStart.
 */
const groupAssignmentsByShift = (assignments) => {
  if (!assignments?.length) return []
  const map = {}
  for (const a of assignments) {
    const key = a.isOff ? '__OFF__' : (a.shiftId || a.shift?.id || '__NO_SHIFT__')
    if (!map[key]) {
      map[key] = {
        key,
        shift: a.isOff ? null : a.shift,
        isOff: !!a.isOff,
        sortOrder: a.isOff ? '99:99' : (a.shift?.shiftStart || '99:99'),
        items: [],
      }
    }
    map[key].items.push(a)
  }
  return Object.values(map).sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
}

const calendarShifts = computed(() => {
  if (!periodDetailData.value?.assignments) return []
  const map = {}
  for (const a of periodDetailData.value.assignments) {
    if (a.shift && !map[a.shift.id]) map[a.shift.id] = a.shift
  }
  return Object.values(map)
})

const loadPeriods = async (extra = {}) => {
  await fetchPeriods({ status: periodFilter.value.status || undefined, ...extra })
}

const openPeriodDetail = async (id) => {
  selectedPeriodId.value = id
  await fetchPeriodDetail(id)
  buildAssignRows()
}

const closePeriodDetail = () => {
  selectedPeriodId.value = null
  periodDetail.value = null
  loadPeriods()
}

// Create / Edit Period modal
const periodModal = ref(null)
const isEditingPeriod = ref(false)
const editingPeriodId = ref(null)
const periodForm = ref({ name: '', startDate: '', endDate: '', notes: '' })

const openCreatePeriod = () => {
  isEditingPeriod.value = false
  editingPeriodId.value = null
  periodForm.value = { name: '', startDate: '', endDate: '', notes: '' }
  periodModal.value?.showModal()
}

const openEditPeriod = (p) => {
  if (!p) return
  isEditingPeriod.value = true
  editingPeriodId.value = p.id
  periodForm.value = { name: p.name, startDate: p.startDate, endDate: p.endDate, notes: p.notes || '' }
  periodModal.value?.showModal()
}

const handleSavePeriod = async () => {
  try {
    const payload = {
      name: periodForm.value.name,
      startDate: periodForm.value.startDate,
      endDate: periodForm.value.endDate,
      notes: periodForm.value.notes || undefined,
    }
    if (isEditingPeriod.value) {
      await updatePeriod(editingPeriodId.value, payload)
      if (selectedPeriodId.value === editingPeriodId.value) await fetchPeriodDetail(editingPeriodId.value)
    } else {
      await createPeriod(payload)
    }
    periodModal.value?.close()
    loadPeriods()
  } catch { /* handled */ }
}

const handleChangeStatus = async (newStatus) => {
  if (!selectedPeriodId.value) return
  try {
    await updatePeriodStatus(selectedPeriodId.value, newStatus)
    await fetchPeriodDetail(selectedPeriodId.value)
    const idx = periods.value.findIndex((p) => p.id === selectedPeriodId.value)
    if (idx !== -1) periods.value[idx].status = newStatus
  } catch { /* handled */ }
}

const confirmDeletePeriod = (p) => {
  if (!p) return
  deleteTarget.value = { type: 'period', id: p.id, name: p.name }
  deleteTitle.value = 'Hapus Periode Jadwal?'
  deleteMessage.value = `Periode "${p.name}" dan SEMUA assignment di dalamnya akan dihapus permanen.`
  deleteModal.value?.showModal()
}

// Assign Staff modal
const assignStaffModal = ref(null)
const assignRows = ref([])

const assignSelectedCount = computed(() => assignRows.value.filter((r) => r.selected).length)
const assignAllSelected = computed(() => assignRows.value.length > 0 && assignRows.value.every((r) => r.selected))
const assignSomeSelected = computed(() => assignRows.value.some((r) => r.selected))

const buildAssignRows = () => {
  const existing = Object.fromEntries(assignRows.value.map((r) => [r.userId, r]))
  assignRows.value = staffList.value.map((u) => {
    const prev = existing[u.id]
    return {
      userId: u.id,
      name: u.name || '',
      employeeNo: u.employeeNo || '',
      selected: prev?.selected ?? true,
      shiftId: prev?.shiftId ?? '',
      offDays: prev?.offDays ? [...prev.offDays] : [0, 6],
    }
  })
}

const toggleAllAssign = () => {
  const val = !assignAllSelected.value
  assignRows.value.forEach((r) => { r.selected = val })
}

const openAssignStaffModal = () => {
  buildAssignRows()
  assignStaffModal.value?.showModal()
}

const handleAssignStaff = async () => {
  const selected = assignRows.value.filter((r) => r.selected && r.shiftId)
  if (!selected.length) return
  try {
    await assignStaffToPeriod(selectedPeriodId.value, {
      assignments: selected.map((r) => ({ employeeId: r.employeeNo, shiftId: r.shiftId, offDays: r.offDays })),
    })
    assignStaffModal.value?.close()
    await fetchPeriodDetail(selectedPeriodId.value)
  } catch { /* handled */ }
}

// Generate dari Template modal
const generateModal = ref(null)
const generateUserIds = ref([])

const openGenerateModal = () => {
  generateUserIds.value = []
  generateModal.value?.showModal()
}

const handleGenerate = async () => {
  try {
    const payload = generateUserIds.value.length ? { userIds: generateUserIds.value } : {}
    await generateFromTemplate(selectedPeriodId.value, payload)
    generateModal.value?.close()
    await fetchPeriodDetail(selectedPeriodId.value)
  } catch { /* handled */ }
}

const handleRemoveAssignment = async (assignment) => {
  try {
    await removePeriodAssignment(selectedPeriodId.value, assignment.id)
    await fetchPeriodDetail(selectedPeriodId.value)
  } catch { /* handled */ }
}

// ─── Date List Modal (lihat semua assignment) ─────────────────
const dateListModal = ref(null)
const dateListDate = ref('')
const dateListItems = ref([])

const openDateListModal = (dateStr, assignments) => {
  dateListDate.value = dateStr
  dateListItems.value = [...assignments]
  dateListModal.value?.showModal()
}

const handleRemoveDateListAssignment = async (assignment) => {
  try {
    await removePeriodAssignment(selectedPeriodId.value, assignment.id)
    await fetchPeriodDetail(selectedPeriodId.value)
    // Update list in-place
    dateListItems.value = dateListItems.value.filter(a => a.id !== assignment.id)
    if (dateListItems.value.length === 0) dateListModal.value?.close()
  } catch { /* handled */ }
}

// ─── Per-Date Assignment modal ─────────────────────────────────
const dateAssignModal = ref(null)
const dateAssignDate = ref('')
const dateAssignEntries = ref([])

// Existing assignments on the selected date
const dateAssignExisting = computed(() => {
  if (!periodDetailData.value?.byDate || !dateAssignDate.value) return []
  return periodDetailData.value.byDate[dateAssignDate.value] || []
})

// Filter staff list: exclude staff already assigned & already picked in other entries
const availableDateStaff = (currentIdx) => {
  const existingIds = dateAssignExisting.value.map(a => a.deviceEmployeeId || a.deviceEmployee?.id || a.userId)
  const pickedIds = dateAssignEntries.value
    .filter((_, i) => i !== currentIdx)
    .map(e => e.userId)
    .filter(Boolean)
  const excluded = new Set([...existingIds, ...pickedIds])
  return staffList.value.filter(u => !excluded.has(u.id))
}

const dateAssignValid = computed(() => {
  return dateAssignEntries.value.some(e => e.userId && (e.shiftId || e.isOff))
})

const openDateAssignModal = (dateStr) => {
  dateAssignDate.value = dateStr
  dateAssignEntries.value = [{ userId: '', shiftId: '', isOff: false }]
  dateAssignModal.value?.showModal()
}

const handleDateAssign = async () => {
  const valid = dateAssignEntries.value.filter(e => e.userId && (e.shiftId || e.isOff))
  if (!valid.length) return
  try {
    await assignStaffToPeriod(selectedPeriodId.value, {
      assignments: valid.map(e => {
        const staff = staffList.value.find(s => s.id === e.userId)
        return {
          employeeId: staff?.employeeNo || e.userId,
          dates: [{
            date: dateAssignDate.value,
            ...(e.isOff ? { isOff: true } : { shiftId: e.shiftId }),
          }],
        }
      }),
    })
    dateAssignModal.value?.close()
    await fetchPeriodDetail(selectedPeriodId.value)
  } catch { /* handled */ }
}

const handleRemoveDateAssignment = async (assignment) => {
  try {
    await removePeriodAssignment(selectedPeriodId.value, assignment.id)
    await fetchPeriodDetail(selectedPeriodId.value)
  } catch { /* handled */ }
}

// ─── Master Shift tab ──────────────────────────────────────────

const shiftModal = ref(null)
const editingShift = ref(null)
const defaultShiftForm = () => ({ name: '', code: '', shiftStart: '08:00', shiftEnd: '16:00', color: '#4CAF50', isActive: true })
const shiftForm = ref(defaultShiftForm())

const openAddShift = () => {
  editingShift.value = null
  shiftForm.value = defaultShiftForm()
  shiftModal.value?.showModal()
}

const openEditShift = (shift) => {
  editingShift.value = shift
  shiftForm.value = {
    name: shift.name,
    code: shift.code || '',
    shiftStart: formatTime(shift.shiftStart) || '08:00',
    shiftEnd: formatTime(shift.shiftEnd) || '16:00',
    color: shift.color || '#888888',
    isActive: shift.isActive ?? true,
  }
  shiftModal.value?.showModal()
}

const handleSaveShift = async () => {
  const toTime = (t) => (t && t.length === 5 ? `${t}:00` : t)
  const payload = {
    name: shiftForm.value.name,
    code: shiftForm.value.code || undefined,
    shiftStart: toTime(shiftForm.value.shiftStart),
    shiftEnd: toTime(shiftForm.value.shiftEnd),
    color: shiftForm.value.color || undefined,
  }
  if (editingShift.value) payload.isActive = shiftForm.value.isActive
  try {
    if (editingShift.value) {
      await updateShift(editingShift.value.id, payload)
    } else {
      await createShift(payload)
    }
    shiftModal.value?.close()
    await fetchShifts()
  } catch { /* handled in composable */ }
}

const confirmDeleteShift = (shift) => {
  deleteTarget.value = { type: 'shift', id: shift.id, name: shift.name }
  deleteTitle.value = 'Hapus Shift?'
  deleteMessage.value = `Shift "${shift.name}" akan dihapus permanen. Pastikan shift ini tidak digunakan di jadwal karyawan.`
  deleteModal.value?.showModal()
}

// ─── Tab 1: Presets ─────────────────────────────────────────────

const presetModal = ref(null)
const isEditingPreset = ref(false)
const editPresetId = ref(null)
const presetForm = ref({ name: '', description: '', schedules: makeDefaultSchedules() })

const openCreatePreset = () => {
  isEditingPreset.value = false
  editPresetId.value = null
  presetForm.value = { name: '', description: '', schedules: makeDefaultSchedules() }
  presetModal.value?.showModal()
}

const openEditPreset = (p) => {
  isEditingPreset.value = true
  editPresetId.value = p.id
  presetForm.value = {
    name: p.name,
    description: p.description || '',
    schedules: JSON.parse(JSON.stringify(p.schedules)),
  }
  presetModal.value?.showModal()
}

const openDuplicatePreset = (p) => {
  isEditingPreset.value = false
  editPresetId.value = null
  presetForm.value = {
    name: p.name + ' (Copy)',
    description: p.description || '',
    schedules: JSON.parse(JSON.stringify(p.schedules)),
  }
  presetModal.value?.showModal()
}

const handleSavePreset = () => {
  if (isEditingPreset.value) {
    updatePresetFn(editPresetId.value, {
      name: presetForm.value.name,
      description: presetForm.value.description,
      schedules: presetForm.value.schedules,
    })
  } else {
    createPreset(presetForm.value)
  }
  presetModal.value?.close()
}

const quickFill = (start, end) => {
  presetForm.value.schedules.forEach((s) => {
    if (s.dayOfWeek >= 1 && s.dayOfWeek <= 5) {
      s.isOff = false
      s.shiftStart = start
      s.shiftEnd = end
    }
  })
}
const quickFillAllOff = () => {
  presetForm.value.schedules.forEach((s) => {
    s.isOff = true
    s.shiftStart = null
    s.shiftEnd = null
  })
}

const confirmDeletePreset = (p) => {
  deleteTarget.value = { type: 'preset', id: p.id }
  deleteTitle.value = 'Hapus Template?'
  deleteMessage.value = `Template "${p.name}" akan dihapus permanen. Karyawan yang sudah menggunakan template ini tidak akan terpengaruh.`
  deleteModal.value?.showModal()
}

// ─── Tab 2: Assign ─────────────────────────────────────────────

const assignMode = ref('shift') // 'shift' | 'template'

// ─── Via Shift (per-day-of-week model) ─────────────────────────

const shiftAssignRange = ref({ startDate: '', endDate: '' })
const shiftAssignRows = ref([]) // [{ userId, ..., selected, dayShifts: {0:'',1:'',...,6:''} }]
const bulkShiftId = ref('')
const bulkApplyDays = ref([1, 2, 3, 4, 5]) // default Sen-Jum

const activeShifts = computed(() => shifts.value.filter(s => s.isActive !== false))

const shiftAssignRangeDays = computed(() => {
  if (!shiftAssignRange.value.startDate || !shiftAssignRange.value.endDate) return null
  const diff = Math.round(
    (new Date(shiftAssignRange.value.endDate) - new Date(shiftAssignRange.value.startDate)) / 86400000
  ) + 1
  return diff
})

const shiftAssignSelectedCount = computed(() => shiftAssignRows.value.filter(r => r.selected).length)
const shiftAssignAllSelected = computed(() => shiftAssignRows.value.length > 0 && shiftAssignRows.value.every(r => r.selected))
const shiftAssignSomeSelected = computed(() => shiftAssignRows.value.some(r => r.selected))

const buildShiftAssignRows = () => {
  const blankDay = () => ({ 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' })
  const existing = Object.fromEntries(shiftAssignRows.value.map(r => [r.userId, r]))
  shiftAssignRows.value = staffList.value.map(u => {
    const prev = existing[u.id]
    return {
      userId: u.id,
      name: u.name || '',
      employeeNo: u.employeeNo || '',
      selected: prev?.selected ?? true,
      dayShifts: prev?.dayShifts ? { ...prev.dayShifts } : blankDay(),
    }
  })
}

const toggleAllShiftAssign = () => {
  const val = !shiftAssignAllSelected.value
  shiftAssignRows.value.forEach(r => { r.selected = val })
}

// Terapkan shift yang dipilih ke hari-hari yang dicentang, untuk semua row yang ditandai
const applyBulkFill = () => {
  shiftAssignRows.value.forEach(r => {
    if (!r.selected) return
    bulkApplyDays.value.forEach(d => {
      r.dayShifts[d] = bulkShiftId.value
    })
  })
}

const handleAssignShifts = async () => {
  const selected = shiftAssignRows.value.filter(r => r.selected)
  if (!selected.length) return
  const payload = {
    startDate: shiftAssignRange.value.startDate,
    endDate: shiftAssignRange.value.endDate,
    // dayShifts: { 0: shiftId|'', ..., 6: shiftId|'' } — nilai '' berarti libur hari tsb
    assignments: selected.map(r => ({
      employeeId: r.employeeNo,
      dayShifts: { ...r.dayShifts },
    })),
  }
  try {
    await assignShifts(payload)
    loadSchedules()
  } catch { /* handled in composable */ }
}

// ─── Via Template ───────────────────────────────────────────────

const assignForm = ref({ presetId: '', userIds: [] })

const selectedPresetPreview = computed(() => {
  if (!assignForm.value.presetId) return null
  return presets.value.find((p) => p.id === assignForm.value.presetId)
})

const selectAllStaff = () => {
  assignForm.value.userIds = staffList.value.map((u) => u.id)
}

const handleApplyPreset = async () => {
  await applyPresetToUsers(assignForm.value.presetId, assignForm.value.userIds)
  assignForm.value.userIds = []
  loadTemplates()
}

const groupedTemplates = computed(() => {
  const map = {}
  for (const t of templates.value) {
    const uid = t.deviceEmployeeId || t.userId || t.deviceEmployee?.id || t.user?.id
    if (!uid) continue
    if (!map[uid]) map[uid] = { userId: uid, deviceEmployee: t.deviceEmployee, user: t.user, days: {} }
    if (t.dayOfWeek !== undefined && t.dayOfWeek !== null) {
      map[uid].days[t.dayOfWeek] = t
    }
  }
  return Object.values(map)
})

const confirmDeleteUserTemplates = (group) => {
  deleteTarget.value = { type: 'userTemplates', userId: group.userId, user: group.user }
  deleteTitle.value = 'Hapus Semua Template Jadwal?'
  deleteMessage.value = `Semua template jadwal untuk ${group.deviceEmployee?.name || group.user?.name || [group.user?.firstName, group.user?.lastName].filter(Boolean).join(' ') || ''} akan dihapus.`
  deleteModal.value?.showModal()
}

// ─── Tab 3: Jadwal Karyawan ─────────────────────────────────────

const schedFilters = ref({ userId: '', startDate: '', endDate: '', isOff: '' })

const loadSchedules = () => {
  fetchSchedules({
    userId: schedFilters.value.userId || undefined,
    startDate: schedFilters.value.startDate || undefined,
    endDate: schedFilters.value.endDate || undefined,
    isOff: schedFilters.value.isOff !== '' ? schedFilters.value.isOff : undefined,
  })
}

const handleExport = () => {
  downloadExcel({
    userId: schedFilters.value.userId || undefined,
    startDate: schedFilters.value.startDate || undefined,
    endDate: schedFilters.value.endDate || undefined,
    isOff: schedFilters.value.isOff !== '' ? schedFilters.value.isOff : undefined,
  })
}

const loadTemplates = () => {
  fetchTemplates()
}

const goToPage = (page) => {
  fetchSchedules({
    userId: schedFilters.value.userId || undefined,
    startDate: schedFilters.value.startDate || undefined,
    endDate: schedFilters.value.endDate || undefined,
    isOff: schedFilters.value.isOff !== '' ? schedFilters.value.isOff : undefined,
    page,
  })
}

const scheduleModal = ref(null)
const isEditingSchedule = ref(false)
const editSchedId = ref(null)
const schedForm = ref({ userId: '', dayOfWeek: null, date: '', isOff: false, shiftStart: '08:00', shiftEnd: '17:00', notes: '' })

const openCreateSchedule = () => {
  isEditingSchedule.value = false
  editSchedId.value = null
  schedForm.value = { userId: '', dayOfWeek: null, date: '', isOff: false, shiftStart: '08:00', shiftEnd: '17:00', notes: '' }
  scheduleModal.value?.showModal()
}

const openEditSchedule = (s) => {
  isEditingSchedule.value = true
  editSchedId.value = s.id
  schedForm.value = {
    userId: s.userId || s.user?.id || '',
    dayOfWeek: s.dayOfWeek ?? null,
    date: s.date || '',
    isOff: !!s.isOff,
    shiftStart: formatTime(s.shiftStart) || '08:00',
    shiftEnd: formatTime(s.shiftEnd) || '17:00',
    notes: s.notes || '',
  }
  scheduleModal.value?.showModal()
}

const handleSaveSchedule = async () => {
  try {
    const data = {
      userId: schedForm.value.userId,
      isOff: schedForm.value.isOff,
      notes: schedForm.value.notes || null,
    }
    if (schedForm.value.dayOfWeek !== null) data.dayOfWeek = schedForm.value.dayOfWeek
    if (schedForm.value.date) data.date = schedForm.value.date
    if (!schedForm.value.isOff) {
      data.shiftStart = schedForm.value.shiftStart
      data.shiftEnd = schedForm.value.shiftEnd
    }
    if (isEditingSchedule.value) {
      await updateSchedule(editSchedId.value, data)
    } else {
      await createSchedule(data)
    }
    scheduleModal.value?.close()
    loadSchedules()
  } catch { /* handled in composable */ }
}

const confirmDeleteSchedule = (s) => {
  deleteTarget.value = { type: 'schedule', id: s.id }
  deleteTitle.value = 'Hapus Jadwal?'
  const who = s.deviceEmployee?.name || (s.user ? (s.user.name || `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim()) : s.deviceEmployeeId || s.userId)
  const day = s.dayOfWeek !== undefined && s.dayOfWeek !== null ? getDayLabel(s.dayOfWeek) : s.date || ''
  deleteMessage.value = `Jadwal ${day} untuk ${who} akan dihapus.`
  deleteModal.value?.showModal()
}

// ─── Shared Delete ──────────────────────────────────────────────

const deleteModal = ref(null)
const deleteTarget = ref(null)
const deleteTitle = ref('')
const deleteMessage = ref('')

const handleDelete = async () => {
  try {
    const t = deleteTarget.value
    if (t.type === 'shift') {
      await deleteShift(t.id)
      await fetchShifts()
    } else if (t.type === 'preset') {
      deletePresetFn(t.id)
    } else if (t.type === 'period') {
      await deletePeriod(t.id)
      if (selectedPeriodId.value === t.id) {
        selectedPeriodId.value = null
        periodDetail.value = null
      }
      loadPeriods()
    } else if (t.type === 'userTemplates') {
      await deleteUserTemplates(t.userId)
      loadTemplates()
    } else if (t.type === 'userSchedules') {
      await deleteUserSchedules(t.userId)
      loadSchedules()
    } else if (t.type === 'schedule') {
      await deleteSchedule(t.id)
      loadSchedules()
    }
    deleteModal.value?.close()
  } catch { /* handled */ }
}

// ─── Init ───────────────────────────────────────────────────────

onMounted(() => {
  loadPeriods()
  loadPresets()
  loadStaff({ status: 'active' }).then(() => {
    buildShiftAssignRows()
    buildAssignRows()
  })
  loadTemplates()
  loadSchedules()
  fetchShifts()
})
</script>
