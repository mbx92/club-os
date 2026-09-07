<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-5xl max-h-[90vh]">
      <form method="dialog">
        <button
          class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="mb-4 text-lg font-bold">
        {{ isEditMode ? "Edit Service Plan" : "Create New Service Plan" }}
      </h3>

      <form @submit.prevent="handleSubmit">
        <div class="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] px-2">
          <!-- Service Type Section -->
          <div>
            <h4 class="mb-3 text-base font-semibold">Service Type</h4>
            <div class="w-full form-control">
              <label class="label">
                <span class="font-medium label-text"
                  >Service Type <span class="text-error">*</span></span
                >
              </label>
              <select
                v-model="formData.serviceType"
                class="w-full select select-bordered"
                :class="{ 'select-error': errors.serviceType }"
                :disabled="isEditMode"
                required
                @change="onServiceTypeChange"
              >
                <option value="" disabled>Select service type</option>
                <option value="membership">Membership</option>
                <option value="class_package">Paket Kelas</option>
                <option value="pt_package">Paket PT</option>
                <option value="spa_package">Paket Spa</option>
                <option value="custom">Add-on</option>
              </select>
              <label v-if="errors.serviceType" class="label">
                <span class="label-text-alt text-error">{{
                  errors.serviceType
                }}</span>
              </label>
            </div>
          </div>

          <!-- Basic Information Section -->
          <div>
            <h4 class="mb-3 text-base font-semibold">Basic Information</h4>
            <div class="space-y-4">
              <!-- Plan Name -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text"
                    >Plan Name <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="e.g., 30 Days Gym Membership, 10x Yoga Package"
                  class="w-full input input-bordered"
                  :class="{ 'input-error': errors.name }"
                  required
                />
                <label v-if="errors.name" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.name
                  }}</span>
                </label>
              </div>

              <!-- Description -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Description</span>
                </label>
                <textarea
                  v-model="formData.description"
                  placeholder="Describe the plan features and benefits"
                  class="w-full h-20 resize-none textarea textarea-bordered"
                />
              </div>
            </div>
          </div>

          <!-- Pricing Section -->
          <div>
            <h4 class="mb-3 text-base font-semibold">Pricing</h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Price -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text"
                    >Price <span class="text-error">*</span></span
                  >
                </label>
                <CurrencyInput
                  v-model="formData.price"
                  :min="0"
                  placeholder="500000"
                  :input-class="errors.price ? 'w-full input input-bordered input-error' : 'w-full input input-bordered'"
                  required
                />
                <label v-if="errors.price" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.price
                  }}</span>
                </label>
              </div>

              <!-- Currency -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Currency</span>
                </label>
                <input
                  v-model="formData.currency"
                  type="text"
                  placeholder="IDR"
                  class="w-full input input-bordered"
                  readonly
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60"
                    >Inherited from tenant settings</span
                  >
                </label>
              </div>
            </div>
          </div>

          <!-- Duration Type Section -->
          <div>
            <h4 class="mb-3 text-base font-semibold">Duration Configuration</h4>
            <div class="w-full mb-4 form-control">
              <label class="label">
                <span class="font-medium label-text"
                  >Duration Type <span class="text-error">*</span></span
                >
              </label>
              <select
                v-model="formData.durationType"
                class="w-full select select-bordered"
                :class="{ 'select-error': errors.durationType }"
                required
              >
                <option
                  v-if="formData.serviceType === 'membership'"
                  value="time_based"
                >
                  Time Based (Days)
                </option>
                <option value="session_based">Session Based</option>
              </select>
            </div>

            <!-- Time-based configuration -->
            <div
              v-if="formData.durationType === 'time_based'"
              class="w-full form-control"
            >
              <label class="label">
                <span class="font-medium label-text"
                  >Duration (Days) <span class="text-error">*</span>
                </span>
              </label>
              <input
                v-model.number="formData.duration"
                type="number"
                min="1"
                placeholder="30"
                class="w-full input input-bordered"
                :class="{ 'input-error': errors.duration }"
                required
              />
              <label v-if="errors.duration" class="label">
                <span class="label-text-alt text-error">{{
                  errors.duration
                }}</span>
              </label>
            </div>

            <!-- Session-based configuration -->
            <div
              v-if="formData.durationType === 'session_based'"
              class="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text"
                    >Number of Sessions <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model.number="formData.sessions"
                  type="number"
                  min="1"
                  placeholder="10"
                  class="w-full input input-bordered"
                  :class="{ 'input-error': errors.sessions }"
                  required
                />
                <label v-if="errors.sessions" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.sessions
                  }}</span>
                </label>
              </div>

              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text"
                    >Validity Period (Days)
                    <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model.number="formData.validityDays"
                  type="number"
                  min="1"
                  placeholder="30"
                  class="w-full input input-bordered"
                  :class="{ 'input-error': errors.validityDays }"
                  required
                />
                <label v-if="errors.validityDays" class="label">
                  <span class="label-text-alt text-error">{{
                    errors.validityDays
                  }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Access Control Section -->
          <div v-if="formData.serviceType">
            <h4 class="mb-3 text-base font-semibold">Access Control</h4>

            <!-- Membership Access Control -->
            <div v-if="formData.serviceType === 'membership'" class="space-y-4">
              <!-- Facilities -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Facilities</span>
                </label>
                <input
                  v-model="facilitiesInput"
                  type="text"
                  placeholder="e.g., gym, pool, sauna (comma-separated)"
                  class="w-full input input-bordered"
                  @blur="updateFacilities"
                />
                <div
                  v-if="formData.accessControl.facilities?.length > 0"
                  class="flex flex-wrap gap-2 mt-2"
                >
                  <div
                    v-for="(facility, index) in formData.accessControl
                      .facilities"
                    :key="index"
                    class="gap-2 badge badge-primary"
                  >
                    {{ facility }}
                    <button type="button" @click="removeFacility(index)">
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <!-- Max Check-ins -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Max Check-ins</span>
                </label>
                <input
                  v-model.number="formData.accessControl.maxCheckIns"
                  type="number"
                  min="0"
                  placeholder="30 (0 for unlimited)"
                  class="w-full input input-bordered"
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60"
                    >Maximum number of check-ins allowed (0 = unlimited)</span
                  >
                </label>
              </div>
            </div>

            <!-- Class Package Access Control -->
            <div
              v-if="formData.serviceType === 'class_package'"
              class="space-y-4"
            >
              <!-- Applicable Class Types -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text"
                    >Applicable Class Types</span
                  >
                </label>
                <input
                  v-model="classTypesInput"
                  type="text"
                  placeholder="e.g., yoga, pilates, zumba (comma-separated)"
                  class="w-full input input-bordered"
                  @blur="updateClassTypes"
                />
                <div
                  v-if="formData.accessControl.applicableClassTypes?.length > 0"
                  class="flex flex-wrap gap-2 mt-2"
                >
                  <div
                    v-for="(classType, index) in formData.accessControl
                      .applicableClassTypes"
                    :key="index"
                    class="gap-2 badge badge-secondary"
                  >
                    {{ classType }}
                    <button type="button" @click="removeClassType(index)">
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <!-- Requires Trainer Assignment -->
              <label
                class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
              >
                <input
                  v-model="formData.accessControl.requiresTrainerAssignment"
                  type="checkbox"
                  class="checkbox"
                />
                <span class="label-text">Requires Trainer Assignment</span>
              </label>

              <!-- Default Trainer Selection (if requires trainer) -->
              <div
                v-if="formData.accessControl.requiresTrainerAssignment"
                class="w-full form-control"
              >
                <label class="label">
                  <span class="font-medium label-text">Default Trainer</span>
                </label>
                <button
                  type="button"
                  class="justify-start w-full btn btn-bordered"
                  :class="{ 'btn-primary': formData.trainerId }"
                  @click="openTrainerModal"
                >
                  <span v-if="selectedTrainerName" class="font-normal">
                    {{ selectedTrainerName }}
                  </span>
                  <span v-else class="font-normal text-base-content/50">
                    Click to select trainer
                  </span>
                </button>
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    Optional: Select a default trainer for this package
                  </span>
                </label>
              </div>
            </div>

            <!-- PT Package Access Control -->
            <div v-if="formData.serviceType === 'pt_package'" class="space-y-4">
              <label
                class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
              >
                <input
                  v-model="formData.accessControl.requiresTrainerAssignment"
                  type="checkbox"
                  class="checkbox"
                  checked
                />
                <span class="label-text">Requires Trainer Assignment</span>
              </label>

              <!-- Default Trainer Selection -->
              <div
                v-if="formData.accessControl.requiresTrainerAssignment"
                class="w-full form-control"
              >
                <label class="label">
                  <span class="font-medium label-text">Default Trainer</span>
                </label>
                <button
                  type="button"
                  class="justify-start w-full btn btn-bordered"
                  :class="{ 'btn-primary': formData.trainerId }"
                  @click="openTrainerModal"
                >
                  <span v-if="selectedTrainerName" class="font-normal">
                    {{ selectedTrainerName }}
                  </span>
                  <span v-else class="font-normal text-base-content/50">
                    Click to select trainer
                  </span>
                </button>
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    Optional: Select a default trainer for this package
                  </span>
                </label>
              </div>
            </div>

            <!-- Spa Package Access Control -->
            <div
              v-if="formData.serviceType === 'spa_package'"
              class="space-y-4"
            >
              <label
                class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
              >
                <input
                  v-model="formData.accessControl.requiresTrainerAssignment"
                  type="checkbox"
                  class="checkbox"
                />
                <span class="label-text">Requires Therapist Assignment</span>
              </label>

              <!-- Default Therapist Selection (if requires therapist) -->
              <div
                v-if="formData.accessControl.requiresTrainerAssignment"
                class="w-full form-control"
              >
                <label class="label">
                  <span class="font-medium label-text">Default Therapist</span>
                </label>
                <button
                  type="button"
                  class="justify-start w-full btn btn-bordered"
                  :class="{ 'btn-primary': formData.trainerId }"
                  @click="openTrainerModal"
                >
                  <span v-if="selectedTrainerName" class="font-normal">
                    {{ selectedTrainerName }}
                  </span>
                  <span v-else class="font-normal text-base-content/50">
                    Click to select therapist
                  </span>
                </button>
                <label class="label">
                  <span class="label-text-alt text-base-content/60">
                    Optional: Select a default therapist for this package
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Settings Section -->
          <div>
            <h4 class="mb-3 text-base font-semibold">Display Settings</h4>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <!-- Display Order -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Display Order</span>
                </label>
                <input
                  v-model.number="formData.displayOrder"
                  type="number"
                  min="1"
                  placeholder="1"
                  class="w-full input input-bordered"
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/60"
                    >Lower numbers appear first</span
                  >
                </label>
              </div>

              <!-- Popular Flag -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Popular Plan</span>
                </label>
                <label
                  class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
                >
                  <input
                    v-model="formData.isPopular"
                    type="checkbox"
                    class="checkbox checkbox-warning"
                  />
                  <span class="label-text">Mark as popular</span>
                </label>
              </div>

              <!-- Walk-in Eligible Flag -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Walk-in Eligible</span>
                </label>
                <label
                  class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
                >
                  <input
                    v-model="formData.allowWalkIn"
                    type="checkbox"
                    class="checkbox checkbox-secondary"
                  />
                  <div>
                    <span class="label-text">Tersedia untuk Walk-in</span>
                    <p class="text-xs text-base-content/50 mt-0.5">Tampil di POS saat tipe pelanggan Walk-in dipilih</p>
                  </div>
                </label>
              </div>

              <!-- Pax -->
              <div class="w-full form-control">
                <label class="label">
                  <span class="font-medium label-text">Pax</span>
                </label>
                <input
                  v-model.number="formData.pax"
                  type="number"
                  min="1"
                  placeholder="Jumlah orang per transaksi, contoh: 2 (untuk paket couple)"
                  class="w-full input input-bordered"
                />
                <label class="label">
                  <span class="label-text-alt text-base-content/50">Isi jika 1 transaksi mencakup lebih dari 1 orang (misal: couple = 2)</span>
                </label>
              </div>
            </div>

            <!-- Active Status -->
            <div class="w-full mt-4 form-control">
              <label class="label">
                <span class="font-medium label-text">Status</span>
              </label>
              <label
                class="justify-start w-full gap-3 px-4 py-3 border rounded-lg cursor-pointer label border-base-300"
              >
                <input
                  v-model="formData.isActive"
                  type="checkbox"
                  class="toggle toggle-success"
                />
                <span class="label-text">{{
                  formData.isActive ? "Active" : "Inactive"
                }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            @click="closeModal"
            :disabled="loading"
          >
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ isEditMode ? "Update Plan" : "Create Plan" }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>

  <!-- Trainer Selection Modal -->
  <TrainerSelectionModal
    ref="trainerModal"
    v-model="formData.trainerId"
    :trainers="trainers"
    :trainers-loading="trainersLoading"
    :modal-title="
      formData.serviceType === 'spa_package' ? 'Therapist' : 'Trainer'
    "
    @update:model-value="handleTrainerSelected"
  />
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useServicePlans } from "@/composables/gym/service-management/useServicePlans";
import { useTrainers } from "@/composables/gym/trainer-management/useTrainers";
import TrainerSelectionModal from "@/components/gym/services/TrainerSelectionModal.vue";
import CurrencyInput from "@/components/shared/CurrencyInput.vue";

