async function travel(req, res) {
  const query = new URLSearchParams();
  for (const key of ['location', 'minPrice', 'maxPrice', 'category']) {
    if (typeof req.query[key] === 'string' && req.query[key]) query.set(key, req.query[key]);
  }
  const endpoint = `http://127.0.0.1:${req.socket.localPort}/api/trips?${query}`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    const trips = response.ok && Array.isArray(data) ? data : [];
    const message = response.status === 404
      ? 'No trips are available right now.'
      : response.ok ? null : 'Trips could not be loaded right now.';

    if (!response.ok && response.status !== 404) res.status(response.status === 400 ? 400 : 503);
    const { decorate } = require('./reservations');
    const categories = ['Beaches', 'Cruises', 'Mountains'].map(name => ({ name, selected: name === query.get('category') }));
    return res.render('travel', { title: 'Travel | Travlr Getaways', trips: trips.map(decorate), message: response.status === 400 ? data.message : message, filters: Object.fromEntries(query), categories });
  } catch (error) {
    console.error('Unable to load trips for the travel page:', error);
    return res.status(503).render('travel', {
      title: 'Travel | Travlr Getaways',
      trips: [],
      message: 'Trips could not be loaded right now.',
    });
  }
}

async function detail(req, res) {
  const { api } = require('./accounts');
  const { decorate } = require('./reservations');
  try {
    const result = await api(req, '/trips/' + encodeURIComponent(req.params.tripCode));
    if (!result.ok) return res.status(result.status).render('message', { heading: 'Trip unavailable', message: result.data.message });
    return res.render('trip', { title: `${result.data.name} | Travlr Getaways`, trip: decorate(result.data) });
  } catch { return res.status(503).render('message', { heading: 'Trip unavailable', message: 'Please try again shortly.' }); }
}
module.exports = { travel, detail };
