const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

// Load base `.env` first (if present), then override with env-specific file
dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
      useUTC: false,
      dateStrings: true,
      typeCast: true
    }
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
      useUTC: false,
      dateStrings: true,
      typeCast: true
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
    timezone: '+07:00',
    dialectOptions: {
      useUTC: false,
      dateStrings: true,
      typeCast: true
    }
  }
};
