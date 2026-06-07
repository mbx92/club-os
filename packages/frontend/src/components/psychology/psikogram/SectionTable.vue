<template>
  <div class="section-wrapper">
    <table class="section-table">
      <thead>
        <tr class="section-header">
          <th colspan="2">{{ title }}</th>
          <th class="definition-col">PENGERTIAN</th>
          <th class="rating-col">R</th>
          <th class="rating-col">K</th>
          <th class="rating-col">C</th>
          <th class="rating-col">B</th>
          <th class="rating-col">T</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index">
          <td class="number-col">{{ index + 1 }}.</td>
          <td class="title-col">{{ item.title }}</td>
          <td class="desc-col">{{ item.description }}</td>
          <td class="check-col">
            <span v-if="item.rating === 'R'" class="rating-check">✓</span>
          </td>
          <td class="check-col">
            <span v-if="item.rating === 'K'" class="rating-check">✓</span>
          </td>
          <td class="check-col">
            <span v-if="item.rating === 'C'" class="rating-check">✓</span>
          </td>
          <td class="check-col">
            <span v-if="item.rating === 'B'" class="rating-check">✓</span>
          </td>
          <td class="check-col">
            <span v-if="item.rating === 'T'" class="rating-check">✓</span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="conclusion" class="conclusion-text">
      <span class="conclusion-label">KESIMPULAN:</span> {{ conclusion }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  conclusion: {
    type: String,
    default: ''
  },
  primaryColor: {
    type: String,
    default: '#15803d'
  }
})
</script>

<style scoped>
.section-wrapper {
  margin-bottom: 1rem;
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-table {
  width: 100%;
  font-size: 10pt;
  border-collapse: collapse;
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-table thead {
  display: table-header-group;
}

.section-table tbody {
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-table th,
.section-table td {
  border: 1px solid #000000;
  padding: 8px;
  text-align: left;
}

.section-header {
  background-color: #16a34a;
  color: #ffffff;
}

.section-header th {
  text-align: left;
  font-weight: 600;
}

.definition-col {
  width: 40%;
  text-align: center !important;
}

.number-col {
  width: 30px;
  text-align: center !important;
}

.title-col {
  font-weight: 500;
}

.desc-col {
  font-size: 9pt;
}

.check-col {
  text-align: center !important;
}

.rating-col {
  width: 25px;
  text-align: center !important;
}

.rating-check {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  display: inline-block;
}

.conclusion-text {
  margin-top: 0.25rem;
  font-size: 10pt;
  page-break-inside: avoid;
  break-inside: avoid;
}

.conclusion-label {
  font-weight: bold;
  color: #16a34a;
}

/* Print support */
@media print {
  .section-wrapper {
    margin-bottom: 1rem;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .section-table {
    width: 100%;
    border-collapse: collapse !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .section-table thead {
    display: table-header-group !important;
  }

  .section-table tbody {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .section-table tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .section-table th,
  .section-table td {
    border: 1px solid #000000 !important;
    padding: 8px !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .section-header {
    background-color: #16a34a !important;
    color: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  .rating-check {
    color: #000000 !important;
  }

  .conclusion-text {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .conclusion-label {
    color: #16a34a !important;
  }
}
</style>