const props = defineProps({
  plan: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  defaultServiceType: {
    type: String,
    default: null,
    validator: (value) =>
      !value ||
      [
        "membership",
        "class_package",
        "pt_package",
        "spa_package",
        "custom",
      ].includes(value),
  },
});

const emit = defineEmits(["submit", "close"]);

const modal = ref(null);
const trainerModal = ref(null);
const errors = ref({});

// Service plan composable
const { getDefaultPlanData } = useServicePlans();

// Trainers composable
const { trainers, loading: trainersLoading, fetchTrainers } = useTrainers();

// Form data
const formData = ref(
  getDefaultPlanData(props.defaultServiceType || "membership")
);

// Helper inputs for arrays
const facilitiesInput = ref("");
const classTypesInput = ref("");

const isEditMode = computed(() => !!props.plan);

// Get selected trainer name for display
const selectedTrainerName = computed(() => {
  if (!formData.value.trainerId) return null;
  const trainer = trainers.value?.find(
    (t) => t.id === formData.value.trainerId
  );
  return trainer ? `${trainer.firstName} ${trainer.lastName}` : null;
});

// Check if requires trainer is checked
const requiresTrainerChecked = computed(() => {
  return formData.value.accessControl?.requiresTrainerAssignment === true;
});

// Initialize form with plan data if editing
watch(
  () => props.plan,
  (newPlan) => {
    if (newPlan) {
      formData.value = {
        serviceType: newPlan.serviceType || "membership",
        name: newPlan.name || "",
        description: newPlan.description || "",
        price: parseFloat(newPlan.price) || 0,
        currency: newPlan.currency || "IDR",
        durationType: newPlan.durationType || "time_based",
        duration: newPlan.duration || null,
        sessions: newPlan.sessions || null,
        validityDays: newPlan.validityDays || null,
        accessControl: { ...newPlan.accessControl } || {},
        trainerId: newPlan.trainerId || null,
        isActive: newPlan.isActive ?? true,
        isPopular: newPlan.isPopular ?? false,
        allowWalkIn: newPlan.allowWalkIn ?? false,
        pax: newPlan.pax ?? null,
        displayOrder: newPlan.displayOrder || 1,
        isBundle: newPlan.isBundle || false,
        bundledServices: newPlan.bundledServices || null,
      };

      // Initialize helper inputs
      if (newPlan.accessControl?.facilities) {
        facilitiesInput.value = newPlan.accessControl.facilities.join(", ");
      }
      if (newPlan.accessControl?.applicableClassTypes) {
        classTypesInput.value =
          newPlan.accessControl.applicableClassTypes.join(", ");
      }
    }
  },
  { immediate: true }
);

