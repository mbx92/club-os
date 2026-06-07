import { ref, computed, provide, inject } from 'vue'

/**
 * Module context composable (gym / restaurant)
 * Provides and injects the active module context throughout the component tree.
 * Used by SidebarNav, TopBar, and dashboard components to switch color accents.
 *
 * @returns {{ activeModule: Ref<'gym'|'restaurant'>, switchModule: (m: string) => void, isGym: ComputedRef<boolean>, isRestaurant: ComputedRef<boolean>, accentColor: ComputedRef<string> }}
 */

const MODULE_KEY = Symbol('dynasty-module-context')

/**
 * Create and provide module context (call once in AppShell)
 * @param {'gym'|'restaurant'} [initial='gym']
 * @returns ModuleContext
 */
export function useModuleContext(initial = 'gym') {
  const activeModule = ref(initial)

  const isGym = computed(() => activeModule.value === 'gym')
  const isRestaurant = computed(() => activeModule.value === 'restaurant')

  const accentColor = computed(() =>
    activeModule.value === 'gym' ? '#2D6A9F' : '#E8604C'
  )

  const bgClass = computed(() =>
    activeModule.value === 'gym'
      ? 'from-steel-50/60 to-steel-100/40 dark:from-steel-950/80 dark:to-steel-900/60'
      : 'from-coral-50/60 to-coral-100/40 dark:from-coral-950/80 dark:to-coral-900/60'
  )

  const accentClass = computed(() =>
    activeModule.value === 'gym'
      ? 'text-gym dark:text-gym-light'
      : 'text-restaurant dark:text-restaurant-light'
  )

  const accentBgClass = computed(() =>
    activeModule.value === 'gym'
      ? 'bg-gym dark:bg-gym-light text-white'
      : 'bg-restaurant dark:bg-restaurant-light text-white'
  )

  /** Switch active module */
  function switchModule(module) {
    if (module === 'gym' || module === 'restaurant') {
      activeModule.value = module
    }
  }

  const ctx = {
    activeModule,
    isGym,
    isRestaurant,
    accentColor,
    accentClass,
    accentBgClass,
    bgClass,
    switchModule,
  }

  provide(MODULE_KEY, ctx)
  return ctx
}

/**
 * Inject module context from ancestor — call in child components
 * @returns {ModuleContext|null}
 */
export function useInjectedModule() {
  return inject(MODULE_KEY, null)
}
