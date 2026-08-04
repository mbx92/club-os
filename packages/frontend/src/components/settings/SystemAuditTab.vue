<template>
  <div class="space-y-6">
    <!-- Features Management Card - Super Admin Only -->
    <div v-if="isSuperAdmin" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconSettings class="w-8 h-8 text-primary" />
            <div>
              <h2 class="card-title">Feature Metadata</h2>
              <p class="text-sm text-base-content/70">
                View all available features, limits, and plan configurations
              </p>
            </div>
          </div>
          
          <button
            class="btn btn-primary btn-sm gap-2"
            @click="openMetadataCanvas"
          >
            <IconEye class="w-4 h-4" />
            View Metadata
          </button>
        </div>
        
        <!-- Quick Stats -->
        <div v-if="hasMetadata" class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div class="stat bg-base-200 rounded-lg p-4">
            <div class="stat-figure text-primary">
              <IconPackage class="w-8 h-8" />
            </div>
            <div class="stat-title text-xs">Total Features</div>
            <div class="stat-value text-2xl">{{ totalFeatures }}</div>
          </div>
          
          <div class="stat bg-base-200 rounded-lg p-4">
            <div class="stat-figure text-secondary">
              <IconCategory class="w-8 h-8" />
            </div>
            <div class="stat-title text-xs">Categories</div>
            <div class="stat-value text-2xl">{{ totalCategories }}</div>
          </div>
          
          <div class="stat bg-base-200 rounded-lg p-4">
            <div class="stat-figure text-accent">
              <IconToggleLeft class="w-8 h-8" />
            </div>
            <div class="stat-title text-xs">Boolean Features</div>
            <div class="stat-value text-2xl">{{ booleanFeatures }}</div>
          </div>
          
          <div class="stat bg-base-200 rounded-lg p-4">
            <div class="stat-figure text-info">
              <IconNumbers class="w-8 h-8" />
            </div>
            <div class="stat-title text-xs">Numeric Limits</div>
            <div class="stat-value text-2xl">{{ numericFeatures }}</div>
          </div>
        </div>
        
        <div v-else class="alert alert-info mt-4">
          <IconInfoCircle class="w-5 h-5" />
          <span>Click "View Metadata" to load and explore available features</span>
        </div>
      </div>
    </div>
    
    <!-- System Information Card - Super Admin Only -->
    <div v-if="isSuperAdmin" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center gap-3 mb-4">
          <IconChartBar class="w-8 h-8 text-secondary" />
          <div>
            <h2 class="card-title">System Information</h2>
            <p class="text-sm text-base-content/70">
              Application version and environment details
            </p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <div class="flex justify-between p-3 bg-base-200 rounded-lg">
              <span class="text-sm font-medium">Environment:</span>
              <span class="text-sm badge" :class="isDev ? 'badge-warning' : 'badge-success'">
                {{ isDev ? 'Development' : 'Production' }}
              </span>
            </div>
            
            <div class="flex justify-between p-3 bg-base-200 rounded-lg">
              <span class="text-sm font-medium">Version:</span>
              <span class="text-sm badge badge-neutral">v1.0.0</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="flex justify-between p-3 bg-base-200 rounded-lg">
              <span class="text-sm font-medium">Framework:</span>
              <span class="text-sm">Vue 3</span>
            </div>
            
            <div class="flex justify-between p-3 bg-base-200 rounded-lg">
              <span class="text-sm font-medium">Build Tool:</span>
              <span class="text-sm">Vite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Database Backup & Restore Card - Admin & Super Admin -->
    <div v-if="canAccessDatabaseBackup" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconDatabase class="w-8 h-8 text-success" />
            <div>
              <h2 class="card-title">Database Backup & Restore</h2>
              <p class="text-sm text-base-content/70">
                Secure your production data with automated backup management
              </p>
            </div>
          </div>
          
          <button
            class="btn btn-success btn-sm gap-2"
            @click="openDatabaseBackupCanvas"
          >
            <IconDatabaseExport class="w-4 h-4" />
            Manage Backups
          </button>
        </div>
        
        <div class="alert alert-info">
          <IconInfoCircle class="w-5 h-5" />
          <div>
            <p class="text-sm">Click "Manage Backups" to create database backups, download backup files, and manage data protection for your system</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Audit Log Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconClipboardList class="w-8 h-8 text-accent" />
            <div>
              <h2 class="card-title">Audit Log</h2>
              <p class="text-sm text-base-content/70">
                Track system activities and user actions
              </p>
            </div>
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="btn btn-success btn-sm gap-2"
              @click="openAttendanceRegenerationCanvas"
            >
              <IconRefresh class="w-4 h-4" />
              Generate Attendance
            </button>
            <button
              class="btn btn-warning btn-sm gap-2"
              @click="openOvernightAuditCanvas"
            >
              <IconMoon class="w-4 h-4" />
              Audit Shift Malam
            </button>
            <button
              class="btn btn-secondary btn-sm gap-2"
              @click="openAccountBalanceRecalculateCanvas"
            >
              <IconCalculator class="w-4 h-4" />
              Recalculate Saldo
            </button>
            <button
              class="btn btn-warning btn-sm gap-2"
              @click="openAdjustmentAuditCanvas"
            >
              <IconReceipt2 class="w-4 h-4" />
              Audit Penyesuaian Manual
            </button>
            <button
              class="btn btn-primary btn-sm gap-2"
              @click="openAuditLogCanvas"
            >
              <IconFileAnalytics class="w-4 h-4" />
              View Logs
            </button>
          </div>
        </div>

        <div class="alert alert-info">
          <IconInfoCircle class="w-5 h-5" />
          <div>
            <p class="text-sm">Click "View Logs" to access comprehensive audit trail with filtering, statistics, and export capabilities</p>
            <p class="text-xs mt-1 opacity-80">Menu <strong>Audit Shift Malam</strong> untuk fix overnight. <strong>Recalculate Saldo</strong> untuk sync balance akun = saldo awal + mutasi (setelah inject openingBalance). <strong>Audit Penyesuaian Manual</strong> untuk cek/balik koreksi manual yang mungkin dibuat menambal selisih laporan akun.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Hikvision Duplicate Employee Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconCopy class="w-8 h-8 text-warning" />
            <div>
              <h2 class="card-title">Duplikat Device Employee</h2>
              <p class="text-sm text-base-content/70">
                Deteksi & gabungkan record Device Employee yang duplikat (nama/user sama)
              </p>
            </div>
          </div>
          <button
            class="btn btn-warning btn-sm gap-2"
            @click="openDuplicateCanvas"
          >
            <IconSearch class="w-4 h-4" />
            Cek Duplikat
          </button>
        </div>
        <div class="alert alert-warning alert-soft text-sm">
          <IconInfoCircle class="w-5 h-5 shrink-0" />
          <span>Jika karyawan tampil <em>absent</em> padahal sudah tap, kemungkinan ada dua record DeviceEmployee untuk orang yang sama. Gunakan fitur ini untuk mendeteksi dan merge duplikat tersebut.</span>
        </div>
      </div>
    </div>

    <!-- Smart Fix CheckIn/CheckOut Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconTool class="w-8 h-8 text-warning" />
            <div>
              <h2 class="card-title">Smart Fix CheckIn / CheckOut</h2>
              <p class="text-sm text-base-content/70">
                Deteksi & perbaiki tap yang tersimpan di field yang salah berdasarkan kedekatan waktu ke shift
              </p>
            </div>
          </div>
          <button
            class="btn btn-warning btn-sm gap-2"
            @click="openSmartFixCanvas"
          >
            <IconTool class="w-4 h-4" />
            Fix Data
          </button>
        </div>
        <div class="alert alert-warning alert-soft text-sm">
          <IconInfoCircle class="w-5 h-5 shrink-0" />
          <span>Jika karyawan punya <em>checkIn</em> yang sebenarnya adalah tap pulang (dekat shiftEnd), gunakan fitur ini untuk mendeteksi dan memperbaikinya. Selalu jalankan <strong>Preview</strong> terlebih dahulu.</span>
        </div>
      </div>
    </div>

    <!-- Diagnose & Fix Cash Register Report Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <IconCashRegister class="w-8 h-8 text-error" />
            <div>
              <h2 class="card-title">Diagnose &amp; Fix Cash Register Report</h2>
              <p class="text-sm text-base-content/70">
                Sesi kas yang selisihnya minus — kemungkinan ada transaksi split/merged yang belum terhitung
              </p>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm gap-2" :disabled="crLoading" @click="loadDeficitSessions">
            <span v-if="crLoading" class="loading loading-spinner loading-xs"></span>
            <IconRefresh v-else class="w-4 h-4" />
            Refresh
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="crLoading" class="flex justify-center py-6">
          <span class="loading loading-spinner loading-md text-error"></span>
        </div>

        <!-- Empty state -->
        <div v-else-if="deficitSessions.length === 0" class="alert alert-success">
          <IconCircleCheck class="w-5 h-5" />
          <span>Tidak ada sesi kas dengan selisih minus 30 hari terakhir.</span>
        </div>

        <!-- Session list -->
        <div v-else class="space-y-2">
          <div
            v-for="s in deficitSessions"
            :key="s.id"
            class="flex items-center justify-between p-3 bg-error/5 border border-error/20 rounded-lg"
          >
            <div class="text-sm">
              <div class="font-semibold">{{ s.shiftName }} — {{ s.shiftDate }}</div>
              <div class="text-base-content/60 text-xs mt-0.5 font-mono">{{ s.id }}</div>
              <div class="text-error font-medium text-xs mt-1">Selisih: {{ formatCurrency(s.difference) }}</div>
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-warning btn-sm gap-2"
                :disabled="recalcLoading && recalcSessionId === s.id"
                @click="runRecalculate(s.id)"
              >
                <span v-if="recalcLoading && recalcSessionId === s.id" class="loading loading-spinner loading-xs"></span>
                <IconCalculator v-else class="w-4 h-4" />
                Recalculate Cash
              </button>
              <button
                class="btn btn-error btn-sm gap-2"
                :disabled="diagnoseLoading && diagnoseSessionId === s.id"
                @click="runDiagnose(s.id)"
              >
                <span v-if="diagnoseLoading && diagnoseSessionId === s.id" class="loading loading-spinner loading-xs"></span>
                <IconSearch v-else class="w-4 h-4" />
                Diagnose
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Diagnose Result Modal -->
  <dialog ref="diagnoseModal" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg flex items-center gap-2 mb-4">
        <template v-if="diagnoseResult?.diagnosis?.hasDiscrepancy">
          <IconAlertTriangle class="w-5 h-5 text-warning" />
          ⚠ Selisih Ditemukan
        </template>
        <template v-else>
          <IconCircleCheck class="w-5 h-5 text-success" />
          ✅ Data Report Sudah Benar
        </template>
      </h3>

      <template v-if="diagnoseResult">
        <!-- Session info -->
        <div v-if="diagnoseResult.session" class="bg-base-200 rounded-lg p-3 mb-4 text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-base-content/60">Shift</span>
            <span class="font-medium">{{ diagnoseResult.session.shiftName }} — {{ diagnoseResult.session.shiftDate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">Status</span>
            <span class="badge badge-sm" :class="diagnoseResult.session.status === 'closed' ? 'badge-success' : 'badge-warning'">{{ diagnoseResult.session.status }}</span>
          </div>
        </div>

        <!-- No discrepancy -->
        <div v-if="!diagnoseResult.diagnosis?.hasDiscrepancy" class="alert alert-success">
          <IconCircleCheck class="w-5 h-5" />
          <span>Tidak ada transaksi split/merged yang belum terhitung. Data laporan sudah benar.</span>
        </div>

        <!-- Has discrepancy -->
        <template v-else>
          <div class="mb-4">
            <p class="text-sm font-semibold mb-2">Transaksi yang belum dihitung ({{ diagnoseResult.diagnosis.splitMergedCount }}):</p>
            <div class="space-y-3">
              <div
                v-for="tx in diagnoseResult.diagnosis.splitMergedTransactions"
                :key="tx.id"
                class="bg-base-200 rounded-lg p-3 text-sm"
              >
                <div class="flex justify-between font-medium">
                  <span>{{ tx.transactionNumber }}</span>
                  <span class="badge badge-warning badge-sm">{{ tx.status }}</span>
                </div>
                <div class="flex justify-between text-base-content/70 mt-1">
                  <span>Total</span>
                  <span>{{ formatCurrency(tx.totalAmount) }}</span>
                </div>
                <!-- editable payment rows -->
                <div
                  v-for="p in getPaymentRows(tx)"
                  :key="p.paymentId || p.paymentMethod"
                  class="mt-2 pt-2 border-t border-base-300"
                >
                  <div class="flex items-center gap-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-1 text-xs text-base-content/60 mb-1">
                        <span class="badge badge-xs badge-ghost">sekarang</span>
                        <span class="font-mono font-medium">{{ p.paymentMethod }}</span>
                        <span>{{ formatCurrency(p.amount) }}</span>
                      </div>
                      <div class="flex gap-1">
                        <select
                          v-model="p.newMethod"
                          class="select select-xs select-bordered flex-1"
                        >
                          <option value="">— tidak diubah —</option>
                          <option v-for="m in paymentMethodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                        </select>
                        <input
                          v-if="p.newMethod"
                          v-model="p.reason"
                          type="text"
                          class="input input-xs input-bordered w-40"
                          placeholder="Alasan (opsional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Correct Payment Result -->
          <div v-if="correctPaymentResult" class="mb-4">
            <div v-if="correctPaymentResult.corrected > 0" class="alert alert-success text-sm">
              <IconCircleCheck class="w-4 h-4" />
              <span>{{ correctPaymentResult.corrected }} payment berhasil dikoreksi. Menjalankan apply fix...</span>
            </div>
            <div v-if="correctPaymentResult.failed > 0" class="alert alert-error text-sm mt-1">
              <IconAlertTriangle class="w-4 h-4" />
              <span>{{ correctPaymentResult.failed }} payment gagal: {{ (correctPaymentResult.errors || []).map(e => e.message).join(', ') }}</span>
            </div>
          </div>

          <!-- Comparison -->
          <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div class="bg-error/10 rounded-lg p-3 space-y-1">
              <p class="font-semibold text-error text-xs uppercase tracking-wide mb-2">Tersimpan (lama)</p>
              <div class="flex justify-between"><span class="text-base-content/60">Selisih</span><span class="font-medium text-error">{{ formatCurrency(diagnoseResult.stored?.difference) }}</span></div>
              <div class="flex justify-between"><span class="text-base-content/60">Closing Balance</span><span>{{ formatCurrency(diagnoseResult.stored?.closingBalance) }}</span></div>
            </div>
            <div class="bg-success/10 rounded-lg p-3 space-y-1">
              <p class="font-semibold text-success text-xs uppercase tracking-wide mb-2">Koreksi (baru)</p>
              <div class="flex justify-between"><span class="text-base-content/60">Selisih</span><span class="font-medium text-success">{{ formatCurrency(diagnoseResult.corrected?.difference) }}</span></div>
              <div class="flex justify-between"><span class="text-base-content/60">Q_totalCash</span><span class="font-medium text-primary">{{ formatCurrency(diagnoseResult.corrected?.Q_totalCash) }}</span></div>
              <div class="flex justify-between"><span class="text-base-content/60">Closing Balance</span><span>{{ formatCurrency(diagnoseResult.corrected?.closingBalance) }}</span></div>
            </div>
          </div>
        </template>

        <!-- Applied badge -->
        <div v-if="diagnoseResult.fixed" class="alert alert-success mt-2">
          <IconCircleCheck class="w-5 h-5" />
          <span>Koreksi berhasil diterapkan. Silakan refresh halaman report untuk melihat perubahan.</span>
        </div>
      </template>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeDiagnoseModal">Tutup</button>
        <button
          v-if="diagnoseResult?.diagnosis?.hasDiscrepancy && !diagnoseResult?.fixed && hasPaymentCorrections"
          class="btn btn-warning gap-2"
          :disabled="correctPaymentLoading"
          @click="applyPaymentCorrections"
        >
          <span v-if="correctPaymentLoading" class="loading loading-spinner loading-xs"></span>
          <IconPencil v-else class="w-4 h-4" />
          Koreksi Payment ({{ pendingCorrectionCount }})
        </button>
        <button
          v-if="diagnoseResult?.diagnosis?.hasDiscrepancy && !diagnoseResult?.fixed"
          class="btn btn-error gap-2"
          :disabled="applyFixLoading"
          @click="applyFix"
        >
          <span v-if="applyFixLoading" class="loading loading-spinner loading-xs"></span>
          <IconTool v-else class="w-4 h-4" />
          Apply Koreksi
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button @click="closeDiagnoseModal">close</button></form>
  </dialog>

  <!-- Recalculate Cash Modal -->
  <dialog ref="recalcModal" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg flex items-center gap-2 mb-1">
        <IconCalculator class="w-5 h-5 text-warning" />
        Recalculate Cash dari Payment Method
      </h3>
      <p class="text-sm text-base-content/60 mb-4">Hitung ulang Q_totalCash berdasarkan semua pembayaran tunai yang tercatat pada transaksi di sesi ini.</p>

      <template v-if="recalcResult">
        <!-- Session info -->
        <div v-if="recalcResult.session" class="bg-base-200 rounded-lg p-3 mb-4 text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-base-content/60">Shift</span>
            <span class="font-medium">{{ recalcResult.session.shiftName }} — {{ recalcResult.session.shiftDate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">Status</span>
            <span class="badge badge-sm" :class="recalcResult.session.status === 'closed' ? 'badge-success' : 'badge-warning'">{{ recalcResult.session.status }}</span>
          </div>
        </div>

        <!-- Payment methods breakdown -->
        <div v-if="recalcResult.paymentBreakdown" class="mb-4">
          <p class="text-sm font-semibold mb-2">Breakdown Pembayaran:</p>
          <div class="space-y-1">
            <div
              v-for="(amount, method) in recalcResult.paymentBreakdown"
              :key="method"
              class="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
              :class="method === 'cash' ? 'bg-success/10 font-medium' : 'bg-base-200'"
            >
              <span class="capitalize">{{ method === 'cash' ? '💵 Tunai (Cash)' : method.replace(/_/g, ' ').toUpperCase() }}</span>
              <span :class="method === 'cash' ? 'text-success' : ''">{{ formatCurrency(amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Before / After comparison -->
        <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div class="bg-error/10 rounded-lg p-3 space-y-1">
            <p class="font-semibold text-error text-xs uppercase tracking-wide mb-2">Tersimpan (lama)</p>
            <div class="flex justify-between"><span class="text-base-content/60">Q_totalCash</span><span class="font-medium text-error">{{ formatCurrency(recalcResult.stored?.Q_totalCash ?? recalcResult.stored?.closingBalance) }}</span></div>
            <div class="flex justify-between"><span class="text-base-content/60">Selisih</span><span>{{ formatCurrency(recalcResult.stored?.difference) }}</span></div>
          </div>
          <div class="bg-success/10 rounded-lg p-3 space-y-1">
            <p class="font-semibold text-success text-xs uppercase tracking-wide mb-2">Koreksi (baru)</p>
            <div class="flex justify-between"><span class="text-base-content/60">Q_totalCash</span><span class="font-medium text-success">{{ formatCurrency(recalcResult.corrected?.Q_totalCash) }}</span></div>
            <div class="flex justify-between"><span class="text-base-content/60">Selisih</span><span>{{ formatCurrency(recalcResult.corrected?.difference) }}</span></div>
            <div class="flex justify-between"><span class="text-base-content/60">Closing Balance</span><span>{{ formatCurrency(recalcResult.corrected?.closingBalance) }}</span></div>
          </div>
        </div>

        <!-- Applied badge -->
        <div v-if="recalcResult.fixed" class="alert alert-success">
          <IconCircleCheck class="w-5 h-5" />
          <span>Recalculate cash berhasil diterapkan. Refresh halaman report untuk melihat perubahan.</span>
        </div>

        <!-- No change needed -->
        <div v-else-if="recalcResult.noChange" class="alert alert-info">
          <IconCircleCheck class="w-5 h-5" />
          <span>Tidak ada perubahan yang diperlukan — data cash sudah benar.</span>
        </div>
      </template>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeRecalcModal">Tutup</button>
        <button
          v-if="recalcResult && !recalcResult.fixed && !recalcResult.noChange"
          class="btn btn-warning gap-2"
          :disabled="applyRecalcLoading"
          @click="applyRecalculate"
        >
          <span v-if="applyRecalcLoading" class="loading loading-spinner loading-xs"></span>
          <IconCalculator v-else class="w-4 h-4" />
          Apply Recalculate
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button @click="closeRecalcModal">close</button></form>
  </dialog>

  <!-- Features Metadata Canvas -->
  <FeaturesMetadataCanvas
    v-model="showMetadataCanvas"
    @close="closeMetadataCanvas"
  />
  
  <!-- Database Backup Canvas -->
  <DatabaseBackupCanvas
    v-model="showDatabaseBackupCanvas"
    @close="closeDatabaseBackupCanvas"
  />
  
  <!-- Audit Log Canvas -->
  <AuditLogCanvas
    v-model="showAuditLogCanvas"
    @close="closeAuditLogCanvas"
  />

  <!-- Device Employee Duplicate Canvas -->
  <DeviceEmployeeDuplicateCanvas
    v-model="showDuplicateCanvas"
    @close="closeDuplicateCanvas"
  />

  <!-- Smart Fix CheckIn Canvas -->
  <SmartFixCheckInCanvas
    v-model="showSmartFixCanvas"
    @close="closeSmartFixCanvas"
  />

  <!-- Overnight Shift Audit Canvas -->
  <OvernightShiftAuditCanvas
    v-model="showOvernightAuditCanvas"
    @close="closeOvernightAuditCanvas"
  />

  <!-- Attendance Regeneration Canvas -->
  <AttendanceRegenerationCanvas
    v-model="showAttendanceRegenerationCanvas"
    @close="closeAttendanceRegenerationCanvas"
  />

  <!-- Account Balance Recalculate Canvas -->
  <AccountBalanceRecalculateCanvas
    v-model="showAccountBalanceRecalculateCanvas"
    @close="closeAccountBalanceRecalculateCanvas"
  />

  <!-- Adjustment Audit Canvas -->
  <AdjustmentAuditCanvas
    v-model="showAdjustmentAuditCanvas"
    @close="closeAdjustmentAuditCanvas"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFeatureMetadata } from '@/composables/subscription/useFeatureMetadata'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/plugins/api'
import { useCashRegister } from '@/composables/gym/cash-register'
import dayjs from 'dayjs'
import FeaturesMetadataCanvas from '@/components/settings/FeaturesMetadataCanvas.vue'
import DatabaseBackupCanvas from '@/components/settings/DatabaseBackupCanvas.vue'
import AuditLogCanvas from '@/components/settings/AuditLogCanvas.vue'
import DeviceEmployeeDuplicateCanvas from '@/components/settings/DeviceEmployeeDuplicateCanvas.vue'
import SmartFixCheckInCanvas from '@/components/settings/SmartFixCheckInCanvas.vue'
import OvernightShiftAuditCanvas from '@/components/settings/OvernightShiftAuditCanvas.vue'
import AttendanceRegenerationCanvas from '@/components/settings/AttendanceRegenerationCanvas.vue'
import AccountBalanceRecalculateCanvas from '@/components/settings/AccountBalanceRecalculateCanvas.vue'
import AdjustmentAuditCanvas from '@/components/settings/AdjustmentAuditCanvas.vue'
import {
  IconEye,
  IconPackage,
  IconCategory,
  IconToggleLeft,
  IconNumbers,
  IconInfoCircle,
  IconClock,
  IconSettings,
  IconChartBar,
  IconClipboardList,
  IconFileAnalytics,
  IconDatabase,
  IconDatabaseExport,
  IconCopy,
  IconSearch,
  IconTool,
  IconCashRegister,
  IconAlertTriangle,
  IconCircleCheck,
  IconRefresh,
  IconCalculator,
  IconPencil,
  IconMoon,
  IconReceipt2,
} from '@tabler/icons-vue'

const isDev = import.meta.env.DEV

// Auth store
const authStore = useAuthStore()

// Check if user is super admin
const isSuperAdmin = computed(() => {
  return authStore.user?.isSuperAdmin === true
})

const isAdmin = computed(() => {
  const role = authStore.user?.role
  return role === 'admin' || role === 'Admin' || role === 'ADMIN'
})

const canAccessDatabaseBackup = computed(() => {
  return isSuperAdmin.value || isAdmin.value
})

// Feature metadata composable
const {
  metadata,
  groupedMetadata,
  fetchMetadata,
  getCategories
} = useFeatureMetadata()

// Canvas state
const showMetadataCanvas = ref(false)
const showDatabaseBackupCanvas = ref(false)
const showAuditLogCanvas = ref(false)
const showDuplicateCanvas = ref(false)
const showSmartFixCanvas = ref(false)
const showOvernightAuditCanvas = ref(false)
const showAttendanceRegenerationCanvas = ref(false)
const showAccountBalanceRecalculateCanvas = ref(false)
const showAdjustmentAuditCanvas = ref(false)

// Computed stats
const hasMetadata = computed(() => metadata.value.length > 0)

const totalFeatures = computed(() => metadata.value.length)

const totalCategories = computed(() => getCategories().length)

const booleanFeatures = computed(() => {
  return metadata.value.filter(f => f.type === 'boolean').length
})

const numericFeatures = computed(() => {
  return metadata.value.filter(f => f.type === 'number').length
})

// Open metadata canvas
const openMetadataCanvas = () => {
  showMetadataCanvas.value = true
}

// Close metadata canvas
const closeMetadataCanvas = () => {
  showMetadataCanvas.value = false
}

// Open database backup canvas
const openDatabaseBackupCanvas = () => {
  showDatabaseBackupCanvas.value = true
}

// Close database backup canvas
const closeDatabaseBackupCanvas = () => {
  showDatabaseBackupCanvas.value = false
}

// Open audit log canvas
const openAuditLogCanvas = () => {
  showAuditLogCanvas.value = true
}

// Close audit log canvas
const closeAuditLogCanvas = () => {
  showAuditLogCanvas.value = false
}

const openOvernightAuditCanvas = () => {
  showOvernightAuditCanvas.value = true
}

const closeOvernightAuditCanvas = () => {
  showOvernightAuditCanvas.value = false
}

const openAttendanceRegenerationCanvas = () => {
  showAttendanceRegenerationCanvas.value = true
}

const closeAttendanceRegenerationCanvas = () => {
  showAttendanceRegenerationCanvas.value = false
}

const openAccountBalanceRecalculateCanvas = () => {
  showAccountBalanceRecalculateCanvas.value = true
}

const closeAccountBalanceRecalculateCanvas = () => {
  showAccountBalanceRecalculateCanvas.value = false
}

const openAdjustmentAuditCanvas = () => {
  showAdjustmentAuditCanvas.value = true
}

const closeAdjustmentAuditCanvas = () => {
  showAdjustmentAuditCanvas.value = false
}

// Duplicate canvas
const openDuplicateCanvas = () => {
  showDuplicateCanvas.value = true
}
const closeDuplicateCanvas = () => {
  showDuplicateCanvas.value = false
}
const openSmartFixCanvas = () => {
  showSmartFixCanvas.value = true
}
const closeSmartFixCanvas = () => {
  showSmartFixCanvas.value = false
}

// ─── Diagnose & Fix Cash Register Report ───
const { sessions: crSessions, loading: crLoading, fetchSessions } = useCashRegister()

const deficitSessions = computed(() =>
  (crSessions.value || []).filter(s => parseFloat(s.difference) < 0)
)

const loadDeficitSessions = async () => {
  await fetchSessions({
    status: 'closed',
    dateFrom: dayjs().subtract(60, 'days').format('YYYY-MM-DD'),
    dateTo: dayjs().format('YYYY-MM-DD'),
    limit: 100
  })
}

onMounted(() => {
  loadDeficitSessions()
})

const diagnoseSessionId = ref('')
const diagnoseLoading = ref(false)
const applyFixLoading = ref(false)
const diagnoseResult = ref(null)
const diagnoseModal = ref(null)

// ─── Payment correction state ───
const paymentRows = ref([]) // reactive rows per payment in diagnose result
const correctPaymentLoading = ref(false)
const correctPaymentResult = ref(null)

const paymentMethodOptions = [
  { value: 'cash', label: '💵 Tunai (Cash)' },
  { value: 'qris', label: 'QRIS' },
  { value: 'credit_card', label: 'Kartu' },
  { value: 'bank_transfer', label: 'Transfer Bank' },
  { value: 'e_wallet', label: 'E-Wallet' },
  { value: 'compliment', label: 'Gratis (Compliment)' },
]

const getPaymentRows = (tx) => {
  return paymentRows.value.filter(r => r.transactionId === tx.id)
}

const initPaymentRows = (result) => {
  const rows = []
  for (const tx of result?.diagnosis?.splitMergedTransactions || []) {
    for (const p of tx.payments || []) {
      rows.push({
        transactionId: tx.id,
        transactionNumber: tx.transactionNumber,
        paymentId: p.id || p.paymentId || null,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        newMethod: '',
        reason: ''
      })
    }
  }
  paymentRows.value = rows
}

const pendingCorrectionCount = computed(() =>
  paymentRows.value.filter(r => r.newMethod && r.newMethod !== r.paymentMethod).length
)

const hasPaymentCorrections = computed(() => pendingCorrectionCount.value > 0)

const applyPaymentCorrections = async () => {
  const id = diagnoseSessionId.value
  if (!id) return
  const corrections = paymentRows.value
    .filter(r => r.newMethod && r.newMethod !== r.paymentMethod)
    .map(r => ({
      ...(r.paymentId ? { paymentId: r.paymentId } : { paymentMethod: r.paymentMethod, transactionId: r.transactionId }),
      newPaymentMethod: r.newMethod,
      ...(r.reason ? { reason: r.reason } : {})
    }))
  if (!corrections.length) return
  try {
    correctPaymentLoading.value = true
    correctPaymentResult.value = null
    const res = await api.patch(`/gym/cash-register/${id}/correct-payment`, { corrections })
    correctPaymentResult.value = res.data?.data || res.data
    // auto re-run diagnose to refresh result
    const diagnoseRes = await api.post(`/gym/cash-register/${id}/diagnose-report?dryRun=true`)
    diagnoseResult.value = diagnoseRes.data?.data || diagnoseRes.data
    initPaymentRows(diagnoseResult.value)
    await loadDeficitSessions()
  } catch (err) {
    console.error('[CorrectPayment] Error:', err)
    alert(err?.response?.data?.message || 'Gagal mengoreksi payment method.')
  } finally {
    correctPaymentLoading.value = false
  }
}

const formatCurrency = (amount) => {
  if (amount == null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const runDiagnose = async (sessionId) => {
  const id = sessionId || diagnoseSessionId.value.trim()
  if (!id) return
  try {
    diagnoseLoading.value = true
    diagnoseSessionId.value = id
    diagnoseResult.value = null
    const response = await api.post(`/gym/cash-register/${id}/diagnose-report?dryRun=true`)
    diagnoseResult.value = response.data?.data || response.data
    initPaymentRows(diagnoseResult.value)
    correctPaymentResult.value = null
    diagnoseModal.value?.showModal()
  } catch (err) {
    console.error('[Diagnose] Error:', err)
    alert(err?.response?.data?.message || 'Gagal menjalankan diagnosa.')
  } finally {
    diagnoseLoading.value = false
  }
}

const applyFix = async () => {
  const id = diagnoseSessionId.value.trim()
  if (!id) return
  try {
    applyFixLoading.value = true
    const response = await api.post(`/gym/cash-register/${id}/diagnose-report?dryRun=false`)
    diagnoseResult.value = response.data?.data || response.data
    // Refresh list after fix
    await loadDeficitSessions()
  } catch (err) {
    console.error('[Diagnose] Apply fix error:', err)
    alert(err?.response?.data?.message || 'Gagal menerapkan koreksi.')
  } finally {
    applyFixLoading.value = false
  }
}

const closeDiagnoseModal = () => {
  diagnoseModal.value?.close()
  diagnoseResult.value = null
  diagnoseSessionId.value = ''
  paymentRows.value = []
  correctPaymentResult.value = null
}

// ─── Recalculate Cash ───
const recalcSessionId = ref('')
const recalcLoading = ref(false)
const applyRecalcLoading = ref(false)
const recalcResult = ref(null)
const recalcModal = ref(null)

const runRecalculate = async (sessionId) => {
  const id = sessionId
  if (!id) return
  try {
    recalcLoading.value = true
    recalcSessionId.value = id
    recalcResult.value = null
    const response = await api.post(`/gym/cash-register/${id}/recalculate-cash?dryRun=true`)
    recalcResult.value = response.data?.data || response.data
    recalcModal.value?.showModal()
  } catch (err) {
    console.error('[Recalculate] Error:', err)
    alert(err?.response?.data?.message || 'Gagal menjalankan recalculate cash.')
  } finally {
    recalcLoading.value = false
  }
}

const applyRecalculate = async () => {
  const id = recalcSessionId.value
  if (!id) return
  try {
    applyRecalcLoading.value = true
    const response = await api.post(`/gym/cash-register/${id}/recalculate-cash?dryRun=false`)
    recalcResult.value = response.data?.data || response.data
    await loadDeficitSessions()
  } catch (err) {
    console.error('[Recalculate] Apply error:', err)
    alert(err?.response?.data?.message || 'Gagal menerapkan recalculate cash.')
  } finally {
    applyRecalcLoading.value = false
  }
}

const closeRecalcModal = () => {
  recalcModal.value?.close()
  recalcResult.value = null
  recalcSessionId.value = ''
}

// Watch for metadata changes (after canvas loads data)
watch(showMetadataCanvas, (isOpen) => {
  if (isDev) {
    console.log('[SystemAuditTab] Canvas state:', isOpen)
  }
})

watch(metadata, (newMetadata) => {
  if (isDev && newMetadata.length > 0) {
    console.log('[SystemAuditTab] Metadata loaded:', newMetadata.length, 'features')
  }
}, { deep: true })
</script>

<style scoped>
.stat {
  padding: 1rem;
}

.stat-title {
  opacity: 0.7;
}

.stat-value {
  font-weight: bold;
}
</style>
