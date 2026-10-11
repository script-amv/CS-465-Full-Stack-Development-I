const router = require('express').Router();
const accounts = require('../controllers/accounts');
const reservations = require('../controllers/reservations');
const { csrfProtection, requireLogin } = require('../middleware/session');

router.get('/login', accounts.loginPage);
router.post('/login', csrfProtection, accounts.login);
router.get('/signup', accounts.signupPage);
router.post('/signup', csrfProtection, accounts.signup);
router.post('/logout', csrfProtection, accounts.logout);
router.get('/checkout', requireLogin, reservations.checkout);
router.post('/checkout', requireLogin, csrfProtection, reservations.book);
router.get('/reservations', requireLogin, reservations.list);
router.post('/reservations/:reservationId/cancel', requireLogin, csrfProtection, reservations.cancel);
router.get('/admin', (req, res) => res.redirect(`http://${req.hostname}:4200/login`));
router.get('/policy', (req, res) => res.render('message', { title: 'Terms and Privacy | Travlr Getaways', heading: 'Terms and privacy', message: 'Reservations record your selected package, dates, party size, and agreed price. No online payment is collected. Your name and email are used to manage your account and bookings. Only you and authorized Travlr staff can view your reservation records.' }));
router.get('/account-help', (req, res) => res.render('message', { title: 'Account Help | Travlr Getaways', heading: 'Account help', message: 'If you cannot access your account, contact the Travlr agency to arrange account support. Password reset by email is not available on this site.' }));
module.exports = router;
