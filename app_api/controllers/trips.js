const Trip = require('../models/travlr');
const Reservation = require('../models/reservation');
const tripFields = ['code', 'name', 'length', 'start', 'resort', 'perPerson', 'image', 'description', 'location', 'category'];

function tripPayload(body) {
  return Object.fromEntries(tripFields.filter(field => body?.[field] !== undefined)
    .map(field => [field, body[field]]));
}

function tripCode(param) {
  const code = String(param || '').toUpperCase();
  return /^[A-Z]{2}\d{3}$/.test(code) ? code : null;
}

function writeError(res, error) {
  if (error.code === 11000) return res.status(409).json({ message: 'Trip code already exists.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }
  console.error('Unable to save trip:', error);
  return res.status(500).json({ message: 'Unable to save trip.' });
}

async function tripsList(req, res) {
  const allowed = ['location', 'minPrice', 'maxPrice', 'category'];
  if (Object.keys(req.query).some(key => !allowed.includes(key)) || Object.values(req.query).some(v => typeof v !== 'string')) return res.status(400).json({ message: 'Invalid search filters.' });
  const query = {};
  const location = (req.query.location || '').trim();
  if (location.length > 100) return res.status(400).json({ message: 'Location is too long.' });
  if (location) {
    const literal = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = ['location', 'resort', 'name'].map(field => ({ [field]: { $regex: literal, $options: 'i' } }));
  }
  const min = req.query.minPrice ? Number(req.query.minPrice) : 0;
  const max = req.query.maxPrice ? Number(req.query.maxPrice) : Infinity;
  if (!Number.isFinite(min) || min < 0 || max < min || (req.query.maxPrice && !Number.isFinite(max))) return res.status(400).json({ message: 'Enter valid minimum and maximum prices.' });
  if (req.query.minPrice || req.query.maxPrice) query.perPerson = { $gte: min, ...(Number.isFinite(max) ? { $lte: max } : {}) };
  if (req.query.category) {
    if (!['Beaches', 'Cruises', 'Mountains'].includes(req.query.category)) return res.status(400).json({ message: 'Invalid trip category.' });
    query.category = req.query.category;
  }
  try {
    const trips = await Trip.find(query).sort({ start: 1 }).lean();
    if (!trips.length && !Object.keys(req.query).length) return res.status(404).json({ message: 'No trips found.' });
    return res.status(200).json(trips);
  } catch (error) {
    console.error('Unable to retrieve trips:', error);
    return res.status(500).json({ message: 'Unable to retrieve trips.' });
  }
}

async function tripsFindByCode(req, res) {
  const code = tripCode(req.params.tripCode);
  if (!code) {
    return res.status(400).json({ message: 'Invalid trip code.' });
  }

  try {
    const trips = await Trip.find({ code }).limit(1).lean();
    if (!trips.length) return res.status(404).json({ message: 'Trip not found.' });
    return res.status(200).json(trips[0]);
  } catch (error) {
    console.error('Unable to retrieve trip:', error);
    return res.status(500).json({ message: 'Unable to retrieve trip.' });
  }
}

async function tripsAddTrip(req, res) {
  try {
    const trip = await Trip.create(tripPayload(req.body));
    return res.status(201).json(trip);
  } catch (error) {
    return writeError(res, error);
  }
}

async function tripsUpdateTrip(req, res) {
  const code = tripCode(req.params.tripCode);
  if (!code) return res.status(400).json({ message: 'Invalid trip code.' });

  try {
    const trip = await Trip.findOne({ code });
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    if (req.body?.code !== undefined && tripCode(req.body.code) !== code) return res.status(400).json({ message: 'Trip codes cannot be changed. They identify saved reservations.' });
    trip.set(tripPayload(req.body));
    await trip.save();
    return res.status(200).json(trip);
  } catch (error) {
    return writeError(res, error);
  }
}

async function tripsDeleteTrip(req, res) {
  const code = tripCode(req.params.tripCode);
  if (!code) return res.status(400).json({ message: 'Invalid trip code.' });

  try {
    if (await Reservation.exists({ tripCode: code, status: 'confirmed' })) return res.status(409).json({ message: 'This trip has confirmed reservations and cannot be deleted.' });
    const trip = await Trip.findOneAndDelete({ code });
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    return res.status(204).end();
  } catch (error) {
    console.error('Unable to delete trip:', error);
    return res.status(500).json({ message: 'Unable to delete trip.' });
  }
}

module.exports = { tripsList, tripsFindByCode, tripsAddTrip, tripsUpdateTrip, tripsDeleteTrip };
