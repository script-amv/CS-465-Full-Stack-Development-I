const express = require('express');
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');
const { authenticateJWT } = require('../middleware/authentication');

const router = express.Router();

router.get('/trips', tripsController.tripsList);
router.get('/trips/:tripCode', tripsController.tripsFindByCode);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/trips', authenticateJWT, tripsController.tripsAddTrip);
router.put('/trips/:tripCode', authenticateJWT, tripsController.tripsUpdateTrip);
router.delete('/trips/:tripCode', authenticateJWT, tripsController.tripsDeleteTrip);

module.exports = router;
