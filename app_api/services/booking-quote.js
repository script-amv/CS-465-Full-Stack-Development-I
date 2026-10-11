const { createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');

function fingerprint(trip) {
  return createHash('sha256').update(JSON.stringify([
    String(trip._id), trip.code, trip.name, trip.length, new Date(trip.start).toISOString(),
    trip.resort, trip.location || '', trip.perPerson, trip.image, trip.description,
  ])).digest('hex');
}
function issueQuote(trip, customer, travellers) {
  return jwt.sign({ kind: 'booking-quote', customer: String(customer), code: trip.code, travellers, version: fingerprint(trip) }, jwtSecret(), { algorithm: 'HS256', expiresIn: '10m', audience: 'travlr-checkout' });
}
function checkQuote(token, trip, customer, travellers) {
  let review;
  try { review = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'], audience: 'travlr-checkout' }); }
  catch (error) { return error.name === 'TokenExpiredError' ? 'expired' : 'invalid'; }
  if (review.kind !== 'booking-quote' || review.customer !== String(customer) || review.code !== trip.code || review.travellers !== travellers) return 'invalid';
  return review.version === fingerprint(trip) ? 'valid' : 'changed';
}
module.exports = { issueQuote, checkQuote };
