<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { IconGripVertical, IconPlus } from '@tabler/icons-vue'

const props = defineProps({
  tables: {
    type: Array,
    default: () => []
  },
  selectedTable: {
    type: Object,
    default: null
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  // Set of tableIds with pending split bills — rendered orange on the canvas
  splitPendingTableIds: {
    type: Object, // Set
    default: () => new Set()
  }
})

const emit = defineEmits(['update:position', 'update:size', 'select', 'add'])

const canvas = ref(null)
const isDragging = ref(false)
const isResizing = ref(false)
const draggedTable = ref(null)
const dragOffset = ref({ x: 0, y: 0 })
const resizeHandle = ref(null) // 'nw', 'ne', 'sw', 'se'
const initialSize = ref({ width: 0, height: 0 })
const cursorStyle = ref('default')

const canvasContainer = ref(null)
const canvasWidth = ref(1200)
const canvasHeight = ref(800)
let resizeObserver = null

const getTableColor = (table) => {
  // Split-pending takes priority over the backend-provided status
  if (props.splitPendingTableIds?.has(table.id)) return '#f97316' // orange
  const colors = {
    available: '#10b981', // green
    occupied: '#ef4444', // red
    reserved: '#f59e0b', // yellow
    cleaning: '#3b82f6' // blue
  }
  return colors[table.status] || '#6b7280'
}

const getTableSize = (table) => {
  // Use custom width and height if available, otherwise fallback to capacity-based sizing
  if (table.width && table.height) {
    return { width: Number(table.width), height: Number(table.height) }
  }
  
  // Fallback to capacity-based sizing for backward compatibility
  const capacity = Number(table.capacity) || 4
  if (capacity <= 2) return { width: 60, height: 60 }
  if (capacity <= 4) return { width: 80, height: 80 }
  if (capacity <= 6) return { width: 100, height: 80 }
  return { width: 120, height: 100 }
}

const startDrag = (table, event, handle = null) => {
  if (handle) {
    // Resizing
    isResizing.value = true
    resizeHandle.value = handle
    const size = getTableSize(table)
    initialSize.value = { width: size.width, height: size.height }
  } else {
    // Moving
    isDragging.value = true
  }
  
  draggedTable.value = table
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  dragOffset.value = {
    x: x - (Number(table.positionX) || 0),
    y: y - (Number(table.positionY) || 0)
  }
}

const onDrag = (event) => {
  if (!draggedTable.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  if (isResizing.value && resizeHandle.value) {
    // Handle resizing
    const table = draggedTable.value
    const tableX = Number(table.positionX) || 0
    const tableY = Number(table.positionY) || 0
    const size = getTableSize(table)
    
    let newWidth = size.width
    let newHeight = size.height
    let newX = tableX
    let newY = tableY
    
    // Calculate new dimensions based on which handle is being dragged
    if (resizeHandle.value.includes('e')) { // East (right)
      newWidth = Math.max(40, Math.min(x - tableX, canvasWidth.value - tableX))
    }
    if (resizeHandle.value.includes('w')) { // West (left)
      const newRightEdge = tableX + size.width
      newWidth = Math.max(40, Math.min(newRightEdge - x, newRightEdge))
      newX = newRightEdge - newWidth
    }
    if (resizeHandle.value.includes('s')) { // South (bottom)
      newHeight = Math.max(40, Math.min(y - tableY, canvasHeight.value - tableY))
    }
    if (resizeHandle.value.includes('n')) { // North (top)
      const newBottomEdge = tableY + size.height
      newHeight = Math.max(40, Math.min(newBottomEdge - y, newBottomEdge))
      newY = newBottomEdge - newHeight
    }
    
    // Emit both position and size updates
    emit('update:position', table.id, newX, newY)
    emit('update:size', table.id, newWidth, newHeight)
  } else if (isDragging.value) {
    // Handle moving
    const moveX = x - dragOffset.value.x
    const moveY = y - dragOffset.value.y
    
    // Constrain to canvas bounds
    const size = getTableSize(draggedTable.value)
    const constrainedX = Math.max(0, Math.min(moveX, canvasWidth.value - size.width))
    const constrainedY = Math.max(0, Math.min(moveY, canvasHeight.value - size.height))
    
    emit('update:position', draggedTable.value.id, constrainedX, constrainedY)
  }
}

const endDrag = () => {
  isDragging.value = false
  isResizing.value = false
  draggedTable.value = null
  resizeHandle.value = null
}

const selectTable = (table) => {
  emit('select', table)
}

const drawResizeHandles = (ctx, table) => {
  if (!props.selectedTable || props.selectedTable.id !== table.id) return
  
  const size = getTableSize(table)
  const x = Number(table.positionX) || 0
  const y = Number(table.positionY) || 0
  const handleSize = 8
  
  // Draw resize handles
  ctx.fillStyle = '#3b82f6' // Blue color for handles
  
  // Top-left handle
  ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize)
  
  // Top-right handle
  ctx.fillRect(x + size.width - handleSize/2, y - handleSize/2, handleSize, handleSize)
  
  // Bottom-left handle
  ctx.fillRect(x - handleSize/2, y + size.height - handleSize/2, handleSize, handleSize)
  
  // Bottom-right handle
  ctx.fillRect(x + size.width - handleSize/2, y + size.height - handleSize/2, handleSize, handleSize)
}

const drawTable = (ctx, table) => {
  const size = getTableSize(table)
  const x = Number(table.positionX) || 0
  const y = Number(table.positionY) || 0
  
  // Draw shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2
  
  // Draw table
  ctx.fillStyle = getTableColor(table)
  
  if (table.shape === 'circle') {
    const radius = size.width / 2
    ctx.beginPath()
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillRect(x, y, size.width, size.height)
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // Draw border if selected
  if (props.selectedTable && props.selectedTable.id === table.id) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    if (table.shape === 'circle') {
      const radius = size.width / 2
      ctx.beginPath()
      ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.strokeRect(x, y, size.width, size.height)
    }
  }
  
  // Draw table number
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(table.tableNumber, x + size.width / 2, y + size.height / 2 - 8)
  
  // Draw capacity
  ctx.font = '12px sans-serif'
  ctx.fillText(`${table.capacity} seats`, x + size.width / 2, y + size.height / 2 + 8)
  
  // Draw resize handles if selected
  drawResizeHandles(ctx, table)
}

const drawCanvas = () => {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  const w = canvasWidth.value
  const h = canvasHeight.value
  
  // Clear canvas
  ctx.clearRect(0, 0, w, h)
  
  // Draw grid
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  
  for (let x = 0; x <= w; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  
  for (let y = 0; y <= h; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  
  // Draw tables
  props.tables.forEach(table => {
    drawTable(ctx, table)
  })
}

const handleCanvasClick = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if clicked on any table
  for (const table of props.tables) {
    const size = getTableSize(table)
    const tx = Number(table.positionX) || 0
    const ty = Number(table.positionY) || 0
    
    if (table.shape === 'circle') {
      const radius = size.width / 2
      const distance = Math.sqrt(Math.pow(x - (tx + radius), 2) + Math.pow(y - (ty + radius), 2))
      if (distance <= radius) {
        selectTable(table)
        return
      }
    } else {
      if (x >= tx && x <= tx + size.width && y >= ty && y <= ty + size.height) {
        selectTable(table)
        return
      }
    }
  }
  
  // Clicked on empty space
  selectTable(null)
}

const handleCanvasMouseMove = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Check if hovering over a resize handle
  if (props.selectedTable) {
    const table = props.selectedTable
    const size = getTableSize(table)
    const tx = Number(table.positionX) || 0
    const ty = Number(table.positionY) || 0
    const handleSize = 8
    
    // Check if hovering over any resize handle
    const isOverHandle =
      // Top-left handle
      (x >= tx - handleSize/2 && x <= tx + handleSize/2 &&
       y >= ty - handleSize/2 && y <= ty + handleSize/2) ||
      // Top-right handle
      (x >= tx + size.width - handleSize/2 && x <= tx + size.width + handleSize/2 &&
       y >= ty - handleSize/2 && y <= ty + handleSize/2) ||
      // Bottom-left handle
      (x >= tx - handleSize/2 && x <= tx + handleSize/2 &&
       y >= ty + size.height - handleSize/2 && y <= ty + size.height + handleSize/2) ||
      // Bottom-right handle
      (x >= tx + size.width - handleSize/2 && x <= tx + size.width + handleSize/2 &&
       y >= ty + size.height - handleSize/2 && y <= ty + size.height + handleSize/2)
    
    if (isOverHandle) {
      cursorStyle.value = 'nwse-resize' // Cursor for diagonal resize
      canvas.value.style.cursor = cursorStyle.value
      return
    }
    
    // Check if hovering over table body
    if (x >= tx && x <= tx + size.width && y >= ty && y <= ty + size.height) {
      cursorStyle.value = 'move' // Cursor for moving
      canvas.value.style.cursor = cursorStyle.value
      return
    }
  }
  
  // Default cursor
  cursorStyle.value = 'default'
  canvas.value.style.cursor = cursorStyle.value
}

onMounted(() => {
  // Set up ResizeObserver to make canvas responsive
  if (canvasContainer.value) {
    const updateSize = () => {
      const rect = canvasContainer.value.getBoundingClientRect()
      canvasWidth.value = Math.floor(rect.width)
      canvasHeight.value = Math.floor(rect.height)
      requestAnimationFrame(drawCanvas)
    }
    
    resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(canvasContainer.value)
    
    // Initial size
    updateSize()
  } else {
    drawCanvas()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// Watch for changes and redraw
const redraw = () => {
  requestAnimationFrame(drawCanvas)
}

// Expose redraw method
defineExpose({ redraw })
</script>

<template>
  <div ref="canvasContainer" class="relative bg-base-200 rounded-lg overflow-hidden" :style="{ width: '100%', height: readOnly ? '100%' : '600px' }">
    <!-- Canvas -->
    <canvas
      ref="canvas"
      :width="canvasWidth"
      :height="canvasHeight"
      @mousemove="(e) => {
        handleCanvasMouseMove(e)
        onDrag(e)
      }"
      @mousedown="(e) => {
        if (readOnly) return;
        
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        
        for (const table of tables) {
          const size = getTableSize(table)
          const tx = Number(table.positionX) || 0
          const ty = Number(table.positionY) || 0
          
          // Check if clicked on table body
          if (x >= tx && x <= tx + size.width && y >= ty && y <= ty + size.height) {
            // Check if clicked on a resize handle (only if table is selected)
            if (selectedTable && selectedTable.id === table.id) {
              const handleSize = 8
              
              // Top-left handle
              if (x >= tx - handleSize/2 && x <= tx + handleSize/2 &&
                  y >= ty - handleSize/2 && y <= ty + handleSize/2) {
                startDrag(table, e, 'nw')
                return
              }
              
              // Top-right handle
              if (x >= tx + size.width - handleSize/2 && x <= tx + size.width + handleSize/2 &&
                  y >= ty - handleSize/2 && y <= ty + handleSize/2) {
                startDrag(table, e, 'ne')
                return
              }
              
              // Bottom-left handle
              if (x >= tx - handleSize/2 && x <= tx + handleSize/2 &&
                  y >= ty + size.height - handleSize/2 && y <= ty + size.height + handleSize/2) {
                startDrag(table, e, 'sw')
                return
              }
              
              // Bottom-right handle
              if (x >= tx + size.width - handleSize/2 && x <= tx + size.width + handleSize/2 &&
                  y >= ty + size.height - handleSize/2 && y <= ty + size.height + handleSize/2) {
                startDrag(table, e, 'se')
                return
              }
            }
            
            // If not a resize handle, then move the table
            startDrag(table, e)
            return
          }
        }
      }"
      @mouseup="endDrag"
      @mouseleave="endDrag"
      @click="handleCanvasClick"
    ></canvas>

    <!-- Legend (hidden in readOnly mode) -->
    <div v-if="!readOnly" class="absolute top-4 right-4 bg-base-100 rounded-lg shadow-lg p-4">
      <h4 class="font-semibold text-sm mb-2">Status Legend</h4>
      <div class="space-y-1 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-success rounded"></div>
          <span>Available</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-error rounded"></div>
          <span>Occupied</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background:#f97316"></div>
          <span>Split Bill Pending</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-warning rounded"></div>
          <span>Reserved</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-info rounded"></div>
          <span>Cleaning</span>
        </div>
      </div>
      
      <div class="divider my-2"></div>
      
      <div class="text-xs text-base-content/60">
        <IconGripVertical class="w-4 h-4 inline mr-1" />
        Drag tables to reposition
      </div>
    </div>

    <!-- Instructions (hidden in readOnly mode) -->
    <div v-if="!readOnly" class="absolute bottom-4 left-4 bg-base-100 rounded-lg shadow-lg p-3 text-sm">
      <p class="font-semibold mb-1">💡 Tips:</p>
      <ul class="text-xs space-y-1 text-base-content/60">
        <li>• Click and drag tables to move them</li>
        <li>• Click on a table to select it</li>
        <li>• Drag the blue handles to resize tables</li>
        <li>• Click on empty space to deselect</li>
      </ul>
    </div>
  </div>
</template>
