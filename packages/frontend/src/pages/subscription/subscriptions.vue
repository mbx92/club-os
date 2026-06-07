<route lang="yaml">
meta:
  title: Manage Subscriptions
  layout: default
  requiresRole: super-admin
</route>

<template>
  <div>
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-3xl font-bold">Manage Subscriptions</h1>
        <p class="text-base-content/60 mt-1">
          Assign and manage tenant subscriptions
        </p>
      </div>
      <button
        v-if="isSuperAdmin()"
        class="btn btn-primary"
        @click="openCreateModal"
      >
        <IconPlus class="w-4 h-4 mr-2" />
        Assign Subscription
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Search Tenant -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Search Tenant</span>
            </label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by tenant name..."
              class="input input-bordered w-full"
              @input="debouncedSearch"
            />
          </div>

          <!-- Status Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
            </label>
            <select
              v-model="filters.status"
              class="select select-bordered w-full"
              @change="handleSearch"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Sort By -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Sort By</span>
            </label>
            <select
              v-model="filters.sortBy"
              class="select select-bordered w-full"
              @change="handleSearch"
            >
              <option value="endDate">End Date</option>
              <option value="startDate">Start Date</option>
              <option value="tenant">Tenant Name</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Subscriptions Table -->
    <div v-else-if="tenants.length > 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Plan</th>
                <th class="text-right">Price</th>
                <th class="text-center">Period</th>
                <th class="text-center">Days Left</th>
                <th class="text-center">Status</th>
                <th class="text-center">Auto Renew</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredTenants.length === 0">
                <td colspan="8" class="text-center py-8 text-base-content/60">
                  No subscriptions found matching your filters.
                </td>
              </tr>
              <tr v-for="tenant in filteredTenants" :key="tenant.id">
                <!-- Tenant -->
                <td>
                  <div class="flex items-center gap-3">
                    <div v-if="tenant.logo" class="avatar">
                      <div class="w-10 h-10 rounded-lg">
                        <img :src="tenant.logo" :alt="tenant.name" />
                      </div>
                    </div>
                    <div v-else class="avatar placeholder">
                      <div
                        class="bg-neutral text-neutral-content rounded-lg w-10 h-10"
                      >
                        <span class="text-lg">{{
                          tenant.name?.charAt(0)
                        }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-semibold">{{ tenant.name }}</div>
                      <div class="text-sm text-base-content/60">
                        {{ tenant.domain }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Plan -->
                <td>
                  <div v-if="tenant.subscription">
                    <div class="font-semibold">
                      {{ tenant.subscription.plan?.name }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      {{ tenant.subscription.plan?.duration }} days
                    </div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Price -->
                <td class="text-right">
                  <div
                    v-if="tenant.subscription"
                    class="font-bold text-primary"
                  >
                    {{ formatCurrency(tenant.subscription.price) }}
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Period -->
                <td class="text-center">
                  <div v-if="tenant.subscription" class="text-sm">
                    <div>{{ formatDate(tenant.subscription.startDate) }}</div>
                    <div class="text-base-content/60">to</div>
                    <div>{{ formatDate(tenant.subscription.endDate) }}</div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Days Remaining -->
                <td class="text-center">
                  <div v-if="tenant.subscription">
                    <div
                      class="font-semibold"
                      :class="
                        getDaysRemainingClass(tenant.subscription.endDate)
                      "
                    >
                      {{ getDaysRemaining(tenant.subscription.endDate) }}
                    </div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Status -->
                <td class="text-center">
                  <div v-if="tenant.subscription">
                    <div
                      class="badge badge-sm"
                      :class="getStatusBadgeClass(tenant.subscription.status)"
                    >
                      {{ tenant.subscription.status }}
                    </div>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Auto Renew -->
                <td class="text-center">
                  <div v-if="tenant.subscription && isSuperAdmin()">
                    <input
                      type="checkbox"
                      class="toggle toggle-success toggle-sm"
                      :checked="tenant.subscription.autoRenew"
                      @change="toggleAutoRenew(tenant.subscription)"
                      :disabled="actionLoading"
                    />
                  </div>
                  <div v-else-if="tenant.subscription">
                    <span
                      class="badge badge-sm"
                      :class="
                        tenant.subscription.autoRenew
                          ? 'badge-success'
                          : 'badge-ghost'
                      "
                    >
                      {{ tenant.subscription.autoRenew ? "Yes" : "No" }}
                    </span>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>

                <!-- Actions -->
                <td class="text-center">
                  <div
                    v-if="tenant.subscription && isSuperAdmin()"
                    class="flex items-center justify-center gap-1"
                  >
                    <!-- Activate button for pending subscriptions -->
                    <button
                      v-if="tenant.subscription.status === 'pending'"
                      class="btn btn-xs btn-success tooltip"
                      data-tip="Activate"
                      @click="confirmActivateSubscription(tenant)"
                      :disabled="actionLoading"
                    >
                      <IconCheck class="w-4 h-4" />
                    </button>
                    <!-- Renew button -->
                    <button
                      class="btn btn-xs btn-ghost tooltip"
                      data-tip="Renew"
                      @click="openRenewModal(tenant)"
                      :disabled="actionLoading"
                    >
                      <IconRefresh class="w-4 h-4" />
                    </button>
                    <!-- Cancel button -->
                    <button
                      class="btn btn-xs btn-ghost text-error tooltip"
                      data-tip="Cancel"
                      @click="confirmCancelSubscription(tenant)"
                      :disabled="
                        actionLoading ||
                        tenant.subscription.status === 'cancelled'
                      "
                    >
                      <IconX class="w-4 h-4" />
                    </button>
                  </div>
                  <div v-else-if="!tenant.subscription && isSuperAdmin()">
                    <button
                      class="btn btn-xs btn-primary tooltip"
                      data-tip="Assign Plan"
                      @click="openCreateModalForTenant(tenant)"
                    >
                      <IconPlus class="w-4 h-4" />
                    </button>
                  </div>
                  <span v-else class="text-base-content/40">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconFileOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Tenants Found</h3>
        <p class="text-base-content/60 mb-4">
          Create tenants first before assigning subscriptions.
        </p>
      </div>
    </div>

    <!-- Subscription Form Modal -->
    <SubscriptionFormModal
      ref="subscriptionFormModal"
      :tenant="selectedTenant"
      :subscription="editingSubscription"
      :loading="modalLoading"
      @submit="handleSubscriptionSubmit"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  IconPlus,
  IconRefresh,
  IconX,
  IconFileOff,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-vue";
import { useSubscriptions } from "@/composables/subscription/useSubscriptions";
import { useTenants } from "@/composables/admin/useTenants";
import { useInvoices } from "@/composables/subscription/useInvoices";
import { useNotification } from "@/composables/core/useNotification";
import { useDialog } from "@/composables/core/useApi";
import SubscriptionFormModal from "@/components/subscription/SubscriptionFormModal.vue";

// Composables
const {
  loading: subscriptionLoading,
  actionLoading,
  isSuperAdmin,
  fetchTenantSubscription,
  createSubscription,
  updateSubscription,
  activateSubscription,
  cancelSubscription,
  renewSubscription,
  getStatusBadgeClass,
  getDaysUntilExpiry,
} = useSubscriptions();

const { tenants, loading: tenantsLoading, fetchTenants } = useTenants();

const { createInvoice } = useInvoices();

const { showSuccess, showError } = useNotification();
const dialog = useDialog();

const isDev = import.meta.env.DEV;

// Local state
const filters = ref({
  search: "",
  status: "",
  sortBy: "endDate",
});

const selectedTenant = ref(null);
const editingSubscription = ref(null);
const modalLoading = ref(false);
const subscriptionFormModal = ref(null);
let searchTimeout = null;

// Computed
const loading = computed(
  () => tenantsLoading.value || subscriptionLoading.value
);

const filteredTenants = computed(() => {
  let result = [...tenants.value];

  // Filter by search
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      (tenant) =>
        tenant.name?.toLowerCase().includes(search) ||
        tenant.domain?.toLowerCase().includes(search)
    );
  }

  // Filter by status
  if (filters.value.status) {
    result = result.filter(
      (tenant) => tenant.subscription?.status === filters.value.status
    );
  }

  // Sort
  if (filters.value.sortBy === "endDate") {
    result.sort((a, b) => {
      if (!a.subscription) return 1;
      if (!b.subscription) return -1;
      return (
        new Date(a.subscription.endDate) - new Date(b.subscription.endDate)
      );
    });
  } else if (filters.value.sortBy === "startDate") {
    result.sort((a, b) => {
      if (!a.subscription) return 1;
      if (!b.subscription) return -1;
      return (
        new Date(b.subscription.startDate) - new Date(a.subscription.startDate)
      );
    });
  } else if (filters.value.sortBy === "tenant") {
    result.sort((a, b) => a.name?.localeCompare(b.name));
  }

  return result;
});

// Methods
const handleSearch = () => {
  // Filter is reactive, no need to reload
};

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleSearch();
  }, 300);
};

