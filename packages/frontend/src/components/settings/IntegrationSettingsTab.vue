<template>
  <div class="space-y-6">
    <div class="alert alert-warning">
      <IconAlertTriangle class="h-5 w-5" />
      <span>Kredensial integrasi disimpan di tenant settings. Pastikan hanya admin tepercaya yang bisa mengubah tab ini.</span>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="card-title mb-2">
              <IconCreditCard class="h-6 w-6" />
              Payment Gateway
            </h2>
            <p class="text-sm text-base-content/70">
              Kelola Midtrans dan Stripe dari satu tempat.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="badge badge-outline">{{ paymentSettings.enabledGateways.length }} gateway aktif</span>
            <span class="badge badge-outline">Timeout {{ paymentSettings.paymentTimeout }}s</span>
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <template v-else>
          <div class="mt-4 space-y-6">
            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Gateway Settings</h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Enabled Gateways</span>
                </label>
                <div class="flex flex-wrap gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      v-model="paymentSettings.enabledGateways"
                      type="checkbox"
                      value="Midtrans"
                      class="checkbox checkbox-primary"
                    >
                    <span class="label-text">Midtrans</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      v-model="paymentSettings.enabledGateways"
                      type="checkbox"
                      value="Stripe"
                      class="checkbox checkbox-primary"
                    >
                    <span class="label-text">Stripe</span>
                  </label>
                </div>
              </div>

              <div class="form-control max-w-sm">
                <label class="label">
                  <span class="label-text font-semibold">Payment Timeout</span>
                </label>
                <input
                  v-model.number="paymentSettings.paymentTimeout"
                  type="number"
                  min="1"
                  class="input input-bordered w-full"
                  placeholder="60"
                >
                <label class="label">
                  <span class="label-text-alt">Timeout dalam detik untuk menyelesaikan pembayaran.</span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section class="rounded-2xl border border-base-300 p-5">
                <h3 class="text-lg font-semibold border-b pb-2">Midtrans</h3>
                <div class="mt-4 grid grid-cols-1 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">API Key</span>
                    </label>
                    <input
                      v-model="paymentSettings.midtransConfig.apiKey"
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="Enter Midtrans API Key"
                    >
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">Client Key</span>
                    </label>
                    <input
                      v-model="paymentSettings.midtransConfig.clientKey"
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="Enter Midtrans Client Key"
                    >
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">Webhook URL</span>
                    </label>
                    <input
                      v-model="paymentSettings.midtransConfig.webhookUrl"
                      type="url"
                      class="input input-bordered w-full"
                      placeholder="https://your-domain.com/webhook/midtrans"
                    >
                  </div>

                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      v-model="paymentSettings.midtransConfig.sandbox"
                      type="checkbox"
                      class="toggle toggle-primary"
                    >
                    <span class="label-text">Use sandbox/test mode</span>
                  </label>
                </div>
              </section>

              <section class="rounded-2xl border border-base-300 p-5">
                <h3 class="text-lg font-semibold border-b pb-2">Stripe</h3>
                <div class="mt-4 grid grid-cols-1 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">API Key</span>
                    </label>
                    <input
                      v-model="paymentSettings.stripeConfig.apiKey"
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="Enter Stripe API Key"
                    >
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">Client Key</span>
                    </label>
                    <input
                      v-model="paymentSettings.stripeConfig.clientKey"
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="Enter Stripe Client Key"
                    >
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">Webhook URL</span>
                    </label>
                    <input
                      v-model="paymentSettings.stripeConfig.webhookUrl"
                      type="url"
                      class="input input-bordered w-full"
                      placeholder="https://your-domain.com/webhook/stripe"
                    >
                  </div>

                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      v-model="paymentSettings.stripeConfig.sandbox"
                      type="checkbox"
                      class="toggle toggle-primary"
                    >
                    <span class="label-text">Use sandbox/test mode</span>
                  </label>
                </div>
              </section>
            </div>
          </div>

          <div class="card-actions justify-end pt-6">
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="saving"
              @click="resetPaymentSettings"
            >
              Reset
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="saving || !hasPaymentChanges"
              @click="handleSavePaymentSettings"
            >
              <span
                v-if="saving && savingSection === 'payment'"
                class="loading loading-spinner loading-sm"
              ></span>
              <IconDeviceFloppy v-else class="h-5 w-5" />
              Simpan Payment Gateway
            </button>
          </div>
        </template>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="card-title mb-2">
                <IconCloudUpload class="h-6 w-6" />
                Google Drive Backup
              </h2>
              <p class="text-sm text-base-content/70">
                Simpan salinan backup database ke folder Drive tenant.
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
          </div>

          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <template v-else>
            <div class="mt-4 grid gap-4">
              <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                <input
                  v-model="googleDriveSettings.enabled"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary mt-0.5"
                >
                <div>
                  <div class="font-medium">Aktifkan Google Drive</div>
                  <div class="text-sm text-base-content/58">Upload backup ke Google Drive setelah file lokal selesai dibuat.</div>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5"
                :class="googleDriveSettings.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
              >
                <input
                  v-model="googleDriveSettings.required"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-warning mt-0.5"
                  :disabled="!googleDriveSettings.enabled"
                >
                <div>
                  <div class="font-medium">Jadikan upload sebagai syarat wajib</div>
                  <div class="text-sm text-base-content/58">Gunakan bila backup dianggap belum lengkap tanpa salinan ke Google Drive.</div>
                </div>
              </label>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold flex items-center gap-2">
                    <IconFolder class="h-4 w-4" />
                    Folder ID
                  </span>
                </label>
                <input
                  v-model="googleDriveSettings.folderId"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="1ESvPnfhl6eG21uIyE42ywJY8FtM3xDuV"
                >
              </div>

              <div class="rounded-2xl border border-base-300 bg-base-200/40 p-4 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="font-semibold">OAuth Google Drive</h3>
                    <p class="text-sm text-base-content/60">
                      Hubungkan akun Google untuk upload backup tanpa edit file env server.
                    </p>
                  </div>
                  <span
                    class="badge"
                    :class="googleDriveOAuthConnected ? 'badge-success' : 'badge-ghost'"
                  >
                    {{ googleDriveOAuthConnected ? 'Terhubung' : 'Belum terhubung' }}
                  </span>
                </div>

                <div v-if="oauthConnection && !oauthConnection.ok" class="alert alert-warning alert-soft text-sm py-2">
                  <IconAlertTriangle class="h-4 w-4 shrink-0" />
                  <span>{{ oauthConnection.issue || oauthStatus?.lastError || 'Koneksi Google Drive belum valid' }}</span>
                </div>

                <div class="grid grid-cols-1 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">OAuth Client ID</span>
                    </label>
                    <input
                      v-model="googleDriveSettings.oauth.clientId"
                      type="text"
                      class="input input-bordered w-full"
                      placeholder="xxxx.apps.googleusercontent.com"
                    >
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-semibold">OAuth Client Secret</span>
                    </label>
                    <input
                      v-model="googleDriveSettings.oauth.clientSecret"
                      type="password"
                      class="input input-bordered w-full"
                      :placeholder="googleDriveSettings.oauth.hasStoredClientSecret ? 'Kosongkan jika tidak diubah' : 'Masukkan client secret'"
                    >
                  </div>
                </div>

                <div class="rounded-xl border border-dashed border-base-300 bg-base-100/70 p-3 text-xs text-base-content/65 space-y-1">
                  <p><strong>Redirect URI</strong> yang didaftarkan di Google Cloud Console:</p>
                  <code class="block break-all">{{ redirectUri || 'Memuat...' }}</code>
                  <p class="pt-1">Scope: <code>https://www.googleapis.com/auth/drive.file</code></p>
                </div>

                <div v-if="googleDriveOAuthConnected" class="text-sm text-base-content/70 space-y-1">
                  <p v-if="oauthStatus?.connectedEmail">Akun: {{ oauthStatus.connectedEmail }}</p>
                  <p v-if="oauthStatus?.connectedAt">Terhubung: {{ formatOAuthDate(oauthStatus.connectedAt) }}</p>
                  <p v-if="oauthStatus?.refreshTokenPreview">Refresh token: {{ oauthStatus.refreshTokenPreview }}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    :disabled="connecting || saving || !canConnectGoogleDrive"
                    @click="handleConnectGoogleDrive"
                  >
                    <span v-if="connecting" class="loading loading-spinner loading-sm"></span>
                    <IconLink v-else class="h-4 w-4" />
                    Hubungkan Google
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    :disabled="testing || saving"
                    @click="handleTestGoogleDriveOAuth"
                  >
                    <span v-if="testing" class="loading loading-spinner loading-sm"></span>
                    <IconPlugConnected v-else class="h-4 w-4" />
                    Tes Koneksi
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm text-error"
                    :disabled="disconnecting || saving || !googleDriveOAuthConnected"
                    @click="handleDisconnectGoogleDrive"
                  >
                    <span v-if="disconnecting" class="loading loading-spinner loading-sm"></span>
                    Putuskan
                  </button>
                </div>
              </div>
            </div>

            <div class="card-actions justify-end gap-2 pt-6">
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="saving || isCreatingBackup || !googleDriveSettings.enabled"
                @click="handleProcessCloudBackup('google_drive')"
              >
                <span
                  v-if="isProcessingGoogleDrive"
                  class="loading loading-spinner loading-sm"
                ></span>
                <IconCloudUpload v-else class="h-5 w-5" />
                Backup Sekarang
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="saving || !hasGoogleDriveChanges"
                @click="handleSaveGoogleDriveSettings"
              >
                <span
                  v-if="saving && savingSection === 'googleDrive'"
                  class="loading loading-spinner loading-sm"
                ></span>
                <IconDeviceFloppy v-else class="h-5 w-5" />
                Simpan Google Drive
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="card-title mb-2">
                <IconCloudUpload class="h-6 w-6" />
                MinIO / S3 Backup
              </h2>
              <p class="text-sm text-base-content/70">
                Upload backup ke object storage internal atau S3-compatible.
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
          </div>

          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <template v-else>
            <div class="mt-4 grid gap-4">
              <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
                <input
                  v-model="minioSettings.enabled"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary mt-0.5"
                >
                <div>
                  <div class="font-medium">Aktifkan MinIO / S3</div>
                  <div class="text-sm text-base-content/58">Upload file backup ke bucket tujuan menggunakan API S3-compatible.</div>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5"
                :class="minioSettings.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
              >
                <input
                  v-model="minioSettings.required"
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-warning mt-0.5"
                  :disabled="!minioSettings.enabled"
                >
                <div>
                  <div class="font-medium">Jadikan upload sebagai syarat wajib</div>
                  <div class="text-sm text-base-content/58">Gunakan bila backup wajib sukses tersalin ke object storage.</div>
                </div>
              </label>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Endpoint</span>
                  </label>
                  <input
                    v-model="minioSettings.endpoint"
                    type="text"
                    class="input input-bordered w-full"
                    placeholder="http://127.0.0.1:9000"
                  >
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Bucket</span>
                  </label>
                  <input
                    v-model="minioSettings.bucket"
                    type="text"
                    class="input input-bordered w-full"
                    placeholder="database-backups"
                  >
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Access Key</span>
                  </label>
                  <input
                    v-model="minioSettings.accessKeyId"
                    type="text"
                    class="input input-bordered w-full"
                    placeholder="minioadmin"
                  >
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Secret Key</span>
                  </label>
                  <input
                    v-model="minioSettings.secretAccessKey"
                    type="password"
                    class="input input-bordered w-full"
                    placeholder="Masukkan secret key"
                  >
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Region</span>
                  </label>
                  <input
                    v-model="minioSettings.region"
                    type="text"
                    class="input input-bordered w-full"
                    placeholder="us-east-1"
                  >
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-semibold">Object Prefix</span>
                  </label>
                  <input
                    v-model="minioSettings.objectPrefix"
                    type="text"
                    class="input input-bordered w-full"
                    placeholder="club-os/backups"
                  >
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
                    <div class="text-sm text-base-content/58">Biasanya dibutuhkan untuk MinIO dan endpoint lokal.</div>
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
                    <div class="text-sm text-base-content/58">Dipakai bila endpoint ditulis tanpa awalan protokol.</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="card-actions justify-end gap-2 pt-6">
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="saving || isCreatingBackup || !minioSettings.enabled"
                @click="handleProcessCloudBackup('minio')"
              >
                <span
                  v-if="isProcessingMinio"
                  class="loading loading-spinner loading-sm"
                ></span>
                <IconCloudUpload v-else class="h-5 w-5" />
                Backup Sekarang
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="saving || !hasMinioChanges"
                @click="handleSaveMinioSettings"
              >
                <span
                  v-if="saving && savingSection === 'minio'"
                  class="loading loading-spinner loading-sm"
                ></span>
                <IconDeviceFloppy v-else class="h-5 w-5" />
                Simpan MinIO
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="card-title mb-2">
              <IconBug class="h-6 w-6" />
              GlitchTip
            </h2>
            <p class="text-sm text-base-content/70">
              Simpan konfigurasi GlitchTip untuk error tracking frontend dan backend yang kompatibel dengan Sentry.
            </p>
          </div>
          <span class="badge" :class="glitchtipSettings.enabled ? 'badge-success' : 'badge-ghost'">
            {{ glitchtipSettings.enabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <template v-else>
          <div class="mt-4 space-y-4">
            <label class="flex items-start gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3.5 cursor-pointer">
              <input
                v-model="glitchtipSettings.enabled"
                type="checkbox"
                class="checkbox checkbox-sm checkbox-primary mt-0.5"
              >
              <div>
                <div class="font-medium">Aktifkan GlitchTip</div>
                <div class="text-sm text-base-content/58">Gunakan untuk mengumpulkan error aplikasi, issue, dan event runtime.</div>
              </div>
            </label>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div class="form-control xl:col-span-2">
                <label class="label">
                  <span class="label-text font-semibold">DSN</span>
                </label>
                <input
                  v-model="glitchtipSettings.dsn"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="https://public@example.glitchtip.com/1"
                >
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Server URL</span>
                </label>
                <input
                  v-model="glitchtipSettings.serverUrl"
                  type="url"
                  class="input input-bordered w-full"
                  placeholder="https://glitchtip.example.com"
                >
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-semibold">Environment</span>
                </label>
                <input
                  v-model="glitchtipSettings.environment"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="production"
                >
              </div>

              <div class="form-control xl:col-span-2">
                <label class="label">
                  <span class="label-text font-semibold">Project Slug</span>
                </label>
                <input
                  v-model="glitchtipSettings.projectSlug"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="club-os-frontend"
                >
              </div>
            </div>
          </div>

          <div class="card-actions justify-end pt-6">
            <button
              type="button"
              class="btn btn-ghost"
              :disabled="saving"
              @click="resetGlitchtipSettings"
            >
              Reset
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="saving || !hasGlitchtipChanges"
              @click="handleSaveGlitchtipSettings"
            >
              <span
                v-if="saving && savingSection === 'glitchtip'"
                class="loading loading-spinner loading-sm"
              ></span>
              <IconDeviceFloppy v-else class="h-5 w-5" />
              Simpan GlitchTip
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useTenantSettings } from '@/composables/admin/useTenantSettings'
import { useDatabaseBackup } from '@/composables/admin/useDatabaseBackup'
import { useGoogleDriveOAuth } from '@/composables/admin/useGoogleDriveOAuth'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import {
  IconAlertTriangle,
  IconBug,
  IconCloudUpload,
  IconCreditCard,
  IconDeviceFloppy,
  IconFolder,
  IconLink,
  IconPlugConnected
} from '@tabler/icons-vue'

const authStore = useAuthStore()
const { showWarning } = useNotification()
const {
  tenantSettings,
  loading,
  saving,
  fetchTenantSettings,
  patchTenantSettings
} = useTenantSettings()
const { createBackup, isCreatingBackup } = useDatabaseBackup()
const {
  oauthStatus,
  oauthConnection,
  redirectUri,
  connecting,
  testing,
  disconnecting,
  fetchOAuthStatus,
  connectOAuth,
  disconnectOAuth,
  testOAuthConnection,
} = useGoogleDriveOAuth()

const savingSection = ref('')
const activeCloudProcess = ref('')

const createDefaultPaymentSettings = () => ({
  enabledGateways: [],
  paymentTimeout: 60,
  midtransConfig: {
    apiKey: '',
    clientKey: '',
    sandbox: true,
    webhookUrl: ''
  },
  stripeConfig: {
    apiKey: '',
    clientKey: '',
    sandbox: true,
    webhookUrl: ''
  }
})

const createDefaultGoogleDriveSettings = () => ({
  enabled: false,
  required: false,
  folderId: '',
  oauth: {
    clientId: '',
    clientSecret: '',
    hasStoredClientSecret: false,
  },
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

const createDefaultGlitchtipSettings = () => ({
  enabled: false,
  dsn: '',
  serverUrl: '',
  environment: 'production',
  projectSlug: ''
})

const paymentSettings = ref(createDefaultPaymentSettings())
const googleDriveSettings = ref(createDefaultGoogleDriveSettings())
const minioSettings = ref(createDefaultMinioSettings())
const glitchtipSettings = ref(createDefaultGlitchtipSettings())

const originalPaymentSettings = ref(createDefaultPaymentSettings())
const originalGoogleDriveSettings = ref(createDefaultGoogleDriveSettings())
const originalMinioSettings = ref(createDefaultMinioSettings())
const originalGlitchtipSettings = ref(createDefaultGlitchtipSettings())

const currentTransactionSettings = ref({})
const currentIntegrationsSettings = ref({})

const clone = (value) => JSON.parse(JSON.stringify(value))

const normalizePaymentSettings = (payment = {}) => {
  const defaults = createDefaultPaymentSettings()
  const gateways = Array.isArray(payment.enabledGateways)
    ? payment.enabledGateways.filter((gateway) => ['Midtrans', 'Stripe'].includes(gateway))
    : []

  return {
    ...defaults,
    ...payment,
    enabledGateways: gateways,
    paymentTimeout: Number(payment.paymentTimeout) > 0 ? Number(payment.paymentTimeout) : defaults.paymentTimeout,
    midtransConfig: {
      ...defaults.midtransConfig,
      ...(payment.midtransConfig || {})
    },
    stripeConfig: {
      ...defaults.stripeConfig,
      ...(payment.stripeConfig || {})
    }
  }
}

const normalizeGoogleDriveSettings = (googleDrive = {}) => ({
  enabled: Boolean(googleDrive.enabled),
  required: Boolean(googleDrive.required),
  folderId: googleDrive.folderId || '',
  oauth: {
    clientId: googleDrive.oauth?.clientId || '',
    clientSecret: '',
    hasStoredClientSecret: Boolean(googleDrive.oauth?.clientSecret),
  },
})

const googleDriveOAuthConnected = computed(() => Boolean(oauthStatus.value?.connected))

const canConnectGoogleDrive = computed(() => {
  const hasClientId = Boolean(googleDriveSettings.value.oauth.clientId.trim())
  const hasSecret = Boolean(
    googleDriveSettings.value.oauth.clientSecret.trim()
    || googleDriveSettings.value.oauth.hasStoredClientSecret
  )
  return hasClientId && hasSecret
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

const normalizeGlitchtipSettings = (glitchtip = {}) => ({
  enabled: Boolean(glitchtip.enabled),
  dsn: glitchtip.dsn || '',
  serverUrl: glitchtip.serverUrl || '',
  environment: glitchtip.environment || 'production',
  projectSlug: glitchtip.projectSlug || ''
})

const hasPaymentChanges = computed(() => {
  return JSON.stringify(paymentSettings.value) !== JSON.stringify(originalPaymentSettings.value)
})

const hasGoogleDriveChanges = computed(() => {
  return JSON.stringify(googleDriveSettings.value) !== JSON.stringify(originalGoogleDriveSettings.value)
})

const hasMinioChanges = computed(() => {
  return JSON.stringify(minioSettings.value) !== JSON.stringify(originalMinioSettings.value)
})

const hasGlitchtipChanges = computed(() => {
  return JSON.stringify(glitchtipSettings.value) !== JSON.stringify(originalGlitchtipSettings.value)
})

const isProcessingGoogleDrive = computed(() => {
  return isCreatingBackup.value && activeCloudProcess.value === 'google_drive'
})

const isProcessingMinio = computed(() => {
  return isCreatingBackup.value && activeCloudProcess.value === 'minio'
})

const applySettings = (settingsSource = {}) => {
  currentTransactionSettings.value = clone(settingsSource?.transaction || {})
  currentIntegrationsSettings.value = clone(settingsSource?.integrations || {})

  paymentSettings.value = normalizePaymentSettings(settingsSource?.transaction?.payment || {})
  googleDriveSettings.value = normalizeGoogleDriveSettings(settingsSource?.backup?.googleDrive || {})
  minioSettings.value = normalizeMinioSettings(settingsSource?.backup?.minio || {})
  glitchtipSettings.value = normalizeGlitchtipSettings(settingsSource?.integrations?.glitchtip || {})

  originalPaymentSettings.value = clone(paymentSettings.value)
  originalGoogleDriveSettings.value = clone(googleDriveSettings.value)
  originalGoogleDriveSettings.value.oauth = {
    ...originalGoogleDriveSettings.value.oauth,
    storedClientSecret: settingsSource?.backup?.googleDrive?.oauth?.clientSecret || '',
    storedRefreshToken: settingsSource?.backup?.googleDrive?.oauth?.refreshToken || '',
  }
  originalMinioSettings.value = clone(minioSettings.value)
  originalGlitchtipSettings.value = clone(glitchtipSettings.value)
}

const loadSettings = async () => {
  applySettings(authStore.user?.tenant?.settings || {})

  try {
    const tenantData = await fetchTenantSettings()
    applySettings(tenantData?.settings || {})
  } catch (error) {
    console.error('[IntegrationSettingsTab] Failed to load settings:', error)
  }
}

const sanitizePaymentSettings = () => ({
  enabledGateways: Array.from(new Set(paymentSettings.value.enabledGateways))
    .filter((gateway) => ['Midtrans', 'Stripe'].includes(gateway)),
  paymentTimeout: Number(paymentSettings.value.paymentTimeout) > 0
    ? Number(paymentSettings.value.paymentTimeout)
    : 60,
  midtransConfig: {
    apiKey: paymentSettings.value.midtransConfig.apiKey.trim(),
    clientKey: paymentSettings.value.midtransConfig.clientKey.trim(),
    sandbox: Boolean(paymentSettings.value.midtransConfig.sandbox),
    webhookUrl: paymentSettings.value.midtransConfig.webhookUrl.trim()
  },
  stripeConfig: {
    apiKey: paymentSettings.value.stripeConfig.apiKey.trim(),
    clientKey: paymentSettings.value.stripeConfig.clientKey.trim(),
    sandbox: Boolean(paymentSettings.value.stripeConfig.sandbox),
    webhookUrl: paymentSettings.value.stripeConfig.webhookUrl.trim()
  }
})

const buildBackupSettingsPayload = () => {
  const currentOAuth = originalGoogleDriveSettings.value.oauth || {}
  const nextClientSecret = googleDriveSettings.value.oauth.clientSecret.trim()
    || currentOAuth.storedClientSecret
    || undefined

  const oauthPayload = {
    clientId: googleDriveSettings.value.oauth.clientId.trim(),
  }

  if (nextClientSecret) {
    oauthPayload.clientSecret = nextClientSecret
  }

  if (currentOAuth.storedRefreshToken) {
    oauthPayload.refreshToken = currentOAuth.storedRefreshToken
  }

  return {
    backup: {
      googleDrive: {
        enabled: googleDriveSettings.value.enabled,
        required: googleDriveSettings.value.enabled ? googleDriveSettings.value.required : false,
        folderId: googleDriveSettings.value.folderId.trim(),
        oauth: oauthPayload,
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
        useSsl: minioSettings.value.useSsl,
      },
    },
  }
}

const sanitizeGlitchtipSettings = () => ({
  enabled: Boolean(glitchtipSettings.value.enabled),
  dsn: glitchtipSettings.value.dsn.trim(),
  serverUrl: glitchtipSettings.value.serverUrl.trim(),
  environment: glitchtipSettings.value.environment.trim() || 'production',
  projectSlug: glitchtipSettings.value.projectSlug.trim()
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

const validateGlitchtipSettings = () => {
  if (glitchtipSettings.value.enabled && !glitchtipSettings.value.dsn.trim()) {
    showWarning('DSN wajib diisi saat GlitchTip aktif')
    return false
  }

  return true
}

const saveBackupSettings = async (section, successMessage) => {
  const payload = buildBackupSettingsPayload()
  savingSection.value = section

  try {
    const result = await patchTenantSettings(payload, successMessage)

    if (result.success) {
      const tenantData = await fetchTenantSettings()
      applySettings(tenantData?.settings || {})
      await fetchOAuthStatus()
    }

    return result
  } finally {
    savingSection.value = ''
  }
}

const handleSavePaymentSettings = async () => {
  const nextTransactionSettings = {
    ...clone(currentTransactionSettings.value),
    payment: sanitizePaymentSettings()
  }

  savingSection.value = 'payment'

  try {
    const result = await patchTenantSettings(
      { transaction: nextTransactionSettings },
      'Payment gateway settings updated successfully'
    )

    if (result.success) {
      currentTransactionSettings.value = nextTransactionSettings
      paymentSettings.value = normalizePaymentSettings(nextTransactionSettings.payment)
      originalPaymentSettings.value = clone(paymentSettings.value)
    }
  } finally {
    savingSection.value = ''
  }
}

const handleSaveGoogleDriveSettings = async () => {
  if (!validateGoogleDriveSettings()) return
  await saveBackupSettings('googleDrive', 'Google Drive backup settings updated successfully')
}

const handleSaveMinioSettings = async () => {
  if (!validateMinioSettings()) return
  await saveBackupSettings('minio', 'MinIO backup settings updated successfully')
}

const handleSaveGlitchtipSettings = async () => {
  if (!validateGlitchtipSettings()) return

  const nextIntegrationsSettings = {
    ...clone(currentIntegrationsSettings.value),
    glitchtip: sanitizeGlitchtipSettings()
  }

  savingSection.value = 'glitchtip'

  try {
    const result = await patchTenantSettings(
      { integrations: nextIntegrationsSettings },
      'GlitchTip settings updated successfully'
    )

    if (result.success) {
      currentIntegrationsSettings.value = nextIntegrationsSettings
      glitchtipSettings.value = normalizeGlitchtipSettings(nextIntegrationsSettings.glitchtip)
      originalGlitchtipSettings.value = clone(glitchtipSettings.value)
    }
  } finally {
    savingSection.value = ''
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
    provider === 'google_drive' ? 'googleDrive' : 'minio',
    provider === 'google_drive' ? 'Google Drive settings saved' : 'MinIO settings saved'
  )

  if (!saveResult.success) {
    return
  }

  activeCloudProcess.value = provider

  try {
    await createBackup({ cloudProvider: provider })
  } catch (error) {
    console.error(`[IntegrationSettingsTab] Failed to process ${provider} backup:`, error)
  } finally {
    activeCloudProcess.value = ''
  }
}

const resetPaymentSettings = () => {
  paymentSettings.value = clone(originalPaymentSettings.value)
}

const resetGlitchtipSettings = () => {
  glitchtipSettings.value = clone(originalGlitchtipSettings.value)
}

const formatOAuthDate = (value) => {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID')
  } catch (_) {
    return value
  }
}

const handleConnectGoogleDrive = async () => {
  if (!canConnectGoogleDrive.value) {
    showWarning('Isi Client ID dan Client Secret, lalu simpan terlebih dahulu')
    return
  }

  if (hasGoogleDriveChanges.value) {
    const saved = await saveBackupSettings('googleDrive', 'Kredensial Google Drive disimpan')
    if (!saved.success) return
  }

  const result = await connectOAuth()
  if (result.success) {
    const tenantData = await fetchTenantSettings()
    applySettings(tenantData?.settings || {})
  }
}

const handleTestGoogleDriveOAuth = async () => {
  await testOAuthConnection()
}

const handleDisconnectGoogleDrive = async () => {
  const result = await disconnectOAuth()
  if (result.success) {
    const tenantData = await fetchTenantSettings()
    applySettings(tenantData?.settings || {})
  }
}

watch(
  tenantSettings,
  (newValue) => {
    if (newValue?.settings) {
      applySettings(newValue.settings)
    }
  },
  { deep: true }
)

onMounted(async () => {
  await loadSettings()
  await fetchOAuthStatus()
})
</script>
