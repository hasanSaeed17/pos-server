const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/profitController');

router.get('/', controller.getProfitReport);

module.exports = router;