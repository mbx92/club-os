/**
 * Password Generator Utility
 * Generates secure random passwords for auto-created admin accounts
 */

const crypto = require('crypto');

/**
 * Generate a secure random password
 * @param {Object} options - Password generation options
 * @param {number} options.length - Length of the password (default: 16)
 * @param {boolean} options.includeUppercase - Include uppercase letters (default: true)
 * @param {boolean} options.includeLowercase - Include lowercase letters (default: true)
 * @param {boolean} options.includeNumbers - Include numbers (default: true)
 * @param {boolean} options.includeSymbols - Include special symbols (default: true)
 * @returns {string} Generated password
 */
function generatePassword(options = {}) {
  const {
    length = parseInt(process.env.PASSWORD_LENGTH) || 16,
    includeUppercase = process.env.PASSWORD_INCLUDE_UPPERCASE !== 'false',
    includeLowercase = process.env.PASSWORD_INCLUDE_LOWERCASE !== 'false',
    includeNumbers = process.env.PASSWORD_INCLUDE_NUMBERS !== 'false',
    includeSymbols = process.env.PASSWORD_INCLUDE_SYMBOLS !== 'false',
  } = options;

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = '';
  let password = '';
  const guaranteedChars = [];

  // Build charset and ensure at least one character from each enabled category
  if (includeUppercase) {
    charset += uppercase;
    guaranteedChars.push(uppercase[crypto.randomInt(0, uppercase.length)]);
  }
  if (includeLowercase) {
    charset += lowercase;
    guaranteedChars.push(lowercase[crypto.randomInt(0, lowercase.length)]);
  }
  if (includeNumbers) {
    charset += numbers;
    guaranteedChars.push(numbers[crypto.randomInt(0, numbers.length)]);
  }
  if (includeSymbols) {
    charset += symbols;
    guaranteedChars.push(symbols[crypto.randomInt(0, symbols.length)]);
  }

  if (charset.length === 0) {
    throw new Error('At least one character set must be enabled for password generation');
  }

  // Generate remaining random characters
  const remainingLength = length - guaranteedChars.length;
  for (let i = 0; i < remainingLength; i++) {
    password += charset[crypto.randomInt(0, charset.length)];
  }

  // Combine guaranteed chars with random chars and shuffle
  const allChars = guaranteedChars.concat(password.split(''));
  const shuffled = allChars.sort(() => crypto.randomInt(0, 2) - 0.5);

  return shuffled.join('');
}

/**
 * Get the password for a new admin account
 * Returns auto-generated password if SMTP is enabled, otherwise returns default password
 * @returns {string} Password for the admin account
 */
function getAdminPassword() {
  const enableAutoGenerate = process.env.ENABLE_AUTO_PASSWORD_GENERATE === 'true';
  
  if (enableAutoGenerate) {
    return generatePassword();
  }
  
  return process.env.DEFAULT_ADMIN_PASSWORD || 'password123';
}

module.exports = {
  generatePassword,
  getAdminPassword,
};
