const pool = require('../config/data_base');
const jwt = require('jsonwebtoken');

async function addToBlacklist(token, userId, expiresAt) {
  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Store the token hash in the database
    const query = `
      INSERT INTO jwt_blacklist (token_hash, user_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token_hash) DO NOTHING
    `;
    await pool.query(query, [tokenValue, userId, expiresAt]);
    
    // Optionally clean up expired tokens
    cleanupExpiredTokens();
    
    return true;
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
    return false;
  }
}

async function isTokenBlacklisted(token) {
  try {
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    const query = `
      SELECT EXISTS(SELECT 1 FROM jwt_blacklist WHERE token_hash = $1) AS is_blacklisted
    `;
    const { rows } = await pool.query(query, [tokenValue]);
    return rows[0].is_blacklisted;
  } catch (error) {
    console.error('Error checking token in blacklist:', error);
    return false; // Default to not blacklisted on error (safer to validate token)
  }
}

// Cleanup function to remove expired tokens
async function cleanupExpiredTokens() {
  try {
    const query = `
      DELETE FROM jwt_blacklist
      WHERE expires_at < NOW()
    `;
    await pool.query(query);
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}

module.exports = {
  addToBlacklist,
  isTokenBlacklisted,
  cleanupExpiredTokens
};
