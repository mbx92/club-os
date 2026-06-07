export const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getFirstDayOfMonth = () => {
  const today = new Date()
  return formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1))
}

export const getLastDayOfMonth = () => {
  const today = new Date()
  return formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))
}

export const getRoleName = (role) => {
  if (!role) return ''
  if (typeof role === 'string') return role.toLowerCase()
  return String(role.name || role.label || '').toLowerCase()
}

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const accountLabel = (account) => {
  const map = {
    cash_drawer: 'Laci Kasir',
    vault: 'Vault / Brankas',
    petty_cash: 'Petty Cash',
    bank: 'Bank / Transfer',
    revenue: 'Revenue',
    external: 'Eksternal',
  }
  return map[account] || account || '-'
}

export const mutationTypeLabel = (type) => {
  const map = {
    drawer_to_vault_transfer: 'Drawer ke Vault',
    vault_expense: 'Expense Vault',
    vault_adjustment: 'Penyesuaian Vault',
  }
  return map[type] || String(type || '-').replace(/_/g, ' ')
}

export const hasNoCashTransaction = (item) => {
  const closingAmount = Number(item?.actualCash ?? item?.closingBalance ?? item?.collectibleBase ?? 0)
  const collectibleBase = Number(item?.collectibleBase ?? 0)
  const remainingAmount = Number(item?.remainingAmount ?? 0)
  const collectedAmount = Number(item?.collectedAmount ?? 0)

  return closingAmount <= 0 && collectibleBase <= 0 && remainingAmount <= 0 && collectedAmount <= 0
}

export const getCollectionStatus = (item) => {
  if (hasNoCashTransaction(item)) return 'no_cash_transaction'
  return item?.collectionStatus || ''
}

export const collectionStatusLabel = (status) => {
  const map = {
    uncollected: 'Belum Diambil',
    partially_collected: 'Diambil Sebagian',
    collected: 'Sudah Diambil',
    no_cash_transaction: 'Tidak Ada Transaksi Cash',
  }
  return map[status] || status || '-'
}

export const collectionStatusClass = (status) => {
  const map = {
    uncollected: 'badge-warning',
    partially_collected: 'badge-info',
    collected: 'badge-success',
    no_cash_transaction: 'badge-ghost',
  }
  return map[status] || 'badge-ghost'
}

export const mutationStatusClass = (status) => {
  const map = {
    draft: 'badge-ghost',
    pending: 'badge-warning',
    posted: 'badge-success',
    cancelled: 'badge-error',
  }
  return map[status] || 'badge-ghost'
}