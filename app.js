const express = require('express');
const hbs = require('hbs');
const path = require('path');
const apiRouter = require('./app_api/routes/index');
const { connectDatabase } = require('./app_server/models/db');
const indexRouter = require('./app_server/routes/index');
const travelRouter = require('./app_server/routes/travel');

const app = express();
const port = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'app_server', 'views', 'partials'));

app.use('/', indexRouter);
app.use('/travel', travelRouter);
// Old HTML links also reach the dynamic trip listing.
app.get('/travel.html', (req, res) => res.redirect('/travel'));
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));

if (require.main === module) {
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
