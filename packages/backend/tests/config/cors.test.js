const {
  buildAllowedOrigins,
  isOriginAllowed,
  isPrivateNetworkOrigin,
} = require('../../src/config/cors');

describe('CORS config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_ALLOW_PRIVATE_NETWORK;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('allows explicit ALLOWED_ORIGINS in production', () => {
    process.env.ALLOWED_ORIGINS = 'https://app.example.com, http://192.168.1.100:8081';
    expect(isOriginAllowed('https://app.example.com')).toBe(true);
    expect(isOriginAllowed('http://192.168.1.100:8081')).toBe(true);
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });

  test('allows RFC1918 LAN origins when CORS_ALLOW_PRIVATE_NETWORK=true', () => {
    process.env.CORS_ALLOW_PRIVATE_NETWORK = 'true';
    expect(isOriginAllowed('http://192.168.1.100:8081')).toBe(true);
    expect(isOriginAllowed('http://10.0.0.5:8081')).toBe(true);
    expect(isOriginAllowed('https://public-internet.example.com')).toBe(false);
  });

  test('rejects unknown public origins in production', () => {
    expect(isOriginAllowed('https://attacker.example.com')).toBe(false);
  });

  test('detects private network origins', () => {
    expect(isPrivateNetworkOrigin('http://192.168.1.100:8081')).toBe(true);
    expect(isPrivateNetworkOrigin('https://app.example.com')).toBe(false);
  });

  test('buildAllowedOrigins includes FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'http://192.168.1.100:8081';
    const allowed = buildAllowedOrigins();
    expect(allowed.has('http://192.168.1.100:8081')).toBe(true);
  });
});
