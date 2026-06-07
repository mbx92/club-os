<script setup>
import { computed, ref, watch } from "vue";
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconArmchair,
  IconEdit,
  IconTrash,
  IconList,
  IconGridDots,
  IconMapPin,
} from "@tabler/icons-vue";
import DialogConfirm from "@/components/shared/DialogConfirm.vue";

const props = defineProps({
  tables: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  viewMode: {
    type: String,
    default: "grid",
    validator: (v) => ["grid", "list"].includes(v),
  },
  searchQuery: {
    type: String,
    default: "",
  },
  selectedStatus: {
    type: String,
    default: "",
  },
  selectedLocation: {
    type: String,
    default: "",
  },
  locations: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "update:searchQuery",
  "update:selectedStatus",
  "update:selectedLocation",
  "update:viewMode",
  "create",
  "edit",
  "delete",
  "reserve",
  "release",
  "clean",
]);

const dialogConfirm = ref(null);

// local view mode ref with sync to prop + emit so toggle works both controlled/uncontrolled
const localViewMode = ref(props.viewMode)

// keep internal state in sync when parent updates the prop
watch(() => props.viewMode, (v) => {
  if (v !== localViewMode.value) localViewMode.value = v
})

// emit updates when internal changes
watch(localViewMode, (v) => {
  emit('update:viewMode', v)
})

