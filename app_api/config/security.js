require('./environment');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters. Run npm run setup first.');
  }
  return secret;
}

module.exports = { jwtSecret };
