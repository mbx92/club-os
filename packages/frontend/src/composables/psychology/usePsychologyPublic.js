import { ref, computed, onUnmounted } from 'vue'

const BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Public Psychology composable for candidates/patients taking tests
 * No JWT authentication required - uses access token instead
 */
export const usePsychologyPublic = () => {
  const tokenData = ref(null)
  const invitation = ref(null)
  const session = ref(null)
  const questions = ref([])
  const answers = ref({})
  const result = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const saving = ref(false)
  const submitting = ref(false)

  let autoSaveInterval = null

  /**
   * Sleep utility for retry mechanism
   * @param {Number} ms - Milliseconds to sleep
   */
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  /**
   * Make API call for public endpoints (no JWT)
   */
  const publicApi = async (endpoint, options = {}) => {
    const url = `${BASE_URL}/psychology/public${endpoint}`
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    if (options.body) {
      config.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      // Create error with additional data from response
      const error = new Error(data.message || 'Request failed')
      error.data = data.data // Include any data from error response (e.g., existing access)
      error.access = data.data?.access // Shortcut to access data
      throw error
    }

    return data
  }

  /**
   * Fetch image with access token (for authenticated resources like CFIT images)
   */
  const fetchImageWithAuth = async (imagePath, accessToken) => {
    // For images, use base URL without /api/v1
    const baseUrl = BASE_URL.replace('/api/v1', '')
    
    // Ensure proper path formatting
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
    
    const url = `${baseUrl}${cleanPath}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    // Convert to blob and create object URL
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  /**
   * Validate access token and get test info
   * @param {String} token - Access token
   */
  const validateToken = async (token) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/access/${token}`)
      tokenData.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || 'Token tidak valid atau sudah kadaluarsa'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get invitation info (for self-registration)
   * @param {String} code - Invitation code
   */
  const getInvitationInfo = async (code) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/invite/${code}`)
      invitation.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || 'Kode undangan tidak valid'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Register via invitation (self-registration)
   * @param {String} code - Invitation code
   * @param {Object} data - Registration data { name, email, phone, nik, birthDate }
   */
  const registerViaInvitation = async (code, data) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/invite/${code}/register`, {
        method: 'POST',
        body: data
      })
      return response.data
    } catch (err) {
      error.value = err.message || 'Gagal mendaftar'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get test questions for a session
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   */
  const getQuestions = async (token, sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/access/${token}/session/${sessionId}/questions`)
      // Store session with testType and patient merged
      session.value = {
        ...response.data.session,
        testType: response.data.testType,
        patient: response.data.patient
      }
      questions.value = response.data.questions || []
      
      // Handle saved answers - normalize to new format if needed
      const savedAnswers = response.data.savedAnswers || {}
      answers.value = Object.entries(savedAnswers).reduce((acc, [questionId, answerData]) => {
        // If already in new format with timestamp, keep as is
        if (typeof answerData === 'object' && answerData.answer && answerData.timestamp) {
          acc[questionId] = answerData
        } 
        // If old format (simple string/value), convert to new format
        else if (answerData !== undefined && answerData !== null && answerData !== '') {
          acc[questionId] = {
            answer: answerData,
            timestamp: response.data.session?.completedAt || new Date().toISOString(),
            duration: 0
          }
        }
        return acc
      }, {})
      
      // Return response data including metadata if available
      return {
        ...response.data,
        metadata: response.data.metadata || response.data.session?.metadata || null
      }
    } catch (err) {
      error.value = err.message || 'Gagal memuat soal'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Start a test session
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   */
  const startSession = async (token, sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/access/${token}/session/${sessionId}/start`, {
        method: 'POST'
      })
      session.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || 'Gagal memulai tes'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Save progress (auto-save) with retry mechanism
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   * @param {Function} onError - Error callback
   * @param {Function} onSuccess - Success callback
   * @param {Object} metadata - Additional metadata to save (e.g., subtest timers)
   */
  const saveProgress = async (token, sessionId, onError = null, onSuccess = null, metadata = null) => {
    if (saving.value) return // Prevent concurrent saves
    
    saving.value = true
    const MAX_RETRIES = 3
    let attempt = 0
    let lastError = null
    
    try {
      // Filter out empty/null answers before saving
      const validAnswers = Object.entries(answers.value)
        .filter(([_, answerData]) => {
          // Handle both old format (simple value) and new format (object with answer + timestamp)
          const answer = typeof answerData === 'object' && answerData.answer ? answerData.answer : answerData
          return answer !== undefined && answer !== null && answer !== ''
        })
        .reduce((acc, [questionId, answerData]) => {
          acc[questionId] = answerData
          return acc
        }, {})
      
      // Prepare request body with answers and optional metadata
      const requestBody = { answers: validAnswers }
      if (metadata) {
        requestBody.metadata = metadata
      }
      
      // Retry loop with exponential backoff
      while (attempt < MAX_RETRIES) {
        try {
          const response = await publicApi(`/access/${token}/session/${sessionId}/save`, {
            method: 'POST',
            body: requestBody
          })
          
          // Success - call success callback if provided
          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(response.data, attempt)
          }
          
          return response.data
        } catch (err) {
          lastError = err
          attempt++
          
          if (attempt >= MAX_RETRIES) {
            // Failed after all retries
            console.error(`Auto-save failed after ${MAX_RETRIES} attempts:`, err)
            if (onError && typeof onError === 'function') {
              onError(err, attempt)
            }
            throw err
          } else {
            // Wait before retry with exponential backoff (1s, 2s, 3s)
            const delay = 1000 * attempt
            console.warn(`Auto-save attempt ${attempt} failed, retrying in ${delay}ms...`, err.message)
            await sleep(delay)
          }
        }
      }
      
      // If we reach here, throw the last error
      if (lastError) {
        if (onError && typeof onError === 'function') {
          onError(lastError, MAX_RETRIES)
        }
        throw lastError
      }
    } finally {
      saving.value = false
    }
  }

  /**
   * Submit test answers with retry mechanism
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   */
  const submitAnswers = async (token, sessionId) => {
    submitting.value = true
    error.value = null
    const MAX_RETRIES = 3
    let attempt = 0
    let lastError = null
    
    try {
      // Filter out empty/null answers before submitting
      const validAnswers = Object.entries(answers.value)
        .filter(([_, answerData]) => {
          // Handle both old format (simple value) and new format (object with answer + timestamp)
          const answer = typeof answerData === 'object' && answerData.answer ? answerData.answer : answerData
          return answer !== undefined && answer !== null && answer !== ''
        })
        .reduce((acc, [questionId, answerData]) => {
          acc[questionId] = answerData
          return acc
        }, {})
      
      // Retry loop with exponential backoff
      while (attempt < MAX_RETRIES) {
        try {
          const response = await publicApi(`/access/${token}/session/${sessionId}/submit`, {
            method: 'POST',
            body: { answers: validAnswers }
          })
          return response.data
        } catch (err) {
          lastError = err
          attempt++
          
          if (attempt >= MAX_RETRIES) {
            // Failed after all retries
            console.error(`Submit failed after ${MAX_RETRIES} attempts:`, err)
            error.value = err.message || 'Gagal mengirim jawaban setelah beberapa percobaan'
            throw err
          } else {
            // Wait before retry with exponential backoff (1s, 2s, 3s)
            const delay = 1000 * attempt
            console.warn(`Submit attempt ${attempt} failed, retrying in ${delay}ms...`, err.message)
            await sleep(delay)
          }
        }
      }
      
      // If we reach here, throw the last error
      if (lastError) {
        error.value = lastError.message || 'Gagal mengirim jawaban'
        throw lastError
      }
    } finally {
      submitting.value = false
    }
  }

  /**
   * Get test result
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   */
  const getResult = async (token, sessionId) => {
    loading.value = true
    error.value = null
    try {
      const response = await publicApi(`/access/${token}/session/${sessionId}/result`)
      result.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || 'Gagal memuat hasil'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Set answer for a question with timing data
   * @param {Number} questionId - Question ID
   * @param {String} choice - Answer choice (A or B)
   * @param {Number} startTime - Timestamp when question was first displayed (milliseconds)
   */
  const setAnswer = (questionId, choice, startTime = null) => {
    const now = Date.now()
    const duration = startTime ? Math.round((now - startTime) / 1000) : 0
    
    answers.value[questionId] = {
      answer: choice,
      timestamp: new Date().toISOString(),
      duration: duration
    }
  }

  /**
   * Start auto-save interval
   * @param {String} token - Access token
   * @param {String} sessionId - Session ID
   * @param {Number} intervalMs - Save interval in milliseconds (default: 30000)
   * @param {Function} onSaveError - Error callback
   * @param {Function} onSaveSuccess - Success callback
   * @param {Function} getMetadata - Function to get metadata (e.g., subtest timers)
   */
  const startAutoSave = (token, sessionId, intervalMs = 30000, onSaveError = null, onSaveSuccess = null, getMetadata = null) => {
    stopAutoSave() // Clear existing interval
    autoSaveInterval = setInterval(() => {
      if (Object.keys(answers.value).length > 0) {
        const metadata = getMetadata && typeof getMetadata === 'function' ? getMetadata() : null
        saveProgress(token, sessionId, onSaveError, onSaveSuccess, metadata)
      }
    }, intervalMs)
  }

  /**
   * Stop auto-save interval
   */
  const stopAutoSave = () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
    }
  }

  /**
   * Calculate current progress
   * For CFIT, excludes example and instruction items from total
   */
  const progress = computed(() => {
    // Filter out example and instruction items (for CFIT)
    const actualQuestions = questions.value.filter(q => q.type !== 'example' && q.type !== 'instruction')
    const total = actualQuestions.length
    
    // Count answered (only actual questions, not examples or instructions)
    const answered = actualQuestions.filter(q => {
      const questionId = getQuestionId(q)
      const answerData = answers.value[questionId]
      // Handle both old format (simple value) and new format (object with answer + timestamp)
      const answer = typeof answerData === 'object' && answerData.answer !== undefined ? answerData.answer : answerData
      return answer !== undefined && answer !== null && answer !== ''
    }).length
    
    return {
      answered,
      total,
      percentage: total > 0 ? Math.round((answered / total) * 100) : 0
    }
  })

  /**
   * Get question ID helper (handles different field names)
   */
  const getQuestionId = (question) => {
    return question.id || question._id || question.questionId
  }

  /**
   * Check if a question has been answered
   */
  const isQuestionAnswered = (question) => {
    const questionId = getQuestionId(question)
    const answerData = answers.value[questionId]
    // Handle both old format (simple value) and new format (object with answer + timestamp)
    const answer = typeof answerData === 'object' && answerData.answer !== undefined ? answerData.answer : answerData
    return answer !== undefined && answer !== null && answer !== ''
  }

  /**
   * Check if all questions are answered
   * For CFIT, excludes example and instruction items
   */
  const allAnswered = computed(() => {
    const actualQuestions = questions.value.filter(q => q.type !== 'example' && q.type !== 'instruction')
    return actualQuestions.length > 0 && 
           actualQuestions.every(q => isQuestionAnswered(q))
  })

  /**
   * Get unanswered question IDs
   * For CFIT, excludes example and instruction items
   */
  const unansweredQuestions = computed(() => {
    return questions.value
      .filter(q => q.type !== 'example' && q.type !== 'instruction' && !isQuestionAnswered(q))
      .map(q => getQuestionId(q))
  })

  /**
   * Format date for display
   * @param {String} date - Date string
   */
  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoSave()
  })

  return {
    // State
    tokenData,
    invitation,
    session,
    questions,
    answers,
    result,
    loading,
    error,
    saving,
    submitting,

    // Computed
    progress,
    allAnswered,
    unansweredQuestions,

    // Methods
    validateToken,
    getInvitationInfo,
    registerViaInvitation,
    getQuestions,
    startSession,
    saveProgress,
    submitAnswers,
    getResult,
    setAnswer,
    startAutoSave,
    stopAutoSave,
    formatDate,
    fetchImageWithAuth
  }
}
