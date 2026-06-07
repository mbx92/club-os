<template>
  <dialog ref="modal" class="modal">
    <div class="modal-box w-11/12 max-w-2xl">
      <form method="dialog">
        <button
          class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"
          @click="closeModal"
        >
          ✕
        </button>
      </form>

      <h3 class="mb-4 text-lg font-bold">
        Select {{ modalTitle }}
      </h3>

      <!-- Search Input -->
      <div class="mb-4 form-control">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or specialization..."
          class="w-full input input-bordered"
          autofocus
        />
      </div>

      <!-- Loading State -->
      <div v-if="trainersLoading" class="flex items-center justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTrainers.length === 0" class="py-8 text-center">
        <div class="flex flex-col items-center gap-2">
          <IconUserX class="w-12 h-12 text-base-content/30" />
          <p class="text-base-content/60">
            {{ searchQuery ? 'No trainers match your search' : 'No trainers available' }}
          </p>
        </div>
      </div>

      <!-- Trainers List -->
      <div v-else class="space-y-2 overflow-y-auto max-h-96">
        <div
          v-for="trainer in filteredTrainers"
          :key="trainer.id"
          class="p-4 transition-colors border rounded-lg cursor-pointer border-base-300 hover:bg-base-200"
          :class="{
            'bg-primary/10 border-primary': selectedTrainerId === trainer.id
          }"
          @click="selectTrainer(trainer)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-semibold">
                  {{ trainer.firstName }} {{ trainer.lastName }}
                </h4>
                <span
                  v-if="trainer.status === 'active'"
                  class="badge badge-success badge-sm"
                >
                  Active
                </span>
                <span
                  v-else-if="trainer.status === 'inactive'"
                  class="badge badge-ghost badge-sm"
                >
                  Inactive
                </span>
              </div>
              
              <p v-if="trainer.specialization" class="mt-1 text-sm text-base-content/70">
                {{ trainer.specialization }}
              </p>
              
              <div v-if="trainer.email || trainer.phone" class="flex flex-wrap gap-3 mt-2 text-xs text-base-content/60">
                <span v-if="trainer.email" class="flex items-center gap-1">
                  <IconMail class="w-3 h-3" />
                  {{ trainer.email }}
                </span>
                <span v-if="trainer.phone" class="flex items-center gap-1">
                  <IconPhone class="w-3 h-3" />
                  {{ trainer.phone }}
                </span>
              </div>
            </div>

            <div v-if="selectedTrainerId === trainer.id" class="ml-4">
              <IconCheck class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <!-- No Selection Option -->
      <div class="mt-4">
        <div
          class="p-4 transition-colors border border-dashed rounded-lg cursor-pointer border-base-300 hover:bg-base-200"
          :class="{
            'bg-primary/10 border-primary': selectedTrainerId === null
          }"
          @click="selectTrainer(null)"
        >
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold">No Default Trainer</h4>
              <p class="text-sm text-base-content/60">
                Assign trainer manually later
              </p>
            </div>
            <div v-if="selectedTrainerId === null">
              <IconCheck class="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="mt-6 modal-action">
        <button
          type="button"
          class="btn btn-ghost"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="confirmSelection"
        >
          Select Trainer
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { IconUserX, IconMail, IconPhone, IconCheck } from '@tabler/icons-vue';

const props = defineProps({
  trainers: {
    type: Array,
    default: () => []
  },
  trainersLoading: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  modalTitle: {
    type: String,
    default: 'Trainer'
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const modal = ref(null);
const searchQuery = ref('');
const selectedTrainerId = ref(null);

// Filtered trainers based on search
const filteredTrainers = computed(() => {
  if (!searchQuery.value) {
    return props.trainers || [];
  }
  
  const query = searchQuery.value.toLowerCase();
  return (props.trainers || []).filter(trainer => {
    const fullName = `${trainer.firstName} ${trainer.lastName}`.toLowerCase();
    const specialization = (trainer.specialization || '').toLowerCase();
    const email = (trainer.email || '').toLowerCase();
    return fullName.includes(query) || 
           specialization.includes(query) || 
           email.includes(query);
  });
});

// Watch for modelValue changes to update local state
watch(
  () => props.modelValue,
  (newValue) => {
    selectedTrainerId.value = newValue;
  },
  { immediate: true }
);

// Select trainer
const selectTrainer = (trainer) => {
  selectedTrainerId.value = trainer ? trainer.id : null;
};

// Confirm selection
const confirmSelection = () => {
  emit('update:modelValue', selectedTrainerId.value);
  closeModal();
};

// Open modal
const openModal = () => {
  selectedTrainerId.value = props.modelValue;
  searchQuery.value = '';
  modal.value?.showModal();
};

// Close modal
const closeModal = () => {
  modal.value?.close();
  emit('close');
};

// Expose methods to parent
defineExpose({
  openModal,
  closeModal
});
</script>
