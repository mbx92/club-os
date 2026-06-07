<script setup>
defineProps({
  status: {
    type: String,
    required: true
  }
})

const getStatusClass = (status) => {
  const classes = {
    pending: 'badge-warning',
    preparing: 'badge-info',
    ready: 'badge-success',
    served: 'badge-accent',
    completed: 'badge-ghost',
    cancelled: 'badge-error'
  }
  return classes[status] || 'badge-ghost'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return labels[status] || status
}
</script>

<template>
  <div :class="['badge', getStatusClass(status)]">
    {{ getStatusLabel(status) }}
  </div>
</template>
