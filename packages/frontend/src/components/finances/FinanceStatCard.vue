<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: [Object, Function, String],
    default: null
  },
  iconColor: {
    type: String,
    default: 'text-primary'
  },
  trend: {
    type: String,
    default: '', // 'up', 'down', or ''
    validator: (value) => ['', 'up', 'down'].includes(value)
  },
  trendValue: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow h-full">
    <div class="card-body relative overflow-hidden flex flex-col">
      <div class="flex items-start justify-between relative z-10">
        <div class="flex-1">
          <h3 class="text-sm font-medium text-base-content/60 uppercase tracking-wide">
            {{ title }}
          </h3>
          
          <div v-if="loading" class="mt-3">
            <div class="loading loading-spinner loading-md"></div>
          </div>
          
          <div v-else class="mt-3">
            <div class="text-3xl font-bold text-base-content">
              {{ value }}
            </div>
            
            <div v-if="description || trend" class="flex items-center gap-2 mt-2">
              <p v-if="description" class="text-sm text-base-content/60">
                {{ description }}
              </p>
              
              <div v-if="trend" class="flex items-center gap-1">
                <span 
                  v-if="trend === 'up'" 
                  class="text-success text-xs flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span v-if="trendValue">{{ trendValue }}</span>
                </span>
                
                <span 
                  v-if="trend === 'down'" 
                  class="text-error text-xs flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span v-if="trendValue">{{ trendValue }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="icon" class="absolute top-6 right-6" :class="[iconColor, 'opacity-20']">
        <component :is="icon" class="w-12 h-12" />
      </div>
      
      <div v-if="link && !loading" class="mt-auto pt-4 text-center">
        <router-link 
          :to="link" 
          class="text-xs font-bold hover:underline inline-flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
        >
          View Details →
        </router-link>
      </div>
    </div>
  </div>
</template>
