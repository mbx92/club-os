<route lang="yaml">
meta:
  title: Batal Transaksi Restoran
  layout: default
  action: cancel
  subject: Transaction
</route>

<script setup>
import VoidTransactionPanel from '@/components/operations/VoidTransactionPanel.vue'
</script>

<template>
  <VoidTransactionPanel module="restaurant" />
</template>
