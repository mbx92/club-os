const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const requestLogger = require('./middlewares/loggerMiddleware');
const metricsMiddleware = require('./middlewares/metricsMiddleware');
const logger = require('./utils/logger');
const { getClientIp } = require('./utils/requestHelper');
const {
  loggedInUsersGauge,
  loginCounter,
  dbConnectionGauge,
  updateTopUrls
} = require('./utils/metrics');
const { createCorsOptions } = require('./config/cors');

const app = express();
const backendPublicPath = path.join(__dirname, '../public');
const frontendIndexPath = path.join(backendPublicPath, 'index.html');

// Trust proxy - required for correct IP detection behind reverse proxy/load balancer
// Cloudflare → Traefik → App (2 proxies)
app.set('trust proxy', 2);

// Custom morgan token for real client IP (works with Cloudflare, Traefik, nginx)
morgan.token('real-ip', (req) => getClientIp(req));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration - support credentials for SSE streaming
app.use(cors(createCorsOptions()));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Custom format: method url status response-time - real-ip
app.use(morgan(':method :url :status :response-time ms\t-\t:real-ip'));
app.use(requestLogger);
app.use(metricsMiddleware);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from public directory
app.use(express.static(backendPublicPath));

app.use('/api/v1', routes);

// Expose metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const { register } = require('./utils/metrics');
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error(`Error serving metrics: ${err.message}`, {
      error: err.stack,
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip
      }
    });
    res.status(500).json({ message: 'Error serving metrics' });
  }
});

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve SPA routes from the built frontend bundle when available.
app.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return next();
  }

  if (!req.accepts('html')) {
    return next();
  }

  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/uploads/') ||
    req.path === '/metrics' ||
    req.path === '/health'
  ) {
    return next();
  }

  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }

  return next();
});

// Update top URLs metrics periodically (every 5 minutes)
setInterval(() => {
  try {
    updateTopUrls();
  } catch (err) {
    console.error('Error updating top URLs metrics:', err);
  }
}, 5 * 60 * 1000);

// centralized error handler
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

module.exports = app;
