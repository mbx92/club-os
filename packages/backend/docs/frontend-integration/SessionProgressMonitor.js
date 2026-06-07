/**
 * Session Progress Monitor - Frontend Integration Utility
 * 
 * This class handles SSE connection to monitor CFIT test session progress in real-time.
 * Designed for admin dashboard to monitor student test progress.
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat detection
 * - Memory leak prevention
 * - TypeScript-ready
 * 
 * Usage:
 * ```javascript
 * import SessionProgressMonitor from '@/utils/SessionProgressMonitor';
 * 
 * const monitor = new SessionProgressMonitor(
 *   'http://localhost:8000',
 *   'session-uuid',
 *   'admin-jwt-token'
 * );
 * 
 * monitor.onConnect = (data) => {
 *   console.log('Connected:', data.patient.fullName);
 *   updateUI(data);
 * };
 * 
 * monitor.onProgress = (data) => {
 *   console.log('Progress:', data.progress.progressPercentage);
 *   updateUI(data);
 * };
 * 
 * monitor.onError = (error) => {
 *   console.error('Error:', error);
 *   showNotification('Connection error');
 * };
 * 
 * monitor.connect();
 * 
 * // Cleanup when done
 * monitor.disconnect();
 * ```
 */

class SessionProgressMonitor {
  /**
   * @param {string} baseUrl - API base URL (e.g., 'http://localhost:8000')
   * @param {string} sessionId - Psychology session UUID
   * @param {string} token - Admin JWT token
   */
  constructor(baseUrl, sessionId, token) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId;
    this.token = token;
    
    // Connection state
    this.isConnected = false;
    this.isClosed = false;
    this.reader = null;
    this.abortController = null;
    
    // Reconnection
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    
    // Heartbeat tracking
    this.lastHeartbeat = null;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 45000; // 45s (server sends every 30s)
    
    // Event handlers (set by consumer)
    this.onConnect = null;
    this.onProgress = null;
    this.onError = null;
    this.onReconnecting = null;
    this.onDisconnect = null;
  }

  /**
   * Get SSE endpoint URL
   * @private
   */
  getStreamUrl() {
    return `${this.baseUrl}/api/v1/psychology/sessions/${this.sessionId}/progress/stream?token=${this.token}`;
  }

  /**
   * Start monitoring session
   */
  async connect() {
    if (this.isConnected || this.isClosed) {
      console.warn('[SessionProgressMonitor] Already connected or closed');
      return;
    }

    const url = this.getStreamUrl();
    
    try {
      this.abortController = new AbortController();
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      this.isConnected = true;
      this.startHeartbeatMonitor();
      
      await this.readStream(response.body);
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[SessionProgressMonitor] Connection aborted');
        return;
      }
      
      console.error('[SessionProgressMonitor] Connection error:', err);
      
      if (this.onError) {
        this.onError(err);
      }
      
      this.handleReconnect();
    }
  }

  /**
   * Read SSE stream
   * @private
   */
  async readStream(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    this.reader = reader;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[SessionProgressMonitor] Stream ended');
          this.isConnected = false;
          this.handleReconnect();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events (separated by \n\n)
        const events = buffer.split('\n\n');
        buffer = events.pop(); // Keep incomplete event in buffer

        for (const eventBlock of events) {
          if (eventBlock.trim()) {
            this.processEvent(eventBlock);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Normal disconnection
        return;
      }
      
      console.error('[SessionProgressMonitor] Stream read error:', err);
      this.isConnected = false;
      
      if (this.onError) {
        this.onError(err);
      }
      
      this.handleReconnect();
    }
  }

  /**
   * Process single SSE event
   * @private
   */
  processEvent(eventBlock) {
    const lines = eventBlock.split('\n');
    let eventType = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return;

    try {
      const parsed = JSON.parse(data);

      // Handle heartbeat
      if (eventType === 'heartbeat') {
        this.lastHeartbeat = new Date();
        return;
      }

      // Handle connected event
      if (parsed.type === 'connected') {
        console.log('[SessionProgressMonitor] Connected to session:', this.sessionId);
        this.reconnectAttempts = 0; // Reset on successful connection
        
        if (this.onConnect) {
          this.onConnect(parsed.data);
        }
        return;
      }

      // Handle progress event
      if (parsed.type === 'progress') {
        if (this.onProgress) {
          this.onProgress(parsed.data);
        }
        return;
      }

    } catch (err) {
      console.error('[SessionProgressMonitor] Failed to parse event:', err);
    }
  }

  /**
   * Start heartbeat monitoring
   * @private
   */
  startHeartbeatMonitor() {
    this.lastHeartbeat = new Date();
    
    // Check heartbeat every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
        console.warn('[SessionProgressMonitor] Heartbeat timeout. Reconnecting...');
        this.disconnect();
        this.handleReconnect();
      }
    }, 15000);
  }

  /**
   * Stop heartbeat monitoring
   * @private
   */
  stopHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle reconnection with exponential backoff
   * @private
   */
  handleReconnect() {
    if (this.isClosed) {
      return; // User called disconnect()
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SessionProgressMonitor] Max reconnect attempts reached');
      
      if (this.onError) {
        this.onError(new Error('Max reconnection attempts reached'));
      }
      
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[SessionProgressMonitor] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.onReconnecting) {
      this.onReconnecting(this.reconnectAttempts, delay);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from stream
   */
  disconnect() {
    console.log('[SessionProgressMonitor] Disconnecting...');
    
    this.isClosed = true;
    this.isConnected = false;
    
    // Cancel reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Stop heartbeat monitoring
    this.stopHeartbeatMonitor();
    
    // Abort fetch request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Close reader
    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }
    
    if (this.onDisconnect) {
      this.onDisconnect();
    }
  }

  /**
   * Check if currently connected
   */
  isActive() {
    return this.isConnected && !this.isClosed;
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      connected: this.isConnected,
      closed: this.isClosed,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionProgressMonitor;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
  exports.SessionProgressMonitor = SessionProgressMonitor;
}

// UMD for browser
if (typeof window !== 'undefined') {
  window.SessionProgressMonitor = SessionProgressMonitor;
}
