<script setup>
/**
 * DStepIndicator — Horizontal step tracker with labels, completion states, and clickable steps.
 *
 * Props:
 * - steps: Array<{ label, description?, status?: 'complete'|'current'|'upcoming'|'error' }>
 * - currentStep: number — index of the currently active step (0-based)
 * - orientation: horizontal | vertical
 * - size: sm | md | lg
 * - clickable: boolean — allow clicking steps to navigate
 */
const props = defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: Number, default: 0 },
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (v) => ['horizontal', 'vertical'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  clickable: { type: Boolean, default: false },
})

const emit = defineEmits(['step-click'])

const stepSizeClasses = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-11 text-base',
}

function stepStatus(index) {
  if (index < props.currentStep) return 'complete'
  if (index === props.currentStep) return 'current'
  return 'upcoming'
}
</script>

<template>
  <div v-if="orientation === 'horizontal'" class="w-full">
    <ol class="flex items-center w-full">
      <li
        v-for="(step, idx) in steps"
        :key="idx"
        :class="[
          'flex items-center',
          idx < steps.length - 1 ? 'flex-1' : '',
        ]"
      >
        <!-- Step circle + label -->
        <div
          :class="[
            'flex flex-col items-center',
            clickable ? 'cursor-pointer' : '',
          ]"
          @click="clickable && emit('step-click', idx)"
        >
          <!-- Circle -->
          <div
            :class="[
              'rounded-full flex items-center justify-center border-2 font-bold transition-all duration-300',
              stepSizeClasses[size],
              stepStatus(idx) === 'complete'
                ? 'bg-primary border-primary text-primary-content'
                : stepStatus(idx) === 'current'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-base-200 border-base-300 text-base-content/40',
            ]"
          >
            <span v-if="stepStatus(idx) === 'complete'" class="i-tabler-check" :class="size === 'sm' ? 'size-3' : 'size-4'" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <!-- Label -->
          <div class="mt-1.5 text-center">
            <span
              :class="[
                'text-xs font-semibold',
                stepStatus(idx) === 'current' ? 'text-base-content' : 'text-base-content/50',
              ]"
            >
              {{ step.label }}
            </span>
          </div>
        </div>

        <!-- Connector line -->
        <div
          v-if="idx < steps.length - 1"
          class="flex-1 mx-2"
          :class="size === 'sm' ? 'mt-[-1rem]' : size === 'lg' ? 'mt-[-1.75rem]' : 'mt-[-1.25rem]'"
        >
          <div
            :class="[
              'h-0.5 rounded-full transition-colors duration-500',
              stepStatus(idx) === 'complete' ? 'bg-primary' : 'bg-base-300',
            ]"
          />
        </div>
      </li>
    </ol>
  </div>

  <!-- Vertical orientation -->
  <div v-else class="relative">
    <ol class="space-y-0">
      <li v-for="(step, idx) in steps" :key="idx" class="relative flex gap-3 pb-6 last:pb-0">
        <!-- Vertical line -->
        <div
          v-if="idx < steps.length - 1"
          :class="[
            'absolute top-8 left-[17px] w-0.5 h-[calc(100%-1.5rem)] rounded-full transition-colors duration-500',
            stepStatus(idx) === 'complete' ? 'bg-primary' : 'bg-base-300',
          ]"
        />
        <!-- Circle -->
        <div
          :class="[
            'rounded-full flex items-center justify-center border-2 font-bold shrink-0 transition-all duration-300 z-10',
            stepSizeClasses[size],
            stepStatus(idx) === 'complete'
              ? 'bg-primary border-primary text-primary-content'
              : stepStatus(idx) === 'current'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-base-200 border-base-300 text-base-content/40',
          ]"
        >
          <span v-if="stepStatus(idx) === 'complete'" class="i-tabler-check" :class="size === 'sm' ? 'size-3' : 'size-4'" />
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <!-- Label -->
        <div class="flex-1 min-w-0">
          <p
            :class="[
              'text-sm font-semibold',
              stepStatus(idx) === 'current' ? 'text-base-content' : 'text-base-content/50',
            ]"
          >
            {{ step.label }}
          </p>
          <p v-if="step.description" class="text-xs text-base-content/40 mt-0.5">
            {{ step.description }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
