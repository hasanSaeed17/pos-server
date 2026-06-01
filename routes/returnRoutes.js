const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/saleReturnController');

router.post('/',               controller.createReturn);
router.get('/',                controller.getAllReturns);
router.get('/sale/:saleId',    controller.getReturnsBySale);
router.get('/:id',             controller.getReturnById);

module.exports = router;