const loadTenantsWithSubscriptions = async () => {
  await fetchTenants();

  // Load subscription for each tenant
  for (const tenant of tenants.value) {
    try {
      const subscription = await fetchTenantSubscription(tenant.id);
      tenant.subscription = subscription;
    } catch (error) {
      tenant.subscription = null;
    }
  }
};

const openCreateModal = () => {
  selectedTenant.value = null;
  editingSubscription.value = null;
  subscriptionFormModal.value?.openModal();
};

const openCreateModalForTenant = (tenant) => {
  selectedTenant.value = tenant;
  editingSubscription.value = null;
  subscriptionFormModal.value?.openModal();
};

const openRenewModal = (tenant) => {
  selectedTenant.value = tenant;
  editingSubscription.value = tenant.subscription;
  subscriptionFormModal.value?.openModal({ isRenewal: true });
};

const handleModalClose = () => {
  selectedTenant.value = null;
  editingSubscription.value = null;
};

// Auto-generate invoice after subscription creation
const autoGenerateInvoice = async (subscription) => {
  try {
    const amount = parseFloat(subscription.price);
    const tax = 0; // Can be calculated based on tenant settings

    const invoiceData = {
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
      amount: amount,
      tax: tax,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      items: [
        {
          description: `${subscription.plan?.name || "Subscription"} - ${
            subscription.plan?.duration || 0
          } days`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ],
      notes: "Payment due within 7 days",
    };

    await createInvoice(invoiceData);
    showSuccess("Invoice generated automatically for the subscription!");
  } catch (error) {
    if (isDev) {
      console.error("Error generating invoice:", error);
    }
    showError(
      "Failed to generate invoice. You can create it manually from the Billing page."
    );
  }
};

const handleSubscriptionSubmit = async (subscriptionData) => {
  modalLoading.value = true;
  try {
    if (subscriptionData.isRenewal) {
      // Renew existing subscription
      const subscription = await renewSubscription(
        editingSubscription.value.id,
        subscriptionData.paymentMethod
      );

      // Auto-generate invoice for renewal
      if (subscription) {
        await autoGenerateInvoice(subscription);
      }
    } else {
      // Create new subscription
      const subscription = await createSubscription({
        tenantId: subscriptionData.tenantId,
        planId: subscriptionData.planId,
        paymentMethod: subscriptionData.paymentMethod,
      });

      // Auto-generate invoice for new subscription
      if (subscription) {
        await autoGenerateInvoice(subscription);
      }
    }

    subscriptionFormModal.value?.closeModal();
    await loadTenantsWithSubscriptions();
  } catch (error) {
    if (isDev) {
      console.error("Error saving subscription:", error);
      console.log("Error data:", error.data);
      console.log("Error response:", error.response);
    }

    // Close modal first before showing dialog
    subscriptionFormModal.value?.closeModal();

    // Check error data structure (ofetch uses error.data)
    const errorData = error.data || error.response?.data;
    
    // Check if error is due to existing subscription
    if (errorData?.existingSubscription) {
      const existing = errorData.existingSubscription;
      const tenantName =
        tenants.value.find((t) => t.id === subscriptionData.tenantId)?.name ||
        "This tenant";

      // Use setTimeout to ensure modal is closed and DOM is ready
      setTimeout(() => {
        dialog
          .confirm({
            title: "Subscription Already Exists",
            isHtml: true,
            message: `
              <div class="space-y-3">
                <p><strong>${tenantName}</strong> already has an existing subscription:</p>
                <div class="bg-base-200 p-4 rounded-lg space-y-2">
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Status:</span>
                    <span class="badge ${existing.status === 'active' ? 'badge-success' : 'badge-warning'}">${existing.status}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">Start Date:</span>
                    <span>${formatDate(existing.startDate)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-base-content/60">End Date:</span>
                    <span>${formatDate(existing.endDate)}</span>
                  </div>
                </div>
                <p class="text-sm text-base-content/60">
                  ${existing.status === "pending"
                    ? "Please activate or cancel the pending subscription before creating a new one."
                    : "You can renew the subscription instead of creating a new one."}
                </p>
              </div>
            `,
            type: "warning",
            showConfirm: false,
            cancelText: "Close",
          })
          .then(() => {
            if (isDev) {
              console.log("Dialog closed");
            }
          })
          .catch((err) => {
            if (isDev) {
              console.error("Dialog error:", err);
            }
          });
      }, 200);
    } else {
      // Show generic error
      showError(
        errorData?.message || error.message || "Failed to create subscription"
      );
    }
  } finally {
    modalLoading.value = false;
  }
};

const toggleAutoRenew = async (subscription) => {
  try {
    await updateSubscription(subscription.id, {
      autoRenew: !subscription.autoRenew,
    });
    await loadTenantsWithSubscriptions();
  } catch (error) {
    if (isDev) {
      console.error("Error toggling auto-renew:", error);
    }
  }
};

const confirmActivateSubscription = async (tenant) => {
  const confirmed = await dialog.confirm({
    title: "Activate Subscription",
    message: `Are you sure you want to activate subscription for "${tenant.name}"? This will change the status from pending to active.`,
    type: "info",
    confirmText: "Activate",
    cancelText: "Cancel",
  });

  if (confirmed) {
    try {
      await activateSubscription(tenant.subscription.id);
      await loadTenantsWithSubscriptions();
    } catch (error) {
      if (isDev) {
        console.error("Error activating subscription:", error);
      }
    }
  }
};

const confirmCancelSubscription = async (tenant) => {
  const confirmed = await dialog.confirm({
    title: "Cancel Subscription",
    message: `Are you sure you want to cancel subscription for "${tenant.name}"? This action cannot be undone.`,
    type: "danger",
    confirmText: "Cancel Subscription",
    cancelText: "Keep Subscription",
  });

  if (confirmed) {
    try {
      await cancelSubscription(tenant.subscription.id);
      await loadTenantsWithSubscriptions();
    } catch (error) {
      if (isDev) {
        console.error("Error cancelling subscription:", error);
      }
    }
  }
};

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getDaysRemaining = (endDate) => {
  const days = getDaysUntilExpiry(endDate);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day";
  return `${days} days`;
};

const getDaysRemainingClass = (endDate) => {
  const days = getDaysUntilExpiry(endDate);
  if (days < 0) return "text-error";
  if (days <= 7) return "text-warning";
  return "text-success";
};

// Lifecycle
onMounted(async () => {
  await loadTenantsWithSubscriptions();
});
</script>
