import { defineStore } from 'pinia'

export const useTenantFeaturesStore = defineStore('tenantFeatures', {
  state: () => ({
    mode: 'gym' // Default mode for gym system
  }),
  
  actions: {
    setMode(newMode) {
      this.mode = newMode
    }
  },
  
  getters: {
    currentMode: (state) => state.mode
  }
})