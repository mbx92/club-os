# Member Management - Vue.js 3 Frontend Integration Guide

## Overview
Dokumentasi ini menjelaskan cara mengintegrasikan frontend Vue.js 3 dengan Member Management API. Sistem ini mengelola data member gym dengan fitur auto-create user account.

## ⚡ Key Features

- **Auto-create user account** ketika member dibuat
- **Dual login authentication** (email OR phone)
- **Default password** "password123" (configurable via env)
- **Password reset** functionality
- **Soft delete** (paranoid mode)
- **Multi-tenant** data isolation

---

## Base URL
```
/api/v1/gym/members
```

## Authentication
Semua endpoint memerlukan JWT token dalam header:
```
Authorization: Bearer <token>
```

---

## Table of Contents
1. [Data Types](#data-types)
2. [API Service Layer](#api-service-layer)
3. [Composables](#composables)
4. [Components](#components)
5. [Error Handling](#error-handling)

---

## Data Types

### Member Interface
```javascript
/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} tenantId
 * @property {string|null} userId
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName - Getter: firstName + lastName
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} dateOfBirth - ISO date string
 * @property {'male'|'female'|'other'|null} gender
 * @property {string|null} address
 * @property {string|null} photoUrl
 * @property {string|null} emergencyContact
 * @property {string|null} emergencyPhone
 * @property {string} joinDate - ISO date string
 * @property {'active'|'inactive'|'suspended'|'expired'} membershipStatus
 * @property {boolean} isActive
 * @property {string|null} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} deletedAt
 * @property {Object} [user] - User association
 * @property {Array} [memberships] - Membership history
 */

/**
 * @typedef {Object} CreateMemberDTO
 * @property {string} firstName - Required
 * @property {string} lastName - Required
 * @property {string} [email] - Optional, but email OR phone required
 * @property {string} [phone] - Optional, but email OR phone required
 * @property {string} [dateOfBirth] - ISO date string
 * @property {'male'|'female'|'other'} [gender]
 * @property {string} [address]
 * @property {string} [photoUrl]
 * @property {string} [emergencyContact]
 * @property {string} [emergencyPhone]
 * @property {string} [joinDate] - Default: today
 * @property {'active'|'inactive'|'suspended'|'expired'} [membershipStatus]
 * @property {boolean} [isActive]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} MemberFilters
 * @property {number} [page]
 * @property {number} [limit]
 * @property {'firstName'|'lastName'|'joinDate'|'membershipStatus'|'createdAt'} [sortBy]
 * @property {'ASC'|'DESC'} [sortOrder]
 * @property {string} [search]
 * @property {'active'|'inactive'|'suspended'|'expired'|'all'} [membershipStatus]
 * @property {boolean|'all'} [isActive]
 */
```

---

## API Service Layer

### memberApi.js
```javascript
/**
 * Member API Service
 * Handles all HTTP requests to member endpoints
 */

// Get All Members
async function getMembers(options = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search = '',
      membershipStatus = 'all',
      isActive = 'all'
    } = options;

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (search) params.append('search', search);
    if (membershipStatus !== 'all') params.append('membershipStatus', membershipStatus);
    if (isActive !== 'all') params.append('isActive', isActive.toString());

    const response = await fetch(`/api/v1/gym/members?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch members');

    const result = await response.json();
    return result; // { data, pagination, filters }
  } catch (error) {
    console.error('Error fetching members:', error);
    throw error;
  }
}

// Get Member by ID
async function getMemberById(memberId) {
  try {
    const response = await fetch(`/api/v1/gym/members/${memberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error('Member not found');
    }

    if (!response.ok) throw new Error('Failed to fetch member');

    const member = await response.json();
    return member;
  } catch (error) {
    console.error('Error fetching member:', error);
    throw error;
  }
}

// Create Member
async function createMember(memberData) {
  try {
    const response = await fetch('/api/v1/gym/members', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(memberData)
    });

    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    }

    if (!response.ok) throw new Error('Failed to create member');

    const result = await response.json();
    return result; // { member, user, credentials }
  } catch (error) {
    console.error('Error creating member:', error);
    throw error;
  }
}

// Update Member
async function updateMember(memberId, updateData) {
  try {
    const response = await fetch(`/api/v1/gym/members/${memberId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (response.status === 404) {
      throw new Error('Member not found');
    }

    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.message);
    }

    if (!response.ok) throw new Error('Failed to update member');

    const member = await response.json();
    return member;
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
}

// Delete Member (Soft Delete)
async function deleteMember(memberId) {
  try {
    const response = await fetch(`/api/v1/gym/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error('Member not found');
    }

    if (!response.ok) throw new Error('Failed to delete member');

    const result = await response.json();
    return result; // { message }
  } catch (error) {
    console.error('Error deleting member:', error);
    throw error;
  }
}

// Reset Member Password
async function resetMemberPassword(memberId) {
  try {
    const response = await fetch(`/api/v1/gym/members/${memberId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error('Member not found');
    }

    if (!response.ok) throw new Error('Failed to reset password');

    const result = await response.json();
    return result; // { message, newPassword }
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

// Export all functions
export {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  resetMemberPassword
};
```

**Usage Examples:**
```javascript
// Get first page with default settings
const result1 = await getMembers();

// Get page 2 with 20 items
const result2 = await getMembers({ page: 2, limit: 20 });

// Search for "john"
const result3 = await getMembers({ search: 'john' });

// Filter by active members only
const result4 = await getMembers({ membershipStatus: 'active' });

// Sort by join date descending
const result5 = await getMembers({ sortBy: 'joinDate', sortOrder: 'DESC' });

// Combine multiple filters
const result6 = await getMembers({
  page: 1,
  limit: 10,
  search: 'doe',
  membershipStatus: 'active',
  isActive: true,
  sortBy: 'firstName',
  sortOrder: 'ASC'
});
```

---

## Composables

### useMembers.js
```javascript
import { ref, computed, watch } from 'vue';
import { getMembers, deleteMember } from '@/api/memberApi';

/**
 * Composable untuk handle member list operations
 * @param {Object} initialFilters - Initial filter values
 */
export function useMembers(initialFilters = {}) {
  // State
  const members = ref([]);
  const loading = ref(false);
  const error = ref(null);
  
  // Pagination
  const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Filters
  const filters = ref({
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 10,
    sortBy: initialFilters.sortBy || 'createdAt',
    sortOrder: initialFilters.sortOrder || 'DESC',
    search: initialFilters.search || '',
    membershipStatus: initialFilters.membershipStatus || 'all',
    isActive: initialFilters.isActive !== undefined ? initialFilters.isActive : 'all'
  });

  // Computed
  const hasMembers = computed(() => members.value.length > 0);
  const isEmpty = computed(() => !loading.value && members.value.length === 0);

  /**
   * Fetch members from API
   */
  async function fetchMembers() {
    loading.value = true;
    error.value = null;

    try {
      const result = await getMembers(filters.value);
      members.value = result.data;
      pagination.value = result.pagination;
    } catch (err) {
      error.value = err.message || 'Failed to fetch members';
      console.error('Error in fetchMembers:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update filters and refetch
   * @param {Object} newFilters - New filter values
   */
  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters };
    filters.value.page = 1; // Reset to page 1
    fetchMembers();
  }

  /**
   * Change page
   * @param {number} page - Page number
   */
  function goToPage(page) {
    if (page < 1 || page > pagination.value.totalPages) return;
    filters.value.page = page;
    fetchMembers();
  }

  /**
   * Next page
   */
  function nextPage() {
    if (pagination.value.hasNextPage) {
      goToPage(filters.value.page + 1);
    }
  }

  /**
   * Previous page
   */
  function prevPage() {
    if (pagination.value.hasPrevPage) {
      goToPage(filters.value.page - 1);
    }
  }

  /**
   * Search members
   * @param {string} searchText - Search keyword
   */
  function search(searchText) {
    updateFilters({ search: searchText, page: 1 });
  }

  /**
   * Sort members
   * @param {string} field - Sort field
   */
  function sortBy(field) {
    const newOrder = filters.value.sortBy === field && filters.value.sortOrder === 'ASC' 
      ? 'DESC' 
      : 'ASC';
    
    updateFilters({ sortBy: field, sortOrder: newOrder });
  }

  /**
   * Delete member
   * @param {string} memberId - Member ID
   */
  async function removeMember(memberId) {
    try {
      await deleteMember(memberId);
      // Refresh list
      await fetchMembers();
      return true;
    } catch (err) {
      error.value = err.message || 'Failed to delete member';
      console.error('Error in removeMember:', err);
      return false;
    }
  }

  /**
   * Refresh list
   */
  async function refresh() {
    await fetchMembers();
  }

  // Auto-fetch on mount
  fetchMembers();

  return {
    // State
    members,
    loading,
    error,
    pagination,
    filters,
    
    // Computed
    hasMembers,
    isEmpty,
    
    // Methods
    fetchMembers,
    updateFilters,
    goToPage,
    nextPage,
    prevPage,
    search,
    sortBy,
    removeMember,
    refresh
  };
}
```

### useMember.js
```javascript
import { ref } from 'vue';
import { 
  getMemberById, 
  createMember, 
  updateMember, 
  resetMemberPassword 
} from '@/api/memberApi';

/**
 * Composable untuk handle single member operations
 * @param {string|null} memberId - Member ID untuk edit mode
 */
export function useMember(memberId = null) {
  // State
  const member = ref(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const credentials = ref(null); // For newly created member

  /**
   * Fetch member by ID
   */
  async function fetchMember() {
    if (!memberId) return;

    loading.value = true;
    error.value = null;

    try {
      member.value = await getMemberById(memberId);
    } catch (err) {
      error.value = err.message || 'Failed to fetch member';
      console.error('Error in fetchMember:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create new member
   * @param {Object} memberData - Member data
   */
  async function create(memberData) {
    saving.value = true;
    error.value = null;
    credentials.value = null;

    try {
      const result = await createMember(memberData);
      member.value = result.member;
      credentials.value = result.credentials; // Save credentials to show to user
      return result;
    } catch (err) {
      error.value = err.message || 'Failed to create member';
      console.error('Error in create:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Update existing member
   * @param {string} id - Member ID
   * @param {Object} updateData - Update data
   */
  async function update(id, updateData) {
    saving.value = true;
    error.value = null;

    try {
      member.value = await updateMember(id, updateData);
      return member.value;
    } catch (err) {
      error.value = err.message || 'Failed to update member';
      console.error('Error in update:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Reset member password
   * @param {string} id - Member ID
   */
  async function resetPassword(id) {
    saving.value = true;
    error.value = null;

    try {
      const result = await resetMemberPassword(id);
      credentials.value = { password: result.newPassword }; // Save new password
      return result;
    } catch (err) {
      error.value = err.message || 'Failed to reset password';
      console.error('Error in resetPassword:', err);
      throw err;
    } finally {
      saving.value = false;
    }
  }

  // Auto-fetch if memberId provided
  if (memberId) {
    fetchMember();
  }

  return {
    // State
    member,
    loading,
    saving,
    error,
    credentials,
    
    // Methods
    fetchMember,
    create,
    update,
    resetPassword
  };
}
```

---

## Components

### MemberList.vue
```vue
<template>
  <div class="member-list">
    <!-- Header -->
    <div class="header">
      <h2>Members</h2>
      <button @click="$router.push('/members/create')" class="btn-primary">
        ➕ Add Member
      </button>
    </div>

    <!-- Filters -->
    <MemberFilters
      v-model:search="filters.search"
      v-model:membershipStatus="filters.membershipStatus"
      v-model:isActive="filters.isActive"
      v-model:sortBy="filters.sortBy"
      v-model:sortOrder="filters.sortOrder"
      @update="updateFilters"
    />

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Loading members...
    </div>

    <!-- Empty State -->
    <div v-else-if="isEmpty" class="empty-state">
      <p>No members found</p>
    </div>

    <!-- Table -->
    <div v-else class="table-container">
      <table class="member-table">
        <thead>
          <tr>
            <th @click="sortBy('firstName')" class="sortable">
              Name {{ getSortIcon('firstName') }}
            </th>
            <th>Contact</th>
            <th @click="sortBy('joinDate')" class="sortable">
              Join Date {{ getSortIcon('joinDate') }}
            </th>
            <th @click="sortBy('membershipStatus')" class="sortable">
              Status {{ getSortIcon('membershipStatus') }}
            </th>
            <th>Active</th>
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
                  class="avatar"
                >
                <div>
                  <div class="name">{{ member.fullName }}</div>
                  <div class="id">ID: {{ member.id.substring(0, 8) }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="contact">
                <div v-if="member.email">📧 {{ member.email }}</div>
                <div v-if="member.phone">📱 {{ member.phone }}</div>
              </div>
            </td>
            <td>{{ formatDate(member.joinDate) }}</td>
            <td>
              <span :class="['badge', `badge-${member.membershipStatus}`]">
                {{ member.membershipStatus }}
              </span>
            </td>
            <td>
              <span :class="['badge', member.isActive ? 'badge-success' : 'badge-danger']">
                {{ member.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button 
                  @click="viewMember(member.id)" 
                  class="btn-icon"
                  title="View"
                >
                  👁️
                </button>
                <button 
                  @click="editMember(member.id)" 
                  class="btn-icon"
                  title="Edit"
                >
                  ✏️
                </button>
                <button 
                  @click="confirmDelete(member)" 
                  class="btn-icon btn-danger"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="hasMembers" class="pagination">
      <button 
        @click="prevPage" 
        :disabled="!pagination.hasPrevPage"
        class="btn-secondary"
      >
        ← Previous
      </button>
      
      <span class="page-info">
        Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
        ({{ pagination.totalRecords }} total)
      </span>
      
      <button 
        @click="nextPage" 
        :disabled="!pagination.hasNextPage"
        class="btn-secondary"
      >
        Next →
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useMembers } from '@/composables/useMembers';
import MemberFilters from './MemberFilters.vue';

const router = useRouter();

const {
  members,
  loading,
  error,
  pagination,
  filters,
  hasMembers,
  isEmpty,
  updateFilters,
  nextPage,
  prevPage,
  sortBy,
  removeMember
} = useMembers();

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID');
}

function getSortIcon(field) {
  if (filters.value.sortBy !== field) return '';
  return filters.value.sortOrder === 'ASC' ? '↑' : '↓';
}

function viewMember(memberId) {
  router.push(`/members/${memberId}`);
}

function editMember(memberId) {
  router.push(`/members/${memberId}/edit`);
}

async function confirmDelete(member) {
  const confirmed = confirm(`Delete member ${member.fullName}?`);
  if (confirmed) {
    const success = await removeMember(member.id);
    if (success) {
      alert('Member deleted successfully');
    }
  }
}
</script>

<style scoped>
.member-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-container {
  overflow-x: auto;
  margin: 20px 0;
}

.member-table {
  width: 100%;
  border-collapse: collapse;
}

.member-table th,
.member-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.member-table th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.member-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.member-table th.sortable:hover {
  background-color: #eeeeee;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.name {
  font-weight: 500;
}

.id {
  font-size: 0.85em;
  color: #666;
}

.contact div {
  margin: 2px 0;
  font-size: 0.9em;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
}

.badge-active {
  background-color: #d4edda;
  color: #155724;
}

.badge-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.badge-suspended {
  background-color: #fff3cd;
  color: #856404;
}

.badge-expired {
  background-color: #e2e3e5;
  color: #383d41;
}

.badge-success {
  background-color: #d4edda;
  color: #155724;
}

.badge-danger {
  background-color: #f8d7da;
  color: #721c24;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 4px 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2em;
}

.btn-icon:hover {
  opacity: 0.7;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.page-info {
  font-weight: 500;
}

.loading,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-message {
  padding: 12px;
  margin-top: 20px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
}

.btn-primary {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### MemberFilters.vue
```vue
<template>
  <div class="member-filters">
    <!-- Search -->
    <div class="filter-group">
      <label>Search</label>
      <input
        type="text"
        v-model="searchValue"
        @input="onSearchInput"
        placeholder="Search by name, email, or phone..."
        class="search-input"
      >
    </div>

    <!-- Membership Status -->
    <div class="filter-group">
      <label>Membership Status</label>
      <select v-model="statusValue" @change="onFilterChange" class="filter-select">
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
        <option value="expired">Expired</option>
      </select>
    </div>

    <!-- Is Active -->
    <div class="filter-group">
      <label>Account Status</label>
      <select v-model="activeValue" @change="onFilterChange" class="filter-select">
        <option value="all">All</option>
        <option :value="true">Active</option>
        <option :value="false">Inactive</option>
      </select>
    </div>

    <!-- Sort By -->
    <div class="filter-group">
      <label>Sort By</label>
      <select v-model="sortByValue" @change="onFilterChange" class="filter-select">
        <option value="createdAt">Created Date</option>
        <option value="firstName">First Name</option>
        <option value="lastName">Last Name</option>
        <option value="joinDate">Join Date</option>
        <option value="membershipStatus">Membership Status</option>
      </select>
    </div>

    <!-- Sort Order -->
    <div class="filter-group">
      <label>Order</label>
      <select v-model="sortOrderValue" @change="onFilterChange" class="filter-select">
        <option value="ASC">Ascending</option>
        <option value="DESC">Descending</option>
      </select>
    </div>

    <!-- Reset Button -->
    <div class="filter-group">
      <label>&nbsp;</label>
      <button @click="resetFilters" class="btn-reset">
        🔄 Reset
      </button>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="active-filters">
      <span class="label">Active filters:</span>
      <span v-if="searchValue" class="filter-tag">
        Search: "{{ searchValue }}"
        <button @click="clearSearch">✕</button>
      </span>
      <span v-if="statusValue !== 'all'" class="filter-tag">
        Status: {{ statusValue }}
        <button @click="statusValue = 'all'; onFilterChange()">✕</button>
      </span>
      <span v-if="activeValue !== 'all'" class="filter-tag">
        Active: {{ activeValue ? 'Yes' : 'No' }}
        <button @click="activeValue = 'all'; onFilterChange()">✕</button>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  search: { type: String, default: '' },
  membershipStatus: { type: String, default: 'all' },
  isActive: { type: [String, Boolean], default: 'all' },
  sortBy: { type: String, default: 'createdAt' },
  sortOrder: { type: String, default: 'DESC' }
});

const emit = defineEmits(['update:search', 'update:membershipStatus', 'update:isActive', 'update:sortBy', 'update:sortOrder', 'update']);

// Local state
const searchValue = ref(props.search);
const statusValue = ref(props.membershipStatus);
const activeValue = ref(props.isActive);
const sortByValue = ref(props.sortBy);
const sortOrderValue = ref(props.sortOrder);

// Debounced search
let searchTimeout = null;
function onSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emit('update:search', searchValue.value);
    emitUpdate();
  }, 500);
}

function onFilterChange() {
  emit('update:membershipStatus', statusValue.value);
  emit('update:isActive', activeValue.value);
  emit('update:sortBy', sortByValue.value);
  emit('update:sortOrder', sortOrderValue.value);
  emitUpdate();
}

function emitUpdate() {
  emit('update', {
    search: searchValue.value,
    membershipStatus: statusValue.value,
    isActive: activeValue.value,
    sortBy: sortByValue.value,
    sortOrder: sortOrderValue.value
  });
}

function resetFilters() {
  searchValue.value = '';
  statusValue.value = 'all';
  activeValue.value = 'all';
  sortByValue.value = 'createdAt';
  sortOrderValue.value = 'DESC';
  onFilterChange();
}

function clearSearch() {
  searchValue.value = '';
  emit('update:search', '');
  emitUpdate();
}

const hasActiveFilters = computed(() => {
  return searchValue.value || 
         statusValue.value !== 'all' || 
         activeValue.value !== 'all';
});

// Watch props for external changes
watch(() => props.search, (val) => searchValue.value = val);
watch(() => props.membershipStatus, (val) => statusValue.value = val);
watch(() => props.isActive, (val) => activeValue.value = val);
watch(() => props.sortBy, (val) => sortByValue.value = val);
watch(() => props.sortOrder, (val) => sortOrderValue.value = val);
</script>

<style scoped>
.member-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
}

.filter-group label {
  font-size: 0.9em;
  font-weight: 500;
  color: #495057;
}

.search-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.95em;
}

.search-input {
  min-width: 250px;
}

.search-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.btn-reset {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-reset:hover {
  background-color: #5a6268;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid #dee2e6;
}

.active-filters .label {
  font-weight: 500;
  color: #495057;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background-color: #007bff;
  color: white;
  border-radius: 16px;
  font-size: 0.85em;
}

.filter-tag button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0 2px;
  font-size: 1.1em;
}

.filter-tag button:hover {
  opacity: 0.8;
}
</style>
```

### MemberForm.vue
```vue
<template>
  <div class="member-form">
    <h2>{{ isEditMode ? 'Edit Member' : 'Create Member' }}</h2>

    <form @submit.prevent="handleSubmit">
      <!-- Personal Information -->
      <fieldset>
        <legend>Personal Information</legend>

        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name <span class="required">*</span></label>
            <input
              id="firstName"
              v-model="formData.firstName"
              type="text"
              required
              placeholder="John"
            >
            <span v-if="errors.firstName" class="error">{{ errors.firstName }}</span>
          </div>

          <div class="form-group">
            <label for="lastName">Last Name <span class="required">*</span></label>
            <input
              id="lastName"
              v-model="formData.lastName"
              type="text"
              required
              placeholder="Doe"
            >
            <span v-if="errors.lastName" class="error">{{ errors.lastName }}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="john.doe@example.com"
            >
            <span v-if="errors.email" class="error">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label for="phone">Phone</label>
            <input
              id="phone"
              v-model="formData.phone"
              type="tel"
              placeholder="+62812345678"
            >
            <span v-if="errors.phone" class="error">{{ errors.phone }}</span>
          </div>
        </div>

        <div class="form-note">
          <strong>Note:</strong> Either email or phone number is required for login.
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              v-model="formData.dateOfBirth"
              type="date"
            >
          </div>

          <div class="form-group">
            <label for="gender">Gender</label>
            <select id="gender" v-model="formData.gender">
              <option :value="null">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="address">Address</label>
          <textarea
            id="address"
            v-model="formData.address"
            rows="3"
            placeholder="Full address"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="photoUrl">Photo URL</label>
          <input
            id="photoUrl"
            v-model="formData.photoUrl"
            type="url"
            placeholder="https://example.com/photo.jpg"
          >
        </div>
      </fieldset>

      <!-- Emergency Contact -->
      <fieldset>
        <legend>Emergency Contact</legend>

        <div class="form-row">
          <div class="form-group">
            <label for="emergencyContact">Contact Name</label>
            <input
              id="emergencyContact"
              v-model="formData.emergencyContact"
              type="text"
              placeholder="Jane Doe"
            >
          </div>

          <div class="form-group">
            <label for="emergencyPhone">Contact Phone</label>
            <input
              id="emergencyPhone"
              v-model="formData.emergencyPhone"
              type="tel"
              placeholder="+62812345678"
            >
          </div>
        </div>
      </fieldset>

      <!-- Membership Status -->
      <fieldset>
        <legend>Membership Status</legend>

        <div class="form-row">
          <div class="form-group">
            <label for="joinDate">Join Date</label>
            <input
              id="joinDate"
              v-model="formData.joinDate"
              type="date"
            >
          </div>

          <div class="form-group">
            <label for="membershipStatus">Membership Status</label>
            <select id="membershipStatus" v-model="formData.membershipStatus">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="formData.isActive"
            >
            Account is active
          </label>
        </div>
      </fieldset>

      <!-- Notes -->
      <fieldset>
        <legend>Additional Notes</legend>

        <div class="form-group">
          <textarea
            v-model="formData.notes"
            rows="4"
            placeholder="Any additional notes..."
          ></textarea>
        </div>
      </fieldset>

      <!-- Success Message (for new member) -->
      <div v-if="showCredentials && credentials" class="credentials-box">
        <h3>✅ Member Created Successfully!</h3>
        <p>User account has been created with the following credentials:</p>
        <div class="credentials">
          <div class="credential-row">
            <strong>Email:</strong> {{ credentials.email || 'N/A' }}
          </div>
          <div class="credential-row">
            <strong>Phone:</strong> {{ credentials.phone || 'N/A' }}
          </div>
          <div class="credential-row">
            <strong>Password:</strong> 
            <code>{{ credentials.password }}</code>
            <button 
              type="button" 
              @click="copyPassword" 
              class="btn-copy"
              title="Copy password"
            >
              📋
            </button>
          </div>
        </div>
        <p class="warning">⚠️ Please save this password and share it with the member securely.</p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button 
          type="button" 
          @click="handleCancel" 
          class="btn-secondary"
          :disabled="saving"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          class="btn-primary"
          :disabled="saving || !isValid"
        >
          {{ saving ? 'Saving...' : (isEditMode ? 'Update Member' : 'Create Member') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMember } from '@/composables/useMember';

const props = defineProps({
  memberId: { type: String, default: null }
});

const router = useRouter();
const isEditMode = computed(() => !!props.memberId);

const { member, saving, error, credentials, fetchMember, create, update } = useMember(props.memberId);

// Form data
const formData = ref({
  firstName: '',
  lastName: '',
  email: null,
  phone: null,
  dateOfBirth: null,
  gender: null,
  address: null,
  photoUrl: null,
  emergencyContact: null,
  emergencyPhone: null,
  joinDate: new Date().toISOString().split('T')[0],
  membershipStatus: 'active',
  isActive: true,
  notes: null
});

// Validation errors
const errors = ref({});

// Show credentials after create
const showCredentials = ref(false);

// Watch member data for edit mode
watch(member, (newMember) => {
  if (newMember && isEditMode.value) {
    formData.value = {
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      email: newMember.email,
      phone: newMember.phone,
      dateOfBirth: newMember.dateOfBirth,
      gender: newMember.gender,
      address: newMember.address,
      photoUrl: newMember.photoUrl,
      emergencyContact: newMember.emergencyContact,
      emergencyPhone: newMember.emergencyPhone,
      joinDate: newMember.joinDate ? newMember.joinDate.split('T')[0] : null,
      membershipStatus: newMember.membershipStatus,
      isActive: newMember.isActive,
      notes: newMember.notes
    };
  }
});

// Validation
const isValid = computed(() => {
  return formData.value.firstName && 
         formData.value.lastName && 
         (formData.value.email || formData.value.phone);
});

function validateForm() {
  errors.value = {};

  if (!formData.value.firstName) {
    errors.value.firstName = 'First name is required';
  }

  if (!formData.value.lastName) {
    errors.value.lastName = 'Last name is required';
  }

  if (!formData.value.email && !formData.value.phone) {
    errors.value.email = 'Either email or phone is required';
    errors.value.phone = 'Either email or phone is required';
  }

  if (formData.value.email && !isValidEmail(formData.value.email)) {
    errors.value.email = 'Invalid email format';
  }

  return Object.keys(errors.value).length === 0;
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function handleSubmit() {
  if (!validateForm()) return;

  try {
    if (isEditMode.value) {
      await update(props.memberId, formData.value);
      alert('Member updated successfully');
      router.push('/members');
    } else {
      const result = await create(formData.value);
      showCredentials.value = true;
      // Don't redirect immediately, show credentials first
    }
  } catch (err) {
    // Error handled by composable
  }
}

function handleCancel() {
  if (showCredentials.value) {
    // If credentials shown, go to members list
    router.push('/members');
  } else {
    // Otherwise, go back
    router.back();
  }
}

function copyPassword() {
  if (credentials.value && credentials.value.password) {
    navigator.clipboard.writeText(credentials.value.password);
    alert('Password copied to clipboard!');
  }
}
</script>

<style scoped>
.member-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

fieldset {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

legend {
  font-weight: 600;
  font-size: 1.1em;
  padding: 0 10px;
  color: #495057;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 500;
  font-size: 0.95em;
  color: #495057;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.95em;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.required {
  color: #dc3545;
}

.error {
  color: #dc3545;
  font-size: 0.85em;
}

.form-note {
  padding: 10px;
  background-color: #e7f3ff;
  border-left: 4px solid #007bff;
  margin-bottom: 15px;
  font-size: 0.9em;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.credentials-box {
  padding: 20px;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  margin-bottom: 20px;
}

.credentials-box h3 {
  color: #155724;
  margin-top: 0;
}

.credentials {
  background-color: #fff;
  padding: 15px;
  border-radius: 4px;
  margin: 15px 0;
}

.credential-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.credential-row code {
  background-color: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 1.1em;
}

.btn-copy {
  padding: 4px 8px;
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.btn-copy:hover {
  background-color: #f8f9fa;
}

.warning {
  color: #856404;
  background-color: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.error-message {
  padding: 12px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin-bottom: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
```

---

## Error Handling

### Common Error Scenarios

```javascript
// 1. Validation Error (400)
{
  "message": "Either email or phone is required"
}

// 2. Duplicate Email/Phone (400)
{
  "message": "Member with this email already exists"
}

// 3. Not Found (404)
{
  "message": "Member not found"
}

// 4. Unauthorized (401)
{
  "message": "Authentication required"
}

// 5. Forbidden (403)
{
  "message": "Permission denied"
}

// 6. Server Error (500)
{
  "message": "Internal server error"
}
```

### Error Handling in Composables

```javascript
// Handle errors gracefully
try {
  const result = await createMember(memberData);
  // Success
} catch (err) {
  if (err.message.includes('already exists')) {
    // Handle duplicate
    alert('A member with this email/phone already exists');
  } else if (err.message.includes('required')) {
    // Handle validation
    alert('Please fill in all required fields');
  } else {
    // Generic error
    alert('Failed to create member. Please try again.');
  }
}
```

---

## Summary

✅ **Implemented:**
- JavaScript-based API service dengan native fetch
- Composables untuk list (`useMembers`) dan single member operations (`useMember`)
- Components: `MemberList`, `MemberFilters`, `MemberForm`
- Auto-create user account dengan credentials display
- Password reset functionality
- Search, filter, sort, dan pagination
- Soft delete support

🎯 **Key Features:**
- Dual login (email OR phone)
- Default password configuration
- Multi-tenant isolation
- Complete CRUD operations
- Error handling
- Responsive design

📝 **Next Steps:**
- Implement `MemberDetail.vue` component
- Add `MemberPasswordReset.vue` dialog component
- Integrate dengan router dan layout
- Add unit tests
- Implement file upload untuk photo
