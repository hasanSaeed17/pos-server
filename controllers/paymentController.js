const PaymentLog = require('../models/paymentLogModel');
const Sale       = require('../models/saleModel');


/* ==========================================================
   GET ALL PENDING PAYMENTS (partial sales only)
   GET /api/payments/pending?period=&from=&to=&paymentMethod=
   ========================================================== */
exports.getPendingPayments = async (req, res) => {
  try {

    const { period, from, to, paymentMethod } = req.query;
    const filter = {};

    // Only partial payments — paidAmount > 0 but less than grandTotal
    filter.$expr = {
      $and: [
        { $gt: ['$paidAmount', 0] },
        { $lt: ['$paidAmount', '$grandTotal'] }
      ]
    };

    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (period) {
      const now = new Date();
      let startDate;

      if (period === 'daily')   startDate = new Date(now.setHours(0, 0, 0, 0));
      if (period === 'weekly')  { startDate = new Date(); startDate.setDate(startDate.getDate() - 7); }
      if (period === 'monthly') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1); }

      if (startDate) filter.createdAt = { $gte: startDate };
    }

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const sales = await Sale.find(filter)
      .populate('items.productId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   sales.length,
      data:    sales
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};


/* ==========================================================
   RECORD A PAYMENT
   POST /api/payments/pay
   Body: { saleId, amountPaid, paymentMethod, recordedBy }
   ========================================================== */
exports.recordPayment = async (req, res) => {
  try {

    const { saleId, amountPaid, paymentMethod, recordedBy } = req.body;

    // ── Validation ────────────────────────────────────────
    if (!saleId || !amountPaid || !paymentMethod || !recordedBy) {
      return res.status(400).json({
        success: false,
        message: 'saleId, amountPaid, paymentMethod and recordedBy are required'
      });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount paid must be greater than zero'
      });
    }

    // ── Fetch sale ────────────────────────────────────────
    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // ── Check if already fully paid ───────────────────────
    if (sale.paidAmount >= sale.grandTotal) {
      return res.status(400).json({
        success: false,
        message: 'This sale is already fully paid'
      });
    }

    const remaining = sale.grandTotal - sale.paidAmount;

    // ── Cannot overpay ────────────────────────────────────
    if (amountPaid > remaining) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds remaining balance of ${remaining}`
      });
    }

    const previousPaid  = sale.paidAmount;
    const newTotalPaid  = previousPaid + amountPaid;
    const remainingAfter = sale.grandTotal - newTotalPaid;
    const isFullyPaid   = remainingAfter <= 0;

    // ── Update sale ───────────────────────────────────────
    await Sale.findByIdAndUpdate(saleId, {
      paidAmount:  newTotalPaid,
      isFullyPaid
    });

    // ── Log the payment ───────────────────────────────────
    const log = await PaymentLog.create({
      saleId,
      saleCode:      sale.saleCode,
      customerName:  sale.customerName || 'Walk-in Customer',
      amountPaid,
      previousPaid,
      newTotalPaid,
      remainingAfter,
      paymentMethod,
      isFullyPaid,
      recordedBy
    });

    return res.status(201).json({
      success: true,
      message: isFullyPaid ? 'Payment completed — sale fully paid!' : 'Partial payment recorded',
      data:    log
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};


/* ==========================================================
   GET PAYMENT HISTORY (all logs with filters)
   GET /api/payments/history?period=&from=&to=&paymentMethod=
   ========================================================== */
exports.getPaymentHistory = async (req, res) => {
  try {

    const { period, from, to, paymentMethod } = req.query;
    const filter = {};

    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (period) {
      const now = new Date();
      let startDate;

      if (period === 'daily')   startDate = new Date(now.setHours(0, 0, 0, 0));
      if (period === 'weekly')  { startDate = new Date(); startDate.setDate(startDate.getDate() - 7); }
      if (period === 'monthly') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1); }

      if (startDate) filter.createdAt = { $gte: startDate };
    }

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const logs = await PaymentLog.find(filter)
      .populate('saleId', 'saleCode grandTotal')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   logs.length,
      data:    logs
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};


/* ==========================================================
   GET PAYMENT LOGS FOR A SPECIFIC SALE
   GET /api/payments/sale/:saleId
   ========================================================== */
exports.getPaymentsBySale = async (req, res) => {
  try {

    const logs = await PaymentLog.find({ saleId: req.params.saleId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data:    logs
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};