// Watch for requiresTrainerAssignment to load trainers
watch(
  () => formData.value.accessControl?.requiresTrainerAssignment,
  async (requiresTrainer) => {
    if (requiresTrainer && trainers.value.length === 0) {
      try {
        await fetchTrainers({
          status: "all",
          page: 1,
          limit: 100,
        });
      } catch (error) {
        console.error("Error loading trainers:", error);
      }
    }
  }
);

// Ensure time-based duration is only used for membership plans
watch(
  () => formData.value.serviceType,
  (serviceType) => {
    if (
      serviceType !== "membership" &&
      formData.value.durationType === "time_based"
    ) {
      formData.value.durationType = "session_based";
      formData.value.duration = null;
    }
  }
);

// Handle service type change
const onServiceTypeChange = () => {
  const defaultData = getDefaultPlanData(formData.value.serviceType);
  formData.value.durationType = defaultData.durationType;
  formData.value.duration = defaultData.duration;
  formData.value.sessions = defaultData.sessions;
  formData.value.validityDays = defaultData.validityDays;
  formData.value.accessControl = { ...defaultData.accessControl };
  facilitiesInput.value = "";
  classTypesInput.value = "";
};

// Update facilities array from input
const updateFacilities = () => {
  if (facilitiesInput.value.trim()) {
    formData.value.accessControl.facilities = facilitiesInput.value
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }
};

