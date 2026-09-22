const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'A trip code is required.'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{2}\d{3}$/, 'Trip code must use two letters and three digits.'],
  },
  name: { type: String, required: [true, 'A trip name is required.'], trim: true },
  length: { type: String, required: [true, 'Trip length is required.'], trim: true },
  start: { type: Date, required: [true, 'A trip start date is required.'] },
  resort: { type: String, required: [true, 'A resort is required.'], trim: true },
  perPerson: { type: Number, required: [true, 'A per-person price is required.'], min: [0, 'Price cannot be negative.'] },
  image: { type: String, required: [true, 'An image filename is required.'], trim: true },
  description: { type: String, required: [true, 'A trip description is required.'], trim: true },
}, { collection: 'trips' });

module.exports = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
