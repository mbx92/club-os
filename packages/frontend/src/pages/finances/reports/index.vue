<route lang="yaml">
meta:
  title: Financial Reports
  layout: default
</route>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold">Financial Reports</h1>
      <p class="text-base-content/60 mt-1">Access comprehensive financial reports and analytics</p>
    </div>

    <!-- Report Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Profit & Loss Report -->
      <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <div class="flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <IconChartBar class="w-8 h-8 text-success" />
          </div>
          <h2 class="card-title">Profit & Loss</h2>
          <p class="text-base-content/60 mb-4">
            View comprehensive P&L analysis with revenue, expenses, and net profit breakdown
          </p>
          <div class="card-actions">
            <router-link to="/finances/reports/profit-loss" class="btn btn-primary btn-block">
              View Report
            </router-link>
          </div>
        </div>
      </div>

      <!-- Revenue Report -->
      <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <div class="flex items-center justify-center w-16 h-16 rounded-full bg-info/10 mb-4">
            <IconChartLine class="w-8 h-8 text-info" />
          </div>
          <h2 class="card-title">Revenue Report</h2>
          <p class="text-base-content/60 mb-4">
            Detailed revenue breakdown by module, period, and payment method
          </p>
          <div class="card-actions">
            <router-link to="/finances/reports/revenue" class="btn btn-primary btn-block">
              View Report
            </router-link>
          </div>
        </div>
      </div>

      <!-- Expense Report -->
      <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <div class="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 mb-4">
            <IconReportMoney class="w-8 h-8 text-error" />
          </div>
          <h2 class="card-title">Expense Report</h2>
          <p class="text-base-content/60 mb-4">
            Analyze expenses by category, period, and status with detailed breakdown
          </p>
          <div class="card-actions">
            <router-link to="/finances/reports/expenses" class="btn btn-primary btn-block">
              View Report
            </router-link>
          </div>
        </div>
      </div>

      <!-- Service Commission Report -->
      <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
        <div class="card-body">
          <div class="flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 mb-4">
            <IconUserStar class="w-8 h-8 text-warning" />
          </div>
          <h2 class="card-title">Komisi Layanan</h2>
          <p class="text-base-content/60 mb-4">
            Laporan pendapatan layanan, komisi trainer, dan pendapatan usaha per periode atau trainer
          </p>
          <div class="card-actions">
            <router-link to="/finances/reports/service-commission" class="btn btn-primary btn-block">
              View Report
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-4">Quick Overview</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Expenses (MTD)</div>
            <div class="stat-value text-error text-2xl">-</div>
            <div class="stat-desc">Month to date</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Total Revenue (MTD)</div>
            <div class="stat-value text-success text-2xl">-</div>
            <div class="stat-desc">Month to date</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Net Profit (MTD)</div>
            <div class="stat-value text-info text-2xl">-</div>
            <div class="stat-desc">Month to date</div>
          </div>
        </div>

        <div class="stats shadow">
          <div class="stat">
            <div class="stat-title">Profit Margin (MTD)</div>
            <div class="stat-value text-primary text-2xl">-</div>
            <div class="stat-desc">Month to date</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info mt-8">
      <IconInfoCircle class="w-5 h-5" />
      <div>
        <h3 class="font-bold">Report Information</h3>
        <div class="text-sm">
          All financial reports are based on completed transactions and approved/paid expenses. 
          Use the filters in each report to customize your analysis.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  IconChartBar,
  IconChartLine,
  IconReportMoney,
  IconInfoCircle,
  IconUserStar
} from '@tabler/icons-vue'
</script>
