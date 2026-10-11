const { randomBytes, createHmac, timingSafeEqual } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../app_api/config/security');
const User = require('../../app_api/models/user');

function cookies(req) {
  const parsed = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const split = part.indexOf('=');
    if (split < 0) continue;
    try { parsed[part.slice(0, split).trim()] = decodeURIComponent(part.slice(split + 1)); } catch {}
  }
  return parsed;
}
function cookieOptions(req) {
  return { httpOnly: true, sameSite: 'lax', secure: req.secure || process.env.NODE_ENV === 'production', maxAge: 3600000, path: '/' };
}
function signature(nonce, token) { return createHmac('sha256', jwtSecret()).update(nonce + '.' + (token || 'anonymous')).digest('hex'); }

async function sessionContext(req, res, next) {
  if (!/^\/(?:$|travel(?:\/|$)|(?:login|signup|logout|checkout|policy|account-help|admin)\/?$|reservations(?:\/|$))/i.test(req.path)) return next();
  const jar = cookies(req);
  req.webToken = jar.travlr_session || '';
  try {
    if (req.webToken) {
      const payload = jwt.verify(req.webToken, jwtSecret(), { algorithms: ['HS256'] });
      if (typeof payload._id !== 'string' || !/^[a-f\d]{24}$/i.test(payload._id)) throw new Error('Invalid identity');
      const user = await User.findById(payload._id);
      if (!user?.active) throw new Error('Inactive user');
      req.webUser = { _id: String(user._id), name: user.name, email: user.email, role: user.role };
    }
  } catch {
    req.webToken = '';
    res.clearCookie('travlr_session', { path: '/' });
  }
  let csrf = jar.travlr_csrf || '';
  if (!/^[a-f\d]{64}-[a-f\d]{64}$/.test(csrf) || csrf.slice(65) !== signature(csrf.slice(0, 64), req.webToken)) {
    const nonce = randomBytes(32).toString('hex');
    csrf = nonce + '-' + signature(nonce, req.webToken);
    res.cookie('travlr_csrf', csrf, cookieOptions(req));
  }
  req.csrfToken = csrf;
  res.locals.csrfToken = csrf;
  res.locals.user = req.webUser;
  res.locals.isAdmin = req.webUser?.role === 'admin';
  return next();
}
function csrfProtection(req, res, next) {
  const submitted = req.body?._csrf;
  if (typeof submitted !== 'string' || !/^[a-f\d]{64}-[a-f\d]{64}$/.test(submitted) || typeof req.csrfToken !== 'string' || !/^[a-f\d]{64}-[a-f\d]{64}$/.test(req.csrfToken) || !timingSafeEqual(Buffer.from(submitted), Buffer.from(req.csrfToken))) {
    return res.status(403).render('message', { title: 'Request expired | Travlr Getaways', heading: 'Please try again', message: 'The form expired or could not be verified. Open the page again before submitting.' });
  }
  return next();
}
function requireLogin(req, res, next) {
  if (req.webUser) return next();
  return res.redirect('/login?returnUrl=' + encodeURIComponent(req.originalUrl));
}
module.exports = { sessionContext, csrfProtection, requireLogin, cookieOptions };
