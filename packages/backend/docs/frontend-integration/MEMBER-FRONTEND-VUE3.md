# 👤 Member Module - Vue.js 3 Frontend Implementation

## 📋 Overview

Frontend implementation untuk Member module menggunakan Vue.js 3 dengan Composition API, TypeScript support, dan best practices.

---

## 🏗️ Architecture

```
src/
├── api/
│   └── memberApi.ts                 # HTTP service layer
├── types/
│   └── member.ts                    # TypeScript interfaces
├── composables/
│   ├── useMembers.ts                # List & operations composable
│   └── useMember.ts                 # Single member composable
├── components/
│   ├── members/
│   │   ├── MemberList.vue           # Table with pagination
│   │   ├── MemberForm.vue           # Create/Edit form
│   │   ├── MemberDetail.vue         # Detail view
│   │   ├── MemberFilters.vue        # Search & filter controls
│   │   └── MemberPasswordReset.vue  # Password reset dialog
│   └── shared/
│       ├── DataTable.vue            # Reusable table component
│       └── FormModal.vue            # Reusable modal
└── views/
    └── members/
        ├── MemberListView.vue       # Main list page
        ├── MemberCreateView.vue     # Create page
        ├── MemberEditView.vue       # Edit page
        └── MemberDetailView.vue     # Detail page
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.6.0",
    "@vueuse/core": "^10.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### Optional UI Libraries (pick one):

**Option 1: Element Plus**
```bash
npm install element-plus
npm install @element-plus/icons-vue
```

**Option 2: Ant Design Vue**
```bash
npm install ant-design-vue
```

**Option 3: Naive UI**
```bash
npm install naive-ui
```

**Option 4: PrimeVue**
```bash
npm install primevue primeicons
```

---

## 🔧 Implementation Files

### 1. TypeScript Types

**File:** `src/types/member.ts`

```typescript
export interface Member {
  id: string;
  tenantId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  photoUrl: string | null;
  joinDate: string;
  isActive: boolean;
  membershipStatus: 'active' | 'expired' | 'suspended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  
  // Relations
  user?: {
    id: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastLogin: string | null;
  };
  tenant?: {
    id: string;
    name: string;
  };
  memberships?: any[];
}

