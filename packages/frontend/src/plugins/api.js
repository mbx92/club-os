import { ofetch } from 'ofetch'
import {
  AccessDeniedError,
  FeatureGateError,
  LimitReachedError,
  SubscriptionRequiredError,
  TenantInactiveError,
} from '@/utils/errors'
import { redirectToAccessDenied, shouldRedirectOn403 } from '@/utils/accessDenied'
import { debug } from '@/utils/debug'

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    this.isRefreshing = false
    this.failedRequests = []
    this.subscriptionStore = null // Will be set after store is initialized
    this.authStore = null // Will be set after store is initialized
    this.clientIP = null // Cache client IP
    
    // Fetch client IP on initialization
    this.fetchClientIP()
    
    this.client = ofetch.create({
      baseURL: this.baseURL,
      onRequest: ({ options, request }) => {
        // Try to get token from localStorage first, then sessionStorage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        if (token) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`
          }
        }
        
        // Add custom headers supported by backend
        // X-Client-IP - IP address client
        if (this.clientIP) {
          options.headers = {
            ...options.headers,
            'X-Client-IP': this.clientIP
          }
        }
        
        // X-Client-Name - Nama client/app
        options.headers = {
          ...options.headers,
          'X-Client-Name': 'Gym FE Web App'
        }
        
        // X-Tenant-ID - Tenant ID (from localStorage if available)
        const tenantId = localStorage.getItem('tenantId')
        if (tenantId) {
          options.headers = {
            ...options.headers,
            'X-Tenant-ID': tenantId
          }
        }
        
        // AGGRESSIVE PROTECTION: Validate subscription before EVERY request
        // Skip critical endpoints that don't require subscription
        const url = request.toString()
        
        // Whitelist: Endpoints that should NEVER be blocked
        const whitelistedEndpoints = [
          '/auth/',           // All auth endpoints (login, register, refresh, etc)
          '/subscription/',   // All subscription endpoints (current, plans, etc)
          '/permissions/',    // User permissions (needed during login)
          '/public/',         // Public endpoints
          '/billing/plans',   // View plans without subscription
          '/tenants'          // Tenant management (for super admin)
        ]
        
        const isWhitelisted = whitelistedEndpoints.some(endpoint => url.includes(endpoint))
        
        // Only apply protection if:
        // 1. Not whitelisted endpoint
        // 2. Stores are initialized
        // 3. User is authenticated (has token)
        const hasToken = localStorage.getItem('token') || sessionStorage.getItem('token')
        
        if (!isWhitelisted && hasToken && this.subscriptionStore && this.authStore) {
          // SUPER ADMIN BYPASS - Full access for super admin
          const isSuperAdmin = this.authStore.user?.isSuperAdmin === true
          if (isSuperAdmin) {
            debug.log('[API Guard] ✅ Super admin - Request allowed')
            return
          }
          
          const hasAccess = this.subscriptionStore.hasSubscription || this.subscriptionStore.isTrialActive
          
          if (!hasAccess) {
            debug.error('[API Guard] 🚫 REQUEST BLOCKED - No active subscription')
            debug.error('[API Guard] Blocked URL:', url)
            
            // Show modal and throw error
            this.subscriptionStore.showSubscriptionRequiredModal()
            
            // Throw error to prevent request
            throw new Error('SUBSCRIPTION_REQUIRED: Active subscription needed to access this resource')
          }
        }
      },
      onResponseError: async ({ response }) => {
        const originalRequest = response._request || {}
        const data = response._data
        const url = response.url || originalRequest.url || ''
        
        debug.log('[API Error]', {
          status: response.status,
          url,
          data
        })
        
        // Handle TENANT_INACTIVE error
        if (data?.code === 'TENANT_INACTIVE') {
          throw new TenantInactiveError(data)
        }
        
        // Handle business logic errors (400) - throw with complete error info
        if (response.status === 400 && data) {
          // Create an error object with all the data from backend
          const error = new Error(data.message || 'Request failed')
          error.code = data.code
          error.statusCode = response.status
          error.data = data
          throw error
        }
        
        // Handle authentication errors (401)
        if (response.status === 401) {
          // For login endpoint specifically, throw immediately without token refresh attempt
          if (url.includes('/auth/login')) {
            debug.log('[API] Login failed with 401:', data)
            // Create an error object with all the data from backend
            const error = new Error(data?.message || 'Unauthorized')
            error.code = data?.code || 'UNAUTHORIZED'
            error.statusCode = response.status
            error.data = data
            
            // Clear tokens since login failed
            this.removeToken()
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            sessionStorage.removeItem('refreshToken')
            sessionStorage.removeItem('user')
            
            throw error
          }
        }
        
        // Handle feature gating errors (403)
        if (response.status === 403 && data) {
          if (data.code === 'MODULE_NOT_AVAILABLE') {
            if (this.subscriptionStore) {
              this.subscriptionStore.showUpgradeModal({
                type: 'module',
                module: data.requiredModule,
                message: data.message,
                currentPlan: data.currentPlan
              })
            }
            throw new FeatureGateError(data)
          }
          
          if (data.code === 'FEATURE_NOT_AVAILABLE') {
            if (this.subscriptionStore) {
              this.subscriptionStore.showUpgradeModal({
                type: 'feature',
                feature: data.requiredFeature,
                message: data.message,
                currentPlan: data.currentPlan
              })
            }
            throw new FeatureGateError(data)
          }
          
          if (data.code === 'LIMIT_REACHED') {
            if (this.subscriptionStore) {
              this.subscriptionStore.showLimitModal({
                limit: data.limit,
                current: data.current,
                message: data.message,
                currentPlan: data.currentPlan
              })
            }
            throw new LimitReachedError(data)
          }

          // Permission / role 403 — redirect to dedicated access denied page
          if (shouldRedirectOn403(data)) {
            const from = window.location.pathname + window.location.search
            redirectToAccessDenied({
              from,
              reason: 'api',
              message: data.message,
            })
            throw new AccessDeniedError(data)
          }
        }
        
        // Handle subscription required (402)
        if (response.status === 402) {
          // Only show modal if subscription store is available and tenant truly needs subscription
          if (this.subscriptionStore) {
            debug.log('[API Interceptor] 402 received, checking subscription status...')
            this.subscriptionStore.showSubscriptionRequiredModal()
          }
          throw new SubscriptionRequiredError(data)
        }
        
        // If token expired and we're not already refreshing
        // Skip this logic if we already threw an auth error from login endpoint
        if (response.status === 401 && !originalRequest._retry && !originalRequest._authError) {
          if (this.isRefreshing) {
            // If already refreshing, add this request to the queue
            return new Promise((resolve, reject) => {
              this.failedRequests.push({ resolve, reject })
            })
          }
          
          this.isRefreshing = true
          originalRequest._retry = true
          
          try {
            // Try to refresh the token
            const newToken = await this.refreshToken()
            
            // Retry all failed requests with the new token
            this.processQueue(newToken)
            
            // Retry the original request
            return this.client(originalRequest.url, {
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`
              }
            })
          } catch (refreshError) {
            // If refresh fails, clear tokens and redirect to login
            this.processQueue(null, refreshError)
            this.removeToken()
            // Clear both localStorage and sessionStorage
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            sessionStorage.removeItem('refreshToken')
            sessionStorage.removeItem('user')
            
            // Only redirect if NOT already on login page
            const currentPath = window.location.pathname
            if (currentPath !== '/auth/login') {
              debug.log('[API] Token refresh failed - redirecting to login from:', currentPath)
              window.location.href = '/auth/login'
            } else {
              debug.log('[API] Token refresh failed on login page - staying to show error')
            }
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }
        
        // For other 401 errors (not from login and not token refresh), clear tokens and redirect
        // BUT: Don't redirect if we're already on the login page (to allow error messages to show)
        if (response.status === 401 && !originalRequest._retry) {
          const url = response.url || ''
          // Skip if this is login endpoint (already handled above)
          if (!url.includes('/auth/login')) {
            this.removeToken()
            // Clear both localStorage and sessionStorage
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            sessionStorage.removeItem('refreshToken')
            sessionStorage.removeItem('user')
            
            // Only redirect if NOT already on login page
            const currentPath = window.location.pathname
            if (currentPath !== '/auth/login') {
              debug.log('[API] 401 error - redirecting to login from:', currentPath)
              window.location.href = '/auth/login'
            } else {
              debug.log('[API] 401 error on login page - staying to show error')
            }
          }
        }
      }
    })
  }

  // Process the queue of failed requests
  processQueue(token, error = null) {
    this.failedRequests.forEach(prom => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token)
      }
    })
    
    this.failedRequests = []
  }

  // Refresh the access token
  async refreshToken() {
    // Try to get refresh token from localStorage first
    let refreshToken = localStorage.getItem('refreshToken')
    
    // If not in localStorage, try sessionStorage
    if (!refreshToken) {
      refreshToken = sessionStorage.getItem('refreshToken')
    }
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to refresh token')
      }
      
      if (data.token) {
        this.setToken(data.token)
        return data.token
      }
      
      throw new Error('Invalid response from server')
    } catch (error) {
      throw error
    }
  }

  // Main API call function - can be called directly
  async call(url, options = {}) {
    // Store original request for potential retry
    const originalRequest = { url, ...options }
    
    try {
      return await this.client(url, options)
    } catch (error) {
      // If we get a 401 error, it will be handled by onResponseError
      throw error
    }
  }

  // Convenience methods
  async get(url, options = {}) {
    return this.call(url, { method: 'GET', ...options })
  }

  async post(url, body, options = {}) {
    return this.call(url, { method: 'POST', body, ...options })
  }

  async put(url, body, options = {}) {
    return this.call(url, { method: 'PUT', body, ...options })
  }

  async patch(url, body, options = {}) {
    return this.call(url, { method: 'PATCH', body, ...options })
  }

  async delete(url, body = null, options = {}) {
    // If body is provided, send it as body
    if (body) {
      return this.call(url, { method: 'DELETE', body, ...options })
    }
    return this.call(url, { method: 'DELETE', ...options })
  }

  setToken(token) {
    // Check if token exists in localStorage to determine which storage to use
    if (localStorage.getItem('token')) {
      localStorage.setItem('token', token)
    } else if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', token)
    } else {
      // Default to localStorage
      localStorage.setItem('token', token)
    }
  }

  removeToken() {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
  }

  getToken() {
    // Try localStorage first, then sessionStorage
    return localStorage.getItem('token') || sessionStorage.getItem('token')
  }
  
  // Set subscription store reference
  setSubscriptionStore(store) {
    this.subscriptionStore = store
  }
  
  // Set auth store reference
  setAuthStore(store) {
    this.authStore = store
  }
  
  // Fetch client IP from external service
  async fetchClientIP() {
    try {
      // Try multiple services for reliability
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.ip.sb/jsonip',
        'https://ipinfo.io/json'
      ]
      
      for (const service of services) {
        try {
          const response = await fetch(service, { 
            method: 'GET',
            cache: 'no-cache'
          })
          
          if (response.ok) {
            const data = await response.json()
            this.clientIP = data.ip || data.origin
            debug.log('[API] Client IP fetched:', this.clientIP)
            return this.clientIP
          }
        } catch (e) {
          // Try next service
          continue
        }
      }
      
      debug.warn('[API] Could not fetch client IP from any service')
      return null
    } catch (error) {
      debug.warn('[API] Failed to fetch client IP:', error.message)
      return null
    }
  }
  
  // Get cached client IP
  getClientIP() {
    return this.clientIP
  }
}

// Create a callable API service
// The trick is to create a function that has all the ApiService methods attached
const createCallableApi = () => {
  const service = new ApiService()
  
  // Create a callable function that wraps the call method
  const callable = function(url, options = {}) {
    return service.call(url, options)
  }
  
  // Copy all properties and methods from service to callable
  Object.getOwnPropertyNames(Object.getPrototypeOf(service)).forEach(key => {
    if (key !== 'constructor' && typeof service[key] === 'function') {
      callable[key] = service[key].bind(service)
    }
  })
  
  // Copy instance properties
  Object.keys(service).forEach(key => {
    if (typeof service[key] !== 'function') {
      Object.defineProperty(callable, key, {
        get() { return service[key] },
        set(val) { service[key] = val }
      })
    }
  })
  
  return callable
}

export const api = createCallableApi()

export default {
  install: (app) => {
    app.config.globalProperties.$api = api
    app.provide('api', api)
  }
}
