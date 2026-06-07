const logger = require('./src/utils/logger');

console.log('Testing logger with action field...\n');

// Test security log dengan action
logger.logSecurity('Test security log with action', {
  action: 'TEST_SECURITY_ACTION',
  userId: 123,
  tenantId: 456,
  request: {
    method: 'POST',
    path: '/test',
    ip: '127.0.0.1'
  }
});

// Test audit log dengan action
logger.logAudit('Test audit log with action', {
  action: 'TEST_AUDIT_ACTION',
  userId: 789,
  tenantId: 999
});

// Test without action
logger.logSecurity('Test security log WITHOUT action', {
  userId: 123,
  tenantId: 456
});

console.log('\n✅ Logger test complete. Check logs/security-2025-11-27.log');
