// Custom error classes for feature gating

/**
 * Base API Error class with error code support
 */
export class ApiError extends Error {
  constructor(data) {
    super(data.message || 'An error occurred')
    this.name = 'ApiError'
    this.code = data.code
    this.statusCode = data.statusCode
    this.data = data.data || {}
  }
}

/**
 * Generic error class that can handle any error code from backend
 */
export class AppError extends Error {
  constructor(data) {
    super(data.message || 'An error occurred')
    this.name = 'AppError'
    this.code = data.code
    this.statusCode = data.statusCode
    this.details = data.details || null
    this.data = data.data || {}
  }
}

export class FeatureGateError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'FeatureGateError'
    this.code = data.code
    this.requiredModule = data.requiredModule
    this.requiredFeature = data.requiredFeature
    this.currentPlan = data.currentPlan
  }
}

export class LimitReachedError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'LimitReachedError'
    this.code = data.code
    this.limit = data.limit
    this.current = data.current
    this.currentPlan = data.currentPlan
  }
}

export class SubscriptionRequiredError extends Error {
  constructor(data) {
    super(data.message)
    this.name = 'SubscriptionRequiredError'
    this.code = data.code
  }
}

export class TenantInactiveError extends Error {
  constructor(data) {
    super(data.message || 'Your organization account is not active. Please contact support.')
    this.name = 'TenantInactiveError'
    this.code = data.code || 'TENANT_INACTIVE'
  }
}

export class AccessDeniedError extends Error {
  constructor(data = {}) {
    super(data.message || 'Akses ditolak')
    this.name = 'AccessDeniedError'
    this.code = data.code || 'ACCESS_DENIED'
    this.statusCode = 403
    this.redirected = true
    this.skipNotification = true
  }
}
