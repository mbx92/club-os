<template>
  <Teleport to="body">
    <dialog ref="modal" class="modal" :class="{ 'modal-open': true }">
      <div class="modal-box max-w-3xl">
        <form method="dialog">
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            @click="closeModal"
          >
            ✕
          </button>
        </form>

        <h3 class="font-bold text-lg mb-4">
          {{ isEditMode ? "Edit Printer" : "Add New Printer" }}
        </h3>

        <form @submit.prevent="savePrinter" class="space-y-4">
          <!-- Basic Information -->
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text"
                  >Printer Name <span class="text-error">*</span></span
                >
              </label>
              <input
                v-model="form.name"
                type="text"
                class="input input-bordered"
                placeholder="e.g., Receipt Printer Main"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Printer Type</span>
              </label>
              <select v-model="form.printerType" class="select select-bordered">
                <option value="receipt">Receipt</option>
                <option value="kitchen">Kitchen (with category options)</option>
                <option value="label">Label</option>
                <option value="invoice">Invoice</option>
                <option value="report">Report</option>
              </select>
              <label v-if="form.printerType === 'kitchen'" class="label">
                <span class="label-text-alt text-info flex items-center gap-1">
                  <IconInfoCircle class="w-3 h-3" />
                  Kitchen printer category options will appear below
                </span>
              </label>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text"
                  >Connection Type <span class="text-error">*</span></span
                >
              </label>
              <select
                v-model="form.connectionType"
                class="select select-bordered"
                required
              >
                <option value="network">Network</option>
                <option value="usb">USB</option>
                <option value="bluetooth">Bluetooth</option>
                <option value="serial">Serial</option>
              </select>
            </div>
          </div>

          <!-- Printer Category (Kitchen/Bar) -->
          <div
            v-if="form.printerType === 'kitchen'"
            class="space-y-3 p-4 bg-base-200 rounded-lg"
          >
            <h4 class="font-semibold text-sm">Printer Category</h4>
            <p class="text-xs text-base-content/70">
              Select which product categories this printer handles
            </p>
            <div class="grid grid-cols-3 gap-3">
              <!-- All Items -->
              <div
                @click="form.printerCategory = 'all'"
                class="card bg-base-100 cursor-pointer transition-all hover:shadow-md"
                :class="{
                  'ring-2 ring-primary': form.printerCategory === 'all',
                }"
              >
                <div class="card-body p-4 items-center text-center">
                  <IconPrinter class="w-10 h-10 mb-2 mx-auto" />
                  <div class="font-semibold text-sm">All Items</div>
                  <div class="text-xs text-base-content/60">
                    Prints both food and beverage
                  </div>
                  <div
                    v-if="form.printerCategory === 'all'"
                    class="badge badge-primary badge-sm mt-2"
                  >
                    ✓ Selected
                  </div>
                </div>
              </div>

              <!-- Kitchen (Food Only) -->
              <div
                @click="form.printerCategory = 'food'"
                class="card bg-base-100 cursor-pointer transition-all hover:shadow-md"
                :class="{
                  'ring-2 ring-primary': form.printerCategory === 'food',
                }"
              >
                <div class="card-body p-4 items-center text-center">
                  <IconToolsKitchen2 class="w-10 h-10 mb-2 mx-auto" />
                  <div class="font-semibold text-sm">Kitchen</div>
                  <div class="text-xs text-base-content/60">
                    Food items only
                  </div>
                  <div
                    v-if="form.printerCategory === 'food'"
                    class="badge badge-primary badge-sm mt-2"
                  >
                    ✓ Selected
                  </div>
                </div>
              </div>

              <!-- Bar (Beverage Only) -->
              <div
                @click="form.printerCategory = 'beverage'"
                class="card bg-base-100 cursor-pointer transition-all hover:shadow-md"
                :class="{
                  'ring-2 ring-primary': form.printerCategory === 'beverage',
                }"
              >
                <div class="card-body p-4 items-center text-center">
                  <IconCup class="w-10 h-10 mb-2 mx-auto" />
                  <div class="font-semibold text-sm">Bar</div>
                  <div class="text-xs text-base-content/60">
                    Beverage items only
                  </div>
                  <div
                    v-if="form.printerCategory === 'beverage'"
                    class="badge badge-primary badge-sm mt-2"
                  >
                    ✓ Selected
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Network Configuration -->
          <div
            v-if="form.connectionType === 'network'"
            class="space-y-4 p-4 bg-base-200 rounded-lg"
          >
            <h4 class="font-semibold">Network Configuration</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text"
                    >IP Address <span class="text-error">*</span></span
                  >
                </label>
                <input
                  v-model="form.ipAddress"
                  type="text"
                  class="input input-bordered"
                  placeholder="192.168.1.100"
                  required
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Port</span>
                </label>
                <input
                  v-model.number="form.port"
                  type="number"
                  class="input input-bordered"
                  placeholder="9100"
                />
              </div>
            </div>
          </div>

          <!-- Printer Details -->
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Manufacturer</span>
              </label>
              <input
                v-model="form.manufacturer"
                type="text"
                class="input input-bordered"
                placeholder="e.g., Epson"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Model</span>
              </label>
              <input
                v-model="form.model"
                type="text"
                class="input input-bordered"
                placeholder="e.g., TM-T82"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Paper Size</span>
              </label>
              <select v-model="form.paperSize" class="select select-bordered">
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
                <option value="A4">A4</option>
              </select>
            </div>
          </div>

          <!-- Settings -->
          <div class="space-y-2">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  v-model="form.isActive"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Active</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input
                  v-model="form.isDefault"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text">Set as default printer</span>
              </label>
            </div>
          </div>

          <!-- Cash Drawer Settings Info (when not available) -->
          <div
            v-if="form.printerType === 'receipt' && form.connectionType !== 'network'"
            class="alert alert-info"
          >
            <IconInfoCircle class="w-5 h-5" />
            <span class="text-sm">Cash drawer is only supported for network printers</span>
          </div>

          <!-- Cash Drawer Settings (for receipt printer only) -->
          <div
            v-if="form.printerType === 'receipt' && form.connectionType === 'network'"
            class="space-y-4 p-4 bg-base-200 rounded-lg"
          >
            <div>
              <h4 class="font-semibold text-sm">Cash Drawer Settings</h4>
              <p class="text-xs text-base-content/70 mt-1">
                Configure cash drawer connected to this receipt printer
              </p>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  v-model="form.openCashDrawer"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <div class="flex flex-col">
                  <span class="label-text font-medium">Enable Cash Drawer</span>
                  <span class="text-xs text-base-content/60 mt-0.5">
                    Automatically open cash drawer on cash payments
                  </span>
                </div>
              </label>
            </div>

            <div v-if="form.openCashDrawer" class="space-y-4 pl-2">
              <div class="form-control">
                <label class="label pb-2">
                  <span class="label-text font-medium">Drawer Pin Configuration</span>
                  <span class="label-text-alt flex items-center gap-1 text-info">
                    <IconInfoCircle class="w-3 h-3" />
                    Check your cash drawer manual
                  </span>
                </label>
                <div class="flex flex-col gap-2.5">
                  <label 
                    class="cursor-pointer p-3 border-2 rounded-lg hover:bg-base-100 transition-all"
                    :class="form.cashDrawerPin === 0 ? 'bg-base-100 border-primary shadow-sm' : 'border-base-300'"
                  >
                    <div class="flex items-start gap-3">
                      <input
                        v-model.number="form.cashDrawerPin"
                        type="radio"
                        :value="0"
                        class="radio radio-primary mt-0.5"
                      />
                      <div class="flex-1">
                        <div class="font-semibold text-sm">Pin 2 (Default)</div>
                        <p class="text-xs text-base-content/60 mt-0.5">Most Epson-compatible drawers</p>
                      </div>
                    </div>
                  </label>
                  
                  <label 
                    class="cursor-pointer p-3 border-2 rounded-lg hover:bg-base-100 transition-all"
                    :class="form.cashDrawerPin === 1 ? 'bg-base-100 border-primary shadow-sm' : 'border-base-300'"
                  >
                    <div class="flex items-start gap-3">
                      <input
                        v-model.number="form.cashDrawerPin"
                        type="radio"
                        :value="1"
                        class="radio radio-primary mt-0.5"
                      />
                      <div class="flex-1">
                        <div class="font-semibold text-sm">Pin 5</div>
                        <p class="text-xs text-base-content/60 mt-0.5">Some Star Micronics drawers</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    v-model="form.autoCut"
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm"
                  />
                  <span class="label-text">Auto-cut paper after print</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Receipt Template (for receipt type only) -->
          <div
            v-if="form.printerType === 'receipt'"
            class="collapse collapse-arrow bg-base-200"
          >
            <input type="checkbox" />
            <div class="collapse-title font-semibold">
              Receipt Template Settings
            </div>
            <div class="collapse-content space-y-4">
              <!-- Header Settings -->
              <div class="space-y-2">
                <h5 class="font-medium">Header</h5>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.header.showLogo"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Logo</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.header.showBusinessName"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Business Name</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.header.showAddress"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Address</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.header.showPhone"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Phone</span>
                  </label>
                </div>
              </div>

              <!-- Body Settings -->
              <div class="space-y-2">
                <h5 class="font-medium">Body</h5>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Font Size</span>
                  </label>
                  <select
                    v-model="form.receiptTemplate.body.fontSize"
                    class="select select-bordered select-sm"
                  >
                    <option value="small">Small</option>
                    <option value="normal">Normal</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.body.showItemCode"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Item Code</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.body.showDiscount"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Discount</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.body.showTax"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Tax</span>
                  </label>
                </div>
              </div>

              <!-- Footer Settings -->
              <div class="space-y-2">
                <h5 class="font-medium">Footer</h5>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.footer.showThankYou"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Thank You Message</span>
                  </label>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Custom Message</span>
                  </label>
                  <textarea
                    v-model="form.receiptTemplate.footer.customMessage"
                    class="textarea textarea-bordered"
                    rows="2"
                    placeholder="Thank you for your visit!"
                  ></textarea>
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.receiptTemplate.footer.showSocialMedia"
                      type="checkbox"
                      class="checkbox checkbox-sm"
                    />
                    <span class="label-text">Show Social Media</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeModal">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="loading loading-spinner"></span>
              <span v-else>{{ isEditMode ? "Update" : "Create" }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closeModal">
        <button>close</button>
      </form>
    </dialog>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { usePrinterSettings } from "@/composables/gym/printer-settings";
import { useNotification } from "@/composables/core/useNotification";
import {
  IconPrinter,
  IconToolsKitchen2,
  IconCup,
  IconInfoCircle,
} from "@tabler/icons-vue";

const props = defineProps({
  printer: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "saved"]);

const { createPrinter, updatePrinter } = usePrinterSettings();
const { showSuccess, showError } = useNotification();

const modal = ref(null);
const saving = ref(false);
const isEditMode = ref(false);

const form = ref({
  name: "",
  printerType: "receipt",
  printerCategory: "all", // For kitchen printers: all, food, beverage
  connectionType: "network",
  ipAddress: "",
  port: 9100,
  model: "",
  manufacturer: "",
  paperSize: "80mm",
  isActive: true,
  isDefault: false,
  // Cash drawer settings (for receipt printers)
  openCashDrawer: false,
  cashDrawerPin: 0, // 0 = Pin 2, 1 = Pin 5
  autoCut: true,
  receiptTemplate: {
    header: {
      showLogo: true,
      showBusinessName: true,
      showAddress: true,
      showPhone: true,
    },
    body: {
      fontSize: "normal",
      showItemCode: false,
      showDiscount: true,
      showTax: true,
    },
    footer: {
      showThankYou: true,
      customMessage: "Terima kasih atas kunjungan Anda!",
      showSocialMedia: false,
    },
  },
});

const initForm = () => {
  if (props.printer) {
    isEditMode.value = true;
    form.value = {
      ...form.value,
      ...props.printer,
      // Ensure printerCategory has default value for existing printers
      printerCategory: props.printer.printerCategory || 'all',
      // Ensure cash drawer fields have defaults for backward compatibility
      openCashDrawer: props.printer.openCashDrawer ?? false,
      cashDrawerPin: props.printer.cashDrawerPin ?? 0,
      autoCut: props.printer.autoCut ?? true,
      receiptTemplate:
        props.printer.receiptTemplate || form.value.receiptTemplate,
    };
  } else {
    // Reset to default for create mode
    form.value = {
      name: "",
      printerType: "receipt",
      printerCategory: "all",
      connectionType: "network",
      ipAddress: "",
      port: 9100,
      model: "",
      manufacturer: "",
      paperSize: "80mm",
      isActive: true,
      isDefault: false,
      openCashDrawer: false,
      cashDrawerPin: 0,
      autoCut: true,
      receiptTemplate: {
        header: {
          showLogo: true,
          showBusinessName: true,
          showAddress: true,
          showPhone: true,
        },
        body: {
          fontSize: "normal",
          showItemCode: false,
          showDiscount: true,
          showTax: true,
        },
        footer: {
          showThankYou: true,
          customMessage: "Terima kasih atas kunjungan Anda!",
          showSocialMedia: false,
        },
      },
    };
  }
};

// Watch for printer type changes to ensure printerCategory is set
watch(() => form.value.printerType, (newType) => {
  console.log('[PrinterForm] Printer type changed to:', newType);
  console.log('[PrinterForm] Current printerCategory:', form.value.printerCategory);
  console.log('[PrinterForm] Cash drawer visible:', newType === 'receipt' && form.value.connectionType === 'network');
  
  // Auto-set printerCategory to 'all' when changing to kitchen type
  if (newType === 'kitchen' && !form.value.printerCategory) {
    form.value.printerCategory = 'all';
    console.log('[PrinterForm] Auto-set printerCategory to "all"');
  }
});

// Watch for connection type changes to show cash drawer availability
watch(() => form.value.connectionType, (newType) => {
  console.log('[PrinterForm] Connection type changed to:', newType);
  console.log('[PrinterForm] Cash drawer visible:', form.value.printerType === 'receipt' && newType === 'network');
});

const savePrinter = async () => {
  saving.value = true;
  try {
    console.log('[PrinterForm] Saving printer with data:', form.value);
    
    if (isEditMode.value) {
      await updatePrinter(props.printer.id, form.value);
      showSuccess("Printer updated successfully");
    } else {
      await createPrinter(form.value);
      showSuccess("Printer created successfully");
    }
    emit("saved");
  } catch (error) {
    showError(error.message || "Failed to save printer");
  } finally {
    saving.value = false;
  }
};

const closeModal = () => {
  emit("close");
};

onMounted(() => {
  console.log('[PrinterForm] Modal mounted');
  console.log('[PrinterForm] props.printer:', props.printer);
  console.log('[PrinterForm] isEditMode:', isEditMode.value);
  
  initForm();
  
  console.log('[PrinterForm] After initForm:');
  console.log('[PrinterForm] form.printerType:', form.value.printerType);
  console.log('[PrinterForm] form.printerCategory:', form.value.printerCategory);
  console.log('[PrinterForm] Full form:', form.value);
  
  modal.value?.showModal();
});
</script>
