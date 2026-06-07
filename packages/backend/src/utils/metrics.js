const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label to all metrics
register.setDefaultLabels({ app: 'gym-membership-api' });

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics for the application

// 1. Metrics for logged-in users
const loggedInUsersGauge = new client.Gauge({
  name: 'app_logged_in_users_total',
  help: 'Total number of currently logged-in users',
  labelNames: ['tenant', 'role'],
  registers: [register]
});

const loginCounter = new client.Counter({
  name: 'app_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status', 'tenant'], // status: 'success' or 'failed'
  registers: [register]
});

// 2. Metrics for server activity
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'app_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets for response time from 0.1ms to 1s
  buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000],
  registers: [register]
});

const httpRequestCounter = new client.Counter({
  name: 'app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const activeConnectionsGauge = new client.Gauge({
  name: 'app_active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// 3. Metrics for database
const dbQueryDurationMicroseconds = new client.Histogram({
  name: 'app_db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['operation', 'table'],
  buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000],
  registers: [register]
});

const dbQueryCounter = new client.Counter({
  name: 'app_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table'],
  registers: [register]
});

const dbConnectionGauge = new client.Gauge({
  name: 'app_db_connections',
  help: 'Number of active database connections',
  registers: [register]
});

// 4. Metrics for top accessed URLs
const urlAccessCounter = new client.Counter({
  name: 'app_url_access_total',
  help: 'Total number of accesses to each URL',
  labelNames: ['url', 'method'],
  registers: [register]
});

const topUrlsGauge = new client.Gauge({
  name: 'app_top_urls_access_count',
  help: 'Access count for top 5 URLs',
  labelNames: ['url', 'method', 'rank'],
  registers: [register]
});

// Helper function to update top URLs gauge
function updateTopUrls() {
  try {
    // This function is called periodically to update the top URLs gauge
    // In a real implementation, you would get this data from your urlAccessCounter
    
    // Reset the top URLs gauge
    topUrlsGauge.reset();
    
    // Get all metrics from the registry
    const metric = register.getSingleMetric('app_url_access_total');
    const urlCounts = [];
    
    // Check if metric exists and has values
    if (metric && metric.hashMap) {
      // Convert hashMap to array. In prom-client v13+ hashMap is a plain object,
      // so it may not have an `entries` method. Use entries() when available
      // (e.g., Map), otherwise fall back to Object.entries.
      const metrics =
        metric.hashMap && typeof metric.hashMap.entries === 'function'
          ? Array.from(metric.hashMap.entries())
          : Object.entries(metric.hashMap || {});
      
      // Extract URL access counts
      metrics.forEach(([key, metricData]) => {
        try {
          if (metricData && metricData.values) {
            metricData.values.forEach(value => {
              if (value.labels && value.labels.url) {
                urlCounts.push({
                  url: value.labels.url,
                  method: value.labels.method || 'GET',
                  count: value.value
                });
              }
            });
          }
        } catch (err) {
          console.error('Error processing metric:', err);
        }
      });
    }
    
    // Sort by count in descending order
    urlCounts.sort((a, b) => b.count - a.count);
    
    // Update top URLs gauge with top 5 URLs
    const topUrls = urlCounts.slice(0, 5);
    topUrls.forEach((urlData, index) => {
      try {
        topUrlsGauge.set(
          {
            url: urlData.url,
            method: urlData.method,
            rank: (index + 1).toString()
          },
          urlData.count
        );
      } catch (err) {
        console.error('Error updating top URLs gauge:', err);
      }
    });
  } catch (err) {
    console.error('Error in updateTopUrls:', err);
  }
}

// Export all metrics and the registry
module.exports = {
  register,
  loggedInUsersGauge,
  loginCounter,
  httpRequestDurationMicroseconds,
  httpRequestCounter,
  activeConnectionsGauge,
  dbQueryDurationMicroseconds,
  dbQueryCounter,
  dbConnectionGauge,
  urlAccessCounter,
  topUrlsGauge,
  updateTopUrls
};