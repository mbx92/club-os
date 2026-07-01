<template>
  <!-- Canvas Overlay -->
  <Teleport to="body">
    <Transition name="canvas">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-hidden"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>
        
        <!-- Canvas Panel -->
        <div class="absolute inset-y-0 right-0 max-w-full flex">
          <div class="w-screen max-w-5xl">
            <div class="h-full flex flex-col bg-base-100 shadow-xl">
              
              <!-- Header -->
              <div class="px-6 py-4 bg-base-200 border-b border-base-300">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-success/10 rounded-lg">
                      <IconDatabase class="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h2 class="text-xl font-bold">Database Backup & Restore</h2>
                      <p class="text-sm text-base-content/70">
                        Manage database backups for data protection
                      </p>
                    </div>
                  </div>
                  
                  <button
                    class="btn btn-sm btn-ghost btn-circle"
                    @click="handleClose"
                  >
                    <IconX class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Tabs -->
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <div role="tablist" class="tabs tabs-boxed tabs-sm">
                    <button
                      role="tab"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': activeTab === 'backup' }"
                      @click="activeTab = 'backup'"
                    >
                      <IconDatabase class="w-4 h-4" />
                      Backup
                    </button>
                    <button
                      role="tab"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': activeTab === 'cloud' }"
                      @click="activeTab = 'cloud'"
                    >
                      <IconCloudUpload class="w-4 h-4" />
                      Cloud Storage
                    </button>
                    <button
                      role="tab"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': activeTab === 'import' }"
                      @click="activeTab = 'import'"
                    >
                      <IconFileImport class="w-4 h-4" />
                      Import Production
                    </button>
                  </div>

                  <template v-if="activeTab === 'backup'">
                    <button
                      class="btn btn-success btn-sm gap-2"
                      :disabled="isCreatingBackup"
                      @click="handleCreateBackup"
                    >
                      <span v-if="isCreatingBackup" class="loading loading-spinner loading-sm"></span>
                      <IconPlus v-else class="w-4 h-4" />
                      Create Backup
                    </button>
                    <button
                      class="btn btn-ghost btn-sm gap-2"
                      :disabled="isLoading"
                      @click="handleRefresh"
                    >
                      <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                      Refresh
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 overflow-y-auto p-6 space-y-6">
                <ProductionImportPanel v-if="activeTab === 'import'" />

                <template v-else-if="activeTab === 'backup'">
                  <div class="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
                    <div class="space-y-6">
                      <section class="overflow-hidden rounded-[1.75rem] border border-base-300 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_38%),linear-gradient(180deg,hsl(var(--b1)),hsl(var(--b2)))] shadow-sm">
                        <div class="p-6">
                          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div class="max-w-2xl">
                              <div class="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-success">
                                Backup Workspace
                              </div>
                              <h3 class="mt-4 text-2xl font-black tracking-tight text-base-content">
                                Backup lokal tetap sederhana dan mudah dipantau.
                              </h3>
                              <p class="mt-3 max-w-xl text-sm leading-6 text-base-content/68">
                                Buat backup baru, cek ukuran penyimpanan, lalu kelola file lokal yang siap diunduh kapan saja.
                              </p>
                            </div>

                            <div class="grid min-w-[220px] gap-3 rounded-[1.4rem] border border-base-300/80 bg-base-100/90 p-4 shadow-sm">
                              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-base-content/45">
                                Active Storage
                              </div>
                              <div class="text-lg font-bold leading-tight text-base-content">
                                {{ cloudStorageLabel }}
                              </div>
                              <div class="flex flex-wrap gap-2">
                                <span class="badge badge-outline">{{ enabledCloudProviderCount }} cloud aktif</span>
                                <span class="badge badge-outline">{{ requiredCloudProviderCount }} wajib</span>
                              </div>
                            </div>
                          </div>

                          <div class="mt-6 grid gap-3 md:grid-cols-3">
                            <div class="rounded-2xl border border-base-300/80 bg-base-100/88 p-4 shadow-sm">
                              <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Total backup</div>
                              <div class="mt-2 text-3xl font-black text-base-content">{{ backups.length }}</div>
                              <p class="mt-2 text-sm text-base-content/60">Riwayat file yang masih tersimpan di server.</p>
                            </div>
                            <div class="rounded-2xl border border-base-300/80 bg-base-100/88 p-4 shadow-sm">
                              <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Total size</div>
                              <div class="mt-2 text-3xl font-black text-base-content">{{ totalSizeMB }} MB</div>
                              <p class="mt-2 text-sm text-base-content/60">Membantu cek pertumbuhan penyimpanan lokal.</p>
                            </div>
                            <div class="rounded-2xl border border-base-300/80 bg-base-100/88 p-4 shadow-sm">
                              <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Backup terbaru</div>
                              <div class="mt-2 text-xl font-black text-base-content">{{ latestBackupTime }}</div>
                              <p class="mt-2 text-sm text-base-content/60">{{ latestBackupLabel }}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <div class="card border border-base-300 bg-base-100 shadow-sm">
                        <div class="card-body gap-5 p-5 sm:p-6">
                          <div v-if="databaseInfo">
                            <h3 class="card-title text-lg flex items-center gap-2">
                              <IconInfoCircle class="w-5 h-5" />
                              Database Information
                            </h3>
                            <div class="mt-4 grid grid-cols-1 gap-3">
                              <div class="min-w-0 rounded-2xl border border-base-300 bg-base-200/60 p-4">
                                <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Database</div>
                                <div class="mt-2 break-words text-sm font-bold text-base-content">{{ databaseInfo.database }}</div>
                              </div>
                              <div class="min-w-0 rounded-2xl border border-base-300 bg-base-200/60 p-4">
                                <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Type</div>
                                <div class="mt-2 text-sm font-bold uppercase text-base-content">{{ databaseInfo.dialect }}</div>
                              </div>
                              <div class="min-w-0 rounded-2xl border border-base-300 bg-base-200/60 p-4">
                                <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Size</div>
                                <div class="mt-2 text-sm font-bold text-base-content">{{ databaseInfo.size }}</div>
                              </div>
                              <div class="min-w-0 rounded-2xl border border-base-300 bg-base-200/60 p-4">
                                <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Tables</div>
                                <div class="mt-2 text-sm font-bold text-base-content">{{ databaseInfo.tableCount }}</div>
                              </div>
                            </div>

                            <div class="mt-4 min-w-0 rounded-[1.4rem] border border-base-300 bg-base-200/70 p-4">
                              <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">Environment</div>
                              <div class="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                <span class="badge" :class="databaseInfo.environment === 'production' ? 'badge-error' : 'badge-warning'">
                                  {{ databaseInfo.environment }}
                                </span>
                                <span class="break-all text-sm text-base-content/68">{{ databaseInfo.host }}:{{ databaseInfo.port }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="card border border-base-300 bg-base-100 shadow-sm">
                        <div class="card-body gap-5 p-5 sm:p-6">
                          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                              <h3 class="card-title text-lg flex items-center gap-2">
                                <IconList class="w-5 h-5" />
                                Backup Files
                              </h3>
                              <p class="mt-1 text-sm text-base-content/65">
                                Daftar backup lokal terbaru yang siap diunduh atau dibersihkan.
                              </p>
                            </div>

                            <div class="flex flex-wrap gap-2 text-xs text-base-content/60">
                              <span class="rounded-full border border-base-300 bg-base-200 px-3 py-1.5">
                                {{ backups.length }} file
                              </span>
                              <span class="rounded-full border border-base-300 bg-base-200 px-3 py-1.5">
                                Max 10 file tersimpan otomatis
                              </span>
                            </div>
                          </div>

                          <div v-if="isLoading && backups.length === 0" class="flex justify-center py-16">
                            <span class="loading loading-spinner loading-lg text-primary"></span>
                          </div>

                          <div v-else-if="backups.length === 0" class="rounded-[1.5rem] border border-dashed border-base-300 bg-base-200/60 px-6 py-14 text-center">
                            <IconFileOff class="mx-auto mb-4 h-14 w-14 text-base-content/28" />
                            <p class="text-base font-semibold text-base-content/72">Belum ada backup lokal</p>
                            <p class="mt-2 text-sm text-base-content/52">Buat backup pertama untuk mulai membangun riwayat cadangan data.</p>
                          </div>

                          <div v-else class="overflow-hidden rounded-[1.4rem] border border-base-300 bg-base-200/55">
                            <div class="overflow-x-auto">
                              <table class="table w-full">
                                <thead>
                                  <tr>
                                    <th>File</th>
                                    <th>Ukuran</th>
                                    <th>Env</th>
                                    <th>Dibuat</th>
                                    <th class="text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="backup in sortedBackups" :key="backup.filename" class="hover">
                                    <td>
                                      <div class="flex items-start gap-3">
                                        <div class="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
                                          <IconFile class="h-4 w-4" />
                                        </div>
                                        <div class="min-w-0">
                                          <div class="truncate font-mono text-xs text-base-content">{{ backup.filename }}</div>
                                          <div class="mt-1 text-xs text-base-content/50">Disimpan lokal dan siap diunduh kapan saja.</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span class="badge badge-ghost font-medium">{{ backup.sizeMB }} MB</span>
                                    </td>
                                    <td>
                                      <span class="badge" :class="getEnvironmentBadge(backup.environment)">
                                        {{ backup.environment }}
                                      </span>
                                    </td>
                                    <td>
                                      <div class="text-sm">
                                        <div class="font-medium text-base-content">{{ formatDate(backup.createdAt) }}</div>
                                        <div class="text-xs text-base-content/50">{{ formatTime(backup.createdAt) }}</div>
                                      </div>
                                    </td>
                                    <td>
                                      <div class="flex justify-end">
                                        <div class="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100/90 p-1 shadow-sm">
                                          <button
                                            class="btn btn-ghost btn-sm btn-circle"
                                            @click="handleDownload(backup.filename)"
                                            title="Download backup"
                                            aria-label="Download backup"
                                          >
                                            <IconDownload class="h-4 w-4" />
                                          </button>
                                          <button
                                            class="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                                            @click="handleDeleteClick(backup)"
                                            title="Delete backup"
                                            aria-label="Delete backup"
                                          >
                                            <IconTrash class="h-4 w-4" />
                                          </button>
                                        </div>
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

                    <div class="space-y-6">
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="space-y-6">
                    <div class="rounded-[1.4rem] border border-warning/30 bg-warning/10 p-4">
                      <div class="flex items-start gap-3">
                        <IconAlertTriangle class="mt-0.5 h-5 w-5 text-warning" />
                        <div class="text-sm text-base-content/72">
                          Access key dan secret key disimpan di tenant settings. Pastikan akses ke tab ini hanya untuk admin tepercaya.
                        </div>
                      </div>
                    </div>

                    <div class="space-y-6">
                      <div class="card border border-base-300 bg-base-100 shadow-sm">
                        <div class="card-body gap-5 p-5 sm:p-6">
                          <div>
                            <h3 class="card-title text-lg flex items-center gap-2">
                              <IconCloudUpload class="w-5 h-5" />
                              Google Drive
                            </h3>
                            <p class="mt-1 text-sm text-base-content/65">
                              Cocok bila tim operasional lebih nyaman memantau salinan backup dari Google Drive.
                            </p>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <span class="badge" :class="googleDriveSettings.enabled ? 'badge-success' : 'badge-ghost'">
                              {{ googleDriveSettings.enabled ? 'Enabled' : 'Disabled' }}
                            </span>
                            <span class="badge" :class="googleDriveSettings.enabled && googleDriveSettings.required ? 'badge-warning' : 'badge-ghost'">
                              {{ googleDriveSettings.enabled && googleDriveSettings.required ? 'Required' : 'Optional' }}
                            </span>
                          </div>

                          <div class="grid gap-3">
                            <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                              <input
                                v-model="googleDriveSettings.enabled"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-primary mt-0.5"
                              >
                              <div>
                                <div class="font-medium">Aktifkan Google Drive</div>
                                <div class="text-sm text-base-content/58">Upload backup ke folder Drive tenant setelah file lokal selesai dibuat.</div>
                              </div>
                            </label>

                            <label
                              class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5"
                              :class="googleDriveSettings.enabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'"
                            >
                              <input
                                v-model="googleDriveSettings.required"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-warning mt-0.5"
                                :disabled="!googleDriveSettings.enabled"
                              >
                              <div>
                                <div class="font-medium">Jadikan upload sebagai syarat wajib</div>
                                <div class="text-sm text-base-content/58">Gunakan bila backup dianggap belum lengkap tanpa salinan ke Drive.</div>
                              </div>
                            </label>
                          </div>

                          <div>
                            <label class="label px-1">
                              <span class="label-text font-medium flex items-center gap-2">
                                <IconFolder class="w-4 h-4" />
                                Folder ID
                              </span>
                            </label>
                            <input
                              v-model="googleDriveSettings.folderId"
                              type="text"
                              class="input input-bordered h-12 w-full rounded-2xl"
                              placeholder="1ESvPnfhl6eG21uIyE42ywJY8FtM3xDuV"
                            >
                          </div>

                          <div class="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p class="text-sm text-base-content/58">
                              Tombol proses akan membuat file backup baru lalu mengirimkannya hanya ke Google Drive.
                            </p>

                            <div class="flex flex-wrap justify-end gap-2">
                              <button
                                class="btn btn-ghost btn-sm gap-2"
                                :disabled="isSavingBackupSettings || isCreatingBackup || !googleDriveSettings.enabled"
                                @click="handleProcessCloudBackup('google_drive')"
                              >
                                <span v-if="isProcessingGoogleDrive" class="loading loading-spinner loading-sm"></span>
                                <IconCloudUpload v-else class="w-4 h-4" />
                                Proses Backup
                              </button>
                              <button
                                class="btn btn-primary btn-sm gap-2"
                                :disabled="isSavingBackupSettings || isCreatingBackup"
                                @click="handleSaveGoogleDriveSettings"
                              >
                                <span v-if="isSavingBackupSettings" class="loading loading-spinner loading-sm"></span>
                                <IconDeviceFloppy v-else class="w-4 h-4" />
                                Simpan Google Drive
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="card border border-base-300 bg-base-100 shadow-sm">
                        <div class="card-body gap-5 p-5 sm:p-6">
                          <div>
                            <h3 class="card-title text-lg flex items-center gap-2">
                              <IconCloudUpload class="w-5 h-5" />
                              S3 / MinIO
                            </h3>
                            <p class="mt-1 text-sm text-base-content/65">
                              Cocok untuk object storage pribadi, server internal, atau MinIO self-hosted.
                            </p>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <span class="badge" :class="minioSettings.enabled ? 'badge-success' : 'badge-ghost'">
                              {{ minioSettings.enabled ? 'Enabled' : 'Disabled' }}
                            </span>
                            <span class="badge" :class="minioSettings.enabled && minioSettings.required ? 'badge-warning' : 'badge-ghost'">
                              {{ minioSettings.enabled && minioSettings.required ? 'Required' : 'Optional' }}
                            </span>
                          </div>

                          <div class="grid gap-3">
                            <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                              <input
                                v-model="minioSettings.enabled"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-primary mt-0.5"
                              >
                              <div>
                                <div class="font-medium">Aktifkan MinIO / S3</div>
                                <div class="text-sm text-base-content/58">Upload file backup ke bucket tujuan menggunakan S3-compatible API.</div>
                              </div>
                            </label>

                            <label
                              class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5"
                              :class="minioSettings.enabled ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'"
                            >
                              <input
                                v-model="minioSettings.required"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-warning mt-0.5"
                                :disabled="!minioSettings.enabled"
                              >
                              <div>
                                <div class="font-medium">Jadikan upload sebagai syarat wajib</div>
                                <div class="text-sm text-base-content/58">Gunakan bila backup harus sukses tersalin ke object storage.</div>
                              </div>
                            </label>
                          </div>

                          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Endpoint</span></label>
                              <input v-model="minioSettings.endpoint" type="text" class="input input-bordered h-12 w-full rounded-2xl" placeholder="http://127.0.0.1:9000">
                            </div>
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Bucket</span></label>
                              <input v-model="minioSettings.bucket" type="text" class="input input-bordered h-12 w-full rounded-2xl" placeholder="database-backups">
                            </div>
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Access Key</span></label>
                              <input v-model="minioSettings.accessKeyId" type="text" class="input input-bordered h-12 w-full rounded-2xl" placeholder="minioadmin">
                            </div>
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Secret Key</span></label>
                              <input v-model="minioSettings.secretAccessKey" type="password" class="input input-bordered h-12 w-full rounded-2xl" placeholder="Masukkan secret key">
                            </div>
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Region</span></label>
                              <input v-model="minioSettings.region" type="text" class="input input-bordered h-12 w-full rounded-2xl" placeholder="us-east-1">
                            </div>
                            <div>
                              <label class="label px-1"><span class="label-text font-medium">Object Prefix</span></label>
                              <input v-model="minioSettings.objectPrefix" type="text" class="input input-bordered h-12 w-full rounded-2xl" placeholder="club-os/backups">
                            </div>
                          </div>

                          <div class="grid gap-3">
                            <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                              <input
                                v-model="minioSettings.forcePathStyle"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-primary mt-0.5"
                              >
                              <div>
                                <div class="font-medium">Force path style</div>
                                <div class="text-sm text-base-content/58">Biasanya dibutuhkan untuk MinIO dan endpoint lokal tanpa virtual-hosted bucket.</div>
                              </div>
                            </label>

                            <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                              <input
                                v-model="minioSettings.useSsl"
                                type="checkbox"
                                class="checkbox checkbox-sm checkbox-primary mt-0.5"
                              >
                              <div>
                                <div class="font-medium">Gunakan HTTPS default</div>
                                <div class="text-sm text-base-content/58">Dipakai bila endpoint ditulis tanpa awalan `http://` atau `https://`.</div>
                              </div>
                            </label>
                          </div>

                          <div class="flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p class="text-sm text-base-content/58">
                              Tombol proses akan membuat file backup baru lalu mengirimkannya hanya ke MinIO / S3.
                            </p>

                            <div class="flex flex-wrap justify-end gap-2">
                              <button
                                class="btn btn-ghost btn-sm gap-2"
                                :disabled="isSavingBackupSettings || isCreatingBackup || !minioSettings.enabled"
                                @click="handleProcessCloudBackup('minio')"
                              >
                                <span v-if="isProcessingMinio" class="loading loading-spinner loading-sm"></span>
                                <IconCloudUpload v-else class="w-4 h-4" />
                                Proses Backup
                              </button>
                              <button
                                class="btn btn-primary btn-sm gap-2"
                                :disabled="isSavingBackupSettings || isCreatingBackup"
                                @click="handleSaveMinioSettings"
                              >
                                <span v-if="isSavingBackupSettings" class="loading loading-spinner loading-sm"></span>
                                <IconDeviceFloppy v-else class="w-4 h-4" />
                                Simpan MinIO
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Confirmation Modal -->
  <dialog ref="deleteModal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <IconAlertTriangle class="w-6 h-6 text-error" />
        Delete Backup File
      </h3>
      <p class="py-4">
        Are you sure you want to delete this backup file?
        <span class="block mt-2 font-mono text-sm bg-base-200 p-2 rounded">
          {{ backupToDelete?.filename }}
        </span>
        This action cannot be undone.
      </p>
      <div class="modal-action">
        <button class="btn btn-ghost" @click="closeDeleteModal">Cancel</button>
        <button class="btn btn-error" @click="confirmDelete">
          <IconTrash class="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeDeleteModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'
import ProductionImportPanel from '@/components/settings/ProductionImportPanel.vue'
import { useTenantSettings } from '@/composables/admin/useTenantSettings'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import {
  IconDatabase,
  IconX,
  IconPlus,
  IconRefresh,
  IconInfoCircle,
  IconCloudUpload,
  IconFolder,
  IconDeviceFloppy,
  IconFiles,
  IconFileZip,
  IconClock,
  IconList,
  IconFileOff,
  IconFile,
  IconDownload,
  IconTrash,
  IconAlertTriangle,
  IconFileImport
} from '@tabler/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

// Composables
const authStore = useAuthStore()
const { showWarning } = useNotification()
const {
  backups,
  databaseInfo,
  isLoading,
  isCreatingBackup,
  fetchBackups,
  createBackup,
  downloadBackup,
  deleteBackup,
  fetchDatabaseInfo
} = useDatabaseBackup()
const {
  currentTenantId,
  fetchTenantSettings,
  patchTenantSettings,
  saving: isSavingBackupSettings
} = useTenantSettings()

// Refs
const activeTab = ref('backup')
const deleteModal = ref(null)
const backupToDelete = ref(null)
const activeCloudProcess = ref('')
const createDefaultGoogleDriveSettings = () => ({
  enabled: false,
  required: false,
  folderId: ''
})
const createDefaultMinioSettings = () => ({
  enabled: false,
  required: false,
  endpoint: '',
  region: 'us-east-1',
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  objectPrefix: '',
  forcePathStyle: true,
  useSsl: false
})
const googleDriveSettings = ref(createDefaultGoogleDriveSettings())
const minioSettings = ref(createDefaultMinioSettings())

// Computed
const sortedBackups = computed(() => {
  return [...backups.value].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

const totalSizeMB = computed(() => {
  const total = backups.value.reduce((sum, backup) => {
    return sum + parseFloat(backup.sizeMB || 0)
  }, 0)
  return total.toFixed(2)
})

const latestBackupTime = computed(() => {
  if (backups.value.length === 0) return 'N/A'
  const latest = sortedBackups.value[0]
  return formatRelativeTime(latest.createdAt)
})

const latestBackupLabel = computed(() => {
  if (backups.value.length === 0) return 'Belum ada file backup yang tersimpan.'
  const latest = sortedBackups.value[0]
  return `${formatDate(latest.createdAt)} • ${formatTime(latest.createdAt)}`
})

const enabledCloudProviderCount = computed(() => {
  return [googleDriveSettings.value.enabled, minioSettings.value.enabled].filter(Boolean).length
})

const requiredCloudProviderCount = computed(() => {
  return [
    googleDriveSettings.value.enabled && googleDriveSettings.value.required,
    minioSettings.value.enabled && minioSettings.value.required
  ].filter(Boolean).length
})

const cloudStorageLabel = computed(() => {
  const providers = []

  if (googleDriveSettings.value.enabled) {
    providers.push('Google Drive')
  }

  if (minioSettings.value.enabled) {
    providers.push('MinIO')
  }

  if (providers.length === 0) {
    return 'Local server only'
  }

  return `Local + ${providers.join(' + ')}`
})

const isProcessingGoogleDrive = computed(() => {
  return isCreatingBackup.value && activeCloudProcess.value === 'google_drive'
})

const isProcessingMinio = computed(() => {
  return isCreatingBackup.value && activeCloudProcess.value === 'minio'
})

// Methods
const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const normalizeGoogleDriveSettings = (googleDrive = {}) => ({
  enabled: Boolean(googleDrive.enabled),
  required: Boolean(googleDrive.required),
  folderId: googleDrive.folderId || ''
})

const normalizeMinioSettings = (minio = {}) => ({
  enabled: Boolean(minio.enabled),
  required: Boolean(minio.required),
  endpoint: minio.endpoint || '',
  region: minio.region || 'us-east-1',
  bucket: minio.bucket || '',
  accessKeyId: minio.accessKeyId || '',
  secretAccessKey: minio.secretAccessKey || '',
  objectPrefix: minio.objectPrefix || '',
  forcePathStyle: minio.forcePathStyle !== false,
  useSsl: Boolean(minio.useSsl)
})

const applyBackupSettings = (settingsSource = null) => {
  googleDriveSettings.value = normalizeGoogleDriveSettings(
    settingsSource?.backup?.googleDrive || {}
  )
  minioSettings.value = normalizeMinioSettings(
    settingsSource?.backup?.minio || {}
  )
}

const loadBackupSettings = async () => {
  applyBackupSettings(authStore.user?.tenant?.settings)

  if (!currentTenantId.value) return

  try {
    const tenantData = await fetchTenantSettings()
    applyBackupSettings(tenantData?.settings)
  } catch (error) {
    console.error('Failed to load backup settings:', error)
  }
}

const handleRefresh = async () => {
  await Promise.all([
    fetchBackups(),
    fetchDatabaseInfo(),
    loadBackupSettings()
  ])
}

const buildBackupSettingsPayload = () => ({
  backup: {
    googleDrive: {
      enabled: googleDriveSettings.value.enabled,
      required: googleDriveSettings.value.enabled ? googleDriveSettings.value.required : false,
      folderId: googleDriveSettings.value.folderId.trim()
    },
    minio: {
      enabled: minioSettings.value.enabled,
      required: minioSettings.value.enabled ? minioSettings.value.required : false,
      endpoint: minioSettings.value.endpoint.trim(),
      region: minioSettings.value.region.trim() || 'us-east-1',
      bucket: minioSettings.value.bucket.trim(),
      accessKeyId: minioSettings.value.accessKeyId.trim(),
      secretAccessKey: minioSettings.value.secretAccessKey.trim(),
      objectPrefix: minioSettings.value.objectPrefix.trim(),
      forcePathStyle: minioSettings.value.forcePathStyle,
      useSsl: minioSettings.value.useSsl
    }
  }
})

const validateGoogleDriveSettings = () => {
  const folderId = googleDriveSettings.value.folderId.trim()

  if (googleDriveSettings.value.enabled && !folderId) {
    showWarning('Folder ID wajib diisi saat Google Drive backup aktif')
    return false
  }

  googleDriveSettings.value.folderId = folderId
  return true
}

const validateMinioSettings = () => {
  const endpoint = minioSettings.value.endpoint.trim()
  const bucket = minioSettings.value.bucket.trim()
  const accessKeyId = minioSettings.value.accessKeyId.trim()
  const secretAccessKey = minioSettings.value.secretAccessKey.trim()

  if (minioSettings.value.enabled) {
    if (!endpoint) {
      showWarning('Endpoint wajib diisi saat MinIO backup aktif')
      return false
    }

    if (!bucket) {
      showWarning('Bucket wajib diisi saat MinIO backup aktif')
      return false
    }

    if (!accessKeyId || !secretAccessKey) {
      showWarning('Access key dan secret key wajib diisi saat MinIO backup aktif')
      return false
    }
  }

  minioSettings.value.endpoint = endpoint
  minioSettings.value.bucket = bucket
  minioSettings.value.accessKeyId = accessKeyId
  minioSettings.value.secretAccessKey = secretAccessKey
  minioSettings.value.region = minioSettings.value.region.trim() || 'us-east-1'
  minioSettings.value.objectPrefix = minioSettings.value.objectPrefix.trim()

  return true
}

const saveBackupSettings = async (successMessage) => {
  const payload = buildBackupSettingsPayload()
  const result = await patchTenantSettings(payload, successMessage)

  if (result.success) {
    applyBackupSettings(payload)
  }

  return result
}

const handleSaveGoogleDriveSettings = async () => {
  if (!validateGoogleDriveSettings()) {
    return
  }
  await saveBackupSettings('Google Drive backup settings updated successfully')
}

const handleSaveMinioSettings = async () => {
  if (!validateMinioSettings()) {
    return
  }
  await saveBackupSettings('MinIO backup settings updated successfully')
}

const handleCreateBackup = async () => {
  try {
    await createBackup()
  } catch (error) {
    console.error('Failed to create backup:', error)
  }
}

const handleProcessCloudBackup = async (provider) => {
  if (provider === 'google_drive') {
    if (!googleDriveSettings.value.enabled) {
      showWarning('Aktifkan Google Drive dulu sebelum memproses backup')
      return
    }

    if (!validateGoogleDriveSettings()) {
      return
    }
  }

  if (provider === 'minio') {
    if (!minioSettings.value.enabled) {
      showWarning('Aktifkan MinIO dulu sebelum memproses backup')
      return
    }

    if (!validateMinioSettings()) {
      return
    }
  }

  const saveResult = await saveBackupSettings(
    provider === 'google_drive'
      ? 'Google Drive settings saved'
      : 'MinIO settings saved'
  )

  if (!saveResult.success) {
    return
  }

  activeCloudProcess.value = provider

  try {
    await createBackup({ cloudProvider: provider })
  } catch (error) {
    console.error(`Failed to process ${provider} backup:`, error)
  } finally {
    activeCloudProcess.value = ''
  }
}

const handleDownload = async (filename) => {
  await downloadBackup(filename)
}

const handleDeleteClick = (backup) => {
  backupToDelete.value = backup
  deleteModal.value?.showModal()
}

const closeDeleteModal = () => {
  deleteModal.value?.close()
  backupToDelete.value = null
}

const confirmDelete = async () => {
  if (backupToDelete.value) {
    const success = await deleteBackup(backupToDelete.value.filename)
    if (success) {
      closeDeleteModal()
    }
  }
}

const getEnvironmentBadge = (environment) => {
  const badges = {
    production: 'badge-error',
    staging: 'badge-warning',
    development: 'badge-info',
    test: 'badge-ghost'
  }
  return badges[environment] || 'badge-neutral'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return formatDate(dateString)
}

// Watch for canvas open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await handleRefresh()
  }
})

// Initial load when mounted
onMounted(() => {
  if (props.modelValue) {
    handleRefresh()
  }
})
</script>

<style scoped>
/* Canvas transition */
.canvas-enter-active,
.canvas-leave-active {
  transition: opacity 0.3s ease;
}

.canvas-enter-from,
.canvas-leave-to {
  opacity: 0;
}

.canvas-enter-active .absolute.inset-y-0,
.canvas-leave-active .absolute.inset-y-0 {
  transition: transform 0.3s ease;
}

.canvas-enter-from .absolute.inset-y-0,
.canvas-leave-to .absolute.inset-y-0 {
  transform: translateX(100%);
}

.stat {
  padding: 1rem;
}

.stat-title {
  opacity: 0.7;
  font-size: 0.75rem;
}

.stat-value {
  font-weight: bold;
}

.table th {
  background-color: hsl(var(--b3));
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
