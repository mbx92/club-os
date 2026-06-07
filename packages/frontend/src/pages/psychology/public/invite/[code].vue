<route lang="yaml">
meta:
  title: Undangan Tes
  layout: public
  public: true
</route>

<template>
  <div class="min-h-screen bg-base-200 py-8">
    <div class="container mx-auto px-4 max-w-lg">
      <!-- Loading -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-16"
      >
        <span class="loading loading-spinner loading-lg mb-4"></span>
        <p class="text-base-content/60">Memuat undangan...</p>
      </div>

      <!-- Registration Success -->
      <div v-else-if="registrationSuccess" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-8">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center"
          >
            <IconCheck class="w-10 h-10 text-success" />
          </div>
          <h2 class="text-2xl font-bold mb-2 text-success">
            Registrasi Berhasil!
          </h2>
          <p class="text-base-content/60 mb-6">
            Anda sudah terdaftar dan siap untuk memulai tes.
          </p>

          <!-- Patient Info -->
          <div
            v-if="registrationSuccess.patient"
            class="bg-base-200 rounded-lg p-4 mb-4 text-left"
          >
            <p class="text-sm text-base-content/60 mb-1">Terdaftar sebagai:</p>
            <p class="font-medium">
              {{ registrationSuccess.patient.fullName }}
            </p>
            <p class="text-sm text-base-content/60">
              {{ registrationSuccess.patient.email }}
            </p>
          </div>

          <!-- Access Token -->
          <div class="bg-base-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-base-content/60 mb-2">
              Kode Akses Tes Anda:
            </p>
            <div class="flex items-center justify-center gap-2">
              <code
                class="text-lg font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg"
              >
                {{ registrationSuccess.token }}
              </code>
              <button
                @click="copyToken"
                class="btn btn-ghost btn-sm btn-square"
                :class="{ 'text-success': copied }"
              >
                <IconCheck v-if="copied" class="w-5 h-5" />
                <IconCopy v-else class="w-5 h-5" />
              </button>
            </div>
            <p class="text-xs text-base-content/50 mt-2">
              Simpan kode ini untuk mengakses tes Anda nanti
            </p>
          </div>

          <!-- Expiry Info -->
          <div
            v-if="registrationSuccess.expiresAt"
            class="text-sm text-base-content/60 mb-4"
          >
            Berlaku hingga: {{ formatDate(registrationSuccess.expiresAt) }}
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button @click="goToTest" class="btn btn-primary btn-block">
              <IconExternalLink class="w-5 h-5" />
              Mulai Tes Sekarang
            </button>
            <a
              :href="registrationSuccess.url"
              target="_blank"
              class="btn btn-outline btn-block"
            >
              Klik disini jika halaman tes tidak muncul
            </a>
          </div>

          <!-- Direct Link -->
          <div class="mt-4 p-3 bg-base-200 rounded-lg">
            <p class="text-xs text-base-content/50 mb-1">
              Atau buka link berikut di browser:
            </p>
            <a
              :href="registrationSuccess.url"
              class="text-sm text-primary break-all hover:underline"
            >
              {{ registrationSuccess.fullUrl }}
            </a>
          </div>
        </div>
      </div>

      <!-- Already Registered -->
      <div v-else-if="alreadyRegistered" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-8">
          <div
            class="w-20 h-20 mx-auto mb-4 rounded-full bg-info/20 flex items-center justify-center"
          >
            <IconCheck class="w-10 h-10 text-info" />
          </div>
          <h2 class="text-2xl font-bold mb-2">Anda Sudah Terdaftar</h2>
          <p class="text-base-content/60 mb-6">
            Anda sudah pernah mendaftar untuk tes ini sebelumnya.
          </p>

          <!-- If we have existing access data -->
          <div v-if="existingAccess" class="space-y-4 mb-6">
            <div class="bg-success/10 border border-success/30 rounded-lg p-4">
              <p class="text-sm text-base-content/70 mb-2">Kode Akses Anda:</p>
              <div class="flex items-center justify-center gap-2">
                <code
                  class="text-lg font-mono font-bold text-success bg-success/10 px-4 py-2 rounded-lg"
                >
                  {{ existingAccess.token }}
                </code>
                <button
                  @click="copyExistingToken"
                  class="btn btn-ghost btn-sm btn-square"
                  :class="{ 'text-success': copied }"
                >
                  <IconCheck v-if="copied" class="w-5 h-5" />
                  <IconCopy v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <button @click="goToExistingTest" class="btn btn-primary btn-block">
              <IconExternalLink class="w-5 h-5" />
              Lanjutkan Tes Sekarang
            </button>
          </div>

          <!-- If no existing access, show input -->
          <div v-else class="bg-base-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-base-content/70 mb-3">
              Untuk mengakses tes Anda, silakan masukkan kode akses yang
              diberikan saat registrasi.
            </p>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Kode Akses</span>
              </label>
              <div class="join w-full">
                <input
                  type="text"
                  v-model="accessToken"
                  placeholder="Contoh: XXXX-XXXX-XXXX"
                  class="input input-bordered join-item flex-1 uppercase"
                  @keyup.enter="goToTestWithToken"
                />
                <button
                  @click="goToTestWithToken"
                  class="btn btn-primary join-item"
                  :disabled="!accessToken"
                >
                  Akses Tes
                </button>
              </div>
            </div>
          </div>

          <div class="divider">informasi</div>

          <div class="text-sm text-base-content/60 space-y-2">
            <p>💡 Kode akses diberikan saat Anda pertama kali mendaftar.</p>
            <p>📧 Cek email Anda untuk menemukan kode akses.</p>
            <p>📞 Jika lupa, hubungi administrator untuk bantuan.</p>
          </div>

          <button @click="resetAndTryAgain" class="btn btn-outline btn-sm mt-6">
            Kembali ke Halaman Undangan
          </button>
        </div>
      </div>

      <!-- Invalid/Expired -->
      <div v-else-if="error" class="card bg-base-100 shadow-xl">
        <div class="card-body text-center py-12">
          <IconAlertTriangle class="w-16 h-16 mx-auto text-error mb-4" />
          <h2 class="text-2xl font-bold mb-2">Undangan Tidak Valid</h2>
          <p class="text-base-content/60">{{ error }}</p>
        </div>
      </div>

      <!-- Invitation Content -->
      <div v-else-if="invitation">
        <!-- Organization Header -->
        <div class="text-center mb-8">
          <div
            v-if="invitation.organization?.logo"
            class="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden"
          >
            <img
              :src="invitation.organization.logo"
              :alt="invitation.organization?.name"
              class="w-full h-full object-cover"
            />
          </div>
          <h1 class="text-3xl font-bold mb-2">
            {{ invitation.invitation?.name || "Undangan Tes Psikologi" }}
          </h1>
          <p v-if="invitation.organization?.name" class="text-base-content/60">
            {{ invitation.organization.name }}
          </p>
        </div>

        <!-- Welcome Message -->
        <div
          v-if="invitation.invitation?.welcomeMessage"
          class="alert alert-info mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <p>{{ invitation.invitation.welcomeMessage }}</p>
        </div>

        <!-- Description -->
        <div v-if="invitation.invitation?.description" class="mb-6">
          <p class="text-base-content/80">
            {{ invitation.invitation.description }}
          </p>
        </div>

        <!-- Invitation Details -->
        <div class="card bg-base-100 shadow-xl mb-6">
          <div class="card-body">
            <h2 class="card-title mb-4">Detail Undangan</h2>

            <div class="space-y-3">
              <!-- Package info -->
              <template v-if="invitation.package">
                <div class="flex justify-between">
                  <span class="text-base-content/60">Paket Tes</span>
                  <span class="font-medium">{{ invitation.package.name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Jumlah Tes</span>
                  <span
                    >{{
                      invitation.package.totalTests ||
                      invitation.package.tests?.length ||
                      0
                    }}
                    tes</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/60">Total Durasi</span>
                  <span>{{ invitation.package.totalMinutes || 0 }} menit</span>
                </div>
              </template>

              <div class="flex justify-between">
                <span class="text-base-content/60">Berlaku Hingga</span>
                <span :class="{ 'text-error': isExpired }">{{
                  formatDate(invitation.expiresAt)
                }}</span>
              </div>

              <!-- Remaining slots -->
              <div
                v-if="
                  invitation.remainingSlots !== undefined &&
                  invitation.remainingSlots !== null
                "
                class="flex justify-between"
              >
                <span class="text-base-content/60">Sisa Kuota</span>
                <span
                  :class="{
                    'text-warning': invitation.remainingSlots <= 5,
                    'text-error': invitation.remainingSlots === 0,
                  }"
                >
                  {{ invitation.remainingSlots }} slot tersedia
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Test Types List -->
        <div
          v-if="testTypesList.length > 0"
          class="card bg-base-100 shadow-xl mb-6"
        >
          <div class="card-body">
            <h2 class="card-title mb-4">Jenis Tes</h2>

            <div class="space-y-3">
              <div
                v-for="(test, index) in testTypesList"
                :key="test.code || index"
                class="flex items-center gap-4 p-3 bg-base-200 rounded-lg"
              >
                <div class="avatar">
                  <div
                    class="w-12 h-12 rounded-lg bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0 relative"
                  >
                    <IconClipboard
                      class="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    />
                  </div>
                </div>
                <div class="flex-1">
                  <h3 class="font-medium">{{ test.name }}</h3>
                  <p class="text-sm text-base-content/60">
                    {{
                      test.estimatedMinutes ||
                      test.estimatedDuration ||
                      test.durationMinutes ||
                      0
                    }}
                    menit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Registration Form -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title mb-4">Daftar Sekarang</h2>

            <form @submit.prevent="register">
              <div class="space-y-4">
                <!-- Full Name -->
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Nama Lengkap <span class="text-error">*</span></span
                    >
                  </label>
                  <input
                    type="text"
                    v-model="form.fullName"
                    placeholder="Masukkan nama lengkap"
                    class="input input-bordered w-full"
                    :class="{ 'input-disabled': isSinglePatient }"
                    :disabled="isSinglePatient"
                    required
                  />
                  <label v-if="isSinglePatient" class="label">
                    <span class="label-text-alt text-base-content/60">Data dari undangan pasien</span>
                  </label>
                </div>

                <!-- Email -->
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Email <span class="text-error">*</span></span
                    >
                  </label>
                  <input
                    type="email"
                    v-model="form.email"
                    placeholder="Masukkan alamat email"
                    class="input input-bordered w-full"
                    :class="{ 'input-disabled': isSinglePatient }"
                    :disabled="isSinglePatient"
                    required
                  />
                  <label v-if="isSinglePatient" class="label">
                    <span class="label-text-alt text-base-content/60">Data dari undangan pasien</span>
                  </label>
                </div>

                <!-- Phone -->
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium"
                      >No. Telepon
                      <span v-if="isFieldRequired('phone')" class="text-error"
                        >*</span
                      ></span
                    >
                  </label>
                  <input
                    type="tel"
                    v-model="form.phone"
                    placeholder="Masukkan nomor telepon"
                    class="input input-bordered w-full"
                    :class="{ 'input-disabled': isSinglePatient }"
                    :disabled="isSinglePatient"
                    :required="isFieldRequired('phone')"
                  />
                  <label v-if="isSinglePatient" class="label">
                    <span class="label-text-alt text-base-content/60">Data dari undangan pasien</span>
                  </label>
                </div>

                <!-- Date of Birth -->
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Tanggal Lahir
                      <span
                        v-if="isFieldRequired('birthDate')"
                        class="text-error"
                        >*</span
                      ></span
                    >
                  </label>
                  <input
                    type="date"
                    v-model="form.birthDate"
                    class="input input-bordered w-full"
                    :required="isFieldRequired('birthDate')"
                  />
                </div>

                <!-- Education -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Pendidikan</span>
                  </label>
                  <select
                    v-model="form.education"
                    class="select select-bordered w-full"
                  >
                    <option value="">Pilih pendidikan</option>
                    <option value="SMA">SMA/SMK</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>

                <!-- Occupation -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Pekerjaan</span>
                  </label>
                  <input
                    v-model="form.occupation"
                    type="text"
                    placeholder="Masukkan pekerjaan"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- Corporate -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Perusahaan/Instansi</span>
                  </label>
                  <input
                    v-model="form.corporate"
                    type="text"
                    placeholder="Masukkan nama perusahaan/instansi"
                    class="input input-bordered w-full"
                  />
                </div>

                <!-- sex -->
                <div class="form-control w-full">
                  <label class="label">
                    <span class="label-text font-medium"
                      >Jenis Kelamin
                      <span v-if="isFieldRequired('sex')" class="text-error"
                        >*</span
                      ></span
                    >
                  </label>
                  <div class="flex gap-4 mt-1">
                    <label class="label cursor-pointer justify-start gap-2">
                      <input
                        type="radio"
                        name="sex"
                        value="male"
                        v-model="form.sex"
                        class="radio radio-primary"
                        :required="isFieldRequired('sex')"
                      />
                      <span class="label-text">Laki-laki</span>
                    </label>
                    <label class="label cursor-pointer justify-start gap-2">
                      <input
                        type="radio"
                        name="sex"
                        value="female"
                        v-model="form.sex"
                        class="radio radio-primary"
                      />
                      <span class="label-text">Perempuan</span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-block mt-6"
                :disabled="
                  registering || isExpired || invitation.remainingSlots === 0
                "
              >
                <span
                  v-if="registering"
                  class="loading loading-spinner loading-sm"
                ></span>
                {{ registering ? "Mendaftar..." : "Daftar & Mulai Tes" }}
              </button>

              <p v-if="isExpired" class="text-error text-center mt-4">
                Undangan ini sudah kadaluarsa
              </p>
              <p
                v-else-if="invitation.remainingSlots === 0"
                class="text-error text-center mt-4"
              >
                Kuota undangan sudah habis
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IconAlertTriangle,
  IconClipboard,
  IconCheck,
  IconCopy,
  IconExternalLink,
} from "@tabler/icons-vue";
import { usePsychologyPublic } from "@/composables/psychology";

