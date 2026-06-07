import { ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export const useUsers = () => {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()
  const isDev = import.meta.env.DEV
  
  const users = ref([])
  const loading = ref(false)
  const saving = ref(false)

  /**
   * Fetch all users from API
   * @param {Object} params - Query params (e.g., { role: 'admin' })
   */
  const fetchUsers = async (params = {}) => {
    loading.value = true
    try {
      const qs = new URLSearchParams()
      if (params.role) qs.append('role', params.role)
      const query = qs.toString()
      const url = query ? `/users?${query}` : '/users'

      const response = await api.get(url)
      // Handle various response shapes: array | { data: [] } | { data: { users: [] } } | { users: [] }
      const raw = response.data ?? response
      users.value = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.data)
            ? raw.data
            : []

      if (isDev) {
        console.log('[useUsers] Fetched users:', users.value)
      }
      
      return users.value
    } catch (err) {
      handleError(err, 'Failed to fetch users')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get user by ID
   * @param {string|number} userId - User ID
   */
  const getUserById = async (userId) => {
    loading.value = true
    try {
      const response = await api.get(`/users/${userId}`)
      const user = response.data?.user || response.user || response
      
      if (isDev) {
        console.log('[useUsers] Fetched user:', user)
      }
      
      return user
    } catch (err) {
      handleError(err, 'Failed to fetch user')
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - { email, password, roleId, tenantId }
   */
  const createUser = async (userData) => {
    saving.value = true
    try {
      const response = await api.post('/users', userData)
      const newUser = response.data?.user || response.user || response
      
      showSuccess('User created successfully')
      return { success: true, data: newUser }
    } catch (err) {
      handleError(err, 'Failed to create user')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Update an existing user
   * @param {string|number} userId - User ID
   * @param {Object} userData - { email, password, roleId }
   */
  const updateUser = async (userId, userData) => {
    saving.value = true
    try {
      const response = await api.put(`/users/${userId}`, userData)
      const updatedUser = response.data?.user || response.user || response
      
      showSuccess('User updated successfully')
      return { success: true, data: updatedUser }
    } catch (err) {
      handleError(err, 'Failed to update user')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Delete a user
   * @param {string|number} userId - User ID
   */
  const deleteUser = async (userId) => {
    saving.value = true
    try {
      await api.delete(`/users/${userId}`)
      showSuccess('User deleted successfully')
      return { success: true }
    } catch (err) {
      handleError(err, 'Failed to delete user')
      return { success: false, error: err }
    } finally {
      saving.value = false
    }
  }

  /**
   * Format user data for display
   * @param {Object} user - User object
   */
  const formatUser = (user) => {
    return {
      id: user.id,
      email: user.email,
      roleName: user.role?.name || 'N/A',
      roleId: user.roleId,
      tenantName: user.tenant?.name || 'N/A',
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin || false,
      createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'
    }
  }

  return {
    // State
    users,
    loading,
    saving,
    
    // Methods
    fetchUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    formatUser
  }
}
