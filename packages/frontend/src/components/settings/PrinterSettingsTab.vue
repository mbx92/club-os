<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold">Printer Settings</h2>
        <p class="text-base-content/60 mt-1">
          Manage thermal printers and receipt configurations
        </p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" @click="openScanModal">
          <IconRadar class="w-4 h-4 mr-2" />
          Scan Network
        </button>
        <button class="btn btn-primary btn-sm" @click="openPrinterModal()">
          <IconPlus class="w-4 h-4 mr-2" />
          Add Printer
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div v-if="statistics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Total Printers</div>
        <div class="stat-value text-primary">{{ statistics.total || 0 }}</div>
        <div class="stat-desc">{{ statistics.active || 0 }} active, {{ statistics.inactive || 0 }} inactive</div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Network Printers</div>
        <div class="stat-value text-info">{{ statistics.byConnection?.network || 0 }}</div>
        <div class="stat-desc">
          USB: {{ statistics.byConnection?.usb || 0 }}, 
          BT: {{ statistics.byConnection?.bluetooth || 0 }}
        </div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">Health Status</div>
        <div class="stat-value text-sm flex gap-2">
          <span class="badge badge-success badge-sm">{{ statistics.healthStatus?.healthy || 0 }}</span>
          <span class="badge badge-warning badge-sm">{{ statistics.healthStatus?.degraded || 0 }}</span>
          <span class="badge badge-error badge-sm">{{ statistics.healthStatus?.unhealthy || 0 }}</span>
        </div>
        <div class="stat-desc">Healthy / Degraded / Unhealthy</div>
      </div>
      <div class="stat bg-base-100 rounded-lg shadow">
        <div class="stat-title">By Type</div>
        <div class="stat-value text-sm">
          <div class="flex gap-1 flex-wrap">
            <span
              v-for="(count, type) in statistics.byType"
              :key="type"
              class="badge badge-sm capitalize"
            >
              {{ type }}: {{ count }}
            </span>
          </div>
        </div>
        <div class="stat-desc">Printer types distribution</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow">
      <div class="card-body py-4">
        <div class="flex flex-wrap gap-2">
          <select
            v-model="filters.printerType"
            class="select select-bordered select-sm"
            @change="loadPrinters"
          >
            <option value="">All Types</option>
            <option value="receipt">Receipt</option>
            <option value="kitchen">Kitchen</option>
            <option value="label">Label</option>
            <option value="invoice">Invoice</option>
            <option value="report">Report</option>
          </select>
          <select
            v-if="filters.printerType === 'kitchen'"
            v-model="filters.printerCategory"
            class="select select-bordered select-sm"
            @change="loadPrinters"
          >
            <option value="">All Categories</option>
            <option value="all">All Items</option>
            <option value="food">Kitchen (Food)</option>
            <option value="beverage">Bar (Beverage)</option>
          </select>
          <select
            v-model="filters.connectionType"
            class="select select-bordered select-sm"
            @change="loadPrinters"
          >
            <option value="">All Connections</option>
            <option value="network">Network</option>
            <option value="usb">USB</option>
            <option value="bluetooth">Bluetooth</option>
            <option value="serial">Serial</option>
          </select>
          <select
            v-model="filters.isActive"
            class="select select-bordered select-sm"
            @change="loadPrinters"
          >
            <option value="">All Status</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search printers..."
            class="input input-bordered input-sm flex-1 min-w-[200px]"
            @input="debouncedSearch"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Printers List -->
    <div
      v-else-if="printers.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="printer in printers"
        :key="printer.id"
        class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
      >
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="card-title text-lg">{{ printer.name }}</h3>
                <div
                  v-if="printer.isDefault"
                  class="badge badge-sm badge-primary"
                >
                  Default
                </div>
                
                <!-- Printer Category Badge (Kitchen/Bar) -->
                <div
                  v-if="printer.printerType === 'kitchen' && printer.printerCategory"
                  class="badge badge-sm gap-1"
                  :class="{
                    'badge-accent': printer.printerCategory === 'all',
                    'badge-warning': printer.printerCategory === 'food',
                    'badge-info': printer.printerCategory === 'beverage',
                  }"
                  :title="`Handles ${printer.printerCategory === 'all' ? 'all items' : printer.printerCategory + ' items'}`"
                >
                  <IconPrinter v-if="printer.printerCategory === 'all'" class="w-3 h-3" />
                  <IconToolsKitchen2 v-else-if="printer.printerCategory === 'food'" class="w-3 h-3" />
                  <IconCup v-else-if="printer.printerCategory === 'beverage'" class="w-3 h-3" />
                  {{ printer.printerCategory === 'all' ? 'All' : printer.printerCategory === 'food' ? 'Kitchen' : 'Bar' }}
                </div>

                <!-- Health Status Badge -->
                <!-- <div 
                  v-if="printer.isActive && healthStatuses[printer.id]?.connected"
                  class="badge badge-xs"
                  :class="getHealthStatusColor(healthStatuses[printer.id]?.status)"
                  :title="healthStatuses[printer.id]?.message"
                >
                  {{ getHealthStatusText(printer.id) }}
                </div> -->

                <!-- Stuck Jobs Warning -->
                <div
                  v-if="healthStatuses[printer.id]?.stuckJobsCount > 0"
                  class="badge badge-xs badge-warning gap-1"
                  :title="`${
                    healthStatuses[printer.id].stuckJobsCount
                  } stuck jobs`"
                >
                  <span>⚠</span>
                  <span>{{ healthStatuses[printer.id].stuckJobsCount }}</span>
                </div>
              </div>

              <div class="space-y-1 text-sm">
                <div class="flex items-center gap-2">
                  <IconPrinter class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Type:</span>
                  <span class="font-semibold capitalize">{{
                    printer.printerType
                  }}</span>
                  <span
                    v-if="printer.printerType === 'kitchen' && printer.printerCategory"
                    class="text-xs text-base-content/60"
                  >
                    ({{ printer.printerCategory === 'all' ? 'All items' : printer.printerCategory === 'food' ? 'Food only' : 'Beverage only' }})
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <IconNetwork class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Connection:</span>
                  <span class="font-semibold capitalize">{{
                    printer.connectionType
                  }}</span>
                </div>
                <div v-if="printer.ipAddress" class="flex items-center gap-2">
                  <IconWorldWww class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">IP:</span>
                  <span class="font-mono"
                    >{{ printer.ipAddress }}:{{ printer.port || 9100 }}</span
                  >
                </div>
                <div v-if="printer.model" class="flex items-center gap-2">
                  <IconDeviceDesktop class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Model:</span>
                  <span>{{ printer.manufacturer }} {{ printer.model }}</span>
                </div>
                <div v-if="printer.paperSize" class="flex items-center gap-2">
                  <IconRuler class="w-4 h-4 text-base-content/60" />
                  <span class="text-base-content/60">Paper:</span>
                  <span>{{ printer.paperSize }}</span>
                </div>
              </div>

              <!-- Statistics -->
              <div
                v-if="
                  healthStatuses[printer.id]?.statistics || printer.statistics
                "
                class="mt-3 pt-3 border-t border-base-300"
              >
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div class="text-base-content/60">Total Jobs</div>
                    <div class="font-bold">
                      {{
                        healthStatuses[printer.id]?.statistics?.total ||
                        printer.statistics?.totalPrintJobs ||
                        0
                      }}
                    </div>
                  </div>
                  <div>
                    <div class="text-base-content/60">Success</div>
                    <div class="font-bold text-success">
                      {{
                        healthStatuses[printer.id]?.statistics?.completed ||
                        printer.statistics?.successfulJobs ||
                        0
                      }}
                    </div>
                  </div>
                  <div>
                    <div class="text-base-content/60">Failed</div>
                    <div class="font-bold text-error">
                      {{
                        healthStatuses[printer.id]?.statistics?.failed ||
                        printer.statistics?.failedJobs ||
                        0
                      }}
                    </div>
                  </div>
                </div>

                <!-- Real-time Health Info -->
                <div
                  v-if="healthStatuses[printer.id]?.statistics"
                  class="mt-2 pt-2 border-t border-base-300"
                >
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div class="text-base-content/60">Success Rate</div>
                      <div class="font-bold text-success">
                        {{ healthStatuses[printer.id].statistics.successRate }}%
                      </div>
                    </div>
                    <div>
                      <div class="text-base-content/60">Avg Duration</div>
                      <div class="font-bold">
                        {{
                          healthStatuses[printer.id].statistics.avgDuration
                        }}ms
                      </div>
                    </div>
                  </div>

                  <!-- Consecutive Failures Warning -->
                  <div
                    v-if="healthStatuses[printer.id].consecutiveFailures > 0"
                    class="mt-2 alert alert-warning py-1 px-2"
                  >
                    <span class="text-xs"
                      >⚠️
                      {{
                        healthStatuses[printer.id].consecutiveFailures
                      }}
                      consecutive failures</span
                    >
                  </div>
                </div>
              </div>

              <!-- Health Status -->
              <div v-if="printer.healthStatus" class="mt-2">
                <div class="flex items-center justify-between gap-2 text-xs">
                  <div class="flex items-center gap-2">
                    <div
                      class="badge badge-xs"
                      :class="{
                        'badge-success': printer.healthStatus === 'healthy',
                        'badge-warning': printer.healthStatus === 'warning',
                        'badge-error': printer.healthStatus === 'error',
                      }"
                    >
                      {{ printer.healthStatus }}
                    </div>
                    <span
                      v-if="printer.lastHealthCheck"
                      class="text-base-content/60"
                    >
                      Last checked:
                      {{ formatRelativeTime(printer.lastHealthCheck) }}
                    </span>
                  </div>
                  
                  <!-- Real-time Connection Status - Footer Right -->
                  <div
                    v-if="printer.isActive && printer.connectionType === 'network'"
                    class="flex items-center gap-1"
                  >
                    <IconPlugConnected
                      class="w-4 h-4"
                      :class="{
                        'text-success animate-pulse':
                          streamStatuses[printer.id]?.online,
                        'text-error':
                          streamStatuses[printer.id]?.connected &&
                          !streamStatuses[printer.id]?.online,
                        'text-base-content/30':
                          !streamStatuses[printer.id]?.connected,
                      }"
                      :title="getStreamStatusTitle(printer.id)"
                    />
                    <span
                      v-if="
                        streamStatuses[printer.id]?.online &&
                        streamStatuses[printer.id]?.latency
                      "
                      class="text-xs text-success font-medium"
                    >
                      {{ streamStatuses[printer.id].latency }}ms
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="dropdown dropdown-end">
              <button tabindex="0" class="btn btn-ghost btn-sm btn-circle">
                <IconDotsVertical class="w-5 h-5" />
              </button>
              <ul
                tabindex="0"
                class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <a @click="testConnection(printer)">
                    <IconPlugConnected class="w-4 h-4" />
                    Test Connection
                  </a>
                </li>
                <li>
                  <a
                    @click="sendTestPrint(printer)"
                    :class="{
                      'pointer-events-none opacity-50':
                        testPrintLoading[printer.id],
                    }"
                  >
                    <IconCircleCheck class="w-4 h-4" />
                    <span v-if="testPrintLoading[printer.id]">Printing...</span>
                    <span v-else>Test Print</span>
                  </a>
                </li>
                <li>
                  <a @click="openPrinterModal(printer)">
                    <IconEdit class="w-4 h-4" />
                    Edit
                  </a>
                </li>
                <li>
                  <a @click="togglePrinterStatus(printer)">
                    <IconPower class="w-4 h-4" />
                    {{ printer.isActive ? "Deactivate" : "Activate" }}
                  </a>
                </li>
                <li v-if="!printer.isDefault && printer.isActive">
                  <a @click="setAsDefault(printer)">
                    <IconStar class="w-4 h-4" />
                    Set as Default
                  </a>
                </li>
                <li class="border-t border-base-300 mt-1 pt-1">
                  <a
                    v-if="activeStreams[printer.id] || activeHealthStreams[printer.id]"
                    @click="handleStopStream(printer)"
                    class="text-warning"
                  >
                    <IconPlayerStop class="w-4 h-4" />
                    Stop Stream
                  </a>
                  <a
                    v-else-if="printer.isActive"
                    @click="handleStartStream(printer)"
                    class="text-info"
                  >
                    <IconPlayerPlay class="w-4 h-4" />
                    Start Stream
                  </a>
                </li>
                <li class="border-t border-base-300 mt-1 pt-1">
                  <a @click="deletePrinter(printer)" class="text-error">
                    <IconTrash class="w-4 h-4" />
                    Delete
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow">
      <div class="card-body text-center py-12">
        <IconPrinterOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Printers Found</h3>
        <p class="text-base-content/60 mb-4">
          Add a printer manually or scan your network to auto-discover printers
        </p>
        <div class="flex gap-2 justify-center">
          <button class="btn btn-outline btn-sm" @click="openScanModal">
            <IconRadar class="w-4 h-4 mr-2" />
            Scan Network
          </button>
          <button class="btn btn-primary btn-sm" @click="openPrinterModal()">
            <IconPlus class="w-4 h-4 mr-2" />
            Add Printer
          </button>
        </div>
      </div>
    </div>

    <!-- Printer Form Modal -->
    <PrinterFormModal
      v-if="showPrinterModal"
      :printer="selectedPrinter"
      @close="closePrinterModal"
      @saved="handlePrinterSaved"
    />

    <!-- Network Scan Modal -->
    <NetworkScanModal
      v-if="showScanModal"
      @close="closeScanModal"
      @printer-selected="handlePrinterFromScan"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { usePrinterSettings } from "@/composables/gym/printer-settings";
import { useNotification } from "@/composables/core/useNotification";
import { useDialog } from "@/composables/core/useApi";
import { api } from "@/plugins/api";
import { usePrinterStream } from "@/composables/gym/usePrinterStream";
import { usePrinterHealth } from "@/composables/gym/usePrinterHealth";
import PrinterFormModal from "@/components/settings/PrinterFormModal.vue";
import NetworkScanModal from "@/components/settings/NetworkScanModal.vue";
import {
  IconPlus,
  IconPrinter,
  IconPrinterOff,
  IconNetwork,
  IconWorldWww,
  IconDeviceDesktop,
  IconRuler,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconPlugConnected,
  IconPower,
  IconStar,
  IconRadar,
  IconCircleCheck,
  IconToolsKitchen2,
  IconCup,
  IconPlayerPlay,
  IconPlayerStop,
} from "@tabler/icons-vue";

const {
  printers,
  statistics,
  loading,
  getPrinters,
  getStatistics,
  updatePrinter,
  deletePrinter: deletePrinterApi,
  testPrinterConnection,
} = usePrinterSettings();

const { showSuccess, showError } = useNotification();
const dialog = useDialog();

const filters = ref({
  printerType: "",
  printerCategory: "", // Kitchen/Bar category filter
  connectionType: "",
  isActive: "",
  search: "",
});

const showPrinterModal = ref(false);
const showScanModal = ref(false);
const selectedPrinter = ref(null);
const testPrintLoading = ref({});
let searchTimeout = null;

// Stream management
const streamStatuses = ref({});
const activeStreams = ref({});
const healthStatuses = ref({});
const activeHealthStreams = ref({});
// Printer IDs that have been manually stopped — skip auto-reinit for these
const pausedStreams = ref(new Set());

/**
 * Initialize stream for a printer
 */
const initializeStream = (printer) => {
  // Only stream for active network printers
  if (!printer.isActive || printer.connectionType !== "network") {
    return;
  }

  // Skip if manually paused by user
  if (pausedStreams.value.has(printer.id)) {
    return;
  }

  // Skip if already streaming
  if (activeStreams.value[printer.id]) {
    return;
  }

  const stream = usePrinterStream(printer.id);
  activeStreams.value[printer.id] = stream;

  // Connect and start monitoring
  stream.connect();

  // Watch for status changes
  watch(
    stream.status,
    (newStatus) => {
      streamStatuses.value[printer.id] = { ...newStatus };
    },
    { deep: true }
  );
};

/**
 * Initialize health stream for a printer
 */
const initializeHealthStream = (printer) => {
  // Only monitor health for active printers
  if (!printer.isActive) {
    return;
  }

  // Skip if manually paused by user
  if (pausedStreams.value.has(printer.id)) {
    return;
  }

  // Skip if already streaming
  if (activeHealthStreams.value[printer.id]) {
    return;
  }

  const healthStream = usePrinterHealth(printer.id);
  activeHealthStreams.value[printer.id] = healthStream;

  // Connect and start monitoring
  healthStream.connect();

  // Watch for health changes
  watch(
    healthStream.health,
    (newHealth) => {
      healthStatuses.value[printer.id] = { ...newHealth };
    },
    { deep: true }
  );
};

/**
 * Cleanup stream for a printer
 */
const cleanupStream = (printerId) => {
  if (activeStreams.value[printerId]) {
    activeStreams.value[printerId].disconnect();
    delete activeStreams.value[printerId];
    delete streamStatuses.value[printerId];
  }
};

/**
 * Cleanup health stream for a printer
 */
const cleanupHealthStream = (printerId) => {
  if (activeHealthStreams.value[printerId]) {
    activeHealthStreams.value[printerId].disconnect();
    delete activeHealthStreams.value[printerId];
    delete healthStatuses.value[printerId];
  }
};

/**
 * Initialize streams for all active network printers
 */
const initializeAllStreams = () => {
  printers.value.forEach((printer) => {
    initializeStream(printer);
    initializeHealthStream(printer);
  });
};

/**
 * Manually stop streams for a printer (user-triggered)
 */
const handleStopStream = (printer) => {
  pausedStreams.value.add(printer.id);
  cleanupStream(printer.id);
  cleanupHealthStream(printer.id);
  showSuccess(`Stream stopped for ${printer.name}`);
};

/**
 * Manually start streams for a printer (user-triggered)
 */
const handleStartStream = (printer) => {
  pausedStreams.value.delete(printer.id);
  initializeStream(printer);
  initializeHealthStream(printer);
  showSuccess(`Stream started for ${printer.name}`);
};

/**
 * Cleanup all streams
 */
const cleanupAllStreams = () => {
  Object.keys(activeStreams.value).forEach((printerId) => {
    cleanupStream(printerId);
  });
  Object.keys(activeHealthStreams.value).forEach((printerId) => {
    cleanupHealthStream(printerId);
  });
};

/**
 * Get stream status title for tooltip
 */
const getStreamStatusTitle = (printerId) => {
  const status = streamStatuses.value[printerId];
  if (!status) return "Monitoring not active";
  if (!status.connected) return "Connecting...";
  if (status.online) return `Online (${status.latency}ms)`;
  return status.error || "Offline";
};

/**
 * Get health status badge color
 */
const getHealthStatusColor = (status) => {
  switch (status) {
    case "healthy":
      return "badge-success";
    case "degraded":
      return "badge-warning";
    case "unhealthy":
      return "badge-error";
    default:
      return "badge-ghost";
  }
};

/**
 * Get health status display text
 */
const getHealthStatusText = (printerId) => {
  const health = healthStatuses.value[printerId];
  if (!health || !health.connected) return "Unknown";
  return health.status.charAt(0).toUpperCase() + health.status.slice(1);
};

const loadPrinters = async () => {
  try {
    await getPrinters(filters.value);
    console.log("[PrinterTab] Printers loaded:", printers.value);
    if (printers.value && printers.value.length > 0) {
      console.log("[PrinterTab] First printer structure:", printers.value[0]);
      console.log(
        "[PrinterTab] First printer keys:",
        Object.keys(printers.value[0])
      );
    }
  } catch (error) {
    showError("Failed to load printers");
  }
};

const loadStatistics = async () => {
  try {
    await getStatistics();
  } catch (error) {
    console.warn("Failed to load statistics:", error);
  }
};

const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadPrinters();
  }, 500);
};

const openPrinterModal = (printer = null) => {
  selectedPrinter.value = printer;
  // Pause & stop streams for the printer being edited so the backend can
  // accept the PUT request without SSE connection conflicts.
  if (printer?.id) {
    pausedStreams.value.add(printer.id);
    cleanupStream(printer.id);
    cleanupHealthStream(printer.id);
    // Give the backend a moment to detect the SSE disconnect before we
    // open the form (avoids PUT hanging while SSE cleanup is in flight).
    setTimeout(() => { showPrinterModal.value = true; }, 400);
  } else {
    showPrinterModal.value = true;
  }
};

const closePrinterModal = () => {
  showPrinterModal.value = false;
  selectedPrinter.value = null;
};

const handlePrinterSaved = async () => {
  // Capture ID before closePrinterModal nulls selectedPrinter
  const savedId = selectedPrinter.value?.id;
  closePrinterModal();
  // Clear pause so the updated printer's streams restart after reload
  if (savedId) {
    pausedStreams.value.delete(savedId);
  }
  await loadPrinters();
  await loadStatistics();
  // Streams will be reinitialized by the watch on printers
};

const openScanModal = () => {
  showScanModal.value = true;
};

const closeScanModal = () => {
  showScanModal.value = false;
};

const handlePrinterFromScan = (printerData) => {
  closeScanModal();
  selectedPrinter.value = {
    ipAddress: printerData.ip,
    port: 9100,
    manufacturer: printerData.printerInfo?.manufacturer || "",
    model: printerData.printerInfo?.model || "",
    connectionType: "network",
    printerType: "receipt",
  };
  openPrinterModal(selectedPrinter.value);
};

const testConnection = async (printer) => {
  try {
    const result = await testPrinterConnection(printer.id);
    console.log("[PrinterTab] Test connection result:", result);

    // Backend returns: { connected: true, healthStatus: 'healthy', printer: {...}, testDetails: {...} }
    if (result && result.connected) {
      const details = result.testDetails;
      const printerInfo = result.printer;
      const message = details
        ? `Printer connected! ${details.manufacturer} ${details.model} at ${printerInfo.ipAddress}:${printerInfo.port} (${details.responseTime}ms)`
        : `Printer connected at ${printerInfo.ipAddress}:${printerInfo.port}`;
      showSuccess(message);
      // Reload printers to update health status in list
      loadPrinters();
    } else {
      showError("Printer connection failed");
    }
  } catch (error) {
    console.error("[PrinterTab] Test connection error:", error);
    showError("Failed to test printer connection");
  }
};

const sendTestPrint = async (printer) => {
  testPrintLoading.value[printer.id] = true;

  try {
    const response = await api.post(
      `/system/printers/${printer.id}/test-print`,
      {
        jobType: "manual",
        metadata: {
          source: "frontend",
          description: "Test print from printer settings",
        },
      }
    );

    if (response.success) {
      const data = response.data;
      showSuccess(`Test print sent! Duration: ${data.duration}ms`);
      console.log("[PrinterTab] Test print success:", {
        jobId: data.jobId,
        duration: data.duration,
        status: data.status,
      });

      // Reload statistics after test print
      await loadStatistics();
    } else {
      showError(response.message || "Test print failed");
    }
  } catch (error) {
    console.error("[PrinterTab] Test print error:", error);
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to send test print";
    showError(message);
  } finally {
    testPrintLoading.value[printer.id] = false;
  }
};

const togglePrinterStatus = async (printer) => {
  try {
    console.log("[PrinterTab] Toggle printer status:", printer);
    console.log("[PrinterTab] Printer ID:", printer.id);
    console.log("[PrinterTab] Printer object keys:", Object.keys(printer));
    await updatePrinter(printer.id, { isActive: !printer.isActive });
    showSuccess(
      `Printer ${printer.isActive ? "deactivated" : "activated"} successfully`
    );
    loadPrinters();
  } catch (error) {
    console.error("[PrinterTab] Toggle printer error:", error);
    showError("Failed to update printer status");
  }
};

const setAsDefault = async (printer) => {
  try {
    await updatePrinter(printer.id, { isDefault: true });
    showSuccess(`${printer.name} set as default printer`);
    loadPrinters();
  } catch (error) {
    showError("Failed to set default printer");
  }
};

const deletePrinter = async (printer) => {
  const confirmed = await dialog.confirm({
    title: "Delete Printer",
    message: `Are you sure you want to delete "${printer.name}"?`,
    description: "This action cannot be undone.",
    type: "danger",
  });

  if (confirmed) {
    try {
      // Cleanup streams before deleting
      cleanupStream(printer.id);
      cleanupHealthStream(printer.id);

      await deletePrinterApi(printer.id);
      showSuccess("Printer deleted successfully");
      await loadPrinters();
      await loadStatistics();
    } catch (error) {
      showError("Failed to delete printer");
    }
  }
};

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

onMounted(async () => {
  await loadPrinters();
  await loadStatistics();
  initializeAllStreams();
});

onUnmounted(() => {
  cleanupAllStreams();
});

// Watch for printer list changes and reinitialize streams for newly added printers.
// Do NOT use { deep: true } — deep watching causes re-init on every health/status
// update, which conflicts with manually-paused streams and SSE edit flow.
watch(
  () => printers.value.map((p) => p.id).join(","),
  () => {
    // Only init streams for printers not already tracked
    initializeAllStreams();
  }
);
</script>
