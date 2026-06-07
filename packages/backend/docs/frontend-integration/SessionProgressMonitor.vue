<template>
  <div class="session-progress-monitor">
    <!-- Connection Status -->
    <div class="connection-status" :class="connectionStatusClass">
      <div class="status-indicator">
        <span class="status-dot" :class="connectionStatusClass"></span>
        <span class="status-text">{{ connectionStatusText }}</span>
      </div>
      <div v-if="reconnecting" class="reconnect-info">
        Reconnecting... (attempt {{ reconnectAttempt }})
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="!connected && !error" class="loading-state">
      <div class="spinner"></div>
      <p>Connecting to session monitor...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Connection Failed</h3>
      <p>{{ error }}</p>
      <button @click="retry" class="btn-retry">Retry Connection</button>
    </div>

    <!-- Progress Monitor -->
    <div v-else-if="progress" class="monitor-content">
      <!-- Header -->
      <div class="monitor-header">
        <div class="patient-info">
          <h3 class="patient-name">
            <span class="icon">👤</span>
            {{ progress.patient?.fullName || 'Unknown' }}
          </h3>
          <p class="patient-email">{{ progress.patient?.email || '-' }}</p>
        </div>
        <div class="test-info">
          <span class="test-badge">{{ progress.testType?.code }}</span>
          <span class="status-badge" :class="progress.status">
            {{ formatStatus(progress.status) }}
          </span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">Test Progress</span>
          <span class="progress-percentage">{{ progress.progress.progressPercentage }}%</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: progress.progress.progressPercentage + '%' }"
            :class="getProgressBarClass(progress.progress.progressPercentage)"
          ></div>
        </div>
        <div class="progress-stats">
          <span class="stat">
            <strong>{{ progress.progress.answeredCount }}</strong> / {{ progress.progress.totalQuestions }} questions
          </span>
          <span class="stat">
            <strong>{{ progress.progress.unansweredCount }}</strong> remaining
          </span>
        </div>
      </div>

      <!-- CFIT Subtest Timers -->
      <div v-if="progress.cfit?.subtestTimers" class="timers-section">
        <h4 class="section-title">
          <span class="icon">⏱️</span>
          Subtest Timers
        </h4>
        <div class="timer-grid">
          <div 
            v-for="(seconds, subtest) in progress.cfit.subtestTimers" 
            :key="subtest"
            class="timer-card"
            :class="{ 
              active: subtest === progress.cfit.currentSubtest,
              warning: seconds < 120,
              danger: seconds < 60
            }"
          >
            <div class="timer-name">{{ formatSubtestName(subtest) }}</div>
            <div class="timer-value">
              {{ formatTime(seconds) }}
            </div>
            <div v-if="subtest === progress.cfit.currentSubtest" class="timer-badge">
              ACTIVE
            </div>
          </div>
        </div>
      </div>

      <!-- Current Position -->
      <div class="position-section">
        <h4 class="section-title">
          <span class="icon">📍</span>
          Current Position
        </h4>
        <div class="position-grid">
          <div class="position-item">
            <div class="position-label">Subtest</div>
            <div class="position-value">
              {{ formatSubtestName(progress.cfit?.currentSubtest) || 'Not started' }}
            </div>
          </div>
          <div class="position-item">
            <div class="position-label">Question</div>
            <div class="position-value">
              #{{ progress.cfit?.currentQuestionIndex || 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Timeline -->
      <div class="activity-section">
        <h4 class="section-title">
          <span class="icon">🕐</span>
          Activity
        </h4>
        <div class="activity-grid">
          <div class="activity-item">
            <div class="activity-label">Started</div>
            <div class="activity-value">
              {{ formatDateTime(progress.timing?.startedAt) }}
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-label">Elapsed Time</div>
            <div class="activity-value">
              {{ formatTime(progress.timing?.elapsedSeconds) }}
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-label">Last Activity</div>
            <div class="activity-value" :class="{ 'text-warning': isActivityStale }">
              {{ formatRelativeTime(progress.timing?.lastActivityAt) }}
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-label">Last Saved</div>
            <div class="activity-value">
              {{ formatRelativeTime(progress.timing?.lastSavedAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import SessionProgressMonitor from '@/utils/SessionProgressMonitor';

const props = defineProps({
  sessionId: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  baseUrl: {
    type: String,
    default: import.meta.env.VITE_API_URL || 'http://localhost:8000'
  }
});

const emit = defineEmits(['connected', 'progress', 'error', 'disconnected']);

// State
const monitor = ref(null);
const connected = ref(false);
const reconnecting = ref(false);
const reconnectAttempt = ref(0);
const progress = ref(null);
const error = ref(null);
const lastUpdate = ref(null);

// Computed
const connectionStatusClass = computed(() => {
  if (error.value) return 'error';
  if (reconnecting.value) return 'reconnecting';
  if (connected.value) return 'connected';
  return 'disconnected';
});

const connectionStatusText = computed(() => {
  if (error.value) return 'Connection Failed';
  if (reconnecting.value) return 'Reconnecting...';
  if (connected.value) return 'Live Monitoring';
  return 'Disconnected';
});

const isActivityStale = computed(() => {
  if (!progress.value?.timing?.lastActivityAt) return false;
  const lastActivity = new Date(progress.value.timing.lastActivityAt);
  const now = new Date();
  const diffSeconds = (now - lastActivity) / 1000;
  return diffSeconds > 120; // Warn if no activity for 2+ minutes
});

// Methods
function getProgressBarClass(percentage) {
  if (percentage < 25) return 'low';
  if (percentage < 50) return 'medium';
  if (percentage < 75) return 'high';
  return 'complete';
}

function formatStatus(status) {
  const statusMap = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'abandoned': 'Abandoned'
  };
  return statusMap[status] || status;
}

function formatSubtestName(subtest) {
  if (!subtest) return 'N/A';
  return subtest.charAt(0).toUpperCase() + subtest.slice(1);
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelativeTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return formatDateTime(dateString);
}

function retry() {
  error.value = null;
  reconnecting.value = false;
  reconnectAttempt.value = 0;
  connect();
}

function connect() {
  monitor.value = new SessionProgressMonitor(
    props.baseUrl,
    props.sessionId,
    props.token
  );

  monitor.value.onConnect = (data) => {
    connected.value = true;
    reconnecting.value = false;
    error.value = null;
    progress.value = data;
    lastUpdate.value = new Date();
    emit('connected', data);
  };

  monitor.value.onProgress = (data) => {
    progress.value = data;
    lastUpdate.value = new Date();
    emit('progress', data);
  };

  monitor.value.onError = (err) => {
    error.value = err.message || 'Connection error';
    connected.value = false;
    emit('error', err);
  };

  monitor.value.onReconnecting = (attempt, delay) => {
    reconnecting.value = true;
    reconnectAttempt.value = attempt;
  };

  monitor.value.onDisconnect = () => {
    connected.value = false;
    emit('disconnected');
  };

  monitor.value.connect();
}

// Lifecycle
onMounted(() => {
  connect();
});

onUnmounted(() => {
  if (monitor.value) {
    monitor.value.disconnect();
  }
});
</script>

<style scoped>
.session-progress-monitor {
  max-width: 900px;
  margin: 0 auto;
}

.connection-status {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: #4CAF50;
}

.status-dot.reconnecting {
  background: #FF9800;
}

.status-dot.error {
  background: #f44336;
}

.status-dot.disconnected {
  background: #9E9E9E;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-state, .error-state {
  background: white;
  padding: 48px 24px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.monitor-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.patient-name {
  margin: 0 0 4px;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.patient-email {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.test-badge, .status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}

.test-badge {
  background: #E3F2FD;
  color: #1976D2;
}

.status-badge.in_progress {
  background: #FFF3E0;
  color: #F57C00;
}

.status-badge.completed {
  background: #E8F5E9;
  color: #388E3C;
}

.progress-section, .timers-section, .position-section, .activity-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-bar {
  height: 24px;
  background: #E0E0E0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 12px;
}

.progress-fill.low {
  background: linear-gradient(90deg, #f44336, #FF5722);
}

.progress-fill.medium {
  background: linear-gradient(90deg, #FF9800, #FFC107);
}

.progress-fill.high {
  background: linear-gradient(90deg, #2196F3, #03A9F4);
}

.progress-fill.complete {
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}

.timer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.timer-card {
  padding: 16px;
  background: #F5F5F5;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
  position: relative;
}

.timer-card.active {
  background: #E3F2FD;
  border: 2px solid #2196F3;
  transform: scale(1.05);
}

.timer-card.warning {
  background: #FFF3E0;
  border-color: #FF9800;
}

.timer-card.danger {
  background: #FFEBEE;
  border-color: #f44336;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.timer-name {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  text-transform: capitalize;
}

.timer-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.timer-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #2196F3;
  color: white;
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
}

.position-grid, .activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.position-item, .activity-item {
  padding: 12px;
  background: #F9F9F9;
  border-radius: 6px;
}

.position-label, .activity-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.position-value, .activity-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.text-warning {
  color: #FF9800 !important;
}

.btn-retry {
  margin-top: 16px;
  padding: 10px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-retry:hover {
  background: #1976D2;
}
</style>
