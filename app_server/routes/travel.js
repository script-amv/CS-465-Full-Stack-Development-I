const express = require('express');
const controlTravel = require('../controllers/travel');

const router = express.Router();

router.get('/', controlTravel.travel);

module.exports = router;
