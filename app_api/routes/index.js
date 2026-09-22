const express = require('express');
const tripsController = require('../controllers/trips');

const router = express.Router();

router.get('/trips', tripsController.tripsList);

module.exports = router;
