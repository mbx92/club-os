<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="card-title text-2xl mb-2">
              <IconShield class="w-7 h-7" />
              Roles & Permissions
            </h2>
            <p class="text-sm opacity-70">Manage user roles and control access to system features</p>
          </div>
          
          <div class="flex gap-2 flex-wrap">
            <button
              v-if="isSuperAdmin"
              class="btn btn-outline btn-sm gap-2"
              @click="handleRegenerateRoutes"
              :disabled="regenerating"
            >
              <IconRefresh class="w-4 h-4" :class="{ 'animate-spin': regenerating }" />
              {{ regenerating ? 'Syncing...' : 'Sync Routes' }}
            </button>
            <button
              class="btn btn-primary btn-sm gap-2"
              @click="openCreateModal"
            >
              <IconPlus class="w-5 h-5" />
              Create Role
            </button>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="flex flex-col md:flex-row gap-3 mt-4">
          <div class="flex-1">
            <div class="relative">
              <IconSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search roles..."
                class="input input-bordered input-sm w-full pl-10"
              />
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="viewMode = 'cards'"
              class="btn btn-sm btn-circle"
              :class="{ 'btn-primary': viewMode === 'cards', 'btn-ghost': viewMode !== 'cards' }"
            >
              <IconLayoutGrid class="w-4 h-4" />
            </button>
            <button
              @click="viewMode = 'list'"
              class="btn btn-sm btn-circle"
              :class="{ 'btn-primary': viewMode === 'list', 'btn-ghost': viewMode !== 'list' }"
            >
              <IconList class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Roles Display -->
    <div v-else>
      <!-- Cards View -->
      <div v-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="role in filteredRoles"
          :key="role.id"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-200 border border-base-300"
        >
          <div class="card-body p-6">
            <!-- Role Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="card-title text-xl capitalize flex items-center gap-2">
                  <component :is="getRoleIcon(role.name)" class="w-6 h-6" :class="getRoleColor(role.name)" />
                  {{ role.name }}
                </h3>
                <p class="text-sm opacity-70 mt-1">{{ role.description || 'No description' }}</p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <div
                  class="badge badge-sm"
                  :class="role.isActive ? 'badge-success' : 'badge-error'"
                >
                  {{ role.isActive ? 'Active' : 'Inactive' }}
                </div>
                <div
                  v-if="isSystemRole(role)"
                  class="badge badge-xs badge-primary"
                >
                  System Role
                </div>
                <div
                  v-else
                  class="badge badge-xs badge-secondary"
                >
                  Custom Role
                </div>
              </div>
            </div>

            <!-- Permission Summary -->
            <div class="space-y-2 my-4">
              <div class="flex items-center justify-between text-sm">
                <span class="opacity-70">Resources Access</span>
                <span class="font-semibold">{{ getPermissionCount(role.permissions) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="opacity-70">Menu Access</span>
                <span class="font-semibold">{{ getMenuAccessCount(role.permissions) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="opacity-70">Allowed Actions</span>
                <span class="font-semibold">{{ Object.values(getDisplayPermissions(role.permissions)).reduce((sum, actions) => sum + (Array.isArray(actions) ? actions.length : 0), 0) }}</span>
              </div>
            </div>

            <!-- Module Tags -->
            <div class="flex flex-wrap gap-1 mt-3 min-h-[32px]">
              <span
                v-for="module in getAccessibleModules(role.permissions)"
                :key="module"
                class="badge badge-sm badge-outline"
              >
                {{ module }}
              </span>
            </div>

            <!-- Actions -->
            <div class="card-actions justify-end mt-4 pt-4 border-t border-base-300">
              <button
                class="btn btn-ghost btn-sm gap-2"
                @click="openPermissionsModal(role)"
              >
                <IconEye class="w-4 h-4" />
                View Details
              </button>
              <button
                v-if="canCustomizeSystemRole(role)"
                class="btn btn-sm btn-secondary gap-2"
                @click="customizeSystemRole(role)"
                title="Buat salinan role khusus tenant yang bisa diedit"
              >
                <IconTemplate class="w-4 h-4" />
                Customize
              </button>
              <button
                v-else
                class="btn btn-sm btn-primary gap-2"
                @click="openEditModal(role)"
                :disabled="!canManageRole(role)"
                :title="editButtonTitle(role)"
              >
                <IconEdit class="w-4 h-4" />
                Edit
              </button>
              <button
                class="btn btn-sm btn-error btn-ghost gap-2"
                @click="confirmDelete(role)"
                :disabled="isSystemRole(role) || !canManageRole(role)"
                :title="!canManageRole(role) ? 'Only Super Admin can delete system roles' : ''"
              >
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredRoles.length === 0" class="col-span-full text-center py-12">
          <IconShieldOff class="w-16 h-16 mx-auto opacity-30 mb-4" />
          <p class="text-lg opacity-50">No roles found</p>
          <p class="text-sm opacity-40 mt-2">Try adjusting your search or create a new role</p>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="card bg-base-100 shadow-xl">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th class="text-center">Resources</th>
                <th class="text-center">Menus</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in filteredRoles" :key="role.id" class="hover">
                <td>
                  <div class="flex items-center gap-3">
                    <component :is="getRoleIcon(role.name)" class="w-5 h-5" :class="getRoleColor(role.name)" />
                    <div>
                      <div class="font-bold capitalize">{{ role.name }}</div>
                      <div
                        class="badge badge-xs mt-1"
                        :class="isSystemRole(role) ? 'badge-primary' : 'badge-secondary'"
                      >
                        {{ isSystemRole(role) ? 'System' : 'Custom' }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="text-sm opacity-70">{{ role.description || 'No description' }}</span>
                </td>
                <td class="text-center">
                  <div class="badge badge-lg">{{ getPermissionCount(role.permissions) }}</div>
                </td>
                <td class="text-center">
                  <div class="badge badge-lg badge-primary badge-outline">{{ getMenuAccessCount(role.permissions) }}</div>
                </td>
                <td class="text-center">
                  <span
                    class="badge"
                    :class="role.isActive ? 'badge-success' : 'badge-error'"
                  >
                    {{ role.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-1 justify-end">
                    <button
                      class="btn btn-ghost btn-sm btn-circle"
                      @click="openPermissionsModal(role)"
                      title="View Details"
                    >
                      <IconEye class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canCustomizeSystemRole(role)"
                      class="btn btn-ghost btn-sm btn-circle"
                      @click="customizeSystemRole(role)"
                      title="Customize — buat salinan role khusus tenant"
                    >
                      <IconTemplate class="w-4 h-4" />
                    </button>
                    <button
                      v-else
                      class="btn btn-ghost btn-sm btn-circle"
                      @click="openEditModal(role)"
                      :disabled="!canManageRole(role)"
                      :title="editButtonTitle(role)"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm btn-circle text-error"
                      @click="confirmDelete(role)"
                      :disabled="isSystemRole(role) || !canManageRole(role)"
                      :title="canManageRole(role) && !isSystemRole(role) ? 'Delete Role' : 'Only Super Admin can delete system roles'"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredRoles.length === 0">
                <td colspan="6" class="text-center py-12 opacity-50">
                  <IconShieldOff class="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No roles found</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>


    <!-- Create/Edit Role Modal -->
    <Teleport to="body">
      <dialog ref="roleModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-full !max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-2xl flex items-center gap-2">
            <IconShieldPlus v-if="!editingRole" class="w-7 h-7 text-primary" />
            <IconShieldCheck v-else class="w-7 h-7 text-primary" />
            {{ editingRole ? 'Edit Role' : (customizingFromRole ? `Customize ${customizingFromRole.name} Role` : 'Create New Role') }}
          </h3>
          <button
            @click="closeRoleModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <IconX class="w-5 h-5" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div
            v-if="customizingFromRole"
            class="alert alert-info text-sm"
          >
            <IconInfoCircle class="w-5 h-5 shrink-0" />
            <span>
              Role <strong class="capitalize">{{ customizingFromRole.name }}</strong> adalah system role bersama.
              Salinan ini akan disimpan khusus untuk tenant Anda. Assign ulang user ke role baru setelah disimpan.
            </span>
          </div>

          <!-- Role Templates (Only for new roles) -->
          <div v-if="!editingRole && !customizingFromRole" class="card bg-base-200">
            <div class="card-body p-3">
              <h4 class="font-semibold text-sm mb-2 flex items-center gap-2">
                <IconTemplate class="w-4 h-4" />
                Quick Start Templates
              </h4>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="template in roleTemplates"
                  :key="template.name"
                  type="button"
                  @click="applyTemplate(template)"
                  class="btn btn-outline btn-sm justify-start gap-2"
                >
                  <component :is="template.icon" class="w-4 h-4" />
                  <span class="flex-1 text-left">{{ template.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Basic Info -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                
                <!-- Role Name (2 cols) -->
                <div class="form-control md:col-span-2">
                  <label class="label py-1">
                    <span class="label-text font-semibold flex items-center gap-1">
                      Role Name <span class="text-error">*</span>
                    </span>
                  </label>
                  <input
                    v-model="formData.name"
                    type="text"
                    placeholder="e.g., trainer"
                    class="input input-bordered input-sm w-full"
                    required
                    :disabled="editingRole && isSystemRole(editingRole)"
                  />
                  <label class="label py-1">
                    <span class="label-text-alt opacity-60">Lowercase, no spaces</span>
                  </label>
                </div>

                <!-- Status (1 col - vertically aligned) -->
                <div class="form-control md:col-span-1">
                  <label class="label py-1">
                    <span class="label-text font-semibold">Status</span>
                  </label>
                  <label class="cursor-pointer flex items-center gap-3 p-1.5 border border-base-200 rounded-lg hover:bg-base-50 transition-colors bg-base-100 h-[2rem]">
                    <input
                      v-model="formData.isActive"
                      type="checkbox"
                      class="toggle toggle-xs toggle-primary"
                    />
                    <span class="label-text font-medium text-sm">
                      {{ formData.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </label>
                </div>

                <!-- Description (Full width on small, 4th col wrapped or handled differently? Let's make description full width below) -->
              </div>
              
              <!-- Description (Full Row) -->
              <div class="form-control mt-2">
                <label class="label py-1">
                  <span class="label-text font-semibold">Description</span>
                </label>
                <textarea
                  v-model="formData.description"
                  class="textarea textarea-bordered textarea-sm w-full resize-none"
                  rows="2"
                  placeholder="Brief description of role responsibilities..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Permissions Section -->
          <div class="divider my-3">
            <IconShield class="w-4 h-4" />
            <span class="text-sm font-semibold">Permissions Configuration</span>
          </div>

          <!-- Permission Search & Stats -->
          <div class="flex flex-col sm:flex-row items-center gap-4 w-full bg-base-100 p-1 rounded-lg">
            <!-- Search -->
            <div class="relative flex-1 w-full">
              <IconSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input
                v-model="permissionSearch"
                type="text"
                placeholder="Search permissions..."
                class="input input-bordered input-sm w-full pl-9 bg-base-100"
              />
            </div>

            <!-- Stats -->
            <div class="flex gap-3 w-full sm:w-auto">
              <div class="flex items-center gap-3 px-3 py-1 bg-base-200 rounded-lg flex-1 sm:flex-none border border-base-300">
                <div class="flex flex-col items-center min-w-[60px]">
                  <span class="text-[10px] uppercase font-bold opacity-60">Resources</span>
                  <span class="text-xl font-bold leading-none">{{ selectedResourceCount }}<span class="text-xs font-normal opacity-50">/{{ availableResources.length }}</span></span>
                </div>
              </div>
              
              <div class="flex items-center gap-3 px-3 py-1 bg-primary/10 rounded-lg flex-1 sm:flex-none border border-primary/20">
                <div class="flex flex-col items-center min-w-[60px]">
                  <span class="text-[10px] uppercase font-bold text-primary">Actions</span>
                  <span class="text-xl font-bold leading-none text-primary">{{ selectedActionCount }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Module Tabs -->
          <div class="py-2">
            <div class="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
              <button
                v-for="module in permissionModules"
                :key="module.id"
                type="button"
                class="flex flex-col items-center justify-center gap-1.5 min-w-[5rem] p-3 rounded-xl border transition-all duration-200 snap-start relative group"
                :class="activeModule === module.id 
                  ? 'bg-primary text-primary-content border-primary shadow-md transform scale-[1.02]' 
                  : 'bg-base-100 border-base-200 hover:border-primary/50 hover:bg-base-50 text-base-content/70'"
                @click="activeModule = module.id"
              >
                <component :is="module.icon" class="w-5 h-5 mb-0.5" />
                <span class="text-xs font-medium whitespace-nowrap">{{ module.label }}</span>
              </button>
            </div>
          </div>

          <!-- Permissions Grid -->
          <div class="max-h-[400px] overflow-y-auto border border-base-300 rounded-lg bg-base-50/50">
            <div class="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="resource in filteredPermissionsByModule"
                :key="resource.name"
                class="bg-base-100 hover:bg-base-200/50 transition-all duration-200 rounded-lg border border-base-200 shadow-sm hover:shadow-md group h-fit break-inside-avoid"
              >
                <div class="p-3">
                  <div class="flex items-start gap-2">
                    <!-- Resource Checkbox -->
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-primary mt-0.5"
                      :checked="isResourceSelected(resource.name)"
                      @change="toggleResource(resource.name)"
                    />
                    
                    <!-- Resource Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-1.5">
                        <div class="min-w-0">
                          <h4 class="font-semibold text-sm truncate">{{ resource.label || resource.name }}</h4>
                          <p v-if="resource.label && resource.label !== resource.name" class="text-[10px] opacity-50 truncate">{{ resource.name }}</p>
                        </div>
                        <span class="text-xs opacity-60 whitespace-nowrap ml-2">
                          {{ getSelectedActions(resource.name).length }}/{{ resource.actions.length }}
                        </span>
                      </div>
                      
                      <!-- Action Checkboxes -->
                      <div class="flex flex-wrap gap-1.5">
                        <label
                          v-for="action in resource.actions"
                          :key="action"
                          class="label cursor-pointer gap-1.5 py-1 px-2 rounded bg-base-200 hover:bg-base-300 transition-colors"
                        >
                          <input
                            type="checkbox"
                            class="checkbox checkbox-xs"
                            :checked="hasPermission(resource.name, action)"
                            @change="togglePermission(resource.name, action)"
                          />
                          <span class="label-text text-xs capitalize">{{ action }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="filteredPermissionsByModule.length === 0" class="text-center py-8 opacity-50">
                <IconFilter class="w-10 h-10 mx-auto mb-2" />
                <p class="text-sm">No permissions found</p>
                <p class="text-xs">Try different search terms or module</p>
              </div>
            </div>
          </div>

          <!-- Menu Access Section -->
          <div class="divider my-3">
            <IconMenu class="w-4 h-4" />
            <span class="text-sm font-semibold">Menu Access (Sidebar)</span>
          </div>

          <div class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <p class="text-sm opacity-70 mb-3">Pilih menu sidebar yang boleh diakses oleh role ini:</p>
              <div class="space-y-2">
                <div v-for="menu in allMenuKeys" :key="menu.key" class="border rounded-lg border-base-200 overflow-hidden">
                  <!-- Parent item -->
                  <label
                    class="label cursor-pointer gap-2 py-2 px-3 transition-colors"
                    :class="formData.menuAccess.includes(menu.key) ? 'bg-primary/10' : 'hover:bg-base-200'"
                  >
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-primary"
                      :checked="formData.menuAccess.includes(menu.key)"
                      @change="toggleParentMenuAccess(menu)"
                    />
                    <span class="label-text text-sm font-semibold flex-1">{{ menu.label }}</span>
                    <span v-if="menu.children" class="text-xs opacity-50">
                      {{ getChildMenuCount(menu) }}/{{ menu.children.length }}
                    </span>
                  </label>
                  <!-- Children items -->
                  <div v-if="menu.children && formData.menuAccess.includes(menu.key)" class="border-t border-base-200 bg-base-50 px-3 py-2">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-1">
                      <label
                        v-for="child in menu.children"
                        :key="child.key"
                        class="label cursor-pointer gap-2 py-1.5 px-2 rounded transition-colors text-sm"
                        :class="formData.menuAccess.includes(child.key) ? 'bg-primary/5' : 'hover:bg-base-200'"
                      >
                        <input
                          type="checkbox"
                          class="checkbox checkbox-xs checkbox-primary"
                          :checked="formData.menuAccess.includes(child.key)"
                          @change="toggleMenuAccess(child.key)"
                        />
                        <span class="label-text text-xs">{{ child.label }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mt-2 justify-end">
                <button
                  type="button"
                  class="btn btn-xs btn-ghost gap-1"
                  @click="selectAllMenuAccess"
                >
                  <IconChecks class="w-3.5 h-3.5" />
                  Select All
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost gap-1"
                  @click="formData.menuAccess = []"
                >
                  <IconX class="w-3.5 h-3.5" />
                  Clear All
                </button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-end pt-3 border-t mt-4">
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              @click="closeRoleModal"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm btn-primary gap-1.5"
              :class="{ 'loading': saving }"
              :disabled="saving || selectedResourceCount === 0"
            >
              <IconDeviceFloppy v-if="!saving" class="w-4 h-4" />
              {{ saving ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role') }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
      </dialog>
    </Teleport>


    <!-- View Permissions Modal -->
    <Teleport to="body">
      <dialog ref="permissionsModal" class="modal modal-bottom sm:modal-middle">
      <div class="modal-box w-full !max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-bold text-2xl flex items-center gap-2 capitalize">
            <component :is="getRoleIcon(viewingRole?.name)" class="w-7 h-7" :class="getRoleColor(viewingRole?.name)" />
            {{ viewingRole?.name }} Role
          </h3>
          <button
            @click="closePermissionsModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <IconX class="w-5 h-5" />
          </button>
        </div>

        <!-- Role Description -->
        <div class="alert mb-6">
          <IconInfoCircle class="w-5 h-5" />
          <p class="text-sm">{{ viewingRole?.description || 'No description available' }}</p>
        </div>

        <!-- Tabs for Different Permission Views -->
        <div class="tabs tabs-boxed mb-6">
          <a
            class="tab gap-2"
            :class="{ 'tab-active': permissionView === 'summary' }"
            @click="permissionView = 'summary'"
          >
            <IconDashboard class="w-4 h-4" />
            Summary
          </a>
          <a
            class="tab gap-2"
            :class="{ 'tab-active': permissionView === 'resources' }"
            @click="permissionView = 'resources'"
          >
            <IconDatabase class="w-4 h-4" />
            Resources
          </a>
          <a
            class="tab gap-2"
            :class="{ 'tab-active': permissionView === 'menu' }"
            @click="permissionView = 'menu'"
          >
            <IconMenu class="w-4 h-4" />
            Menu Access
          </a>
        </div>

        <!-- Summary View -->
        <div v-if="permissionView === 'summary'" class="space-y-4">
          <div class="stats shadow w-full">
            <div class="stat">
              <div class="stat-figure text-primary">
                <IconDatabase class="w-8 h-8" />
              </div>
              <div class="stat-title">Resources</div>
              <div class="stat-value text-primary">{{ getPermissionCount(viewingRole?.permissions) }}</div>
              <div class="stat-desc">Total accessible resources</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-secondary">
                <IconShield class="w-8 h-8" />
              </div>
              <div class="stat-title">Actions</div>
              <div class="stat-value text-secondary">{{ Object.values(getDisplayPermissions(viewingRole?.permissions)).reduce((sum, actions) => sum + (Array.isArray(actions) ? actions.length : 0), 0) }}</div>
              <div class="stat-desc">Total allowed actions</div>
            </div>
            <div class="stat">
              <div class="stat-figure text-accent">
                <IconMenu class="w-8 h-8" />
              </div>
              <div class="stat-title">Menus</div>
              <div class="stat-value text-accent">{{ getMenuAccessCount(viewingRole?.permissions) }}</div>
              <div class="stat-desc">Accessible menus</div>
            </div>
          </div>

          <!-- Accessible Modules -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-lg mb-3">Accessible Modules</h4>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="module in getAccessibleModules(viewingRole?.permissions)"
                  :key="module"
                  class="badge badge-lg badge-primary"
                >
                  {{ module }}
                </div>
                <div v-if="getAccessibleModules(viewingRole?.permissions).length === 0" class="text-sm opacity-50">
                  No specific modules assigned
                </div>
              </div>
            </div>
          </div>

          <!-- UI Flags -->
          <div v-if="viewingRole?.permissions?.uiFlags" class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-lg mb-3">UI Capabilities</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div
                  v-for="(value, flag) in viewingRole.permissions.uiFlags"
                  :key="flag"
                  class="flex items-center gap-2"
                >
                  <IconCheck v-if="value" class="w-5 h-5 text-success" />
                  <IconX v-else class="w-5 h-5 text-error" />
                  <span class="text-sm capitalize">{{ formatFlagName(flag) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resources View -->
        <div v-if="permissionView === 'resources'" class="space-y-3 max-h-[500px] overflow-y-auto">
          <div
            v-for="(actions, resource) in getDisplayPermissions(viewingRole?.permissions)"
            :key="resource"
            class="card bg-base-200"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold">{{ resource }}</h4>
                <span class="badge badge-primary">{{ Array.isArray(actions) ? actions.length : 0 }} actions</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="action in (Array.isArray(actions) ? actions : [])"
                  :key="action"
                  class="badge badge-sm capitalize"
                  :class="{
                    'badge-success': action === 'read',
                    'badge-info': action === 'create',
                    'badge-warning': action === 'update',
                    'badge-error': action === 'delete',
                    'badge-primary': action === 'manage'
                  }"
                >
                  {{ action }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="Object.keys(getDisplayPermissions(viewingRole?.permissions)).length === 0" class="text-center py-8 opacity-50">
            <IconDatabase class="w-12 h-12 mx-auto mb-2" />
            <p>No resource permissions defined</p>
          </div>
        </div>

        <!-- Menu Access View -->
        <div v-if="permissionView === 'menu'" class="space-y-3">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div
              v-for="menu in viewingRole?.permissions?.menuAccess || []"
              :key="menu"
              class="card bg-primary text-primary-content"
            >
              <div class="card-body p-4 items-center text-center">
                <IconCheck class="w-6 h-6 mb-1" />
                <span class="text-sm font-semibold capitalize">{{ menu }}</span>
              </div>
            </div>
          </div>
          <div v-if="!viewingRole?.permissions?.menuAccess || viewingRole.permissions.menuAccess.length === 0" class="text-center py-8 opacity-50">
            <IconMenu class="w-12 h-12 mx-auto mb-2" />
            <p>No menu access defined</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex gap-3 justify-end pt-6 border-t mt-6">
          <button
            class="btn btn-ghost"
            @click="closePermissionsModal"
          >
            Close
          </button>
          <button
            v-if="canCustomizeSystemRole(viewingRole)"
            class="btn btn-secondary gap-2"
            @click="customizeFromView"
          >
            <IconTemplate class="w-4 h-4" />
            Customize Role
          </button>
          <button
            v-else-if="canManageRole(viewingRole)"
            class="btn btn-primary gap-2"
            @click="editFromView"
          >
            <IconEdit class="w-4 h-4" />
            Edit Role
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
      </dialog>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRolesPermissions } from '@/composables/admin/useRolesPermissions'
import { useNotification } from '@/composables/core/useNotification'
import { useAuthStore } from '@/stores/auth'
import { ALL_MENU_KEYS, ROLE_MENU_MAP } from '@/navigation/menuKeys'
import {
  getAllMenuKeyValues,
  resolveMenuAccessForRole,
  resolvePermissionsFromResources,
  extractStoredResourcesFromRolePermissions,
  buildAllResourcePermissions,
  normalizeMenuAccess
} from '@/navigation/menuKeyUtils'
import {
  IconShield,
  IconShieldPlus,
  IconShieldCheck,
  IconShieldOff,
  IconInfoCircle,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDeviceFloppy,
  IconRefresh,
  IconSearch,
  IconLayoutGrid,
  IconList,
  IconEye,
  IconX,
  IconTemplate,
  IconChecks,
  IconFilter,
  IconCheck,
  IconDashboard,
  IconDatabase,
  IconMenu,
  IconUsers,
  IconCash,
  IconToolsKitchen2,
  IconFileInvoice,
  IconSettings,
  IconUserCog,
  IconCrown,
  IconCashRegister,
  IconTicket,
  IconBuildingSkyscraper,
  IconReportAnalytics,
  IconServerCog
} from '@tabler/icons-vue'

const { showError } = useNotification()
const dialog = inject('dialog')
const authStore = useAuthStore()

const {
  roles,
  availableResources,
  loading,
  saving,
  fetchAvailableResources,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  regenerateRoutes
} = useRolesPermissions()

const roleModal = ref(null)
const permissionsModal = ref(null)
const editingRole = ref(null)
const viewingRole = ref(null)
const regenerating = ref(false)
const searchQuery = ref('')
const permissionSearch = ref('')
const viewMode = ref('cards') // 'cards' or 'list'
const activeModule = ref('all')
const permissionView = ref('summary') // 'summary', 'resources', 'menu'

// Must stay reactive — authStore.user can hydrate after this tab mounts.
const isSuperAdmin = computed(() => authStore.user?.isSuperAdmin === true)
const isTenantAdmin = computed(() => {
  if (isSuperAdmin.value) return true
  const role = authStore.user?.role
  const roleName = (typeof role === 'string' ? role : role?.name || '').toLowerCase()
  return roleName === 'admin' || roleName === 'owner'
})

// RBAC-01: roles are either shared system defaults (tenantId null) or owned
// by exactly one tenant. Mirrors the access rules enforced server-side in
// permissionController.js so the UI never offers an action the API will reject.
const resolveCurrentTenantId = () => {
  const currentUser = authStore.user
  if (!currentUser) return null
  return currentUser.tenantId ?? currentUser.tenant?.id ?? null
}

const sameTenantId = (left, right) => {
  if (left == null || right == null) return false
  return String(left) === String(right)
}

const isSystemRole = (role) => {
  const tenantId = role?.tenantId
  return tenantId === null || tenantId === undefined || tenantId === ''
}

const canManageRole = (role) => {
  if (!role) return false
  if (isSuperAdmin.value) return true
  return !isSystemRole(role) && sameTenantId(role.tenantId, resolveCurrentTenantId())
}
// System roles are shared platform-wide — tenant admins clone them instead of editing in place.
const canCustomizeSystemRole = (role) => {
  if (!role || !isSystemRole(role)) return false
  if (isSuperAdmin.value) return false
  return isTenantAdmin.value
}
const editButtonTitle = (role) => {
  if (canManageRole(role)) return 'Edit Role'
  if (isSystemRole(role)) {
    return 'System role — hanya Super Admin yang bisa edit langsung. Gunakan Customize untuk salinan tenant.'
  }
  if (!resolveCurrentTenantId()) {
    return 'Tenant tidak terdeteksi — logout/login ulang lalu coba lagi.'
  }
  return 'Role ini milik tenant lain'
}

const MODULE_META = {
  all: { id: 'all', label: 'All', icon: IconShield },
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  'cash-register': { id: 'cash-register', label: 'Cash Register', icon: IconCashRegister },
  gym: { id: 'gym', label: 'Gym', icon: IconUsers },
  restaurant: { id: 'restaurant', label: 'Restaurant', icon: IconToolsKitchen2 },
  vouchers: { id: 'vouchers', label: 'Vouchers', icon: IconTicket },
  'back-office': { id: 'back-office', label: 'Back Office', icon: IconBuildingSkyscraper },
  finances: { id: 'finances', label: 'Finances', icon: IconFileInvoice },
  reports: { id: 'reports', label: 'Reports', icon: IconReportAnalytics },
  subscription: { id: 'subscription', label: 'Subscription', icon: IconCrown },
  settings: { id: 'settings', label: 'Settings', icon: IconSettings },
  system: { id: 'system', label: 'System', icon: IconServerCog },
}

const MODULE_ORDER = [
  'all',
  'dashboard',
  'cash-register',
  'gym',
  'restaurant',
  'vouchers',
  'back-office',
  'finances',
  'reports',
  'subscription',
  'settings',
  'system',
]

const permissionModules = computed(() => {
  const availableModuleIds = new Set(
    availableResources.value.map(resource => resource.module || 'system')
  )

  return MODULE_ORDER
    .filter(id => id === 'all' || availableModuleIds.has(id))
    .map(id => MODULE_META[id] || { id, label: id, icon: IconShield })
})

// Role Templates — subjects must match backend config/routePermissions.js ROUTE_TO_SUBJECT_MAP
const roleTemplates = [
  {
    name: 'Cashier',
    icon: IconCash,
    description: 'Front desk staff who handle transactions',
    permissions: {
      Dashboard:           ['read'],
      Member:              ['read', 'create', 'update'],
      CheckIn:             ['read', 'create', 'update'],
      Transaction:         ['read', 'create'],
      Payment:             ['read', 'create'],
      Invoice:             ['read', 'create'],
      Voucher:             ['read', 'create', 'update'],
      CashRegisterSession: ['read', 'create', 'update'],
      ActiveService:       ['read', 'create', 'update'],
      StaffAttendance:     ['read'],
      HikvisionDevice:     ['read'],
    }
  },
  {
    name: 'Manager',
    icon: IconUserCog,
    description: 'Manager with supervisory access',
    permissions: {
      Dashboard:           ['read'],
      Member:              ['read', 'create', 'update', 'delete'],
      MembershipPlan:      ['read', 'create', 'update', 'delete'],
      CheckIn:             ['read', 'create', 'update', 'delete'],
      Transaction:         ['read'],
      FinancialReport:     ['read'],
      EmployeeSchedule:    ['read', 'update'],
      StaffAttendance:     ['read', 'create', 'update'],
      Trainer:             ['read', 'update'],
      TrainerCommission:   ['read'],
      ActiveService:       ['read', 'create', 'update', 'delete'],
      ServicePlan:         ['read', 'create', 'update', 'delete'],
      RestaurantProduct:   ['read', 'create', 'update', 'delete'],
      RestaurantCategory:  ['read', 'create', 'update', 'delete'],
      RestaurantTable:     ['read', 'create', 'update'],
      RestaurantStock:     ['read', 'create', 'update'],
    }
  },
  {
    name: 'Trainer',
    icon: IconUsers,
    description: 'Gym instructor with limited access',
    permissions: {
      Dashboard:         ['read'],
      Member:            ['read'],
      CheckIn:           ['read', 'create'],
      PTSession:         ['read', 'create', 'update'],
      ActiveService:     ['read', 'update'],
      TrainerCommission: ['read'],
    }
  }
]

// Form data
const formData = ref({
  name: '',
  description: '',
  permissions: {},
  menuAccess: [],
  isActive: true
})
const customizingFromRole = ref(null)

// All available menu keys for the editor
const allMenuKeys = ALL_MENU_KEYS

// Toggle single menu access checkbox
const toggleMenuAccess = (key) => {
  const idx = formData.value.menuAccess.indexOf(key)
  if (idx > -1) {
    formData.value.menuAccess.splice(idx, 1)
  } else {
    formData.value.menuAccess.push(key)
  }
}

// Toggle parent menu (also toggles all children)
const toggleParentMenuAccess = (menu) => {
  const idx = formData.value.menuAccess.indexOf(menu.key)
  if (idx > -1) {
    // Unchecking parent → remove parent + all children
    formData.value.menuAccess.splice(idx, 1)
    if (menu.children) {
      menu.children.forEach(child => {
        const ci = formData.value.menuAccess.indexOf(child.key)
        if (ci > -1) formData.value.menuAccess.splice(ci, 1)
      })
    }
  } else {
    // Checking parent → add parent + all children
    formData.value.menuAccess.push(menu.key)
    if (menu.children) {
      menu.children.forEach(child => {
        if (!formData.value.menuAccess.includes(child.key)) {
          formData.value.menuAccess.push(child.key)
        }
      })
    }
  }
}

// Select all menu access (parent + all children)
const selectAllMenuAccess = () => {
  formData.value.menuAccess = getAllMenuKeyValues()
}

// Get count of checked children for a parent
const getChildMenuCount = (menu) => {
  if (!menu.children) return 0
  return menu.children.filter(c => formData.value.menuAccess.includes(c.key)).length
}

// Computed: Filtered roles (by search)
const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  
  const query = searchQuery.value.toLowerCase()
  return roles.value.filter(role => {
    return (
      role.name.toLowerCase().includes(query) ||
      (role.description && role.description.toLowerCase().includes(query))
    )
  })
})

// Computed: Filtered permissions by module and search
const filteredPermissionsByModule = computed(() => {
  let filtered = availableResources.value

  // Filter by search
  if (permissionSearch.value) {
    const query = permissionSearch.value.toLowerCase()
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.label || '').toLowerCase().includes(query)
    )
  }

  // Filter by module from backend catalog
  if (activeModule.value !== 'all') {
    filtered = filtered.filter(r => (r.module || 'system') === activeModule.value)
  }

  return filtered
})

// Computed: Selected resource count
const selectedResourceCount = computed(() => {
  return Object.keys(formData.value.permissions).length
})

// Computed: Selected action count
const selectedActionCount = computed(() => {
  return Object.values(formData.value.permissions).reduce((sum, actions) => {
    return sum + (Array.isArray(actions) ? actions.length : 0)
  }, 0)
})

// Helper: Get selected actions for a resource
const getSelectedActions = (resourceName) => {
  return formData.value.permissions[resourceName] || []
}

// Helper: Extract resource permissions for display
const getDisplayPermissions = (permissions) => {
  return permissions?.resources || {}
}

// Helper: Get permission count
const getPermissionCount = (permissions) => {
  if (!permissions) return 0
  return Object.keys(getDisplayPermissions(permissions)).length
}

// Helper: Get menu access count
const getMenuAccessCount = (permissions) => {
  if (!permissions?.menuAccess) return 0
  return permissions.menuAccess.length
}

// Helper: Get accessible modules — extract unique top-level names from menuAccess keys
const getAccessibleModules = (permissions) => {
  if (!permissions?.menuAccess) return []
  
  const moduleLabels = {
    dashboard: 'Dashboard',
    gym: 'Gym',
    pos: 'POS',
    restaurant: 'Restaurant',
    classes: 'Classes',
    finance: 'Finance',
    finances: 'Finance',
    reports: 'Reports',
    subscription: 'Subscription',
    'back-office': 'Back Office',
    'cash-register': 'Cash Register',
    vouchers: 'Vouchers',
    settings: 'Settings',
  }
  
  const seen = new Set()
  const modules = []
  for (const key of permissions.menuAccess) {
    // Extract top-level module: "gym.members" → "gym", "dashboard" → "dashboard"
    const topLevel = key.includes('.') ? key.split('.')[0] : key
    if (seen.has(topLevel)) continue
    // Only show known modules (filter out stale/unknown keys from old data)
    if (!moduleLabels[topLevel]) continue
    seen.add(topLevel)
    modules.push(moduleLabels[topLevel])
  }
  return modules
}

// Helper: Get role icon
const getRoleIcon = (roleName) => {
  const icons = {
    admin: IconCrown,
    manager: IconUserCog,
    cashier: IconCash,
    trainer: IconUsers,
    member: IconUsers
  }
  return icons[roleName?.toLowerCase()] || IconShield
}

// Helper: Get role color
const getRoleColor = (roleName) => {
  const colors = {
    admin: 'text-primary',
    manager: 'text-secondary',
    cashier: 'text-accent',
    trainer: 'text-info',
    member: 'text-success'
  }
  return colors[roleName?.toLowerCase()] || 'text-base-content'
}

// Helper: Format flag name
const formatFlagName = (flag) => {
  return flag.replace(/([A-Z])/g, ' $1').trim().replace(/^can/, '')
}

// Load roles and resources on mount
onMounted(async () => {
  // Fetch roles first, then resources (to merge existing permissions)
  await fetchRoles()
  await fetchAvailableResources()
})

// Apply role template
const applyTemplate = (template) => {
  formData.value.name = template.name.toLowerCase()
  formData.value.description = template.description
  formData.value.permissions = { ...template.permissions }
  // Apply default menu access for this template role
  formData.value.menuAccess = ROLE_MENU_MAP[template.name.toLowerCase()] || []
}

// Open create modal
const openCreateModal = () => {
  editingRole.value = null
  customizingFromRole.value = null
  formData.value = {
    name: '',
    description: '',
    permissions: {},
    menuAccess: [],
    isActive: true
  }
  activeModule.value = 'all'
  permissionSearch.value = ''
  roleModal.value?.showModal()
}

const populateFormFromRole = (role, { asCustomCopy = false } = {}) => {
  const perms = role.permissions || {}
  const rawResources = extractStoredResourcesFromRolePermissions(perms)
  let existingPermissions = resolvePermissionsFromResources(rawResources, availableResources.value, role)

  const roleName = role.name?.toLowerCase()
  if ((roleName === 'admin' || roleName === 'owner') && availableResources.value.length > 0) {
    existingPermissions = buildAllResourcePermissions(availableResources.value)
  }

  formData.value = {
    name: role.name,
    description: asCustomCopy
      ? (role.description ? `${role.description} (custom)` : `Custom copy of ${role.name}`)
      : (role.description || ''),
    permissions: existingPermissions,
    menuAccess: resolveMenuAccessForRole(role),
    isActive: role.isActive
  }
}

const customizeSystemRole = (role) => {
  editingRole.value = null
  customizingFromRole.value = role
  populateFormFromRole(role, { asCustomCopy: true })
  activeModule.value = 'all'
  permissionSearch.value = ''
  roleModal.value?.showModal()
}

// Open edit modal
const openEditModal = (role) => {
  editingRole.value = role
  customizingFromRole.value = null

  if (import.meta.env.DEV) {
    console.log('[EditModal] role.permissions:', JSON.stringify(role.permissions || {}, null, 2))
  }

  populateFormFromRole(role)
  activeModule.value = 'all'
  permissionSearch.value = ''
  roleModal.value?.showModal()
}

// Open permissions view modal
const openPermissionsModal = (role) => {
  viewingRole.value = role
  permissionView.value = 'summary'
  permissionsModal.value?.showModal()
}

// Edit from view modal
const editFromView = () => {
  closePermissionsModal()
  if (viewingRole.value) {
    openEditModal(viewingRole.value)
  }
}

const customizeFromView = () => {
  closePermissionsModal()
  if (viewingRole.value) {
    customizeSystemRole(viewingRole.value)
  }
}

// Close modals
const closeRoleModal = () => {
  roleModal.value?.close()
  editingRole.value = null
  customizingFromRole.value = null
}

const closePermissionsModal = () => {
  permissionsModal.value?.close()
  viewingRole.value = null
}

// Check if resource is selected
const isResourceSelected = (resource) => {
  return formData.value.permissions[resource]?.length > 0
}

// Toggle entire resource
const toggleResource = (resource) => {
  if (isResourceSelected(resource)) {
    delete formData.value.permissions[resource]
  } else {
    const resourceDef = availableResources.value.find(r => r.name === resource)
    if (resourceDef) {
      formData.value.permissions[resource] = [...resourceDef.actions]
    }
  }
}

// Check if permission exists
const hasPermission = (resource, action) => {
  return formData.value.permissions[resource]?.includes(action) || false
}

// Toggle individual permission
const togglePermission = (resource, action) => {
  if (!formData.value.permissions[resource]) {
    formData.value.permissions[resource] = []
  }
  
  const index = formData.value.permissions[resource].indexOf(action)
  if (index > -1) {
    formData.value.permissions[resource].splice(index, 1)
    // Remove resource if no actions left
    if (formData.value.permissions[resource].length === 0) {
      delete formData.value.permissions[resource]
    }
  } else {
    formData.value.permissions[resource].push(action)
  }
}

// Handle regenerate routes (Superadmin only)
const handleRegenerateRoutes = async () => {
  const confirmed = await dialog.confirm({
    title: 'Sync Routes Metadata',
    message: 'This will refresh route metadata and update the available permission catalog. Continue?',
    confirmText: 'Sync',
    cancelText: 'Cancel'
  })
  
  if (confirmed) {
    regenerating.value = true
    const result = await regenerateRoutes()
    regenerating.value = false
    
    if (result.success) {
      const isDev = import.meta.env.DEV
      if (isDev) {
        console.log('[RolesPermissionsTab] Routes regenerated:', result.data)
      }
    }
  }
}

// Handle form submission
const handleSubmit = async () => {
  // Validate
  if (!formData.value.name) {
    showError('Role name is required')
    return
  }

  if (Object.keys(formData.value.permissions).length === 0) {
    showError('At least one permission is required')
    return
  }

  const payload = {
    ...formData.value,
    // Save exactly what the admin selected — no auto-derivation from permissions.
    // menuAccess is the single source of truth for sidebar visibility.
    menuAccess: normalizeMenuAccess(formData.value.menuAccess)
  }

  let result
  const editedCurrentUserRole = editingRole.value?.id && editingRole.value.id === authStore.user?.role?.id

  if (editingRole.value) {
    result = await updateRole(editingRole.value.id, payload)
  } else {
    result = await createRole(payload)
  }
  
  if (result.success) {
    if (editedCurrentUserRole) {
      await authStore.fetchUserPermissions()
    }
    await fetchRoles()
    closeRoleModal()
  }
}

// Confirm delete using DialogConfirm
const confirmDelete = async (role) => {
  const confirmed = await dialog.delete({
    title: 'Delete Role',
    message: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })
  
  if (confirmed) {
    const result = await deleteRole(role.id)
    if (result.success) {
      await fetchRoles()
    }
  }
}

</script>
