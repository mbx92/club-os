const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'supersecretrefresh';
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
