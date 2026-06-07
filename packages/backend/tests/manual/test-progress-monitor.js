/**
 * Manual Test Script - Session Progress Monitor (SSE)
 * 
 * Usage:
 * 1. Start server: npm run dev
 * 2. Get admin JWT token from login
 * 3. Get active session ID
 * 4. Run: node tests/manual/test-progress-monitor.js <sessionId> <token>
 * 
 * Example:
 * node tests/manual/test-progress-monitor.js abc-123-uuid eyJhbGciOiJIUzI1NiIs...
 */

const fetch = require('node-fetch');

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(type, message, data = null) {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  
  switch(type) {
    case 'success': color = colors.green; break;
    case 'info': color = colors.blue; break;
    case 'warning': color = colors.yellow; break;
    case 'error': color = colors.red; break;
    case 'data': color = colors.cyan; break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function monitorSessionProgress(sessionId, token, duration = 60000) {
  const url = `http://localhost:8000/api/v1/psychology/sessions/${sessionId}/progress/stream?token=${token}`;
  
  log('info', `🔌 Connecting to: ${url}`);
  log('info', `⏱️  Will monitor for ${duration / 1000} seconds...`);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    log('success', '✅ Connected to stream!');
    console.log('');

    const reader = response.body;
    let buffer = '';
    let eventCount = 0;
    let heartbeatCount = 0;
    let progressCount = 0;

    // Set timeout
    const timeout = setTimeout(() => {
      log('info', `⏰ Test duration (${duration / 1000}s) reached. Closing connection...`);
      printSummary();
      process.exit(0);
    }, duration);

    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete events (separated by double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop(); // Keep incomplete event in buffer

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;
        
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

        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          eventCount++;

          if (eventType === 'heartbeat') {
            heartbeatCount++;
            log('info', `💓 Heartbeat ${heartbeatCount}`);
          } else {
            if (parsed.type === 'connected') {
              log('success', '🎯 Initial Connection Event', {
                patient: parsed.data?.patient?.fullName || 'N/A',
                status: parsed.data?.status,
                testType: parsed.data?.testType?.code,
                progress: `${parsed.data?.progress?.answeredCount || 0}/${parsed.data?.progress?.totalQuestions || 0}`,
                percentage: `${parsed.data?.progress?.progressPercentage || 0}%`
              });
            } else if (parsed.type === 'progress') {
              progressCount++;
              
              const progress = parsed.data?.progress || {};
              const timing = parsed.data?.timing || {};
              const cfit = parsed.data?.cfit || {};

              log('data', `📊 Progress Update #${progressCount}`, {
                answered: `${progress.answeredCount}/${progress.totalQuestions}`,
                percentage: `${progress.progressPercentage}%`,
                elapsedTime: formatSeconds(timing.elapsedSeconds),
                currentSubtest: cfit.currentSubtest || 'N/A',
                currentQuestion: cfit.currentQuestionIndex || 0,
                lastActivity: timing.lastActivityAt,
                timers: cfit.subtestTimers ? formatTimers(cfit.subtestTimers) : 'N/A'
              });
            }
          }
          
          console.log(''); // Separator
        } catch (err) {
          log('error', '❌ Failed to parse event:', err.message);
        }
      }
    });

    reader.on('error', (err) => {
      clearTimeout(timeout);
      log('error', '❌ Stream error:', err.message);
      printSummary();
      process.exit(1);
    });

    reader.on('end', () => {
      clearTimeout(timeout);
      log('info', '🔌 Stream ended');
      printSummary();
      process.exit(0);
    });

    function printSummary() {
      console.log('');
      log('info', '📈 Test Summary:');
      console.log(`  - Total events: ${eventCount}`);
      console.log(`  - Heartbeats: ${heartbeatCount}`);
      console.log(`  - Progress updates: ${progressCount}`);
    }

  } catch (err) {
    log('error', '❌ Connection failed:', err.message);
    process.exit(1);
  }
}

function formatSeconds(seconds) {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatTimers(timers) {
  return Object.entries(timers)
    .map(([subtest, seconds]) => `${subtest}: ${formatSeconds(seconds)}`)
    .join(', ');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node test-progress-monitor.js <sessionId> <token> [duration_ms]');
  console.error('');
  console.error('Example:');
  console.error('  node tests/manual/test-progress-monitor.js abc-123 eyJhbGc... 60000');
  process.exit(1);
}

const [sessionId, token, duration] = args;
const monitorDuration = duration ? parseInt(duration) : 60000;

// Start monitoring
monitorSessionProgress(sessionId, token, monitorDuration);