// Remove facility
const removeFacility = (index) => {
  formData.value.accessControl.facilities.splice(index, 1);
  facilitiesInput.value = formData.value.accessControl.facilities.join(", ");
};

// Update class types array from input
const updateClassTypes = () => {
  if (classTypesInput.value.trim()) {
    formData.value.accessControl.applicableClassTypes = classTypesInput.value
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }
};

// Remove class type
const removeClassType = (index) => {
  formData.value.accessControl.applicableClassTypes.splice(index, 1);
  classTypesInput.value =
    formData.value.accessControl.applicableClassTypes.join(", ");
};

// Validate form
const validateForm = () => {
  errors.value = {};

  if (!formData.value.serviceType) {
    errors.value.serviceType = "Service type is required";
  }

  if (!formData.value.name || formData.value.name.trim() === "") {
    errors.value.name = "Plan name is required";
  }

  if (!formData.value.price || formData.value.price <= 0) {
    errors.value.price = "Price must be greater than 0";
  }

  if (!formData.value.durationType) {
    errors.value.durationType = "Duration type is required";
  }

  if (formData.value.durationType === "time_based") {
    if (!formData.value.duration || formData.value.duration <= 0) {
      errors.value.duration =
        "Duration must be greater than 0 for time-based plans";
    }
  }

  if (formData.value.durationType === "session_based") {
    if (!formData.value.sessions || formData.value.sessions <= 0) {
      errors.value.sessions =
        "Sessions must be greater than 0 for session-based plans";
    }
    if (!formData.value.validityDays || formData.value.validityDays <= 0) {
      errors.value.validityDays =
        "Validity days must be greater than 0 for session-based plans";
    }
  }

  return Object.keys(errors.value).length === 0;
};

