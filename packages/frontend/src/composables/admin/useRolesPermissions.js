import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useRolesPermissions = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV

  const roles = ref([])
  const availableResources = ref([])
  const loading = ref(false)
  const saving = ref(false)

  const normalizeRole = (role) => {
    if (!role) return role

    return {
      ...role,
      permissions: {
        resources: role.permissions?.resources || {},
        uiFlags: role.permissions?.uiFlags || {},
        menuAccess: role.permissions?.menuAccess || [],
      },
    }
  }

  const getDefaultResources = () => {
    const CRUD = ['create', 'delete', 'read', 'update']
    const RO = ['read']

    return [
      { name: 'Dashboard', label: 'Dashboard', module: 'dashboard', actions: RO },
      { name: 'CashRegisterSession', label: 'Cash Register Session', module: 'cash-register', actions: ['create', 'read', 'update'] },
      { name: 'ActiveService', label: 'Active Services', module: 'gym', actions: CRUD },
      { name: 'CheckIn', label: 'Check-ins', module: 'gym', actions: CRUD },
      { name: 'Member', label: 'Members', module: 'gym', actions: CRUD },
      { name: 'MembershipPlan', label: 'Membership Plans', module: 'gym', actions: CRUD },
      { name: 'PTSession', label: 'PT Sessions', module: 'gym', actions: CRUD },
      { name: 'ServicePlan', label: 'Service Plans', module: 'gym', actions: CRUD },
      { name: 'Trainer', label: 'Trainers', module: 'gym', actions: CRUD },
      { name: 'TrainerCommission', label: 'Trainer Commissions', module: 'gym', actions: ['create', 'read', 'update'] },
      { name: 'EmployeeSchedule', label: 'Employee Schedules', module: 'back-office', actions: CRUD },
      { name: 'Shift', label: 'Shifts', module: 'back-office', actions: CRUD },
      { name: 'StaffAttendance', label: 'Staff Attendance', module: 'back-office', actions: CRUD },
      { name: 'HikvisionDevice', label: 'Hikvision Devices', module: 'back-office', actions: CRUD },
      { name: 'RestaurantCategory', label: 'Restaurant Categories', module: 'restaurant', actions: CRUD },
      { name: 'RestaurantLocation', label: 'Restaurant Locations', module: 'restaurant', actions: CRUD },
      { name: 'RestaurantProduct', label: 'Restaurant Products', module: 'restaurant', actions: CRUD },
      { name: 'RestaurantStock', label: 'Restaurant Stock', module: 'restaurant', actions: CRUD },
      { name: 'RestaurantTable', label: 'Restaurant Tables', module: 'restaurant', actions: CRUD },
      // 'cancel' (void transaction) is a distinct permission from 'update' — see RBAC-02.
      { name: 'Transaction', label: 'Transactions', module: 'cash-register', actions: [...CRUD, 'cancel'] },
      { name: 'Voucher', label: 'Vouchers', module: 'vouchers', actions: CRUD },
      { name: 'FinanceDashboard', label: 'Finance Dashboard', module: 'finances', actions: RO },
      { name: 'Income', label: 'Incomes', module: 'finances', actions: CRUD },
      { name: 'IncomeCategory', label: 'Income Categories', module: 'finances', actions: CRUD },
      { name: 'Expense', label: 'Expenses', module: 'finances', actions: CRUD },
      { name: 'ExpenseCategory', label: 'Expense Categories', module: 'finances', actions: CRUD },
      { name: 'CashFlow', label: 'Cash Flow', module: 'finances', actions: RO },
      { name: 'FinancialReport', label: 'Financial Reports', module: 'reports', actions: CRUD },
      { name: 'PettyCash', label: 'Petty Cash', module: 'finances', actions: CRUD },
      { name: 'Supplier', label: 'Suppliers', module: 'finances', actions: CRUD },
      { name: 'Invoice', label: 'Invoices', module: 'finances', actions: CRUD },
      { name: 'Payment', label: 'Payments', module: 'finances', actions: CRUD },
      { name: 'Subscription', label: 'Subscriptions', module: 'subscription', actions: CRUD },
      { name: 'SubscriptionPlan', label: 'Subscription Plans', module: 'subscription', actions: CRUD },
      { name: 'SubscriptionFeature', label: 'Subscription Features', module: 'subscription', actions: CRUD },
      { name: 'Tenant', label: 'Tenants', module: 'settings', actions: CRUD },
      { name: 'User', label: 'Users', module: 'settings', actions: CRUD },
      { name: 'Role', label: 'Roles', module: 'settings', actions: CRUD },
      { name: 'Permission', label: 'Permissions', module: 'settings', actions: CRUD },
      { name: 'Log', label: 'Audit Logs', module: 'settings', actions: CRUD },
      { name: 'PrinterSettings', label: 'Printer Settings', module: 'settings', actions: CRUD },
      { name: 'ReceiptTemplate', label: 'Receipt Templates', module: 'settings', actions: CRUD },
      { name: 'SystemSettings', label: 'System Settings', module: 'settings', actions: CRUD },
      { name: 'DatabaseBackup', label: 'Database Backup', module: 'settings', actions: CRUD },
      { name: 'Scheduler', label: 'Scheduler', module: 'settings', actions: ['read', 'update'] },
      { name: 'Auth', label: 'Authentication', module: 'system', actions: ['create', 'read', 'update'] },
      { name: 'Health', label: 'Health Check', module: 'system', actions: RO },
      { name: 'SystemMetrics', label: 'System Metrics', module: 'system', actions: RO },
    ]
  }

  const fetchAvailableResources = async () => {
    try {
      const response = await api.get('/permissions/subjects')
      const subjects = response.data?.subjects || response.subjects || []

      if (subjects.length > 0) {
        availableResources.value = subjects
          .map(item => ({
            name: item.subject || item.name,
            label: item.label || item.subject || item.name,
            module: item.module || 'system',
            actions: Array.isArray(item.actions) ? [...new Set(item.actions)].sort() : ['read', 'create', 'update', 'delete'],
          }))
          .filter(item => item.name)
          .sort((a, b) => a.name.localeCompare(b.name))

        return availableResources.value
      }
    } catch (err) {
      if (isDev) console.warn('[useRolesPermissions] /permissions/subjects failed:', err?.message)
    }

    availableResources.value = getDefaultResources()
    return availableResources.value
  }

  const fetchRoles = async () => {
    loading.value = true
    try {
      const response = await api.get('/permissions/roles')
      const rawRoles = response.data?.roles || response.roles || []
      roles.value = rawRoles.map(normalizeRole)
      return roles.value
    } catch (err) {
      handleError(err, 'Failed to fetch roles')
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRole = async (roleData) => {
    saving.value = true
    try {
      const response = await api.post('/permissions/roles', roleData)
      const role = response.data?.role || response.role || response
      showSuccess('Role created successfully')
      return { success: true, data: normalizeRole(role) }
    } catch (err) {
      handleError(err, 'Failed to create role')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  const updateRole = async (roleId, roleData) => {
    saving.value = true
    try {
      const response = await api.put(`/permissions/roles/${roleId}`, roleData)
      const role = response.data?.role || response.role || response
      showSuccess('Role updated successfully')
      return { success: true, data: normalizeRole(role) }
    } catch (err) {
      handleError(err, 'Failed to update role')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  const updateRolePermissions = async (roleId, permissions, extras = {}) => {
    saving.value = true
    try {
      const response = await api.patch(`/permissions/roles/${roleId}/permissions`, {
        permissions: {
          resources: permissions,
          ...extras,
        },
      })
      const role = response.data?.role || response.role || response
      showSuccess('Role permissions updated successfully')
      return { success: true, data: normalizeRole(role) }
    } catch (err) {
      handleError(err, 'Failed to update role permissions')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  const previewRole = async (roleId) => {
    try {
      const response = await api.get(`/permissions/roles/${roleId}/preview`)
      return { success: true, data: response.data?.permissions || response.permissions || {} }
    } catch (err) {
      handleError(err, 'Failed to load role preview')
      return { success: false, error: err }
    }
  }

  const deleteRole = async (roleId) => {
    try {
      await api.delete(`/permissions/roles/${roleId}`)
      showSuccess('Role deleted successfully')
      return { success: true }
    } catch (err) {
      handleError(err, 'Failed to delete role')
      return { success: false, error: err }
    }
  }

  const regenerateRoutes = async () => {
    try {
      const response = await api.post('/permissions/routes/regenerate')
      const result = response.data || response

      showSuccess(`Routes regenerated: ${result.data?.routesCount || 0} routes`)
      await fetchAvailableResources()

      return { success: true, data: result.data }
    } catch (err) {
      handleError(err, 'Failed to regenerate routes')
      return { success: false, error: err }
    }
  }

  return {
    roles,
    availableResources,
    loading,
    saving,
    fetchAvailableResources,
    fetchRoles,
    createRole,
    updateRole,
    updateRolePermissions,
    deleteRole,
    regenerateRoutes,
    previewRole,
  }
}
