<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-4">
        <IconUsers class="w-6 h-6" />
        User Management
      </h2>

      <div class="alert alert-info mb-4">
        <IconInfoCircle class="w-5 h-5" />
        <span class="text-sm">Manage system users and their access roles</span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Users List -->
      <div v-else class="space-y-4">
        <!-- Action Buttons + Filters -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <!-- Role Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm text-base-content/60 whitespace-nowrap">Filter Role:</label>
            <select
              v-model="roleFilter"
              class="select select-bordered select-sm w-36"
              @change="onFilterChange"
            >
              <option value="">Semua (non-member)</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="trainer">Trainer</option>
              <option value="cashier">Cashier</option>
              <option value="member">Member</option>
            </select>
          </div>

          <button
            class="btn btn-primary btn-sm"
            @click="openCreateModal"
          >
            <IconPlus class="w-4 h-4" />
            Add New User
          </button>
        </div>

        <!-- Users Table -->
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tenant</th>
                <th>Type</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <div class="flex items-center gap-2">
                    <div class="avatar placeholder shrink-0">
                      <div class="bg-primary/10 text-primary rounded-full w-7 h-7">
                        <span class="text-xs font-bold">{{ (user.firstName?.[0] || user.email?.[0] || '?').toUpperCase() }}</span>
                      </div>
                    </div>
                    <div class="leading-tight">
                      <div class="font-medium text-sm">{{ [user.firstName, user.lastName].filter(Boolean).join(' ') || '—' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-1">
                    <IconUser class="w-4 h-4 opacity-50 shrink-0" />
                    <span class="text-sm">{{ user.email }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-sm">{{ user.role?.name || 'N/A' }}</span>
                </td>
                <td>
                  <span class="text-sm">{{ user.tenant?.name || 'N/A' }}</span>
                </td>
                <td>
                  <span
                    v-if="user.isSuperAdmin"
                    class="badge badge-sm badge-error"
                  >
                    Super Admin
                  </span>
                  <span v-else class="badge badge-sm badge-ghost">
                    Regular
                  </span>
                </td>
                <td>
                  <span class="text-sm opacity-70">
                    {{ formatDate(user.createdAt) }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-xs btn-ghost"
                      @click="openEditModal(user)"
                      :title="'Edit ' + user.email"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost text-error"
                      @click="confirmDelete(user)"
                      :disabled="user.isSuperAdmin"
                      :title="user.isSuperAdmin ? 'Cannot delete Super Admin' : 'Delete ' + user.email"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="7" class="text-center py-8 opacity-50">
                  No users found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit User Modal -->
    <dialog ref="userModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editingUser ? 'Edit User' : 'Create New User' }}
        </h3>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-semibold">Nama Depan *</span>
              </label>
              <input
                v-model="formData.firstName"
                type="text"
                placeholder="Budi"
                class="input input-bordered w-full"
                required
              />
            </div>
            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-semibold">Nama Belakang</span>
              </label>
              <input
                v-model="formData.lastName"
                type="text"
                placeholder="Santoso"
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <!-- Email -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Email *</span>
            </label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="user@example.com"
              class="input input-bordered w-full"
              required
            />
          </div>

          <!-- Password -->
          <div class="form-control" v-if="!editingUser">
            <label class="label">
              <span class="label-text font-semibold">Password *</span>
            </label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="Minimum 8 characters"
              class="input input-bordered w-full"
              :required="!editingUser"
              minlength="8"
            />
          </div>

          <!-- Password (for edit) -->
          <div class="form-control" v-else>
            <label class="label">
              <span class="label-text font-semibold">New Password</span>
              <span class="label-text-alt text-xs opacity-70">Leave empty to keep current</span>
            </label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="Minimum 8 characters"
              class="input input-bordered w-full"
              minlength="8"
            />
          </div>

          <!-- Role -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-semibold">Role *</span>
            </label>
            <select
              v-model="formData.roleId"
              class="select select-bordered w-full"
              required
            >
              <option value="" disabled>Select a role</option>
              <option
                v-for="role in availableRoles"
                :key="role.id"
                :value="role.id"
              >
                {{ role.name }}
              </option>
            </select>
          </div>

          <!-- Tenant (only for super admin) -->
          <div class="form-control" v-if="currentUser?.isSuperAdmin && availableTenants.length > 0">
            <label class="label">
              <span class="label-text font-semibold">Tenant</span>
              <span class="label-text-alt text-xs opacity-70">Optional for super admin</span>
            </label>
            <select
              v-model="formData.tenantId"
              class="select select-bordered w-full"
            >
              <option value="">Select a tenant</option>
              <option
                v-for="tenant in availableTenants"
                :key="tenant.id"
                :value="tenant.id"
              >
                {{ tenant.name }}
              </option>
            </select>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              @click="closeUserModal"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-sm"></span>
              <span v-else>{{ editingUser ? 'Update' : 'Create' }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation Dialog -->
    <DialogConfirm ref="deleteDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUsers } from '@/composables/admin/useUsers'
import { useRolesPermissions } from '@/composables/admin/useRolesPermissions'
import { useTenants } from '@/composables/admin/useTenants'
import { useAuth } from '@/composables/core/useAuth'
import DialogConfirm from '@/components/shared/DialogConfirm.vue'

// Icons
import {
  IconUsers,
  IconUser,
  IconPlus,
  IconEdit,
  IconTrash,
  IconInfoCircle
} from '@tabler/icons-vue'

// Composables
const { users, loading, saving, fetchUsers, createUser, updateUser, deleteUser } = useUsers()
const { roles, fetchRoles } = useRolesPermissions()
const { tenants, fetchTenants } = useTenants()
const { auth } = useAuth()

// Get current user from auth store
const currentUser = computed(() => auth.user)

// State
const userModal = ref(null)
const deleteDialog = ref(null)
const editingUser = ref(null)
const userToDelete = ref(null)

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  roleId: '',
  tenantId: ''
})

const roleFilter = ref('')  // default empty = exclude members (show all non-member roles)

// Computed
const availableRoles = computed(() => {
  return roles.value.filter(role => role.isActive)
})

const availableTenants = computed(() => {
  return tenants.value || []
})



// Methods
const onFilterChange = () => {
  loadUsers()
}

const loadUsers = async () => {
  const params = {}
  if (roleFilter.value) {
    params.role = roleFilter.value
  }
  await fetchUsers(params)
  // Default (no filter selected): exclude members client-side
  if (!roleFilter.value) {
    users.value = users.value.filter(u => {
      const roleName = typeof u.role === 'string' ? u.role : u.role?.name
      return (roleName || '').toLowerCase() !== 'member'
    })
  }
}
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const openCreateModal = () => {
  editingUser.value = null
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    tenantId: ''
  }
  userModal.value?.showModal()
}

const openEditModal = (user) => {
  editingUser.value = user
  formData.value = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    password: '',
    roleId: user.roleId || '',
    tenantId: user.tenantId || ''
  }
  userModal.value?.showModal()
}

const closeUserModal = () => {
  userModal.value?.close()
  editingUser.value = null
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: '',
    tenantId: ''
  }
}