export interface CreateMemberDTO {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export interface UpdateMemberDTO extends Partial<CreateMemberDTO> {
  isActive?: boolean;
}

export interface MemberFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  membershipStatus?: 'active' | 'expired' | 'suspended' | 'cancelled';
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface MemberListResponse {
  data: Member[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: MemberFilters;
}

export interface MemberCreateResponse {
  message: string;
  member: Partial<Member>;
  credentials: {
    tempPassword?: string;
    message?: string;
  };
}
```

---

### 2. API Service Layer

**File:** `src/api/memberApi.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import type { 
  Member, 
  CreateMemberDTO, 
  UpdateMemberDTO, 
  MemberFilters, 
  MemberListResponse,
  MemberCreateResponse 
} from '@/types/member';

class MemberApi {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors globally
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all members with pagination and filters
   */
  async getMembers(filters?: MemberFilters): Promise<MemberListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.api.get<MemberListResponse>(
      `/gym/members?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get single member by ID
   */
  async getMember(id: string): Promise<Member> {
    const response = await this.api.get<Member>(`/gym/members/${id}`);
    return response.data;
  }

  /**
   * Create new member
   */
  async createMember(data: CreateMemberDTO): Promise<MemberCreateResponse> {
    const response = await this.api.post<MemberCreateResponse>('/gym/members', data);
    return response.data;
  }

  /**
   * Update member
   */
  async updateMember(id: string, data: UpdateMemberDTO): Promise<{ message: string; member: Member }> {
    const response = await this.api.put<{ message: string; member: Member }>(
      `/gym/members/${id}`, 
      data
    );
    return response.data;
  }

  /**
   * Delete member (soft delete)
   */
  async deleteMember(id: string): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/gym/members/${id}`);
    return response.data;
  }

  /**
   * Reset member password
   */
  async resetPassword(id: string): Promise<{ message: string; data: any }> {
    const response = await this.api.post<{ message: string; data: any }>(
      `/gym/members/${id}/reset-password`
    );
    return response.data;
  }

  /**
   * Export members to CSV/Excel
   */
  async exportMembers(filters?: MemberFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await this.api.get(`/gym/members/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const memberApi = new MemberApi();
export default memberApi;
```

---

### 3. Composables

#### 3.1 useMembers (List Operations)

**File:** `src/composables/useMembers.ts`

```typescript
import { ref, reactive, computed } from 'vue';
import { memberApi } from '@/api/memberApi';
import type { Member, MemberFilters, MemberListResponse } from '@/types/member';

export function useMembers() {
  const members = ref<Member[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const filters = reactive<MemberFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: 'all',
    membershipStatus: undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  const pagination = reactive({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  /**
   * Fetch members from API
   */
  const fetchMembers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response: MemberListResponse = await memberApi.getMembers(filters);
      members.value = response.data;
      Object.assign(pagination, response.pagination);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch members';
      console.error('Error fetching members:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete member
   */
  const deleteMember = async (id: string) => {
    try {
      await memberApi.deleteMember(id);
      await fetchMembers(); // Refresh list
      return { success: true, message: 'Member deleted successfully' };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete member';
      return { success: false, message };
    }
  };

  /**
   * Reset member password
   */
  const resetPassword = async (id: string) => {
    try {
      const response = await memberApi.resetPassword(id);
      return { 
        success: true, 
        message: response.message,
        data: response.data 
      };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reset password';
      return { success: false, message };
    }
  };

  /**
   * Search members
   */
  const searchMembers = (searchTerm: string) => {
    filters.search = searchTerm;
    filters.page = 1; // Reset to first page
    fetchMembers();
  };

  /**
   * Change page
   */
  const changePage = (page: number) => {
    filters.page = page;
    fetchMembers();
  };

  /**
   * Change page size
   */
  const changePageSize = (limit: number) => {
    filters.limit = limit;
    filters.page = 1; // Reset to first page
    fetchMembers();
  };

  /**
   * Apply filters
   */
  const applyFilters = (newFilters: Partial<MemberFilters>) => {
    Object.assign(filters, newFilters);
    filters.page = 1; // Reset to first page
    fetchMembers();
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    filters.page = 1;
    filters.limit = 10;
    filters.search = '';
    filters.status = 'all';
    filters.membershipStatus = undefined;
    filters.sortBy = 'createdAt';
    filters.sortOrder = 'DESC';
    fetchMembers();
  };

  /**
   * Export members
   */
  const exportMembers = async () => {
    try {
      const blob = await memberApi.exportMembers(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `members-${new Date().toISOString()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err: any) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to export members' 
      };
    }
  };

  // Computed properties
  const hasMembers = computed(() => members.value.length > 0);
  const isEmpty = computed(() => !loading.value && members.value.length === 0);

  return {
    // State
    members,
    loading,
    error,
    filters,
    pagination,
    
    // Computed
    hasMembers,
    isEmpty,
    
    // Methods
    fetchMembers,
    deleteMember,
    resetPassword,
    searchMembers,
    changePage,
    changePageSize,
    applyFilters,
    resetFilters,
    exportMembers,
  };
}
```

#### 3.2 useMember (Single Member Operations)

**File:** `src/composables/useMember.ts`

```typescript
import { ref } from 'vue';
import { memberApi } from '@/api/memberApi';
import type { Member, CreateMemberDTO, UpdateMemberDTO } from '@/types/member';

