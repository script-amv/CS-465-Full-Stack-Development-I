const Trip = require('../../app_server/models/travlr');

async function tripsList(req, res) {
  try {
    const trips = await Trip.find().sort({ start: 1 }).lean();
    if (!trips.length) return res.status(404).json({ message: 'No trips found.' });
    return res.status(200).json(trips);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to retrieve trips.', error: error.message });
  }
}

module.exports = { tripsList };