const route = useRoute();
const router = useRouter();

const {
  invitation,
  loading,
  error,
  getInvitationInfo,
  registerViaInvitation,
  formatDate,
} = usePsychologyPublic();

const registering = ref(false);
const registrationSuccess = ref(null); // Store success data
const alreadyRegistered = ref(false); // User already registered
const existingAccess = ref(null); // Store existing access data if already registered
const copied = ref(false);

const form = reactive({
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  sex: "",
  education: "",
  occupation: "",
  corporate: "",
});

const accessToken = ref("");

const isExpired = computed(() => {
  if (!invitation.value?.expiresAt) return false;
  return new Date(invitation.value.expiresAt) < new Date();
});

// Check if this is single patient invitation
const isSinglePatient = computed(() => {
  // Check if invitation has patient data (from backend)
  if (invitation.value?.patient) {
    return true;
  }
  
  // Temporary fallback: check if invitationType is single_patient
  if (invitation.value?.invitation?.invitationType === 'single_patient') {
    return true;
  }
  
  return false;
});

// Watch invitation to auto-fill patient data
watch(invitation, (newInvitation) => {
  if (newInvitation && newInvitation.patient) {
    // Auto-fill patient data if available
    const patient = newInvitation.patient;
    form.fullName = patient.name || patient.fullName || '';
    form.email = patient.email || '';
    form.phone = patient.phone || '';
    // Optional: auto-fill other fields if available
    if (patient.birthDate) {
      form.birthDate = patient.birthDate;
    }
    if (patient.sex) {
      form.sex = patient.sex;
    }
  }
}, { immediate: true });

