const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

const app = express();

// Trust proxy - required for correct IP detection behind reverse proxy/load balancer
// Cloudflare → Traefik → App (2 proxies)
app.set('trust proxy', 2);

// Custom morgan token for real client IP (works with Cloudflare, Traefik, nginx)
morgan.token('real-ip', (req) => getClientIp(req));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration - support credentials for SSE streaming
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];

    // Also allow from environment variable
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, origin);
    } else {
      callback(null, origin); // Allow all in production too, but with specific origin
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-client-ip',
    'x-client-name',
    'x-tenant-id'
  ],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  maxAge: 86400 // 24 hours - cache preflight requests
};
app.use(cors(corsOptions));

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
app.use(express.static(path.join(__dirname, '../public')));

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