const handleDelete = async (table) => {
  if (!dialogConfirm.value) {
    // Fallback: emit immediately
    emit("delete", table.id);
    return;
  }

  try {
    const confirmed = await dialogConfirm.value.open({
      title: "Delete Table",
      message: `Are you sure you want to delete ${table.tableNumber}?`,
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      emit("delete", table.id);
    }
  } catch (err) {
    // ignore
    console.error("Dialog confirm error:", err);
  }
};

const handleRelease = async (table) => {
  if (!dialogConfirm.value) {
    // Fallback: emit immediately
    emit("release", table.id);
    return;
  }

  try {
    const confirmed = await dialogConfirm.value.open({
      title: "Mark Table Available",
      message: `Are you sure you want to mark ${table.tableNumber} as available?`,
      type: "success",
      confirmText: "Mark as Available",
      cancelText: "Cancel",
    });

    if (confirmed) {
      emit("release", table.id);
    }
  } catch (err) {
    console.error("Dialog confirm error:", err);
  }
};

const statuses = [
  { value: "available", label: "Available", color: "success" },
  { value: "occupied", label: "Occupied", color: "error" },
  { value: "reserved", label: "Reserved", color: "warning" },
  { value: "cleaning", label: "Cleaning", color: "info" },
];

const getStatusBadgeClass = (status) => {
  const statusObj = statuses.find((s) => s.value === status);
  return statusObj ? `badge-${statusObj.color}` : "badge-ghost";
};

const getStatusLabel = (status) => {
  const statusObj = statuses.find((s) => s.value === status);
  return statusObj ? statusObj.label : status;
};
</script>

<template>
  <div class="space-y-4">
    <!-- Toolbar -->
    <div
      class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
    >
      <!-- Search -->
      <div class="flex-1 w-full sm:max-w-md">
        <label class="flex items-center gap-2 input input-bordered">
          <IconSearch class="w-5 h-5 opacity-70" />
          <input
            type="text"
            placeholder="Search tables..."
            class="grow"
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
          />
        </label>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <!-- View Mode Toggle -->
        <div>
          <button
            class="btn btn-sm"
            :title="localViewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'"
            @click="localViewMode = localViewMode === 'grid' ? 'list' : 'grid'"
          >
            <IconList v-if="localViewMode === 'grid'" class="w-4 h-4" />
            <IconGridDots v-else class="w-4 h-4" />
          </button>
        </div>

        <!-- Create Button -->
        <button class="btn btn-primary btn-sm" @click="$emit('create')">
          <IconPlus class="w-4 h-4 mr-2" />
          Add Table
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <select
        class="w-full select select-bordered select-sm sm:w-auto"
        :value="selectedStatus"
        @change="$emit('update:selectedStatus', $event.target.value)"
      >
        <option value="">All Statuses</option>
        <option
          v-for="status in statuses"
          :key="status.value"
          :value="status.value"
        >
          {{ status.label }}
        </option>
      </select>

      <select
        class="w-full select select-bordered select-sm sm:w-auto"
        :value="selectedLocation"
        @change="$emit('update:selectedLocation', $event.target.value)"
      >
        <option value="">All Locations</option>
        <option
          v-for="location in locations"
          :key="location.id"
          :value="location.id"
        >
          {{ location.name }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="tables.length === 0" class="py-12 text-center">
      <IconArmchair class="w-16 h-16 mx-auto mb-4 text-base-content/30" />
      <h3 class="mb-2 text-lg font-semibold">No tables found</h3>
      <p class="mb-4 text-base-content/60">
        {{
          searchQuery || selectedStatus || selectedLocation
            ? "Try adjusting your filters"
            : "Get started by adding your first table"
        }}
      </p>
      <button
        v-if="!searchQuery && !selectedStatus && !selectedLocation"
        class="btn btn-primary"
        @click="$emit('create')"
      >
        <IconPlus class="w-5 h-5 mr-2" />
        Add Your First Table
      </button>
    </div>

    <!-- Tables Grid or List -->
    <div v-else>
      <div
        v-if="localViewMode === 'grid'"
        class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="table in tables"
          :key="table.id"
          class="transition-shadow shadow-xl card bg-base-100 hover:shadow-2xl"
        >
          <div class="p-4 card-body">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <IconArmchair class="w-5 h-5 text-primary" />
                <h3 class="text-base card-title">{{ table.tableNumber }}</h3>
              </div>
              <div
                :class="['badge badge-sm', getStatusBadgeClass(table.status)]"
              >
                {{ getStatusLabel(table.status) }}
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-base-content/60">Capacity:</span>
                <span class="font-semibold">{{ table.capacity }} guests</span>
              </div>

              <div v-if="table.location" class="text-xs text-base-content/60 mt-1 flex items-center gap-1">
                <IconMapPin class="w-3 h-3" />
                <span>{{ table.location.name }}</span>
              </div>

              <div v-if="table.section" class="text-xs text-base-content/60">
                Section: {{ table.section }}
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-3">
              <div class="mb-1 text-xs text-base-content/60">Actions:</div>
              <div class="flex flex-wrap gap-1">
                <!-- Reserve button for available tables -->
                <button
                  v-if="table.status === 'available'"
                  class="btn btn-xs btn-warning"
                  @click="$emit('reserve', table.id)"
                >
                  Mark as Reserved
                </button>

                <!-- Release button for reserved tables -->
                <button
                  v-if="
                    table.status === 'reserved' || table.status === 'cleaning'
                  "
                  class="btn btn-xs btn-success"
                  @click="handleRelease(table)"
                >
                  Mark as Available
                </button>

                <!-- View order button for occupied tables -->
                <router-link
                  v-if="table.status === 'occupied' && table.currentOrder"
                  :to="`/restaurant/orders/${table.currentOrder.id}`"
                  class="btn btn-xs btn-info"
                >
                  View Order
                </router-link>

                <!-- Set table for cleaning -->
                <button
                  v-if="
                    table.status === 'available' || table.status === 'occupied'
                  "
                  class="btn btn-xs btn-outline"
                  @click="$emit('clean', table.id)"
                  title="Set table for cleaning"
                >
                  Set for Cleaning
                </button>
              </div>
            </div>

            <div class="justify-end gap-2 mt-3 card-actions">
              <button
                class="btn btn-sm btn-ghost"
                @click="$emit('edit', table)"
              >
                <IconEdit class="w-4 h-4" />
              </button>
              <button
                class="btn btn-sm btn-ghost text-error"
                @click="handleDelete(table)"
              >
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="overflow-x-auto">
        <table class="table w-full table-zebra">
          <thead>
            <tr>
              <th>Table</th>
              <th>Location</th>
              <th>Capacity</th>
              <th>Name</th>
              <th>Status</th>
              <th>Update</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="table in tables" :key="table.id" class="hover">
              <td class="font-semibold">{{ table.tableNumber }}</td>
              <td>{{ table.location?.name || "N/A" }}</td>
              <td>{{ table.capacity }}</td>
              <td>{{ table.tableName || "No Name" }}</td>
              <td>
                <div
                  :class="['badge badge-sm', getStatusBadgeClass(table.status)]"
                >
                  {{ getStatusLabel(table.status) }}
                </div>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button
                    v-if="table.status === 'available'"
                    class="btn btn-xs btn-warning"
                    @click="$emit('reserve', table.id)"
                  >
                    Mark as Reserved
                  </button>

                  <button
                    v-if="
                      table.status === 'reserved' || table.status === 'cleaning'
                    "
                    class="btn btn-xs btn-success"
                    @click="handleRelease(table)"
                  >
                    Mark as Available
                  </button>

                  <router-link
                    v-if="table.status === 'occupied' && table.currentOrder"
                    :to="`/restaurant/orders/${table.currentOrder.id}`"
                    class="btn btn-xs btn-info"
                  >
                    View Order
                  </router-link>

                  <button
                    v-if="
                      table.status === 'available' ||
                      table.status === 'occupied'
                    "
                    class="btn btn-xs btn-outline"
                    @click="$emit('clean', table.id)"
                    title="Set table for cleaning"
                  >
                    Set for Cleaning
                  </button>
                </div>

              </td>
              <td>
                <div class="flex gap-2">
                  <button
                    class="btn btn-sm btn-ghost"
                    @click="$emit('edit', table)"
                  >
                    <IconEdit class="w-4 h-4" />
                  </button>
                  <button
                    class="btn btn-sm btn-ghost text-error"
                    @click="handleDelete(table)"
                  >
                    <IconTrash class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <DialogConfirm ref="dialogConfirm" />
  </div>
</template>
