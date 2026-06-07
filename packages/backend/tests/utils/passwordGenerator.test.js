/**
 * Unit Tests for Password Generator Utility
 */

const { generatePassword, getAdminPassword } = require('../../src/utils/passwordGenerator');

describe('Password Generator Utility', () => {
  describe('generatePassword', () => {
    it('should generate password with default length', () => {
      const password = generatePassword();
      expect(password).toBeDefined();
      expect(password.length).toBeGreaterThanOrEqual(16);
    });

    it('should generate password with custom length', () => {
      const password = generatePassword({ length: 20 });
      expect(password.length).toBe(20);
    });

    it('should include uppercase letters when enabled', () => {
      const password = generatePassword({
        length: 100,
        includeUppercase: true,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false
      });
      expect(password).toMatch(/[A-Z]/);
      expect(password).not.toMatch(/[a-z]/);
      expect(password).not.toMatch(/[0-9]/);
    });

    it('should include lowercase letters when enabled', () => {
      const password = generatePassword({
        length: 100,
        includeUppercase: false,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false
      });
      expect(password).toMatch(/[a-z]/);
      expect(password).not.toMatch(/[A-Z]/);
      expect(password).not.toMatch(/[0-9]/);
    });

    it('should include numbers when enabled', () => {
      const password = generatePassword({
        length: 100,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: true,
        includeSymbols: false
      });
      expect(password).toMatch(/[0-9]/);
      expect(password).not.toMatch(/[a-zA-Z]/);
    });

    it('should include symbols when enabled', () => {
      const password = generatePassword({
        length: 100,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: true
      });
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
      expect(password).not.toMatch(/[a-zA-Z0-9]/);
    });

    it('should throw error when no character set is enabled', () => {
      expect(() => {
        generatePassword({
          includeUppercase: false,
          includeLowercase: false,
          includeNumbers: false,
          includeSymbols: false
        });
      }).toThrow('At least one character set must be enabled');
    });

    it('should generate different passwords on each call', () => {
      const password1 = generatePassword();
      const password2 = generatePassword();
      expect(password1).not.toBe(password2);
    });

    it('should ensure at least one character from each enabled set', () => {
      const password = generatePassword({
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true
      });

      expect(password).toMatch(/[A-Z]/); // At least one uppercase
      expect(password).toMatch(/[a-z]/); // At least one lowercase
      expect(password).toMatch(/[0-9]/); // At least one number
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // At least one symbol
    });
  });

  describe('getAdminPassword', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return default password when auto-generate is disabled', () => {
      process.env.ENABLE_AUTO_PASSWORD_GENERATE = 'false';
      process.env.DEFAULT_ADMIN_PASSWORD = 'test123';
      
      const password = getAdminPassword();
      expect(password).toBe('test123');
    });

    it('should return auto-generated password when enabled', () => {
      process.env.ENABLE_AUTO_PASSWORD_GENERATE = 'true';
      
      const password = getAdminPassword();
      expect(password).toBeDefined();
      expect(password.length).toBeGreaterThanOrEqual(16);
    });

    it('should return fallback password when DEFAULT_ADMIN_PASSWORD is not set', () => {
      process.env.ENABLE_AUTO_PASSWORD_GENERATE = 'false';
      delete process.env.DEFAULT_ADMIN_PASSWORD;
      
      const password = getAdminPassword();
      expect(password).toBe('password123');
    });
  });
});
