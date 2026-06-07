const app = require('./app');
const sequelize = require('./utils/db');
const { initializeScheduledJobs } = require('./utils/scheduler');

const PORT = process.env.PORT || 3000;

console.log('Starting server...');
console.log('Database config:', {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected');
    
    // Initialize scheduled jobs
    try {
      initializeScheduledJobs();
      console.log('✅ Scheduled jobs initialized');
    } catch (err) {
      console.error('⚠️  Failed to initialize scheduled jobs:', err.message);
      // Continue without scheduler
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`📍 Network: http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
