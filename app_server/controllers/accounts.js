const { cookieOptions } = require('../middleware/session');

async function api(req, route, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${req.socket.localPort}/api${route}`, {
    method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(req.webToken ? { Authorization: `Bearer ${req.webToken}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, ok: response.ok, data: response.status === 204 ? null : await response.json() };
}
function safeReturn(value) {
  return typeof value === 'string' && /^\/(reservations|checkout|travel(?:\/[A-Za-z]{2}\d{3})?)(\?[^\r\n]*)?$/.test(value) ? value : '/travel';
}
function loginPage(req, res) { res.render('account', { title: 'Login | Travlr Getaways', returnUrl: safeReturn(req.query.returnUrl) }); }
function signupPage(req, res) { res.render('account', { title: 'Sign Up | Travlr Getaways', signup: true }); }
async function accountSubmit(req, res, signup = false) {
  const returnUrl = safeReturn(req.body.returnUrl);
  const fail = (status, message) => res.status(status).render('account', { title: `${signup ? 'Sign Up' : 'Login'} | Travlr Getaways`, signup, message, email: typeof req.body.email === 'string' ? req.body.email : '', name: typeof req.body.name === 'string' ? req.body.name : '', returnUrl });
  if (signup && (req.body.password !== req.body.confirmPassword || req.body.agreement !== 'on')) return fail(400, 'Passwords must match, and you must accept the terms and privacy policy.');
  try {
    const result = await api(req, signup ? '/register' : '/login', 'POST', { name: req.body.name, email: req.body.email, password: req.body.password });
    if (!result.ok) return fail(result.status, result.data.message);
    res.cookie('travlr_session', result.data.token, cookieOptions(req));
    res.clearCookie('travlr_csrf', { path: '/' });
    return res.redirect(303, signup ? '/travel' : returnUrl);
  } catch { return fail(503, 'Account services are unavailable. Please try again shortly.'); }
}
function login(req, res) { return accountSubmit(req, res); }
function signup(req, res) { return accountSubmit(req, res, true); }
function logout(req, res) {
  res.clearCookie('travlr_session', { path: '/' }); res.clearCookie('travlr_csrf', { path: '/' }); return res.redirect(303, '/');
}
module.exports = { api, loginPage, signupPage, login, signup, logout };
