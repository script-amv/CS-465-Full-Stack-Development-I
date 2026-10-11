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
  location: { type: String, trim: true, maxlength: 100, default: '' },
  category: { type: String, enum: ['Beaches', 'Cruises', 'Mountains'], default: 'Beaches' },
  perPerson: {
    type: Number, required: [true, 'A per-person price is required.'], min: [0, 'Price cannot be negative.'],
    validate: { validator: value => Number.isFinite(value) && value <= 1000000 && Math.round(value * 100) / 100 === value, message: 'Price must be a finite amount up to $1,000,000 with no more than two decimal places.' },
  },
  image: { type: String, required: [true, 'An image filename is required.'], trim: true },
  description: { type: String, required: [true, 'A trip description is required.'], trim: true },
}, { collection: 'trips' });

module.exports = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
