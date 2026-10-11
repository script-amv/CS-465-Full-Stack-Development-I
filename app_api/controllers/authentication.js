const passport = require('passport');
const User = require('../models/user');
const { jwtSecret } = require('../config/security');

function credentials(body, registration = false) {
  if (typeof body?.email !== 'string' || typeof body?.password !== 'string') return false;
  const email = body.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !body.password || body.password.length > 128) return false;
  return !registration || (typeof body.name === 'string' && body.name.trim().length > 0 && body.name.trim().length <= 100 && body.password.length >= 12);
}

async function register(req, res) {
  if (!credentials(req.body, true)) return res.status(400).json({ message: 'Provide a name, valid email, and password of 12 to 128 characters.' });
  try {
    jwtSecret();
    const user = new User({ name: req.body.name, email: req.body.email });
    await user.setPassword(req.body.password);
    await user.save();
    return res.status(201).json({ token: user.generateJWT() });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered.' });
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Invalid registration data.' });
    console.error('Registration failed:', error.message);
    return res.status(500).json({ message: 'Registration is unavailable.' });
  }
}

function login(req, res, next) {
  if (!credentials(req.body)) return res.status(400).json({ message: 'Provide a valid email and password.' });
  return passport.authenticate('local', { session: false }, (error, user, info) => {
    if (error) return res.status(500).json({ message: 'Login is unavailable.' });
    if (!user) return res.status(401).json(info);
    try {
      return res.status(200).json({ token: user.generateJWT() });
    } catch (error) {
      return res.status(500).json({ message: 'Login is unavailable.' });
    }
  })(req, res, next);
}

module.exports = { register, login };
