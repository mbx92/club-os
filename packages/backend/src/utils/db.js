const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const {
  dbQueryDurationMicroseconds,
  dbQueryCounter,
  dbConnectionGauge
} = require('./metrics');

// Pakai .env.test kalau NODE_ENV=test
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

// Create a custom Sequelize instance with query logging for metrics
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false, // Disable default logging
    // Add hooks for query metrics
    hooks: {
      beforeQuery: (options) => {
        // Start timing the query
        options._startTime = Date.now();
      },
      afterQuery: (options) => {
        try {
          // Calculate query duration
          const duration = Date.now() - (options._startTime || Date.now());
          
          // Extract table name from the query
          let tableName = 'unknown';
          if (options && options.model && options.model.tableName) {
            tableName = options.model.tableName;
          } else if (options && options.query && typeof options.query === 'string') {
            const query = options.query;
            
            // Try different patterns to extract table name
            let fromMatch = null;
            
            // For SELECT queries - look for FROM clause
            if (query.toUpperCase().includes('SELECT')) {
              // Skip SELECT keyword itself
              const fromIndex = query.toUpperCase().indexOf('FROM');
              if (fromIndex !== -1) {
                // Get the part after FROM
                const afterFrom = query.substring(fromIndex + 4).trim();
                
                // Extract the first word after FROM (this should be the table name)
                const tableMatch = afterFrom.match(/^([^\s,\(\)]+)/i);
                if (tableMatch && tableMatch[1]) {
                  tableName = tableMatch[1].replace(/["'`]/g, '');
                }
              }
            }
            
            // For INSERT queries
            if (tableName === 'unknown' && query.toUpperCase().includes('INSERT')) {
              const intoIndex = query.toUpperCase().indexOf('INTO');
              if (intoIndex !== -1) {
                const afterInto = query.substring(intoIndex + 4).trim();
                const tableMatch = afterInto.match(/^([^\s,\(\)]+)/i);
                if (tableMatch && tableMatch[1]) {
                  tableName = tableMatch[1].replace(/["'`]/g, '');
                }
              }
            }
            
            // For UPDATE queries
            if (tableName === 'unknown' && query.toUpperCase().includes('UPDATE')) {
              const updateIndex = query.toUpperCase().indexOf('UPDATE');
              if (updateIndex !== -1) {
                const afterUpdate = query.substring(updateIndex + 6).trim();
                const tableMatch = afterUpdate.match(/^([^\s,\(\)]+)/i);
                if (tableMatch && tableMatch[1]) {
                  tableName = tableMatch[1].replace(/["'`]/g, '');
                }
              }
            }
            
            // For DELETE queries
            if (tableName === 'unknown' && query.toUpperCase().includes('DELETE')) {
              const fromIndex = query.toUpperCase().indexOf('FROM');
              if (fromIndex !== -1) {
                const afterFrom = query.substring(fromIndex + 4).trim();
                const tableMatch = afterFrom.match(/^([^\s,\(\)]+)/i);
                if (tableMatch && tableMatch[1]) {
                  tableName = tableMatch[1].replace(/["'`]/g, '');
                }
              }
            }
            
            // Validate that we didn't capture a SQL keyword
            const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT', 'ON', 'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET'];
            if (sqlKeywords.includes(tableName.toUpperCase())) {
              tableName = 'unknown';
            }
          } else if (options && options.type) {
            // If no query string but we have a type, use that as fallback
            tableName = options.type.toLowerCase();
          }
          
          // Determine operation type
          let operation = 'unknown';
          if (options && options.query && typeof options.query === 'string') {
            const queryUpper = options.query.toUpperCase().trim();
            if (queryUpper.startsWith('SELECT')) operation = 'select';
            else if (queryUpper.startsWith('INSERT')) operation = 'insert';
            else if (queryUpper.startsWith('UPDATE')) operation = 'update';
            else if (queryUpper.startsWith('DELETE')) operation = 'delete';
            else if (queryUpper.startsWith('CREATE')) operation = 'create';
            else if (queryUpper.startsWith('DROP')) operation = 'drop';
            else if (queryUpper.startsWith('ALTER')) operation = 'alter';
            else if (queryUpper.startsWith('TRUNCATE')) operation = 'truncate';
          } else if (options && options.type) {
            // Fallback to Sequelize operation type if available
            operation = options.type.toLowerCase();
          }
          
          // Update metrics
          dbQueryDurationMicroseconds
            .labels(operation, tableName)
            .observe(duration);
            
          dbQueryCounter
            .labels(operation, tableName)
            .inc();
            
          // Debug logging - remove in production
          if (tableName === 'select') {
            console.log('DEBUG - Query:', options.query);
            console.log('DEBUG - Extracted table name:', tableName);
          }
        } catch (err) {
          console.error('Error in database query metrics:', err);
        }
      }
    }
  }
);

// Track connection pool metrics
sequelize.connectionManager.initPools();

// Update connection metrics periodically
setInterval(() => {
  try {
    if (sequelize.connectionManager && sequelize.connectionManager.pool) {
      const pool = sequelize.connectionManager.pool;
      dbConnectionGauge.set(pool.size);
    }
  } catch (err) {
    console.error('Error updating database connection metrics:', err);
  }
}, 5000); // Update every 5 seconds

module.exports = sequelize;
