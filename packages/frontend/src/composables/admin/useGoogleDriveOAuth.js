import { onBeforeUnmount, ref } from 'vue'
import { useApi } from '@/composables/core/useApi'
import { useNotification } from '@/composables/core/useNotification'

export function useGoogleDriveOAuth() {
  const api = useApi()
  const { showSuccess, handleError } = useNotification()

  const oauthStatus = ref(null)
  const oauthConnection = ref(null)
  const redirectUri = ref('')
  const loadingStatus = ref(false)
  const connecting = ref(false)
  const testing = ref(false)
  const disconnecting = ref(false)

  let popupWatcher = null
  let messageHandler = null

  const clearOAuthListeners = () => {
    if (popupWatcher) {
      clearInterval(popupWatcher)
      popupWatcher = null
    }
    if (messageHandler) {
      window.removeEventListener('message', messageHandler)
      messageHandler = null
    }
  }

  const fetchOAuthStatus = async () => {
    loadingStatus.value = true
    try {
      const response = await api.get('/admin/database/google-drive/oauth/status')
      const data = response.data || response
      oauthStatus.value = data.status || null
      oauthConnection.value = data.connection || null
      redirectUri.value = data.redirectUri || ''
      return data
    } catch (error) {
      handleError(error, 'Gagal memuat status Google Drive OAuth')
      return null
    } finally {
      loadingStatus.value = false
    }
  }

  const testOAuthConnection = async () => {
    testing.value = true
    try {
      const response = await api.post('/admin/database/google-drive/oauth/test')
      const body = response.data || response
      oauthConnection.value = body.data || body.connection || null
      if (body.success) {
        showSuccess(body.message || 'Koneksi Google Drive berhasil')
      } else {
        handleError(new Error(body.message || 'Koneksi Google Drive gagal'), 'Test koneksi gagal')
      }
      await fetchOAuthStatus()
      return response
    } catch (error) {
      handleError(error, 'Test koneksi Google Drive gagal')
      return { success: false }
    } finally {
      testing.value = false
    }
  }

  const disconnectOAuth = async () => {
    disconnecting.value = true
    try {
      await api.post('/admin/database/google-drive/oauth/disconnect')
      showSuccess('Google Drive OAuth diputus')
      await fetchOAuthStatus()
      return { success: true }
    } catch (error) {
      handleError(error, 'Gagal memutus koneksi Google Drive')
      return { success: false }
    } finally {
      disconnecting.value = false
    }
  }

  const connectOAuth = async () => {
    connecting.value = true
    clearOAuthListeners()

    try {
      const response = await api.get('/admin/database/google-drive/oauth/authorize-url')
      const data = response.data || response
      const authorizeUrl = data.authorizeUrl

      if (!authorizeUrl) {
        throw new Error('Authorize URL tidak tersedia')
      }

      const popup = window.open(
        authorizeUrl,
        'googleDriveOAuth',
        'width=520,height=720,menubar=no,toolbar=no,location=yes,status=no,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.')
      }

      await new Promise((resolve, reject) => {
        messageHandler = (event) => {
          if (event.origin !== window.location.origin) return
          const payload = event.data
          if (!payload || payload.type !== 'google-drive-oauth') return

          clearOAuthListeners()
          try {
            popup.close()
          } catch (_) {}

          if (payload.success) {
            resolve(payload)
          } else {
            reject(new Error(payload.message || 'OAuth gagal'))
          }
        }

        window.addEventListener('message', messageHandler)

        popupWatcher = setInterval(() => {
          if (!popup || popup.closed) {
            clearOAuthListeners()
            reject(new Error('OAuth dibatalkan atau jendela ditutup sebelum selesai'))
          }
        }, 500)
      })

      showSuccess('Google Drive berhasil dihubungkan')
      await fetchOAuthStatus()
      return { success: true }
    } catch (error) {
      handleError(error, 'Gagal menghubungkan Google Drive')
      return { success: false }
    } finally {
      connecting.value = false
      clearOAuthListeners()
    }
  }

  onBeforeUnmount(() => {
    clearOAuthListeners()
  })

  return {
    oauthStatus,
    oauthConnection,
    redirectUri,
    loadingStatus,
    connecting,
    testing,
    disconnecting,
    fetchOAuthStatus,
    connectOAuth,
    disconnectOAuth,
    testOAuthConnection,
  }
}