// Get test types list from package.tests
const testTypesList = computed(() => {
  if (!invitation.value) return [];

  // New API structure: package.tests
  if (invitation.value.package?.tests) {
    return invitation.value.package.tests;
  }

  // Fallback for old structure
  if (invitation.value.package?.testTypes) {
    return invitation.value.package.testTypes;
  }

  return [];
});

// Check if a field is required based on registration.requiredFields
const isFieldRequired = (fieldName) => {
  const requiredFields = invitation.value?.registration?.requiredFields || [];
  return requiredFields.includes(fieldName);
};

const loadInvitation = async () => {
  const code = route.params.code;
  await getInvitationInfo(code);
  
  // Auto-fill form if patient data is available
  if (invitation.value?.patient) {
    const patient = invitation.value.patient;
    form.fullName = patient.name || patient.fullName || '';
    form.email = patient.email || '';
    form.phone = patient.phone || '';
    if (patient.birthDate) {
      form.birthDate = patient.birthDate;
    }
    if (patient.sex) {
      form.sex = patient.sex;
    }
  }
};

const register = async () => {
  registering.value = true;
  try {
    // Build payload with personalData structure for education/occupation/corporate
    const payload = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null,
      birthDate: form.birthDate || null,
      sex: form.sex || null,
      personalData: {
        education: form.education || '',
        occupation: form.occupation || '',
        corporate: form.corporate || ''
      }
    };
    
    const result = await registerViaInvitation(route.params.code, payload);

    // Check for access token in the response
    if (result?.access?.token) {
      // Always use our frontend URL path, ignore API's url field
      const testUrl = `/psychology/public/access/${result.access.token}`;
      registrationSuccess.value = {
        token: result.access.token,
        url: testUrl,
        fullUrl: window.location.origin + testUrl,
        expiresAt: result.access.expiresAt,
        patient: result.patient,
        orderNumber: result.order?.orderNumber,
        totalTests: result.totalTests,
      };

      // Try to redirect
      router.push(testUrl);
    } else if (result?.accessToken) {
      // Fallback for old response structure
      const testUrl = `/psychology/public/access/${result.accessToken}`;
      registrationSuccess.value = {
        token: result.accessToken,
        url: testUrl,
        fullUrl: window.location.origin + testUrl,
      };
      router.push(testUrl);
    }
  } catch (err) {
    console.error("Registration error:", err);
    // Check if it's "already registered" error
    const errorMsg = err.message?.toLowerCase() || "";
    if (
      errorMsg.includes("already registered") ||
      errorMsg.includes("sudah terdaftar")
    ) {
      alreadyRegistered.value = true;
      error.value = null; // Clear error to show alreadyRegistered UI

      // Check if error response contains access data
      if (err.access?.token) {
        existingAccess.value = {
          token: err.access.token,
          url: `/psychology/public/access/${err.access.token}`,
          expiresAt: err.access.expiresAt,
        };
      }
    }
  } finally {
    registering.value = false;
  }
};

const goToTestWithToken = () => {
  if (accessToken.value) {
    const token = accessToken.value.trim().toUpperCase();
    router.push(`/psychology/public/access/${token}`);
  }
};

const goToExistingTest = () => {
  if (existingAccess.value?.url) {
    router.push(existingAccess.value.url);
  }
};

const copyExistingToken = async () => {
  if (existingAccess.value?.token) {
    try {
      await navigator.clipboard.writeText(existingAccess.value.token);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
};

const resetAndTryAgain = () => {
  alreadyRegistered.value = false;
  existingAccess.value = null;
  error.value = null;
  accessToken.value = "";
};

const copyToken = async () => {
  if (registrationSuccess.value?.token) {
    try {
      await navigator.clipboard.writeText(registrationSuccess.value.token);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }
};

const goToTest = () => {
  if (registrationSuccess.value?.url) {
    window.location.href = registrationSuccess.value.url;
  }
};

onMounted(() => {
  loadInvitation();
});
</script>
