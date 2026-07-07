const jwt = require('jsonwebtoken');
require('dotenv').config();

// RBAC-13: a hardcoded fallback secret means anyone who reads this source
// file (it's a public-ish constant, not a real secret) can forge valid JWTs
// for ANY tenant/user if an operator ever forgets to set the env var in
// production. Fail fast instead of silently running with a known secret.
const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(envVar, devFallback) {
  const value = process.env[envVar];
  if (value) return value;

  if (isProduction) {
    throw new Error(
      `[jwt] Missing required environment variable "${envVar}" in production. ` +
      'Refusing to start with a hardcoded fallback secret.'
    );
  }

  return devFallback;
}

const JWT_SECRET = requireSecret('JWT_SECRET', 'dev-only-insecure-secret');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_SECRET = requireSecret('REFRESH_TOKEN_SECRET', 'dev-only-insecure-refresh-secret');
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const OPERATOR_TOKEN_SECRET = process.env.OPERATOR_JWT_SECRET || (JWT_SECRET + '_operator');
const OPERATOR_TOKEN_EXPIRES_IN = process.env.OPERATOR_JWT_EXPIRES_IN || '8h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

function generateOperatorToken(payload) {
  return jwt.sign(payload, OPERATOR_TOKEN_SECRET, { expiresIn: OPERATOR_TOKEN_EXPIRES_IN });
}

function verifyOperatorToken(token) {
  return jwt.verify(token, OPERATOR_TOKEN_SECRET);
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateOperatorToken,
  verifyOperatorToken
};
