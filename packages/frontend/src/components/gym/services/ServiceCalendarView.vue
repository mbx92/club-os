<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">{{ title }}</h1>
        <p class="text-base-content/60 mt-1">{{ subtitle }}</p>
      </div>
      <div class="flex gap-2">
        <slot name="header-actions">
          <router-link :to="listViewLink" class="btn btn-primary btn-outline">
            <IconList class="w-5 h-5 mr-2" />
            List View
          </router-link>
        </slot>
      </div>
    </div>

    <!-- Calendar Controls -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <!-- Month Navigation -->
          <div class="flex items-center gap-4">
            <button 
              class="btn btn-sm btn-circle"
              @click="previousMonth"
            >
              <IconChevronLeft class="w-4 h-4" />
            </button>
            <h2 class="text-xl font-bold">
              {{ currentMonthName }} {{ currentYear }}
            </h2>
            <button 
              class="btn btn-sm btn-circle"
              @click="nextMonth"
            >
              <IconChevronRight class="w-4 h-4" />
            </button>
            <button 
              class="btn btn-sm btn-ghost"
              @click="goToToday"
            >
              Today
            </button>
          </div>

          <!-- View Mode Buttons -->
          <div class="join">
            <button 
              class="btn btn-sm join-item"
              :class="{ 'btn-primary': viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <IconList class="w-4 h-4 mr-1" />
              List
            </button>
            <button 
              class="btn btn-sm join-item"
              :class="{ 'btn-primary': viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <IconCalendarMonth class="w-4 h-4 mr-1" />
              Grid
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Summary -->
    <div v-if="calendarEvents" class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="stat">
            <div class="stat-title">Total Services</div>
            <div class="stat-value text-primary">{{ calendarEvents.summary?.totalServices || 0 }}</div>
            <div class="stat-desc">In this month</div>
          </div>
          <div class="stat">
            <div class="stat-title">Active Services</div>
            <div class="stat-value text-success">{{ calendarEvents.summary?.activeServices || 0 }}</div>
            <div class="stat-desc">Currently active</div>
          </div>
          <div class="stat">
            <div class="stat-title">Expiring This Month</div>
            <div class="stat-value text-warning">{{ calendarEvents.summary?.expiringThisMonth || 0 }}</div>
            <div class="stat-desc">Needs attention</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Grid Calendar View -->
    <div v-else-if="viewMode === 'grid'" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="text-xl font-bold mb-4">Calendar View</h3>
        
        <!-- Calendar Grid -->
        <div class="grid grid-cols-7 gap-2">
          <!-- Day Headers -->
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" 
               :key="day"
               class="text-center font-bold py-2 text-sm">
            {{ day }}
          </div>
          
          <!-- Calendar Days -->
          <div 
            v-for="day in calendarDays" 
            :key="day.dateString"
            class="aspect-square border border-base-300 rounded-lg p-1.5 cursor-pointer transition-all hover:bg-base-200 overflow-hidden min-w-0"
            :class="{
              'bg-base-200': !day.isCurrentMonth,
              'ring-2 ring-primary': isToday(day.date),
              'bg-primary/10': day.hasEvents
            }"
            @click="openDateModal(day)"
          >
            <div class="text-sm font-semibold mb-1"
                 :class="{ 
                   'text-base-content/40': !day.isCurrentMonth,
                   'text-red-500': day.date.getDay() === 0 && day.isCurrentMonth
                 }">
              {{ day.date.getDate() }}
            </div>
            
            <!-- Event Indicators -->
            <div v-if="day.hasEvents && day.events.length > 0" class="space-y-0.5 min-w-0 overflow-hidden">
              <div
                v-for="(event, idx) in day.events"
                :key="idx"
                class="text-[0.6rem] leading-tight truncate rounded-sm px-1 py-0.5"
                :class="{
                  'bg-success/10 text-success': event.type === 'start',
                  'bg-error/10 text-error': event.type === 'end',
                }"
                :title="event.title"
              >
                {{ event.type === 'start' ? '▶' : '⏹' }} {{ event.title || event.serviceName }}
              </div>
              <div
                v-if="day.eventsTruncated"
                class="text-[0.55rem] text-base-content/40 pl-1 leading-tight font-medium select-none"
              >
                +{{ day.eventCount - day.events.length }} more...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="hasEvents" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h3 class="text-xl font-bold mb-4">Events This Month</h3>
        
        <!-- Group events by date -->
        <div v-for="(eventsGroup, date) in groupedEvents" :key="date" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <div class="badge badge-lg badge-primary">{{ formatDateHeader(date) }}</div>
            <div class="text-sm text-base-content/60">{{ eventsGroup.length }} event(s)</div>
          </div>
          
          <div class="space-y-2">
            <div 
              v-for="event in eventsGroup" 
              :key="event.serviceId"
              class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
              @click="$emit('view-member', event.memberId)"
            >
              <div class="card-body p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <div 
                        class="badge badge-sm"
                        :class="{
                          'badge-success': event.type === 'start',
                          'badge-error': event.type === 'end'
                        }"
                      >
                        {{ event.type === 'start' ? 'Start' : 'End' }}
                      </div>
                      <div 
                        class="badge badge-sm"
                        :class="{
                          'badge-success': event.status === 'active',
                          'badge-error': event.status === 'expired',
                          'badge-warning': event.status === 'depleted'
                        }"
                      >
                        {{ event.status }}
                      </div>
                    </div>
                    
                    <h4 class="font-bold text-lg">{{ event.title }}</h4>
                    
                    <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span class="text-base-content/60">Member:</span>
                        <span class="font-semibold ml-1">{{ event.memberName }}</span>
                      </div>
                      <div>
                        <span class="text-base-content/60">Service:</span>
                        <span class="font-semibold ml-1">{{ event.serviceName }}</span>
                      </div>
                      <div v-if="event.remainingSessions">
                        <span class="text-base-content/60">Sessions:</span>
                        <span class="font-semibold ml-1">{{ event.remainingSessions }} remaining</span>
                      </div>
                      <div v-if="event.trainerName">
                        <span class="text-base-content/60">Trainer:</span>
                        <span class="font-semibold ml-1">{{ event.trainerName }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button class="btn btn-sm btn-ghost btn-circle">
                    <IconEye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-base-100 shadow-xl">
      <div class="card-body text-center py-12">
        <IconCalendarOff class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Events This Month</h3>
        <p class="text-base-content/60">
          No service starts or ends scheduled for {{ currentMonthName }} {{ currentYear }}
        </p>
      </div>
    </div>

    <!-- Date Events Modal -->
    <dialog ref="dateModal" class="modal">
      <div class="modal-box max-w-3xl">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        
        <h3 class="font-bold text-lg mb-4">
          Events on {{ selectedDate ? formatDateHeader(selectedDate) : '' }}
        </h3>
        
        <div v-if="selectedDateEvents.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
          <div 
            v-for="event in selectedDateEvents" 
            :key="event.serviceId"
            class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
            @click="$emit('view-member', event.memberId); dateModal.close()"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <div 
                      class="badge badge-sm"
                      :class="{
                        'badge-success': event.type === 'start',
                        'badge-error': event.type === 'end'
                      }"
                    >
                      {{ event.type === 'start' ? 'Start' : 'End' }}
                    </div>
                    <div 
                      class="badge badge-sm"
                      :class="{
                        'badge-success': event.status === 'active',
                        'badge-error': event.status === 'expired',
                        'badge-warning': event.status === 'depleted'
                      }"
                    >
                      {{ event.status }}
                    </div>
                  </div>
                  
                  <h4 class="font-bold text-lg">{{ event.title }}</h4>
                  
                  <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span class="text-base-content/60">Member:</span>
                      <span class="font-semibold ml-1">{{ event.memberName }}</span>
                    </div>
                    <div>
                      <span class="text-base-content/60">Service:</span>
                      <span class="font-semibold ml-1">{{ event.serviceName }}</span>
                    </div>
                    <div v-if="event.remainingSessions">
                      <span class="text-base-content/60">Sessions:</span>
                      <span class="font-semibold ml-1">{{ event.remainingSessions }} remaining</span>
                    </div>
                    <div v-if="event.trainerName">
                      <span class="text-base-content/60">Trainer:</span>
                      <span class="font-semibold ml-1">{{ event.trainerName }}</span>
                    </div>
                  </div>
                </div>
                
                <IconEye class="w-5 h-5 text-base-content/60" />
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8 text-base-content/60">
          <IconCalendarOff class="w-12 h-12 mx-auto mb-2 opacity-30" />
          No events on this date
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useActiveServices } from '@/composables/gym/service-management/useActiveServices.js'
import { 
  IconList,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconCalendarOff,
  IconCalendarMonth
} from '@tabler/icons-vue'

