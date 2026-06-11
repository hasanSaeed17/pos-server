const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

router.post('/',              purchaseController.createPurchase);
router.patch('/:id/confirm',  purchaseController.confirmPurchase);
router.put('/:id',            purchaseController.updatePurchase);   // 👈 before GET /:id
router.get('/',               purchaseController.getPurchases);
router.get('/:id',            purchaseController.getPurchaseById);
router.delete('/:id',         purchaseController.deletePurchase);

module.exports = router;