const handleSubmit = async () => {
  const payload = {
    firstName: formData.value.firstName,
    lastName: formData.value.lastName || undefined,
    email: formData.value.email,
    roleId: formData.value.roleId
  }

  // Add password only if provided
  if (formData.value.password) {
    payload.password = formData.value.password
  }

  // Add tenantId only for super admin
  if (currentUser.value?.isSuperAdmin && formData.value.tenantId) {
    payload.tenantId = formData.value.tenantId
  }

  let result
  if (editingUser.value) {
    // Remove password from payload if empty on edit
    if (!payload.password) {
      delete payload.password
    }
    result = await updateUser(editingUser.value.id, payload)
    if (result.success) {
      // Patch local array immediately so table updates without waiting for fetchUsers
      const idx = users.value.findIndex(u => u.id === editingUser.value.id)
      if (idx !== -1) {
        users.value[idx] = {
          ...users.value[idx],
          firstName: payload.firstName,
          lastName: payload.lastName || '',
          email: payload.email,
          roleId: payload.roleId,
          ...(result.data || {}),
        }
      }
    }
  } else {
    result = await createUser(payload)
    if (result.success && result.data) {
      // Append new user to local array immediately
      users.value = [...users.value, result.data]
    }
  }

  if (result.success) {
    closeUserModal()
    await loadUsers()
  }
}

const confirmDelete = (user) => {
  userToDelete.value = user
  deleteDialog.value?.open({
    title: 'Delete User',
    message: `Are you sure you want to delete user '${user.email}'? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger'
  }).then((confirmed) => {
    if (confirmed) {
      handleDelete()
    }
  })
}

const handleDelete = async () => {
  if (!userToDelete.value) return

  const result = await deleteUser(userToDelete.value.id)
  if (result.success) {
    await loadUsers()
  }
  userToDelete.value = null
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadUsers(),
    fetchRoles(),
    currentUser.value?.isSuperAdmin ? fetchTenants() : Promise.resolve()
  ])
})
</script>
