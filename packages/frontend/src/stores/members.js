import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { debug } from '@/utils/debug'

export const useMembersStore = defineStore('members', () => {
  const members = ref([])
  const loading = ref(false)

  const activeMembers = computed(() => 
    members.value.filter(m => m.status === 'Aktif')
  )

  const fetchMembers = async () => {
    loading.value = true
    try {
      // Implement API call
      // const response = await $fetch('/api/members')
      // members.value = response.data
    } finally {
      loading.value = false
    }
  }

  const addMember = async (memberData) => {
    // Implement API call
    debug.log('Add member:', memberData)
  }

  const updateMember = async (id, memberData) => {
    // Implement API call
    debug.log('Update member:', id, memberData)
  }

  const deleteMember = async (id) => {
    // Implement API call
    debug.log('Delete member:', id)
  }

  return {
    members,
    loading,
    activeMembers,
    fetchMembers,
    addMember,
    updateMember,
    deleteMember
  }
})
