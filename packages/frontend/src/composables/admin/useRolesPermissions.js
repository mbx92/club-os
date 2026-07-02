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

  /**
   * Fetch available subjects/resources.
   * Tries /permissions/subjects first, then /permissions/routes,
   * then aggregates from existing roles, then falls back to hardcoded defaults.
   */
  const fetchAvailableResources = async () => {
    try {
      // Try new subjects endpoint first
      const response = await api.get('/permissions/subjects')
      const subjects = response.data?.subjects || response.subjects || []

      if (subjects.length > 0) {
        availableResources.value = subjects
          .map(s => ({
            name: s.subject || s.name,
            actions: Array.isArray(s.actions) ? s.actions.filter(a => a !== 'manage').sort() : ['read', 'create', 'update', 'delete']
          }))
          .filter(r => r.name && r.name !== 'all')
          .sort((a, b) => a.name.localeCompare(b.name))

        if (isDev) console.log('[useRolesPermissions] Loaded', availableResources.value.length, 'subjects from /permissions/subjects')
        return availableResources.value
      }
    } catch (err) {
      if (isDev) console.warn('[useRolesPermissions] /permissions/subjects failed:', err?.message)
    }

    // Try /permissions/routes endpoint
    try {
      const fallback = await api.get('/permissions/routes')
      const routes = fallback.data?.routes || fallback.routes || {}
      const resourceMap = {}

      Object.entries(routes).forEach(([, route]) => {
        const { resource, actions = [] } = route.permissions || {}
        if (resource && resource !== 'all' && resource !== 'Resource') {
          if (!resourceMap[resource]) resourceMap[resource] = new Set()
          actions.forEach(a => { if (a !== 'manage') resourceMap[resource].add(a) })
        }
      })

      if (Object.keys(resourceMap).length > 0) {
        availableResources.value = Object.entries(resourceMap)
          .map(([name, actions]) => ({ name, actions: Array.from(actions).sort() }))
          .sort((a, b) => a.name.localeCompare(b.name))
        if (isDev) console.log('[useRolesPermissions] Loaded', availableResources.value.length, 'resources from /permissions/routes')
        return availableResources.value
      }
    } catch (err) {
      if (isDev) console.warn('[useRolesPermissions] /permissions/routes failed:', err?.message)
    }

    // Build from all existing roles permissions (aggregate all unique keys)
    if (roles.value.length > 0) {
      const resourceMap = {}
      const SKIP_KEYS = ['rules', 'uiFlags', 'menuAccess', 'rolePermissions']

      roles.value.forEach(role => {
        const perms = role.permissions || {}
        Object.entries(perms).forEach(([key, val]) => {
          if (SKIP_KEYS.includes(key)) return
          if (!Array.isArray(val)) return
          // Skip keys that look like route params (e.g. :id, :voucherid)
          if (key.startsWith(':')) return

          if (!resourceMap[key]) resourceMap[key] = new Set()
          val.forEach(a => resourceMap[key].add(a))
        })
      })

      if (Object.keys(resourceMap).length > 0) {
        availableResources.value = Object.entries(resourceMap)
          .map(([name, actions]) => ({ name, actions: Array.from(actions).sort() }))
          .sort((a, b) => a.name.localeCompare(b.name))
        if (isDev) console.log('[useRolesPermissions] Built', availableResources.value.length, 'resources from existing roles')
        return availableResources.value
      }
    }

    // Final fallback: hardcoded defaults
    if (isDev) console.warn('[useRolesPermissions] Using hardcoded defaults')
    availableResources.value = getDefaultResources()
    return availableResources.value
  }

  /**
   * Convert form permissions to rules array format (new backend format)
   * Input:  { Member: ['read', 'create'], CheckIn: ['read'] }
   * Output: [{ subject: 'Member', actions: ['read', 'create'], conditions: { tenantId: '$tenantId' } }]
   */
  const formPermissionsToRules = (permissions) => {
    return Object.entries(permissions)
      .filter(([, actions]) => Array.isArray(actions) && actions.length > 0)
      .map(([subject, actions]) => ({
        subject,
        actions,
        conditions: { tenantId: '$tenantId' }
      }))
  }

  /**
   * Convert rules back to form permissions format
   * Input:  [{ subject: 'Member', actions: ['read','create'] }]
   * Output: { Member: ['read', 'create'] }
   */
  const rulesToFormPermissions = (rules) => {
    if (!Array.isArray(rules)) return {}
    const result = {}
    rules.forEach(rule => {
      if (rule.subject && rule.subject !== 'all' && Array.isArray(rule.actions)) {
        result[rule.subject] = rule.actions
      }
    })
    return result
  }

  /**
   * Get default resources as fallback — mirrors backend config/routePermissions.js ROUTE_TO_SUBJECT_MAP.
   * ⚠️  Keep in sync: every subject from GET /permissions/subjects must be represented here.
   */
  const getDefaultResources = () => {
    const CRUD = ['create', 'delete', 'read', 'update']
    const RO = ['read']
    const CRU = ['create', 'read', 'update']
    return [
      // ── Dashboard ──
      { name: 'Dashboard', actions: RO },

      // ── Gym Module ──
      { name: 'ActiveService', actions: CRUD },
      { name: 'CheckIn', actions: CRUD },
      { name: 'EmployeeSchedule', actions: CRUD },
      { name: 'Member', actions: CRUD },
      { name: 'MembershipPlan', actions: CRUD },
      { name: 'PTSession', actions: CRUD },
      { name: 'ServicePlan', actions: CRUD },
      { name: 'Shift', actions: CRU },
      { name: 'StaffAttendance', actions: CRU },
      { name: 'Trainer', actions: CRU },
      { name: 'TrainerCommission', actions: CRU },

      // ── Restaurant Module ──
      { name: 'RestaurantCategory', actions: CRUD },
      { name: 'RestaurantLocation', actions: CRU },
      { name: 'RestaurantProduct', actions: CRUD },
      { name: 'RestaurantStock', actions: CRU },
      { name: 'RestaurantTable', actions: CRU },

      // ── Finance Module ──
      { name: 'CashFlow', actions: RO },
      { name: 'CashRegisterSession', actions: CRU },
      { name: 'Expense', actions: CRUD },
      { name: 'ExpenseCategory', actions: CRUD },
      { name: 'FinanceDashboard', actions: RO },
      { name: 'FinancialReport', actions: CRUD },
      { name: 'Income', actions: CRUD },
      { name: 'IncomeCategory', actions: CRUD },
      { name: 'Invoice', actions: CRU },
      { name: 'Payment', actions: CRU },
      { name: 'PettyCash', actions: CRUD },
      { name: 'Subscription', actions: CRUD },
      { name: 'SubscriptionPlan', actions: RO },
      { name: 'Supplier', actions: CRUD },
      { name: 'Transaction', actions: CRUD },

      // ── Vouchers (cross-cutting) ──
      { name: 'Voucher', actions: CRUD },

      // ── System / Core ──
      { name: 'Auth', actions: CRU },
      { name: 'DatabaseBackup', actions: CRU },
      { name: 'Health', actions: RO },
      { name: 'HikvisionDevice', actions: CRU },
      { name: 'Log', actions: CRUD },
      { name: 'Permission', actions: CRUD },
      { name: 'PrinterSettings', actions: CRUD },
      { name: 'ReceiptTemplate', actions: CRUD },
      { name: 'Role', actions: CRUD },
      { name: 'Scheduler', actions: RO },
      { name: 'Settings', actions: CRU },
      { name: 'SubscriptionFeature', actions: CRU },
      { name: 'SystemMetrics', actions: RO },
      { name: 'SystemSettings', actions: CRU },
      { name: 'Tenant', actions: CRUD },
      { name: 'User', actions: CRUD },
    ]
  }

  /**
   * Normalize role data from backend - handles various response structures
   */
  const normalizeRole = (role) => {
    // Backend may return rules at different levels:
    // Option A: role.permissions.rules (nested)
    // Option B: role.rules (flat)
    // Option C: role.permissions = { rules: [], rolePermissions: {} }
    if (!role) return role

    const normalized = { ...role }

    // Ensure permissions object exists
    if (!normalized.permissions) normalized.permissions = {}

    // If rules at root level, move into permissions
    if (Array.isArray(role.rules) && !normalized.permissions.rules) {
      normalized.permissions.rules = role.rules
    }

    // If rolePermissions at root level, move into permissions
    if (role.rolePermissions && !normalized.permissions.rolePermissions) {
      normalized.permissions.rolePermissions = role.rolePermissions
    }

    // If menuAccess at root level, move into permissions
    if (Array.isArray(role.menuAccess) && !normalized.permissions.menuAccess) {
      normalized.permissions.menuAccess = role.menuAccess
    }

    return normalized
  }

  /**
   * Fetch all roles from API
   */
  const fetchRoles = async () => {
    loading.value = true
    try {
      const response = await api.get('/permissions/roles')
      const rawRoles = response.data?.roles || response.roles || []
      roles.value = rawRoles.map(normalizeRole)

      if (isDev) {
        console.log('[useRolesPermissions] Fetched roles:', roles.value)
        if (roles.value.length > 0) {
          console.log('[useRolesPermissions] Sample role permissions structure:', JSON.stringify(roles.value[0]?.permissions, null, 2))
        }
      }

      return roles.value
    } catch (err) {
      handleError(err, 'Failed to fetch roles')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new role, then generate RBAC rules via generate-rules endpoint
   * @param {Object} roleData - { name, description, permissions, isActive }
   * permissions format: { Subject: ['read', 'create'] }
   */
  const createRole = async (roleData) => {
    saving.value = true
    try {
      const { permissions, menuAccess, ...baseData } = roleData
      // Include menuAccess in the role data sent to backend
      if (Array.isArray(menuAccess)) {
        baseData.menuAccess = menuAccess
      }

      // Step 1: Create role (with menuAccess)
      const response = await api.post('/permissions/roles', baseData)
      const newRole = response.data?.role || response.role || response

      // Step 2: Generate rules from subjects form
      if (newRole?.id && permissions && Object.keys(permissions).length > 0) {
        const allSelected = Object.keys(permissions).length >= availableResources.value.length
        await generateRulesForRole(newRole.id, permissions, { fullAccess: allSelected })
      }

      showSuccess('Role created successfully')
      return { success: true, data: newRole }
    } catch (err) {
      handleError(err, 'Failed to create role')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing role, then re-generate RBAC rules
   * @param {string} roleId - Role UUID
   * @param {Object} roleData - { name, description, permissions, isActive }
   */
  const updateRole = async (roleId, roleData) => {
    saving.value = true
    try {
      const { permissions, menuAccess, ...baseData } = roleData
      // Include menuAccess in the role data sent to backend
      if (Array.isArray(menuAccess)) {
        baseData.menuAccess = menuAccess
      }

      // Step 1: Update role base data (with menuAccess)
      const response = await api.put(`/permissions/roles/${roleId}`, baseData)
      const updatedRole = response.data?.role || response.role || response

      // Step 2: Regenerate rules from subjects
      if (permissions && Object.keys(permissions).length > 0) {
        const allSelected = Object.keys(permissions).length >= availableResources.value.length
        await generateRulesForRole(roleId, permissions, { fullAccess: allSelected })
      }

      showSuccess('Role updated successfully')
      return { success: true, data: updatedRole }
    } catch (err) {
      handleError(err, 'Failed to update role')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Generate rules for a role from form permissions
   * POST /permissions/roles/:roleId/generate-rules
   * @param {string} roleId
   * @param {Object} permissions - { Subject: ['read', 'create'] }
   */
  const generateRulesForRole = async (roleId, permissions, { fullAccess = false } = {}) => {
    const payload = fullAccess
      ? { fullAccess: true }
      : { subjects: formPermissionsToRules(permissions) }
    const response = await api.post(`/permissions/roles/${roleId}/generate-rules`, payload)
    if (isDev) {
      console.log('[useRolesPermissions] Rules generated for role', roleId, response.data)
    }
    return response.data
  }

  /**
   * Preview full permissions for a role (rules + menus + routes)
   * GET /permissions/roles/:roleId/preview
   */
  const previewRole = async (roleId) => {
    try {
      const response = await api.get(`/permissions/roles/${roleId}/preview`)
      return { success: true, data: response.data?.permissions || response.permissions || {} }
    } catch (err) {
      handleError(err, 'Failed to load role preview')
      return { success: false, error: err }
    }
  }

  /**
   * Update role permissions only
   * @param {string} roleId - Role UUID
   * @param {Object} permissions - Permissions object (lowercase plural camelCase keys)
   */
  const updateRolePermissions = async (roleId, permissions) => {
    saving.value = true
    try {
      const response = await api.patch(`/permissions/roles/${roleId}/permissions`, {
        permissions
      })
      const updatedRole = response.data?.role || response.role || response

      showSuccess('Role permissions updated successfully')
      return { success: true, data: updatedRole }
    } catch (err) {
      handleError(err, 'Failed to update role permissions')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a role
   * @param {string} roleId - Role UUID
   */
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

  /**
   * Regenerate routes metadata (Superadmin only)
   * Triggers backend to re-scan all route files and update metadata
   */
  const regenerateRoutes = async () => {
    try {
      const response = await api.post('/permissions/routes/regenerate')
      const result = response.data || response

      showSuccess(`Routes regenerated: ${result.data?.routesCount || 0} routes`)

      // Refresh available resources after regeneration
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
    generateRulesForRole,
    previewRole,
    rulesToFormPermissions,
    formPermissionsToRules
  }
}
