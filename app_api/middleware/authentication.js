const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { jwtSecret } = require('../config/security');

async function authenticateJWT(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
  if (!match) return res.status(401).json({ message: 'A Bearer token is required.' });
  let payload;
  try {
    payload = jwt.verify(match[1], jwtSecret(), { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || !Number.isFinite(payload.exp) || typeof payload._id !== 'string' || !/^[a-f\d]{24}$/i.test(payload._id)) throw new Error('Invalid token payload');
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
  try {
    const user = await User.findById(payload._id);
    if (!user) return res.status(401).json({ message: 'User is no longer registered.' });
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(503).json({ message: 'Authentication is unavailable.' });
  }
}

module.exports = { authenticateJWT };
