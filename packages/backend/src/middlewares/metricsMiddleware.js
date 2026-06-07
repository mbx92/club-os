const { 
  httpRequestDurationMicroseconds, 
  httpRequestCounter, 
  urlAccessCounter,
  activeConnectionsGauge 
} = require('../utils/metrics');

// Track active connections
let activeConnections = 0;

// Middleware to collect HTTP request metrics
function metricsMiddleware(req, res, next) {
  // Increment active connections
  activeConnections++;
  activeConnectionsGauge.set(activeConnections);
  
  // Start timer
  const start = Date.now();
  
  // Track when request finishes
  res.on('finish', () => {
    // Decrement active connections
    activeConnections--;
    activeConnectionsGauge.set(activeConnections);
    
    // Calculate request duration
    const duration = Date.now() - start;
    
    // Get route path, fallback to original URL if route path is not available
    const route = req.route ? req.route.path : req.originalUrl;
    
    // Update metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
      
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
      
    urlAccessCounter
      .labels(req.originalUrl, req.method)
      .inc();
  });
  
  next();
}

module.exports = metricsMiddleware;