const express = require('express');
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const { authenticateJWT, requireAdmin } = require('../middleware/authentication');
const customers = require('../controllers/customers');
const reservations = require('../controllers/reservations');

const router = express.Router();

router.get('/trips', tripsController.tripsList);
router.get('/trips/:tripCode', tripsController.tripsFindByCode);
router.get('/trips/:tripCode/quote', authenticateJWT, reservations.quoteReservation);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateJWT, customers.me);
router.post('/trips', authenticateJWT, requireAdmin, tripsController.tripsAddTrip);
router.put('/trips/:tripCode', authenticateJWT, requireAdmin, tripsController.tripsUpdateTrip);
router.delete('/trips/:tripCode', authenticateJWT, requireAdmin, tripsController.tripsDeleteTrip);
router.get('/customers', authenticateJWT, requireAdmin, customers.listCustomers);
router.put('/customers/:customerId', authenticateJWT, requireAdmin, customers.updateCustomer);
router.delete('/customers/:customerId', authenticateJWT, requireAdmin, customers.deleteCustomer);
router.get('/me/reservations', authenticateJWT, reservations.myReservations);
router.post('/reservations', authenticateJWT, reservations.createReservation);
router.get('/reservations', authenticateJWT, requireAdmin, reservations.listReservations);
router.get('/reservations/:reservationId', authenticateJWT, reservations.getReservation);
router.put('/reservations/:reservationId', authenticateJWT, reservations.updateReservation);

module.exports = router;