// Handle form submission
const handleSubmit = () => {
  if (facilitiesInput.value.trim()) {
    updateFacilities();
  }
  if (classTypesInput.value.trim()) {
    updateClassTypes();
  }

  if (!validateForm()) {
    return;
  }

  const submitData = {
    serviceType: formData.value.serviceType,
    name: formData.value.name,
    description: formData.value.description,
    price: formData.value.price,
    currency: formData.value.currency,
    durationType: formData.value.durationType,
    duration:
      formData.value.durationType === "time_based"
        ? formData.value.duration
        : null,
    sessions:
      formData.value.durationType === "session_based"
        ? formData.value.sessions
        : null,
    validityDays:
      formData.value.durationType === "session_based"
        ? formData.value.validityDays
        : null,
    accessControl: formData.value.accessControl,
    trainerId: formData.value.trainerId || null,
    isActive: formData.value.isActive,
    isPopular: formData.value.isPopular,
    allowWalkIn: formData.value.allowWalkIn,
    pax: formData.value.pax || null,
    displayOrder: formData.value.displayOrder,
    isBundle: formData.value.isBundle,
    bundledServices: formData.value.bundledServices,
  };

  emit("submit", submitData);
};

// Open modal
const openModal = () => {
  errors.value = {};
  modal.value?.showModal();
};

// Close modal
const closeModal = () => {
  modal.value?.close();
  emit("close");
};

// Reset form
const resetForm = () => {
  formData.value = getDefaultPlanData(props.defaultServiceType || "membership");
  facilitiesInput.value = "";
  classTypesInput.value = "";
  errors.value = {};
};

// Open trainer selection modal
const openTrainerModal = async () => {
  // Load trainers if not already loaded
  if (trainers.value.length === 0) {
    await fetchTrainers({
      status: "all",
      page: 1,
      limit: 100,
    });
  }
  trainerModal.value?.openModal();
};

// Handle trainer selection from modal
const handleTrainerSelected = (trainerId) => {
  formData.value.trainerId = trainerId;
};

// Expose methods to parent
defineExpose({
  openModal,
  closeModal,
  resetForm,
});
</script>
