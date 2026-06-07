<route lang="yaml">
meta:
  title: Settings
  layout: default
</route>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Settings</h1>
    </div>

    <!-- Tabs -->
    <div role="tablist" class="tabs tabs-lifted border-b-2 border-base-300">
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'tenant' }"
        @click="activeTab = 'tenant'"
      >
        <IconBuilding class="w-4 h-4 mr-2" />
        Tenant Settings
        <span v-if="activeTab === 'tenant'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'hours' }"
        @click="activeTab = 'hours'"
      >
        <IconClock class="w-4 h-4 mr-2" />
        Working Hours
        <span v-if="activeTab === 'hours'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'transactions' }"
        @click="activeTab = 'transactions'"
      >
        <IconCreditCard class="w-4 h-4 mr-2" />
        Transactions Settings
        <span v-if="activeTab === 'transactions'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'theme' }"
        @click="activeTab = 'theme'"
      >
        <IconPalette class="w-4 h-4 mr-2" />
        Theme Settings
        <span v-if="activeTab === 'theme'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'subscription' }"
        @click="activeTab = 'subscription'"
      >
        <IconReceipt class="w-4 h-4 mr-2" />
        Subscription Details
        <span v-if="activeTab === 'subscription'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'users' }"
        @click="activeTab = 'users'"
      >
        <IconUsers class="w-4 h-4 mr-2" />
        User Management
        <span v-if="activeTab === 'users'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'roles' }"
        @click="activeTab = 'roles'"
      >
        <IconShield class="w-4 h-4 mr-2" />
        Roles & Permissions
        <span v-if="activeTab === 'roles'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'printers' }"
        @click="activeTab = 'printers'"
      >
        <IconPrinter class="w-4 h-4 mr-2" />
        Printer Settings
        <span v-if="activeTab === 'printers'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'templates' }"
        @click="activeTab = 'templates'"
      >
        <IconFileText class="w-4 h-4 mr-2" />
        Receipt Templates
        <span v-if="activeTab === 'templates'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'receiptSettings' }"
        @click="activeTab = 'receiptSettings'"
      >
        <IconSettings class="w-4 h-4 mr-2" />
        Receipt Settings
        <span v-if="activeTab === 'receiptSettings'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
      <a
        role="tab"
        class="tab relative"
        :class="{ 'tab-active': activeTab === 'audit' }"
        @click="activeTab = 'audit'"
      >
        <IconFileAnalytics class="w-4 h-4 mr-2" />
        System & Audit Log
        <span v-if="activeTab === 'audit'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
      </a>
    </div>

    <!-- Tab Content -->
    <div class="mt-6">
      <!-- Tenant Settings Tab -->
      <div v-if="activeTab === 'tenant'" key="tenant">
        <TenantSettingsTab />
      </div>

      <!-- Working Hours Tab -->
      <div v-if="activeTab === 'hours'" key="hours">
        <WorkingHoursTab />
      </div>

      <!-- Transactions Settings Tab -->
      <div v-if="activeTab === 'transactions'" key="transactions">
        <TransactionTab />
      </div>

      <!-- Theme Settings Tab -->
      <div v-if="activeTab === 'theme'" key="theme">
        <ThemeSettingsTab />
      </div>

      <!-- Subscription Details Tab -->
      <div v-if="activeTab === 'subscription'" key="subscription">
        <SubscriptionsTab />
      </div>

      <!-- User Management Tab -->
      <div v-if="activeTab === 'users'" key="users">
        <UserManagementTab />
      </div>

      <!-- Roles & Permissions Tab -->
      <div v-if="activeTab === 'roles'" key="roles">
        <RolesPermissionsTab />
      </div>

      <!-- Printer Settings Tab -->
      <div v-if="activeTab === 'printers'" key="printers">
        <PrinterSettingsTab />
      </div>

      <!-- Receipt Templates Tab -->
      <div v-if="activeTab === 'templates'" key="templates">
        <ReceiptTemplatesTab />
      </div>

      <!-- Receipt Settings Tab -->
      <div v-if="activeTab === 'receiptSettings'" key="receiptSettings">
        <ReceiptSettingsTab />
      </div>

      <!-- System & Audit Log Tab -->
      <div v-if="activeTab === 'audit'" key="audit">
        <SystemAuditTab />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import TenantSettingsTab from '@/components/settings/TenantSettingsTab.vue'
import WorkingHoursTab from '@/components/settings/WorkingHoursTab.vue'
import ThemeSettingsTab from '@/components/settings/ThemeSettingsTab.vue'
import TransactionTab from '@/components/settings/TransactionTab.vue'
import SubscriptionsTab from '@/components/settings/SubscriptionsTab.vue'
import UserManagementTab from '@/components/settings/UserManagementTab.vue'
import RolesPermissionsTab from '@/components/settings/RolesPermissionsTab.vue'
import PrinterSettingsTab from '@/components/settings/PrinterSettingsTab.vue'
import ReceiptTemplatesTab from '@/components/settings/ReceiptTemplatesTab.vue'
import ReceiptSettingsTab from '@/components/settings/ReceiptSettingsTab.vue'
import SystemAuditTab from '@/components/settings/SystemAuditTab.vue'
import {
  IconBuilding,
  IconClock,
  IconPalette,
  IconCreditCard,
  IconReceipt,
  IconUsers,
  IconShield,
  IconPrinter,
  IconFileText,
  IconFileAnalytics,
  IconSettings,
  IconInfoCircle
} from '@tabler/icons-vue'

const isDev = import.meta.env.DEV

// Active tab state
const activeTab = ref('tenant')

if (isDev) {
  console.log('[Settings] Page loaded, active tab:', activeTab.value)
}

watch(activeTab, (newTab) => {
  if (isDev) {
    console.log('[Settings] Tab changed to:', newTab)
  }
})
</script>

