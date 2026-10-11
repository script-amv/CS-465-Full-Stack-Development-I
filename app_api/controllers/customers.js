const User = require('../models/user');
const Reservation = require('../models/reservation');
const validId = id => /^[a-f\d]{24}$/i.test(id || '');

async function listCustomers(req, res) {
  try { return res.json(await User.find({ role: 'customer' }).sort({ name: 1 }).lean()); }
  catch { return res.status(500).json({ message: 'Customers could not be loaded.' }); }
}
async function updateCustomer(req, res) {
  if (!validId(req.params.customerId)) return res.status(400).json({ message: 'Invalid customer ID.' });
  const { name, email, active } = req.body || {};
  if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.trim().length > 100)) ||
    (email !== undefined && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) ||
    (active !== undefined && typeof active !== 'boolean')) return res.status(400).json({ message: 'Invalid customer details.' });
  try {
    const customer = await User.findOne({ _id: req.params.customerId, role: 'customer' });
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    if (name !== undefined) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (active !== undefined) customer.active = active;
    await customer.save(); return res.json(customer);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already registered.' });
    return res.status(500).json({ message: 'Customer could not be updated.' });
  }
}
async function deleteCustomer(req, res) {
  if (!validId(req.params.customerId)) return res.status(400).json({ message: 'Invalid customer ID.' });
  try {
    if (await Reservation.exists({ customer: req.params.customerId })) return res.status(409).json({ message: 'Customers with reservation history must be deactivated instead of deleted.' });
    const customer = await User.findOneAndDelete({ _id: req.params.customerId, role: 'customer' });
    return customer ? res.status(204).end() : res.status(404).json({ message: 'Customer not found.' });
  } catch { return res.status(500).json({ message: 'Customer could not be deleted.' }); }
}
function me(req, res) {
  return res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, active: req.user.active });
}
module.exports = { listCustomers, updateCustomer, deleteCustomer, me };
