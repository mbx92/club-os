<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(parseFloat(amount))
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>
            <div>
              <div class="font-semibold">{{ item.itemName || item.product?.name }}</div>
              <div v-if="item.notes" class="text-xs text-base-content/60 mt-1">
                Note: {{ item.notes }}
              </div>
              <div v-if="item.itemDetails?.modifiers && item.itemDetails.modifiers.length > 0" class="text-xs text-base-content/60 mt-1">
                Modifiers: {{ item.itemDetails.modifiers.join(', ') }}
              </div>
            </div>
          </td>
          <td class="text-center">{{ item.quantity }}</td>
          <td class="text-right">{{ formatCurrency(item.unitPrice) }}</td>
          <td class="text-right font-semibold">{{ formatCurrency(item.total || item.subtotal) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