const props = defineProps({
  serviceType: {
    type: String,
    required: true,
    validator: (value) => ['membership', 'class_package', 'pt_package', 'spa_package'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: 'Monthly view of service start and end dates'
  },
  listViewLink: {
    type: String,
    required: true
  }
})

defineEmits(['view-member'])

const { 
  calendarEvents,
  loading,
  getServicesCalendar
} = useActiveServices()

const currentMonth = ref(new Date().getMonth() + 1)
const currentYear = ref(new Date().getFullYear())
const viewMode = ref('list')
const dateModal = ref(null)
const selectedDate = ref(null)

// Computed
const currentMonthName = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value - 1)
  return date.toLocaleDateString('en-US', { month: 'long' })
})

const hasEvents = computed(() => {
  return calendarEvents.value?.events && calendarEvents.value.events.length > 0
})

const groupedEvents = computed(() => {
  if (!hasEvents.value) return {}
  
  const groups = {}
  calendarEvents.value.events.forEach(event => {
    if (!groups[event.date]) {
      groups[event.date] = []
    }
    groups[event.date].push(event)
  })
  
  const sortedGroups = {}
  Object.keys(groups).sort().forEach(date => {
    sortedGroups[date] = groups[date]
  })
  
  return sortedGroups
})

const calendarDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const days = []
  
  // Previous month days
  const prevMonthLastDay = new Date(currentYear.value, currentMonth.value - 1, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(currentYear.value, currentMonth.value - 2, prevMonthLastDay - i)
    days.push({
      date,
      dateString: formatDateString(date),
      isCurrentMonth: false,
      hasEvents: false,
      eventCount: 0,
      events: [],
      eventsTruncated: false
    })
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    const dateString = formatDateString(date)
    const eventsOnDate = groupedEvents.value[dateString] || []
    const maxVisible = 3  // max events to show per cell before truncating

    days.push({
      date,
      dateString,
      isCurrentMonth: true,
      hasEvents: eventsOnDate.length > 0,
      eventCount: eventsOnDate.length,
      events: eventsOnDate.slice(0, maxVisible),
      eventsTruncated: eventsOnDate.length > maxVisible
    })
  }
  
  // Next month days
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentYear.value, currentMonth.value, day)
    days.push({
      date,
      dateString: formatDateString(date),
      isCurrentMonth: false,
      hasEvents: false,
      eventCount: 0,
      events: [],
      eventsTruncated: false
    })
  }
  
  return days
})

const selectedDateEvents = computed(() => {
  if (!selectedDate.value) return []
  return groupedEvents.value[selectedDate.value] || []
})

// Methods
const loadCalendar = async () => {
  try {
    await getServicesCalendar({
      year: currentYear.value,
      month: currentMonth.value,
      serviceType: props.serviceType
    })
  } catch (error) {
    console.error('Error loading calendar:', error)
  }
}

const previousMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadCalendar()
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadCalendar()
}

const goToToday = () => {
  const today = new Date()
  currentMonth.value = today.getMonth() + 1
  currentYear.value = today.getFullYear()
  loadCalendar()
}

const formatDateHeader = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isToday = (date) => {
  const today = new Date()
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear()
}

const openDateModal = (day) => {
  if (!day.hasEvents || !day.isCurrentMonth) return
  
  selectedDate.value = day.dateString
  dateModal.value?.showModal()
}

const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(() => {
  loadCalendar()
})
</script>
