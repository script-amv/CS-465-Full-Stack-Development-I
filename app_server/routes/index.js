const express = require('express');
const controlMain = require('../controllers/main');

const router = express.Router();

router.get('/', controlMain.index);

module.exports = router;
