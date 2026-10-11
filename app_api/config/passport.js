const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+hash +salt');
    if (!user || !user.active || !await user.validPassword(password)) {
      return done(null, false, { message: 'Invalid email or password.' });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

module.exports = passport;
