<template>
  <div class="space-y-6 p-6 md:p-8">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-black">Dynasty Theme Test</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-base-content/70">
          Playground untuk mengecek token warna, struktur card, dan `theme-controller` DaisyUI pada theme
          `dynasty-club`.
        </p>
      </div>

      <div class="badge badge-outline badge-lg">{{ currentTheme }}</div>
    </div>

    <div class="card card-border bg-base-100 shadow-xl">
      <div class="card-body gap-5">
        <div>
          <h2 class="card-title">Theme Controller</h2>
          <p class="text-sm text-base-content/70">
            Radio di bawah memakai class `theme-controller` sesuai dokumentasi DaisyUI.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <label class="label cursor-pointer gap-3 rounded-2xl border border-base-300 px-4 py-3">
            <input
              type="radio"
              name="theme-preview"
              value="dynasty-club"
              class="radio radio-primary theme-controller"
              :checked="currentTheme === 'dynasty-club'"
              @change="syncThemeInfo"
            />
            <span class="label-text font-medium">Dynasty Club</span>
          </label>

          <label class="label cursor-pointer gap-3 rounded-2xl border border-base-300 px-4 py-3">
            <input
              type="radio"
              name="theme-preview"
              value="dynasty-club-night"
              class="radio radio-primary theme-controller"
              :checked="currentTheme === 'dynasty-club-night'"
              @change="syncThemeInfo"
            />
            <span class="label-text font-medium">Dynasty Club Night</span>
          </label>

          <label class="label cursor-pointer gap-3 rounded-2xl border border-base-300 px-4 py-3">
            <input
              type="radio"
              name="theme-preview"
              value="corporate"
              class="radio radio-primary theme-controller"
              :checked="currentTheme === 'corporate'"
              @change="syncThemeInfo"
            />
            <span class="label-text font-medium">Corporate</span>
          </label>

          <label class="label cursor-pointer gap-3 rounded-2xl border border-base-300 px-4 py-3">
            <input
              type="radio"
              name="theme-preview"
              value="business"
              class="radio radio-primary theme-controller"
              :checked="currentTheme === 'business'"
              @change="syncThemeInfo"
            />
            <span class="label-text font-medium">Business</span>
          </label>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div class="card card-border bg-base-100 shadow-xl">
        <div class="card-body gap-5">
          <div>
            <h2 class="card-title">Component Preview</h2>
            <p class="text-sm text-base-content/70">Menggunakan pola komponen dari MCP DaisyUI: card, button, alert, checkbox, radio, dan toggle.</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="btn">Default</button>
            <button class="btn btn-primary">Primary</button>
            <button class="btn btn-secondary">Secondary</button>
            <button class="btn btn-accent">Accent</button>
            <button class="btn btn-outline btn-primary">Outline</button>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="label cursor-pointer justify-start gap-3 rounded-2xl border border-base-300 px-4 py-3">
              <input type="checkbox" checked class="checkbox checkbox-primary" />
              <span class="label-text">Primary checkbox</span>
            </label>

            <label class="label cursor-pointer justify-start gap-3 rounded-2xl border border-base-300 px-4 py-3">
              <input type="checkbox" checked class="toggle toggle-primary" />
              <span class="label-text">Primary toggle</span>
            </label>

            <label class="label cursor-pointer justify-start gap-3 rounded-2xl border border-base-300 px-4 py-3">
              <input type="radio" checked name="density" class="radio radio-primary" />
              <span class="label-text">Compact desk layout</span>
            </label>

            <label class="label cursor-pointer justify-start gap-3 rounded-2xl border border-base-300 px-4 py-3">
              <input type="radio" name="density" class="radio radio-secondary" />
              <span class="label-text">Spacious floor layout</span>
            </label>
          </div>

          <div role="alert" class="alert alert-info alert-soft">
            <span>Member check-in feed is active and theme tokens are rendering correctly.</span>
          </div>

          <div role="alert" class="alert alert-success alert-soft">
            <span>Cash register shortcut cards stay readable in both Dynasty modes.</span>
          </div>
        </div>
      </div>

      <div class="card card-border bg-base-100 shadow-xl">
        <div class="card-body gap-5">
          <div>
            <h2 class="card-title">Token Snapshot</h2>
            <p class="text-sm text-base-content/70">Nilai diambil langsung dari computed CSS variables aktif.</p>
          </div>

          <div class="grid gap-3 text-sm font-mono">
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 px-4 py-3">
              <span>--color-primary</span>
              <span class="font-semibold">{{ cssVars.primary }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 px-4 py-3">
              <span>--color-secondary</span>
              <span class="font-semibold">{{ cssVars.secondary }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 px-4 py-3">
              <span>--color-accent</span>
              <span class="font-semibold">{{ cssVars.accent }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 px-4 py-3">
              <span>--color-base-100</span>
              <span class="font-semibold">{{ cssVars.base100 }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-2xl border border-base-300 px-4 py-3">
              <span>--color-base-content</span>
              <span class="font-semibold">{{ cssVars.baseContent }}</span>
            </div>
          </div>

          <div class="card-actions justify-end">
            <button class="btn btn-primary" @click="setTheme('dynasty-club')">Reset Light</button>
            <button class="btn btn-secondary" @click="setTheme('dynasty-club-night')">Go Night</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div class="card card-border bg-base-100 shadow-xl">
        <div class="card-body gap-5">
          <div>
            <h2 class="card-title">Navigation Preview</h2>
            <p class="text-sm text-base-content/70">Badge, menu, tabs, dan dropdown untuk area backoffice.</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <span class="badge badge-primary badge-lg">Active Shift</span>
            <span class="badge badge-secondary badge-lg">Desk Team</span>
            <span class="badge badge-outline badge-lg">Standard Theme</span>
          </div>

          <ul class="menu rounded-box border border-base-300 bg-base-100 p-2">
            <li><a class="menu-active">Dashboard</a></li>
            <li><a>Members</a></li>
            <li><a>Billing</a></li>
          </ul>

          <div role="tablist" class="tabs tabs-box">
            <button role="tab" class="tab tab-active">Overview</button>
            <button role="tab" class="tab">Classes</button>
            <button role="tab" class="tab">Payments</button>
          </div>

          <details class="dropdown">
            <summary class="btn btn-outline btn-primary">Open Actions</summary>
            <ul class="menu dropdown-content z-[1] mt-2 w-56 rounded-box bg-base-100">
              <li><a>Refresh metrics</a></li>
              <li><a>Download report</a></li>
              <li><a>Lock cashier</a></li>
            </ul>
          </details>
        </div>
      </div>

      <div class="card card-border bg-base-100 shadow-xl">
        <div class="card-body gap-5">
          <div>
            <h2 class="card-title">Data Preview</h2>
            <p class="text-sm text-base-content/70">Stats, table, dan form controls dengan surface Dynasty Club.</p>
          </div>

          <div class="stats stats-vertical border border-base-300 lg:stats-horizontal">
            <div class="stat">
              <div class="stat-title">Check-ins</div>
              <div class="stat-value text-primary">184</div>
              <div class="stat-desc">Today</div>
            </div>
            <div class="stat">
              <div class="stat-title">Renewals</div>
              <div class="stat-value text-secondary">29</div>
              <div class="stat-desc">This week</div>
            </div>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-base-300">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Aulia</td>
                  <td><span class="badge badge-success">Active</span></td>
                  <td>Monthly</td>
                </tr>
                <tr>
                  <td>Rama</td>
                  <td><span class="badge badge-warning">Pending</span></td>
                  <td>Annual</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <input class="input input-bordered w-full" placeholder="Search member" />
            <select class="select select-bordered w-full">
              <option>Front desk</option>
              <option>Cashier</option>
            </select>
            <textarea class="textarea textarea-bordered sm:col-span-2" placeholder="Add staff note"></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const currentTheme = ref('dynasty-club')
const cssVars = ref({
  primary: '',
  secondary: '',
  accent: '',
  base100: '',
  baseContent: '',
})

let observer

const updateThemeInfo = () => {
  currentTheme.value = document.documentElement.getAttribute('data-theme') || 'none'

  const styles = getComputedStyle(document.documentElement)
  cssVars.value = {
    primary: styles.getPropertyValue('--color-primary').trim() || 'not set',
    secondary: styles.getPropertyValue('--color-secondary').trim() || 'not set',
    accent: styles.getPropertyValue('--color-accent').trim() || 'not set',
    base100: styles.getPropertyValue('--color-base-100').trim() || 'not set',
    baseContent: styles.getPropertyValue('--color-base-content').trim() || 'not set',
  }
}

const syncThemeInfo = () => {
  window.requestAnimationFrame(updateThemeInfo)
}

const setTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  updateThemeInfo()
}

onMounted(() => {
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', 'dynasty-club')
  }

  updateThemeInfo()

  observer = new MutationObserver(updateThemeInfo)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
