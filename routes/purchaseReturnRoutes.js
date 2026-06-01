const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/purchaseReturnController');

// ⚠️ specific routes BEFORE param routes
router.get('/purchase/:purchaseId', controller.getReturnsByPurchase);
router.get('/report',               controller.getPurchaseReturnsReport); // 👈 before /:id
router.post('/',                    controller.createPurchaseReturn);
router.get('/',                     controller.getAllPurchaseReturns);
router.get('/:id',                  controller.getPurchaseReturnById);    // 👈 always last

module.exports = router;