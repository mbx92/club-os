/**
 * Unit tests for requestHelper IP detection
 */

const { getClientIp, isLocalhost, sanitizeIp, getUserAgent } = require('../../src/utils/requestHelper');

describe('requestHelper', () => {
  describe('getClientIp', () => {
    test('should extract IP from X-Forwarded-For header (first IP)', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.168.1.1'
        }
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    test('should extract IP from X-Real-IP header', () => {
      const req = {
        headers: {
          'x-real-ip': '198.51.100.42'
        }
      };
      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    test('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '203.0.113.55'
        }
      };
      expect(getClientIp(req)).toBe('203.0.113.55');
    });

    test('should extract IP from req.ip and remove IPv6 prefix', () => {
      const req = {
        headers: {},
        ip: '::ffff:192.168.1.100'
      };
      expect(getClientIp(req)).toBe('192.168.1.100');
    });

    test('should extract IP from connection.remoteAddress', () => {
      const req = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.50'
        }
      };
      expect(getClientIp(req)).toBe('192.168.1.50');
    });

    test('should return "unknown" when no IP available', () => {
      const req = {
        headers: {}
      };
      expect(getClientIp(req)).toBe('unknown');
    });

    test('should prioritize X-Forwarded-For over other headers', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '198.51.100.1',
          'cf-connecting-ip': '192.168.1.1'
        },
        ip: '10.0.0.1'
      };
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    test('should handle localhost IPv6', () => {
      const req = {
        headers: {},
        ip: '::1'
      };
      expect(getClientIp(req)).toBe('::1');
    });

    test('should handle localhost IPv4', () => {
      const req = {
        headers: {},
        ip: '127.0.0.1'
      };
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('isLocalhost', () => {
    test('should detect 127.0.0.1 as localhost', () => {
      expect(isLocalhost('127.0.0.1')).toBe(true);
    });

    test('should detect ::1 as localhost', () => {
      expect(isLocalhost('::1')).toBe(true);
    });

    test('should detect localhost string', () => {
      expect(isLocalhost('localhost')).toBe(true);
    });

    test('should detect private IP ranges as localhost', () => {
      expect(isLocalhost('192.168.1.1')).toBe(true);
      expect(isLocalhost('10.0.0.1')).toBe(true);
      expect(isLocalhost('172.16.0.1')).toBe(true);
    });

    test('should not detect public IP as localhost', () => {
      expect(isLocalhost('203.0.113.1')).toBe(false);
      expect(isLocalhost('8.8.8.8')).toBe(false);
    });
  });

  describe('sanitizeIp', () => {
    test('should return IP unchanged by default', () => {
      expect(sanitizeIp('203.0.113.1')).toBe('203.0.113.1');
    });

    test('should mask private IPs when maskPrivate=true', () => {
      expect(sanitizeIp('192.168.1.1', true)).toBe('local');
      expect(sanitizeIp('10.0.0.1', true)).toBe('local');
    });

    test('should mask localhost when maskPrivate=true', () => {
      expect(sanitizeIp('127.0.0.1', true)).toBe('local');
      expect(sanitizeIp('::1', true)).toBe('local');
    });

    test('should not mask public IPs even when maskPrivate=true', () => {
      expect(sanitizeIp('203.0.113.1', true)).toBe('203.0.113.1');
    });
  });

  describe('getUserAgent', () => {
    test('should extract user agent from headers', () => {
      const req = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      };
      expect(getUserAgent(req)).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    test('should return "unknown" when no user agent', () => {
      const req = {
        headers: {}
      };
      expect(getUserAgent(req)).toBe('unknown');
    });

    test('should handle req.get() method', () => {
      const req = {
        headers: { 'user-agent': 'TestAgent/1.0' },
        get: (header) => header.toLowerCase() === 'user-agent' ? 'TestAgent/1.0' : undefined
      };
      expect(getUserAgent(req)).toBe('TestAgent/1.0');
    });
  });
});
