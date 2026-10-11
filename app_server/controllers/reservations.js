const { api } = require('./accounts');
const decorate = trip => ({ ...trip, dateLabel: new Date(trip.start).toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'long' }), priceLabel: Number(trip.perPerson).toFixed(2) });

async function checkout(req, res) {
  const code = typeof req.query.tripCode === 'string' ? req.query.tripCode : '';
  const travellers = /^\d+$/.test(req.query.travellers || '') ? Number(req.query.travellers) : 1;
  try {
    const result = await api(req, '/trips/' + encodeURIComponent(code) + '/quote?travellers=' + Math.max(1, Math.min(20, travellers)));
    if (!result.ok) return res.status(result.status).render('message', { title: 'Checkout | Travlr Getaways', heading: 'Trip unavailable', message: result.data.message });
    return res.render('checkout', { title: 'Checkout | Travlr Getaways', trip: decorate(result.data.trip), travellers: result.data.travellers, totalLabel: result.data.total.toFixed(2), quote: result.data.quote });
  } catch { return res.status(503).render('message', { heading: 'Checkout unavailable', message: 'Please try again shortly.' }); }
}
async function book(req, res) {
  const travellers = typeof req.body.travellers === 'string' && /^\d+$/.test(req.body.travellers) ? Number(req.body.travellers) : 0;
  try {
    const result = await api(req, '/reservations', 'POST', { tripCode: req.body.tripCode, travellers, quote: req.body.quote });
    if (!result.ok) return res.status(result.status).render('message', { title: 'Reservation | Travlr Getaways', heading: 'Reservation not saved', message: result.data.message });
    return res.redirect(303, '/reservations?booked=' + result.data._id);
  } catch { return res.status(503).render('message', { heading: 'Reservation unavailable', message: 'Your reservation was not confirmed. Please check your reservations before trying again.' }); }
}
async function list(req, res) {
  try {
    const result = await api(req, '/me/reservations');
    if (!result.ok) return res.status(result.status).render('message', { heading: 'Reservations unavailable', message: result.data.message });
    const reservations = result.data.map(record => ({ ...record, trip: decorate(record.trip), totalLabel: record.total.toFixed(2), confirmed: record.status === 'confirmed' }));
    return res.render('reservations', { title: 'My Reservations | Travlr Getaways', reservations, booked: /^[a-f\d]{24}$/i.test(req.query.booked || '') });
  } catch { return res.status(503).render('message', { heading: 'Reservations unavailable', message: 'Please try again shortly.' }); }
}
async function cancel(req, res) {
  try {
    const result = await api(req, '/reservations/' + encodeURIComponent(req.params.reservationId), 'PUT', { status: 'cancelled' });
    if (!result.ok) return res.status(result.status).render('message', { heading: 'Cancellation not saved', message: result.data.message });
    return res.redirect(303, '/reservations');
  } catch { return res.status(503).render('message', { heading: 'Cancellation unavailable', message: 'Please check your reservations before trying again.' }); }
}
module.exports = { checkout, book, list, cancel, decorate };
