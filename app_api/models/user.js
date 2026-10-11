const mongoose = require('mongoose');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');
const pbkdf2 = promisify(crypto.pbkdf2);
const iterations = 210000;

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  hash: { type: String, required: true, select: false },
  salt: { type: String, required: true, select: false },
});

userSchema.methods.setPassword = async function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = (await pbkdf2(password, this.salt, iterations, 64, 'sha512')).toString('hex');
};
userSchema.methods.validPassword = async function(password) {
  if (!this.salt || !this.hash) return false;
  const actual = await pbkdf2(password, this.salt, iterations, 64, 'sha512');
  const expected = Buffer.from(this.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
userSchema.methods.generateJWT = function() {
  return jwt.sign({ _id: String(this._id), email: this.email, name: this.name }, jwtSecret(), { algorithm: 'HS256', expiresIn: '1h' });
};

module.exports = mongoose.model('users', userSchema);