export function useMember(memberId?: string) {
  const member = ref<Member | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch member by ID
   */
  const fetchMember = async (id?: string) => {
    const targetId = id || memberId;
    if (!targetId) {
      error.value = 'Member ID is required';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      member.value = await memberApi.getMember(targetId);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch member';
      console.error('Error fetching member:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Create new member
   */
  const createMember = async (data: CreateMemberDTO) => {
    saving.value = true;
    error.value = null;

    try {
      const response = await memberApi.createMember(data);
      return { 
        success: true, 
        message: response.message,
        member: response.member,
        credentials: response.credentials
      };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create member';
      error.value = message;
      return { success: false, message };
    } finally {
      saving.value = false;
    }
  };

  /**
   * Update member
   */
  const updateMember = async (id: string, data: UpdateMemberDTO) => {
    saving.value = true;
    error.value = null;

    try {
      const response = await memberApi.updateMember(id, data);
      member.value = response.member;
      return { 
        success: true, 
        message: response.message,
        member: response.member
      };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update member';
      error.value = message;
      return { success: false, message };
    } finally {
      saving.value = false;
    }
  };

  /**
   * Reset form
   */
  const reset = () => {
    member.value = null;
    error.value = null;
  };

  return {
    // State
    member,
    loading,
    saving,
    error,
    
    // Methods
    fetchMember,
    createMember,
    updateMember,
    reset,
  };
}
```

---

### 4. Components

#### 4.1 Member List Component

**File:** `src/components/members/MemberList.vue`

```vue
<template>
  <div class="member-list">
    <!-- Header -->
    <div class="list-header">
      <h2>Members</h2>
      <div class="header-actions">
        <button @click="exportMembers" :disabled="loading" class="btn btn-secondary">
          <i class="icon-download"></i> Export
        </button>
        <button @click="$emit('create')" class="btn btn-primary">
          <i class="icon-plus"></i> Add Member
        </button>
      </div>
    </div>

    <!-- Filters -->
    <MemberFilters 
      :filters="filters"
      :loading="loading"
      @search="searchMembers"
      @filter="applyFilters"
      @reset="resetFilters"
    />

    <!-- Table -->
    <div class="table-container">
      <table class="data-table" v-if="hasMembers">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Membership Status</th>
            <th>Join Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>
              <div class="member-info">
                <img 
                  v-if="member.photoUrl" 
                  :src="member.photoUrl" 
                  :alt="member.fullName"
                  class="member-avatar"
                />
                <div class="member-avatar-placeholder" v-else>
                  {{ getInitials(member.firstName, member.lastName) }}
                </div>
                <div>
                  <div class="member-name">{{ member.firstName }} {{ member.lastName }}</div>
                  <div class="member-id text-muted">#{{ member.id.slice(0, 8) }}</div>
                </div>
              </div>
            </td>
            <td>{{ member.email || '-' }}</td>
            <td>{{ member.phone || '-' }}</td>
            <td>
              <span :class="['badge', `badge-${getMembershipStatusColor(member.membershipStatus)}`]">
                {{ member.membershipStatus }}
              </span>
            </td>
            <td>{{ formatDate(member.joinDate) }}</td>
            <td>
              <span :class="['badge', member.isActive ? 'badge-success' : 'badge-danger']">
                {{ member.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button 
                  @click="$emit('view', member.id)" 
                  class="btn-icon" 
                  title="View"
                >
                  <i class="icon-eye"></i>
                </button>
                <button 
                  @click="$emit('edit', member.id)" 
                  class="btn-icon" 
                  title="Edit"
                >
                  <i class="icon-edit"></i>
                </button>
                <button 
                  @click="handleResetPassword(member)" 
                  class="btn-icon" 
                  title="Reset Password"
                >
                  <i class="icon-key"></i>
                </button>
                <button 
                  @click="handleDelete(member)" 
                  class="btn-icon btn-danger" 
                  title="Delete"
                >
                  <i class="icon-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading members...</p>
      </div>

      <!-- Empty State -->
      <div v-if="isEmpty" class="empty-state">
        <i class="icon-users icon-large"></i>
        <h3>No members found</h3>
        <p>Get started by adding your first member</p>
        <button @click="$emit('create')" class="btn btn-primary">
          Add Member
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="hasMembers">
      <div class="pagination-info">
        Showing {{ (pagination.currentPage - 1) * pagination.limit + 1 }} 
        to {{ Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords) }} 
        of {{ pagination.totalRecords }} members
      </div>
      <div class="pagination-controls">
        <button 
          @click="changePage(pagination.currentPage - 1)"
          :disabled="!pagination.hasPrevPage"
          class="btn btn-sm"
        >
          Previous
        </button>
        <span class="pagination-pages">
          Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
        </span>
        <button 
          @click="changePage(pagination.currentPage + 1)"
          :disabled="!pagination.hasNextPage"
          class="btn btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMembers } from '@/composables/useMembers';
import MemberFilters from './MemberFilters.vue';
import type { Member } from '@/types/member';

// Emits
const emit = defineEmits<{
  create: [];
  view: [id: string];
  edit: [id: string];
}>();

// Composable
const {
  members,
  loading,
  filters,
  pagination,
  hasMembers,
  isEmpty,
  fetchMembers,
  deleteMember,
  resetPassword,
  searchMembers,
  changePage,
  applyFilters,
  resetFilters,
  exportMembers: exportMembersAction,
} = useMembers();

// Fetch members on mount
fetchMembers();

// Methods
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

const getMembershipStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    expired: 'warning',
    suspended: 'danger',
    cancelled: 'secondary',
  };
  return colors[status] || 'secondary';
};

const handleDelete = async (member: Member) => {
  if (!confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}?`)) {
    return;
  }

  const result = await deleteMember(member.id);
  if (result.success) {
    alert(result.message);
  } else {
    alert(result.message);
  }
};

const handleResetPassword = async (member: Member) => {
  if (!confirm(`Reset password for ${member.firstName} ${member.lastName}?`)) {
    return;
  }

  const result = await resetPassword(member.id);
  if (result.success) {
    if (result.data.tempPassword) {
      alert(`Password reset successfully!\n\nTemporary Password: ${result.data.tempPassword}\n\nPlease share this with the member.`);
    } else {
      alert(result.message);
    }
  } else {
    alert(result.message);
  }
};

const exportMembers = async () => {
  const result = await exportMembersAction();
  if (!result.success) {
    alert(result.message);
  }
};
</script>

<style scoped>
.member-list {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.member-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.member-name {
  font-weight: 500;
  color: #111827;
}

.member-id {
  font-size: 12px;
  color: #6b7280;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-secondary {
  background: #e5e7eb;
  color: #374151;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #111827;
}

.btn-icon.btn-danger:hover {
  background: #fee2e2;
  color: #991b1b;
}

.loading-state,
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-large {
  font-size: 48px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
}

.btn-secondary {
  background: white;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 14px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

---

## 📝 Usage Example

### In Vue Router:

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/members',
    name: 'MemberList',
    component: () => import('@/views/members/MemberListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/members/create',
    name: 'MemberCreate',
    component: () => import('@/views/members/MemberCreateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/members/:id',
    name: 'MemberDetail',
    component: () => import('@/views/members/MemberDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/members/:id/edit',
    name: 'MemberEdit',
    component: () => import('@/views/members/MemberEditView.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

### In Main View:

```vue
<!-- views/members/MemberListView.vue -->
<template>
  <div class="member-list-view">
    <MemberList
      @create="handleCreate"
      @view="handleView"
      @edit="handleEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import MemberList from '@/components/members/MemberList.vue';

const router = useRouter();

const handleCreate = () => {
  router.push({ name: 'MemberCreate' });
};

const handleView = (id: string) => {
  router.push({ name: 'MemberDetail', params: { id } });
};

const handleEdit = (id: string) => {
  router.push({ name: 'MemberEdit', params: { id } });
};
</script>
```

---

#### 4.2 Member Filters Component

**File:** `src/components/members/MemberFilters.vue`

```vue
<template>
  <div class="member-filters">
    <div class="filters-row">
      <!-- Search -->
      <div class="filter-group filter-search">
        <input
          v-model="localSearch"
          @input="debounceSearch"
          type="text"
          placeholder="Search by name, email, or phone..."
          class="input-search"
        />
        <i class="icon-search"></i>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label>Status</label>
        <select v-model="localFilters.status" @change="emitFilters" class="input-select">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- Membership Status Filter -->
      <div class="filter-group">
        <label>Membership</label>
        <select v-model="localFilters.membershipStatus" @change="emitFilters" class="input-select">
          <option :value="undefined">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <!-- Sort By -->
      <div class="filter-group">
        <label>Sort By</label>
        <select v-model="localFilters.sortBy" @change="emitFilters" class="input-select">
          <option value="createdAt">Join Date</option>
          <option value="firstName">First Name</option>
          <option value="lastName">Last Name</option>
          <option value="email">Email</option>
        </select>
      </div>

      <!-- Sort Order -->
      <div class="filter-group">
        <button 
          @click="toggleSortOrder" 
          class="btn-sort"
          :title="localFilters.sortOrder === 'ASC' ? 'Ascending' : 'Descending'"
        >
          <i :class="localFilters.sortOrder === 'ASC' ? 'icon-arrow-up' : 'icon-arrow-down'"></i>
        </button>
      </div>

      <!-- Reset Button -->
      <div class="filter-group">
        <button @click="handleReset" class="btn btn-secondary btn-sm">
          <i class="icon-refresh"></i> Reset
        </button>
      </div>
    </div>

    <!-- Active Filters -->
    <div class="active-filters" v-if="hasActiveFilters">
      <span class="filter-label">Active filters:</span>
      <span v-if="localSearch" class="filter-tag">
        Search: "{{ localSearch }}"
        <button @click="clearSearch" class="filter-tag-close">&times;</button>
      </span>
      <span v-if="localFilters.status !== 'all'" class="filter-tag">
        Status: {{ localFilters.status }}
        <button @click="clearStatus" class="filter-tag-close">&times;</button>
      </span>
      <span v-if="localFilters.membershipStatus" class="filter-tag">
        Membership: {{ localFilters.membershipStatus }}
        <button @click="clearMembershipStatus" class="filter-tag-close">&times;</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MemberFilters } from '@/types/member';

interface Props {
  filters: MemberFilters;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  search: [search: string];
  filter: [filters: Partial<MemberFilters>];
  reset: [];
}>();

// Local state
const localSearch = ref(props.filters.search || '');
const localFilters = ref<Partial<MemberFilters>>({
  status: props.filters.status || 'all',
  membershipStatus: props.filters.membershipStatus,
  sortBy: props.filters.sortBy || 'createdAt',
  sortOrder: props.filters.sortOrder || 'DESC',
});

// Debounce timer
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Computed
const hasActiveFilters = computed(() => {
  return localSearch.value !== '' ||
         localFilters.value.status !== 'all' ||
         localFilters.value.membershipStatus !== undefined;
});

// Watch for external filter changes
watch(() => props.filters, (newFilters) => {
  localSearch.value = newFilters.search || '';
  localFilters.value = {
    status: newFilters.status || 'all',
    membershipStatus: newFilters.membershipStatus,
    sortBy: newFilters.sortBy || 'createdAt',
    sortOrder: newFilters.sortOrder || 'DESC',
  };
}, { deep: true });

// Methods
const debounceSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = setTimeout(() => {
    emit('search', localSearch.value);
  }, 500);
};

const emitFilters = () => {
  emit('filter', localFilters.value);
};

const toggleSortOrder = () => {
  localFilters.value.sortOrder = localFilters.value.sortOrder === 'ASC' ? 'DESC' : 'ASC';
  emitFilters();
};

const handleReset = () => {
  localSearch.value = '';
  localFilters.value = {
    status: 'all',
    membershipStatus: undefined,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  };
  emit('reset');
};

const clearSearch = () => {
  localSearch.value = '';
  emit('search', '');
};

const clearStatus = () => {
  localFilters.value.status = 'all';
  emitFilters();
};

const clearMembershipStatus = () => {
  localFilters.value.membershipStatus = undefined;
  emitFilters();
};
</script>

<style scoped>
.member-filters {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filters-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-search {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.filter-search .icon-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}

.input-search,
.input-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.input-search {
  padding-left: 36px;
}

.input-search:focus,
.input-select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.btn-sort {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sort:hover {
  background: #f9fafb;
  border-color: #6366f1;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
}

.filter-tag-close {
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
}

.filter-tag-close:hover {
  color: #111827;
}
</style>
```

---

#### 4.3 Member Form Component

**File:** `src/components/members/MemberForm.vue`

```vue
<template>
  <div class="member-form">
    <form @submit.prevent="handleSubmit">
      <!-- Basic Information -->
      <div class="form-section">
        <h3 class="section-title">Basic Information</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="required">First Name</label>
            <input
              v-model="formData.firstName"
              type="text"
              placeholder="Enter first name"
              class="input"
              required
            />
            <span v-if="errors.firstName" class="error-text">{{ errors.firstName }}</span>
          </div>

          <div class="form-group">
            <label class="required">Last Name</label>
            <input
              v-model="formData.lastName"
              type="text"
              placeholder="Enter last name"
              class="input"
              required
            />
            <span v-if="errors.lastName" class="error-text">{{ errors.lastName }}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="Enter email address"
              class="input"
            />
            <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
            <span class="help-text">Used for login and communication</span>
          </div>

          <div class="form-group">
            <label>Phone</label>
            <input
              v-model="formData.phone"
              type="tel"
              placeholder="Enter phone number"
              class="input"
            />
            <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
            <span class="help-text">Can also be used for login</span>
          </div>
        </div>

        <div class="alert alert-info" v-if="!isEditMode">
          <i class="icon-info"></i>
          <span>At least one contact method (email or phone) is required</span>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="form-section">
        <h3 class="section-title">Personal Information</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Date of Birth</label>
            <input
              v-model="formData.dateOfBirth"
              type="date"
              class="input"
            />
          </div>

          <div class="form-group">
            <label>Gender</label>
            <select v-model="formData.gender" class="input">
              <option :value="null">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Address</label>
          <textarea
            v-model="formData.address"
            placeholder="Enter full address"
            class="textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Emergency Contact -->
      <div class="form-section">
        <h3 class="section-title">Emergency Contact</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Contact Name</label>
            <input
              v-model="formData.emergencyContactName"
              type="text"
              placeholder="Enter emergency contact name"
              class="input"
            />
          </div>

          <div class="form-group">
            <label>Contact Phone</label>
            <input
              v-model="formData.emergencyContactPhone"
              type="tel"
              placeholder="Enter emergency contact phone"
              class="input"
            />
          </div>
        </div>
      </div>

      <!-- Additional Information -->
      <div class="form-section">
        <h3 class="section-title">Additional Information</h3>
        <div class="form-group">
          <label>Notes</label>
          <textarea
            v-model="formData.notes"
            placeholder="Add any additional notes..."
            class="textarea"
            rows="4"
          ></textarea>
        </div>

        <div class="form-group" v-if="isEditMode">
          <label class="checkbox-label">
            <input
              v-model="formData.isActive"
              type="checkbox"
              class="checkbox"
            />
            <span>Active Member</span>
          </label>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn btn-secondary"
          :disabled="saving"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="saving || !isFormValid"
        >
          <span v-if="saving">
            <i class="icon-spinner"></i> Saving...
          </span>
          <span v-else>
            {{ isEditMode ? 'Update Member' : 'Create Member' }}
          </span>
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="alert alert-success">
        <i class="icon-check"></i>
        <div>
          <strong>{{ successMessage }}</strong>
          <div v-if="tempPassword" class="credentials-box">
            <p><strong>Temporary Password:</strong></p>
            <code>{{ tempPassword }}</code>
            <button @click="copyPassword" class="btn-copy" type="button">
              <i class="icon-copy"></i> Copy
            </button>
            <p class="help-text">Please share this password with the member</p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="alert alert-danger">
        <i class="icon-alert"></i>
        <span>{{ errorMessage }}</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Member, CreateMemberDTO, UpdateMemberDTO } from '@/types/member';

interface Props {
  member?: Member | null;
  saving?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: CreateMemberDTO | UpdateMemberDTO];
  cancel: [];
}>();

// Form data
const formData = ref<CreateMemberDTO & { isActive?: boolean }>({
  firstName: '',
  lastName: '',
  email: null,
  phone: null,
  dateOfBirth: null,
  gender: null,
  address: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  notes: null,
  photoUrl: null,
  isActive: true,
});

// Errors
const errors = ref<Record<string, string>>({});

// Success state
const successMessage = ref('');
const tempPassword = ref('');
const errorMessage = ref('');

// Computed
const isEditMode = computed(() => !!props.member);

const isFormValid = computed(() => {
  return formData.value.firstName.trim() !== '' &&
         formData.value.lastName.trim() !== '' &&
         (formData.value.email || formData.value.phone);
});

// Watch for member changes (edit mode)
watch(() => props.member, (newMember) => {
  if (newMember) {
    formData.value = {
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      email: newMember.email,
      phone: newMember.phone,
      dateOfBirth: newMember.dateOfBirth,
      gender: newMember.gender,
      address: newMember.address,
      emergencyContactName: newMember.emergencyContactName,
      emergencyContactPhone: newMember.emergencyContactPhone,
      notes: newMember.notes,
      photoUrl: newMember.photoUrl,
      isActive: newMember.isActive,
    };
  }
}, { immediate: true });

// Methods
const validateForm = () => {
  errors.value = {};

  if (!formData.value.firstName.trim()) {
    errors.value.firstName = 'First name is required';
  }

  if (!formData.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required';
  }

  if (!formData.value.email && !formData.value.phone) {
    errors.value.email = 'Email or phone is required';
    errors.value.phone = 'Email or phone is required';
  }

  if (formData.value.email && !isValidEmail(formData.value.email)) {
    errors.value.email = 'Invalid email format';
  }

  return Object.keys(errors.value).length === 0;
};

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  // Clean up null strings
  const cleanedData = Object.entries(formData.value).reduce((acc, [key, value]) => {
    acc[key] = value === '' ? null : value;
    return acc;
  }, {} as any);

  emit('submit', cleanedData);
};

