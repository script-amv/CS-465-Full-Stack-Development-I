const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  tripCode: { type: String, required: true, index: true },
  trip: {
    name: { type: String, required: true }, length: { type: String, required: true },
    start: { type: Date, required: true }, resort: { type: String, required: true },
    location: String, image: String, description: String,
    perPerson: { type: Number, required: true, min: 0 },
  },
  travellers: { type: Number, required: true, min: 1, max: 20 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
}, { timestamps: true });
reservationSchema.index({ customer: 1, tripCode: 1 }, { unique: true, partialFilterExpression: { status: 'confirmed' } });
module.exports = mongoose.model('Reservation', reservationSchema);
