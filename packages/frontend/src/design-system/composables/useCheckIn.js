import { ref, reactive } from 'vue'

/**
 * Check-in workflow composable
 * Handles member lookup, check-in confirmation, and recent check-ins list.
 *
 * @param {object} [apiService] - Optional API service (e.g., ofetch instance)
 * @returns {CheckInState}
 */
export function useCheckIn(apiService = null) {
  const status = ref('idle') // idle | loading | found | notFound | checkingIn | success | error
  const memberData = reactive({
    id: '',
    name: '',
    photo: '',
    tier: '',
    membershipType: '',
    expiryDate: '',
    lastCheckIn: '',
  })
  const recentCheckIns = ref([])
  const todayStats = reactive({
    totalVisits: 0,
    activeNow: 0,
  })
  const error = ref('')

  /**
   * Look up a member by ID or scan code
   * @param {string} memberId
   */
  async function lookupMember(memberId) {
    status.value = 'loading'
    error.value = ''

    try {
      const response = apiService
        ? await apiService.get(`/members/${memberId}`)
        : { id: memberId, name: 'Demo Member', photo: '', tier: 'gold', membershipType: 'Premium', expiryDate: '2026-12-31', lastCheckIn: '2026-06-06 08:00' }

      if (response) {
        Object.assign(memberData, response)
        status.value = 'found'
      } else {
        status.value = 'notFound'
      }
    } catch (e) {
      error.value = e?.message || 'Gagal mencari anggota'
      status.value = 'error'
    }
  }

  /**
   * Confirm check-in for current member
   * @param {string} memberId
   */
  async function doCheckIn(memberId) {
    status.value = 'checkingIn'
    error.value = ''

    try {
      if (apiService) {
        await apiService.post(`/check-ins`, { memberId })
      }

      status.value = 'success'

      // Add to recent check-ins
      recentCheckIns.value.unshift({
        id: Date.now().toString(),
        memberId,
        name: memberData.name,
        photo: memberData.photo,
        tier: memberData.tier,
        checkInTime: new Date().toISOString(),
      })

      // Keep only last 10
      if (recentCheckIns.value.length > 10) {
        recentCheckIns.value = recentCheckIns.value.slice(0, 10)
      }

      todayStats.totalVisits++
      todayStats.activeNow++
    } catch (e) {
      error.value = e?.message || 'Gagal check-in'
      status.value = 'error'
    }
  }

  /** Reset the check-in state */
  function reset() {
    status.value = 'idle'
    error.value = ''
    Object.assign(memberData, {
      id: '', name: '', photo: '', tier: '', membershipType: '', expiryDate: '', lastCheckIn: '',
    })
  }

  /**
   * Load recent check-ins from API
   */
  async function loadRecentCheckIns() {
    try {
      if (apiService) {
        const data = await apiService.get('/check-ins/recent?limit=10')
        recentCheckIns.value = data
      } else {
        recentCheckIns.value = [
          { id: '1', memberId: 'M001', name: 'John Doe', tier: 'gold', checkInTime: '2026-06-06T07:30:00Z' },
          { id: '2', memberId: 'M002', name: 'Jane Smith', tier: 'silver', checkInTime: '2026-06-06T07:15:00Z' },
        ]
      }
    } catch (e) {
      // silently fail
    }
  }

  /**
   * Load today's stats
   */
  async function loadTodayStats() {
    try {
      if (apiService) {
        const data = await apiService.get('/check-ins/stats/today')
        Object.assign(todayStats, data)
      } else {
        todayStats.totalVisits = 47
        todayStats.activeNow = 12
      }
    } catch (e) {
      // silently fail
    }
  }

  return {
    status,
    memberData,
    recentCheckIns,
    todayStats,
    error,
    lookupMember,
    doCheckIn,
    reset,
    loadRecentCheckIns,
    loadTodayStats,
  }
}
