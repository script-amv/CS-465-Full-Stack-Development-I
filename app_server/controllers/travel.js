const fs = require('node:fs');
const path = require('node:path');

// Local mock data is loaded once when the server starts.
const trips = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', 'data', 'trips.json'), 'utf8'
));

const travel = (req, res) => {
  res.render('travel', {
    title: 'Travel | Travlr Getaways',
    trips,
  });
};

module.exports = {
  travel,
};
