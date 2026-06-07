<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import {
  IconVolume,
  IconVolumeOff
} from '@tabler/icons-vue'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true
  },
  newOrderCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:enabled'])

const audioContext = ref(null)
const isMuted = ref(!props.enabled)
const lastOrderCount = ref(0)

// Create notification sound
const playNotificationSound = () => {
  if (isMuted.value || !audioContext.value) return

  try {
    const oscillator = audioContext.value.createOscillator()
    const gainNode = audioContext.value.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.value.destination)

    // Bell-like sound
    oscillator.frequency.setValueAtTime(800, audioContext.value.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.value.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, audioContext.value.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.value.currentTime + 0.5)

    oscillator.start(audioContext.value.currentTime)
    oscillator.stop(audioContext.value.currentTime + 0.5)

    // Play second beep after short delay
    setTimeout(() => {
      if (isMuted.value || !audioContext.value) return

      const oscillator2 = audioContext.value.createOscillator()
      const gainNode2 = audioContext.value.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.value.destination)

      oscillator2.frequency.setValueAtTime(1000, audioContext.value.currentTime)
      oscillator2.frequency.exponentialRampToValueAtTime(500, audioContext.value.currentTime + 0.1)

      gainNode2.gain.setValueAtTime(0.3, audioContext.value.currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.value.currentTime + 0.5)

      oscillator2.start(audioContext.value.currentTime)
      oscillator2.stop(audioContext.value.currentTime + 0.5)
    }, 200)
  } catch (err) {
    console.warn('Audio playback failed:', err)
  }
}

// Watch for new orders
watch(() => props.newOrderCount, (newCount) => {
  if (newCount > lastOrderCount.value) {
    playNotificationSound()
  }
  lastOrderCount.value = newCount
})

const toggleMute = () => {
  isMuted.value = !isMuted.value
  emit('update:enabled', !isMuted.value)

  // Initialize audio context on first unmute (requires user interaction)
  if (!isMuted.value && !audioContext.value) {
    initAudioContext()
  }
}

const initAudioContext = () => {
  try {
    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
  } catch (err) {
    console.warn('AudioContext not supported:', err)
  }
}

onMounted(() => {
  lastOrderCount.value = props.newOrderCount
  if (props.enabled) {
    initAudioContext()
  }
})

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.close()
  }
})
</script>

<template>
  <button
    class="btn btn-circle btn-ghost"
    :class="{ 'text-error': isMuted }"
    @click="toggleMute"
    :title="isMuted ? 'Enable sound notifications' : 'Mute sound notifications'"
  >
    <IconVolumeOff v-if="isMuted" class="w-6 h-6" />
    <IconVolume v-else class="w-6 h-6" />
  </button>
</template>
