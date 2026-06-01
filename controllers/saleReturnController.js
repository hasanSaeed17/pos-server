const SaleReturn = require('../models/saleReturnModel');
const Sale       = require('../models/saleModel');
const Product    = require('../models/productModel');


/* ================= Generate Return Code ================= */
async function generateReturnCode() {
  const count = await SaleReturn.countDocuments();
  const next  = count + 1;
  return `RET-${next.toString().padStart(4, '0')}`;
}


/* ==========================================================
   CREATE RETURN
   POST /api/returns
   Body: { saleId, returnedItems, reason, returnedBy }
   ========================================================== */
exports.createReturn = async (req, res) => {
  try {

    const { saleId, returnedItems, reason, returnedBy } = req.body;

    // ── Basic validation ──────────────────────────────────
    if (!saleId || !returnedItems || returnedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'saleId and at least one returned item are required'
      });
    }

    // ── Fetch original sale ───────────────────────────────
    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // ── Only paid / partial-paid sales allowed ────────────
    const isPaid    = sale.paidAmount >= sale.grandTotal;
    const isPartial = sale.paidAmount > 0 && sale.paidAmount < sale.grandTotal;

    if (!isPaid && !isPartial) {
      return res.status(400).json({
        success: false,
        message: 'Only paid or partially paid sales can be returned'
      });
    }

    // ── Validate each returned item ───────────────────────
    const previousReturns = await SaleReturn.find({ saleId });

    for (let retItem of returnedItems) {

      const saleItem = sale.items.find(
        i => i.productId.toString() === retItem.productId
      );

      if (!saleItem) {
        return res.status(400).json({
          success: false,
          message: `Product ${retItem.productName} is not part of this sale`
        });
      }

      const alreadyReturned = previousReturns.reduce((sum, ret) => {
        const match = ret.returnedItems.find(
          i => i.productId.toString() === retItem.productId
        );
        return sum + (match ? match.quantity : 0);
      }, 0);

      const returnable = saleItem.quantity - alreadyReturned;

      if (retItem.quantity > returnable) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${retItem.quantity} of "${saleItem.productName}". Only ${returnable} returnable.`
        });
      }
    }

    // ── Calculate total return amount ─────────────────────
    const totalReturnAmount = returnedItems.reduce(
      (sum, item) => sum + item.lineTotal, 0
    );

    // ── Restore inventory ─────────────────────────────────
    for (let retItem of returnedItems) {
      const product = await Product.findById(retItem.productId);
      if (product) {
        product.currentStock += retItem.quantity;
        await product.save();
      }
    }

    // ── Create the return record ──────────────────────────
    const returnCode = await generateReturnCode();

    const saleReturn = await SaleReturn.create({
      returnCode,
      saleId:            sale._id,
      saleCode:          sale.saleCode,
      customerName:      sale.customerName || 'Walk-in Customer',
      returnedItems,
      totalReturnAmount,
      reason:            reason || '',
      returnedBy
    });

    // ── Calculate updated sale values ─────────────────────
    const newReturnedAmount = (sale.returnedAmount || 0) + totalReturnAmount;
    const newGrandTotal     = sale.grandTotal - totalReturnAmount;
    const newPaidAmount     = Math.max(0, sale.paidAmount - totalReturnAmount);

    let returnStatus = 'partial';
    if (newGrandTotal <= 0) returnStatus = 'fully_returned';

    // ── Update item quantities in original sale ───────────
    const updatedItems = sale.items.map((saleItem) => {
      const retItem = returnedItems.find(
        r => r.productId === saleItem.productId.toString()
      );
      if (retItem) {
        return {
          ...saleItem.toObject(),
          quantity:  saleItem.quantity - retItem.quantity,
          lineTotal: (saleItem.quantity - retItem.quantity) * saleItem.sellingPrice
        };
      }
      return saleItem.toObject();
    });

    // ── Update the original sale ──────────────────────────
    await Sale.findByIdAndUpdate(saleId, {
      returnedAmount: newReturnedAmount,
      grandTotal:     newGrandTotal,
      paidAmount:     newPaidAmount,
      isFullyPaid:    newPaidAmount >= newGrandTotal,
      returnStatus,
      items:          updatedItems
    });

    return res.status(201).json({
      success: true,
      message: 'Return processed successfully',
      data: saleReturn
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/* ==========================================================
   GET ALL RETURNS  (with filters)
   GET /api/returns?period=&from=&to=&paymentMethod=&returnStatus=
   ========================================================== */
exports.getAllReturns = async (req, res) => {
  try {

    const { period, from, to } = req.query;

    const filter = {};

    // Period filter
    if (period) {
      const now = new Date();
      let startDate;

      if (period === 'daily')   startDate = new Date(now.setHours(0, 0, 0, 0));
      if (period === 'weekly')  { startDate = new Date(); startDate.setDate(startDate.getDate() - 7); }
      if (period === 'monthly') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1); }

      if (startDate) filter.createdAt = { $gte: startDate };
    }

    // Date range filter
    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const returns = await SaleReturn.find(filter)
      .populate('saleId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: returns
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


/* ==========================================================
   GET RETURNS FOR A SPECIFIC SALE
   GET /api/returns/sale/:saleId
   ========================================================== */
exports.getReturnsBySale = async (req, res) => {
  try {

    const { saleId } = req.params;

    const returns = await SaleReturn.find({ saleId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: returns
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


/* ==========================================================
   GET SINGLE RETURN BY ID
   GET /api/returns/:id
   ========================================================== */
exports.getReturnById = async (req, res) => {
  try {

    const saleReturn = await SaleReturn.findById(req.params.id)
      .populate('saleId');

    if (!saleReturn) {
      return res.status(404).json({
        success: false,
        message: 'Return not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: saleReturn
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


/* ==========================================================
   GET SALE RETURNS LIST (WITH FILTERS)
   GET /api/returns/list?period=&from=&to=&paymentMethod=
   ========================================================== */
exports.getSaleReturnsList = async (req, res) => {
  try {

    const { period, from, to } = req.query;
    const filter = {};

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

    const returns = await SaleReturn.find(filter)
      .populate('saleId', 'saleCode paymentMethod customerName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count:   returns.length,
      data:    returns
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};