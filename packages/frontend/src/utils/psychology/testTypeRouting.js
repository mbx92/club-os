/**
 * Centralized Test Type Routing Configuration
 * Manages routing for different psychology test result pages
 */

/**
 * Test type route mapping
 * Add new test types here when creating new result pages
 * Format: 'testCode': '/path/to/result/page'
 * 
 * If a test type is NOT in this list, it will use the generic result page
 * which will show basic information without specific visualizations
 */
export const TEST_TYPE_ROUTES = {
  // PAPI Kostick - Personality & Work Style Assessment
  'papi': '/psychology/results/papi',
  'papi_kostick': '/psychology/results/papi',
  'papi-kostick': '/psychology/results/papi',
  'papikostick': '/psychology/results/papi',
  
  // EPPS - Edwards Personal Preference Schedule
  'epps': '/psychology/results/epps',
  
  // CFIT - Culture Fair Intelligence Test
  'cfit': '/psychology/results/cfit',
  
  // Love Language - 5 Bahasa Cinta
  'love': '/psychology/results/love',
  'love_language': '/psychology/results/love',
  
  // Add more test types here as you create their result pages
  // 'mbti': '/psychology/results/mbti',
  // 'disc': '/psychology/results/disc',
}

/**
 * Test type display names
 * Maps test code to human-readable names
 */
export const TEST_TYPE_NAMES = {
  'papi': 'Papikostick',
  'papikostick': 'Papikostick',
  'epps': 'Edwards Personal Preference Schedule',
  'cfit': 'Culture Fair Intelligence Test',
  'love': '5 Bahasa Cinta',
  'love_language': '5 Bahasa Cinta',
  'cnth': 'Contoh',
}

/**
 * Detect test type from session/result data
 * Returns normalized test type key for routing
 * 
 * @param {Object} data - Session or result data
 * @returns {string|null} Test type key (lowercase, normalized) or null
 */
export function detectTestType(data) {
  if (!data) return null
  
  // Get test code and name (case insensitive)
  const testCode = (data.testType?.code || '').toLowerCase().trim()
  const testName = (data.testType?.name || '').toLowerCase().trim()
  
  // Direct code match (fastest)
  if (testCode) {
    // Exact matches
    if (testCode === 'papi' || testCode === 'papikostick') return 'papi'
    if (testCode === 'epps') return 'epps'
    if (testCode === 'cfit') return 'cfit'
    if (testCode === 'love_language') return 'love'
    if (testCode === 'cnth') return 'cnth'
    
    // Partial matches
    if (testCode.includes('papi')) return 'papi'
    if (testCode.includes('epps')) return 'epps'
    if (testCode.includes('cfit')) return 'cfit'
    if (testCode.includes('love')) return 'love'
  }
  
  // Name-based detection (fallback)
  if (testName) {
    if (testName.includes('papi') || testName.includes('kostick')) return 'papi'
    if (testName.includes('epps') || testName.includes('edwards')) return 'epps'
    if (testName.includes('cfit') || testName.includes('culture fair')) return 'cfit'
    if (testName.includes('love') || testName.includes('bahasa cinta')) return 'love'
  }
  
  // Check scoring config type (for tests with special scoring)
  const scoringType = (data.testType?.scoringConfig?.type || '').toLowerCase()
  if (scoringType) {
    if (scoringType.includes('papi')) return 'papi'
    if (scoringType.includes('epps')) return 'epps'
    if (scoringType.includes('cfit')) return 'cfit'
    if (scoringType.includes('love')) return 'love'
  }
  
  // Return raw test code as fallback (will use generic result page)
  return testCode || null
}

/**
 * Get result page route for a session
 * @param {Object} session - Session data
 * @returns {string} Route path
 */
export function getResultRoute(session) {
  if (!session?.id) return '/psychology/sessions'
  
  const testType = detectTestType(session)
  
  // If test type has specific route, use it
  if (testType && TEST_TYPE_ROUTES[testType]) {
    return `${TEST_TYPE_ROUTES[testType]}/${session.id}`
  }
  
  // Otherwise use generic route which will auto-redirect
  return `/psychology/results/${session.id}`
}

/**
 * Get display name for test type
 * @param {Object} data - Session or result data
 * @returns {string} Display name
 */
export function getTestTypeName(data) {
  const testType = detectTestType(data)
  return TEST_TYPE_NAMES[testType] || data?.testType?.name || 'Tes'
}

/**
 * Check if test type has custom result page
 * @param {string} testType - Test type key
 * @returns {boolean}
 */
export function hasCustomResultPage(testType) {
  return testType && TEST_TYPE_ROUTES[testType] !== undefined
}

export default {
  TEST_TYPE_ROUTES,
  TEST_TYPE_NAMES,
  detectTestType,
  getResultRoute,
  getTestTypeName,
  hasCustomResultPage
}
