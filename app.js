const express = require('express');
const hbs = require('hbs');
const path = require('path');
const { jwtSecret } = require('./app_api/config/security');
const passport = require('./app_api/config/passport');
const apiRouter = require('./app_api/routes/index');
const { connectDatabase } = require('./app_api/models/db');
const indexRouter = require('./app_server/routes/index');
const travelRouter = require('./app_server/routes/travel');
const accountRouter = require('./app_server/routes/accounts');
const { sessionContext } = require('./app_server/middleware/session');

const app = express();
const port = process.env.PORT || 3000;
const adminOrigins = new Set(['http://localhost:4200', 'http://127.0.0.1:4200']);

app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'app_server', 'views', 'partials'));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(sessionContext);
app.use('/api', (req, res, next) => {
  if (adminOrigins.has(req.headers.origin)) {
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use('/', indexRouter);
app.use('/travel', travelRouter);
app.use('/', accountRouter);
app.get('/index.html', (req, res) => res.redirect('/'));
// Old HTML links also reach the dynamic trip listing.
app.get('/travel.html', (req, res) => res.redirect('/travel'));
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));

if (require.main === module) {
  jwtSecret();
  connectDatabase().then(() => {
    app.listen(port, () => {
      console.log(`Travlr Getaways is running at http://localhost:${port}`);
    });
  }).catch(() => {
    console.error('Travlr Getaways was not started because MongoDB is unavailable.');
    process.exitCode = 1;
  });
}

module.exports = app;
