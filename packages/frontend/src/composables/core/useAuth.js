import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()
  
  const hasToken = () => {
    return !!authStore.token
  }
  
  const fetchProfile = async () => {
    return await authStore.initializeAuth()
  }
  
  const clearAuth = () => {
    authStore.$reset()
  }
  
  return {
    auth: authStore,
    hasToken,
    fetchProfile,
    clearAuth
  }
}