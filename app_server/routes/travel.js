const express = require('express');
const controlTravel = require('../controllers/travel');

const router = express.Router();

router.get('/', controlTravel.travel);
router.get('/:tripCode', controlTravel.detail);

module.exports = router;
