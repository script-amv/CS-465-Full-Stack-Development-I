const Reservation = require('../models/reservation');
const Trip = require('../models/travlr');
const { issueQuote, checkQuote } = require('../services/booking-quote');

function visible(req) {
  return req.user.role === 'admin' ? {} : { customer: req.user._id };
}
function validId(id) { return /^[a-f\d]{24}$/i.test(id || ''); }

async function quoteReservation(req, res) {
  const code = req.params.tripCode;
  const count = req.query.travellers === undefined ? '1' : req.query.travellers;
  if (!/^[A-Za-z]{2}\d{3}$/.test(code) || typeof count !== 'string' || !/^\d+$/.test(count) || Number(count) < 1 || Number(count) > 20) return res.status(400).json({ message: 'Choose a valid trip and 1 to 20 travellers.' });
  try {
    const trip = await Trip.findOne({ code: code.toUpperCase() }).lean();
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    if (trip.start <= new Date()) return res.status(400).json({ message: 'This trip has already departed.' });
    const travellers = Number(count);
    return res.json({ trip, travellers, total: Math.round(trip.perPerson * 100) * travellers / 100, quote: issueQuote(trip, req.user._id, travellers) });
  } catch { return res.status(500).json({ message: 'The reservation review could not be loaded.' }); }
}

async function createReservation(req, res) {
  const { tripCode, travellers } = req.body || {};
  if (typeof tripCode !== 'string' || !/^[A-Za-z]{2}\d{3}$/.test(tripCode) || !Number.isInteger(travellers) || travellers < 1 || travellers > 20) {
    return res.status(400).json({ message: 'Choose a valid trip and 1 to 20 travellers.' });
  }
  try {
    const trip = await Trip.findOne({ code: tripCode.toUpperCase() }).lean();
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    if (trip.start <= new Date()) return res.status(400).json({ message: 'This trip has already departed.' });
    if (typeof req.body.quote !== 'string' || req.body.quote.length > 4096) return res.status(400).json({ message: 'Review the trip at checkout before booking.' });
    const review = checkQuote(req.body.quote, trip, req.user._id, travellers);
    if (review === 'invalid') return res.status(400).json({ message: 'The reservation review could not be verified. Open checkout again.' });
    if (review !== 'valid') return res.status(409).json({ message: 'The trip changed or your review expired. Open checkout again and review the current price and itinerary before confirming.' });
    const reservation = await Reservation.create({
      customer: req.user._id, tripCode: trip.code,
      trip: { name: trip.name, length: trip.length, start: trip.start, resort: trip.resort, location: trip.location, perPerson: trip.perPerson, image: trip.image, description: trip.description },
      travellers, total: Math.round(trip.perPerson * 100) * travellers / 100,
    });
    return res.status(201).json(reservation);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a confirmed reservation for this trip.' });
    return res.status(500).json({ message: 'The reservation could not be saved.' });
  }
}
async function myReservations(req, res) {
  try { return res.json(await Reservation.find({ customer: req.user._id }).sort({ 'trip.start': 1 }).lean()); }
  catch { return res.status(500).json({ message: 'Reservations could not be loaded.' }); }
}
async function listReservations(req, res) {
  try { return res.json(await Reservation.find().populate('customer', 'name email').sort({ 'trip.start': 1 }).lean()); }
  catch { return res.status(500).json({ message: 'Reservations could not be loaded.' }); }
}
async function getReservation(req, res) {
  if (!validId(req.params.reservationId)) return res.status(400).json({ message: 'Invalid reservation ID.' });
  try {
    const reservation = await Reservation.findOne({ _id: req.params.reservationId, ...visible(req) }).lean();
    return reservation ? res.json(reservation) : res.status(404).json({ message: 'Reservation not found.' });
  } catch { return res.status(500).json({ message: 'Reservation could not be loaded.' }); }
}
async function updateReservation(req, res) {
  if (!validId(req.params.reservationId)) return res.status(400).json({ message: 'Invalid reservation ID.' });
  const status = req.body?.status;
  if (!['confirmed', 'cancelled'].includes(status) || (req.user.role !== 'admin' && status !== 'cancelled')) return res.status(400).json({ message: 'Invalid reservation status.' });
  try {
    const reservation = await Reservation.findOneAndUpdate({ _id: req.params.reservationId, ...visible(req) }, { status }, { new: true, runValidators: true });
    return reservation ? res.json(reservation) : res.status(404).json({ message: 'Reservation not found.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Another confirmed reservation already exists.' });
    return res.status(500).json({ message: 'Reservation could not be updated.' });
  }
}
module.exports = { quoteReservation, createReservation, myReservations, listReservations, getReservation, updateReservation };
