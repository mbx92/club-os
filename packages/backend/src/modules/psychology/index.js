'use strict';

/**
 * Psychology Module
 * 
 * Modular structure for psychological testing system.
 * Supports PAPI Kostick, EPPS, and other standardized tests.
 * 
 * Features:
 * - Dynamic test types (admin can add via JSON paste)
 * - Package & Price management
 * - QR-based access tokens for candidates
 * - Hybrid scoring (frontend preview, backend verify)
 * - Print-friendly result pages
 */

const controllers = require('./controllers');
const services = require('./services');
const routes = require('./routes');
const validators = require('./validators');

module.exports = {
  controllers,
  services,
  routes,
  validators,
  
  // Module metadata
  name: 'psychology',
  version: '1.0.0',
  description: 'Psychology testing module (PAPI, EPPS, etc.)',
  
  // Feature flag name for subscription checks
  featureFlag: 'psychology',
  
  // Required subscription plan features
  requiredFeatures: ['modules.psychology']
};
