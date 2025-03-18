
const tokenBlacklist = [];

function addToBlacklist(token) {
  tokenBlacklist.push(token);
}

function isTokenBlacklisted(token) {
  return tokenBlacklist.includes(token);
}

module.exports = {
  addToBlacklist,
  isTokenBlacklisted
};
