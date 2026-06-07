<template>
  <div class="space-y-6">
    <!-- Theme Settings Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconPalette class="w-6 h-6" />
          Theme Settings
        </h2>
        
        <div class="alert alert-info mb-4">
          <IconInfoCircle class="w-5 h-5" />
          <span class="text-sm">Theme settings will apply to all users in your tenant: <strong>{{ tenantName }}</strong></span>
        </div>

        <!-- Current Theme Display -->
        <div class="mb-6">
          <div class="text-sm opacity-70 mb-2">Current Theme</div>
          <div class="flex items-center gap-3">
            <div class="badge badge-primary badge-lg">{{ currentPreset.name }}</div>
            <div class="text-sm opacity-70">
              Light: <strong>{{ lightTheme }}</strong> • Dark: <strong>{{ darkTheme }}</strong>
            </div>
          </div>
        </div>

        <!-- Theme Presets -->
        <div class="space-y-3">
          <div class="text-sm font-semibold opacity-70">Choose Theme Preset</div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              class="card border-2 cursor-pointer transition-all hover:shadow-md"
              :class="selectedPreset.id === preset.id ? 'border-primary bg-primary/5' : 'border-base-300'"
              @click="selectPreset(preset)"
            >
              <div class="card-body p-4">
                <div class="flex items-start gap-3">
                  <!-- Color Preview -->
                  <div class="flex gap-1 shrink-0">
                    <div class="w-6 h-6 rounded" :style="{ backgroundColor: preset.preview.primary }"></div>
                    <div class="w-6 h-6 rounded" :style="{ backgroundColor: preset.preview.secondary }"></div>
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold flex items-center gap-2">
                      {{ preset.name }}
                      <IconCheck v-if="selectedPreset.id === preset.id" class="w-4 h-4 text-primary" />
                    </div>
                    <div class="text-xs opacity-70 mt-1">{{ preset.description }}</div>
                    <div class="text-xs opacity-50 mt-1">
                      {{ preset.light }} / {{ preset.dark }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="card-actions justify-end mt-6">
          <button 
            class="btn btn-primary"
            :class="{ 'loading': isLoading }"
            :disabled="isLoading || !hasChanges"
            @click="saveThemeSettings"
          >
            <IconDeviceFloppy v-if="!isLoading" class="w-5 h-5" />
            {{ isLoading ? 'Saving...' : 'Save Theme Settings' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Theme Preview Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title mb-4">
          <IconEye class="w-6 h-6" />
          Theme Preview
          <div class="badge badge-sm">{{ selectedPreset.name }}</div>
        </h2>
        
        <!-- Preview Container with selected theme applied -->
        <div :data-theme="previewLightTheme" class="rounded-lg border-2 border-base-300 bg-base-100 p-6">
          <div class="mb-3 text-sm font-semibold opacity-70">Light Mode Preview:</div>
          <div class="card card-border bg-base-100 shadow-sm">
            <div class="card-body gap-4">
              <div>
                <h3 class="card-title">Front Desk Console</h3>
                <p class="text-sm opacity-70">Preview kartu, tombol aksi, dan form controls pada mode terang.</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary">Secondary</button>
                <button class="btn btn-accent">Accent</button>
                <button class="btn btn-neutral">Neutral</button>
              </div>

              <div class="flex flex-wrap items-center gap-4">
                <input type="checkbox" checked class="checkbox checkbox-primary" />
                <input type="checkbox" checked class="checkbox checkbox-secondary" />
                <input type="radio" name="preview-light" class="radio radio-primary" checked />
                <input type="checkbox" checked class="toggle toggle-primary" />
              </div>

              <div role="alert" class="alert alert-info alert-soft">
                <IconInfoCircle class="w-5 h-5" />
                <span>Info alert with selected theme</span>
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-outline btn-primary">Review Palette</button>
                <button class="btn btn-primary">Apply Feel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dark Mode Preview -->
        <div :data-theme="previewDarkTheme" class="mt-4 rounded-lg border-2 border-base-300 bg-base-100 p-6">
          <div class="mb-3 text-sm font-semibold opacity-70">Dark Mode Preview:</div>
          <div class="card card-border bg-base-100 shadow-sm">
            <div class="card-body gap-4">
              <div>
                <h3 class="card-title">After Hours Operations</h3>
                <p class="text-sm opacity-70">Kontras gelap untuk monitoring check-in, kasir, dan status klub.</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary">Secondary</button>
                <button class="btn btn-accent">Accent</button>
                <button class="btn btn-neutral">Neutral</button>
              </div>

              <div class="flex flex-wrap items-center gap-4">
                <input type="checkbox" checked class="checkbox checkbox-primary" />
                <input type="checkbox" checked class="checkbox checkbox-secondary" />
                <input type="radio" name="preview-dark" class="radio radio-primary" checked />
                <input type="checkbox" checked class="toggle toggle-primary" />
              </div>

              <div role="alert" class="alert alert-success alert-soft">
                <IconInfoCircle class="w-5 h-5" />
                <span>Success alert with selected dark theme</span>
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-outline btn-primary">Check Contrast</button>
                <button class="btn btn-primary">Use This Theme</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTheme } from '@/composables/core/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useNotification } from '@/composables/core/useNotification'
import {
  IconPalette,
  IconInfoCircle,
  IconCheck,
  IconDeviceFloppy,
  IconEye
} from '@tabler/icons-vue'

const isDev = import.meta.env.DEV

if (isDev) {
  console.log('[ThemeSettingsTab] Component loaded')
}

const authStore = useAuthStore()
const { showSuccess, handleError } = useNotification()

onMounted(() => {
  if (isDev) {
    console.log('[ThemeSettingsTab] Component mounted')
    console.log('[ThemeSettingsTab] Current preset:', currentPreset.value)
    console.log('[ThemeSettingsTab] Auth store:', authStore.user)
  }
})
const {
  currentPreset,
  lightTheme,
  darkTheme,
  THEME_PRESETS,
  updateTenantTheme,
  isLoading
} = useTheme()

const tenantName = computed(() => authStore.user?.tenant?.name || 'Your Organization')
const selectedPreset = ref(currentPreset.value)
const hasChanges = computed(() => selectedPreset.value.id !== currentPreset.value.id)

// Preview theme names based on selected preset
const previewLightTheme = computed(() => selectedPreset.value?.light || lightTheme.value)
const previewDarkTheme = computed(() => selectedPreset.value?.dark || darkTheme.value)

// Watch currentPreset to update selectedPreset when theme loads
watch(() => currentPreset.value, (newPreset) => {
  if (newPreset && !hasChanges.value) {
    selectedPreset.value = newPreset
  }
}, { immediate: true })

const selectPreset = (preset) => {
  if (isDev) {
    console.log('[ThemeSettingsTab] Selected preset:', preset)
  }
  selectedPreset.value = preset
}

const saveThemeSettings = async () => {
  if (isDev) {
    console.log('[ThemeSettingsTab] Saving theme:', selectedPreset.value)
  }
  const result = await updateTenantTheme({
    preset: selectedPreset.value.id,
    lightTheme: selectedPreset.value.light,
    darkTheme: selectedPreset.value.dark
  })
  
  if (result.success) {
    showSuccess('Theme settings saved successfully')
  } else {
    handleError(result.error, 'Failed to save theme settings')
  }
}
</script>
