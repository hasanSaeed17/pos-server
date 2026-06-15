const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/paymentController');

// ⚠️ specific routes BEFORE param routes
router.get('/pending',       controller.getPendingPayments);
router.get('/history',       controller.getPaymentHistory);
router.get('/sale/:saleId',  controller.getPaymentsBySale);
router.post('/pay',          controller.recordPayment);

module.exports = router;