const copyPassword = () => {
  if (tempPassword.value) {
    navigator.clipboard.writeText(tempPassword.value);
    alert('Password copied to clipboard!');
  }
};

// Expose methods for parent component
const setSuccess = (message: string, password?: string) => {
  successMessage.value = message;
  tempPassword.value = password || '';
  errorMessage.value = '';
  
  // Scroll to top to show message
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const setError = (message: string) => {
  errorMessage.value = message;
  successMessage.value = '';
  tempPassword.value = '';
  
  // Scroll to top to show message
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => {
  formData.value = {
    firstName: '',
    lastName: '',
    email: null,
    phone: null,
    dateOfBirth: null,
    gender: null,
    address: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    notes: null,
    photoUrl: null,
    isActive: true,
  };
  errors.value = {};
  successMessage.value = '';
  tempPassword.value = '';
  errorMessage.value = '';
};

defineExpose({
  setSuccess,
  setError,
  resetForm,
});
</script>

<style scoped>
.member-form {
  max-width: 800px;
}

.form-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group label.required::after {
  content: ' *';
  color: #ef4444;
}

.input,
.textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.textarea {
  resize: vertical;
  font-family: inherit;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.help-text {
  font-size: 12px;
  color: #6b7280;
}

.error-text {
  font-size: 12px;
  color: #ef4444;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
}

.alert-info {
  background: #dbeafe;
  color: #1e40af;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
}

.alert-danger {
  background: #fee2e2;
  color: #991b1b;
}

.credentials-box {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.credentials-box code {
  display: inline-block;
  padding: 8px 12px;
  background: #374151;
  color: #f9fafb;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  letter-spacing: 1px;
  margin-right: 8px;
}

.btn-copy {
  padding: 6px 12px;
  border: 1px solid #065f46;
  background: transparent;
  color: #065f46;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-copy:hover {
  background: rgba(6, 95, 70, 0.1);
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

---

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** In Progress - Components 4.2 & 4.3 Added 🔄
