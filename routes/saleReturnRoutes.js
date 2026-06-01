const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/saleReturnController');

router.get('/sale/:saleId',  controller.getReturnsBySale);
router.get('/list',        controller.getSaleReturnsList);  // 👈 before /:id
router.post('/',             controller.createReturn);
router.get('/',              controller.getAllReturns);
router.get('/:id',           controller.getReturnById);         // 👈 always last

module.exports = router;