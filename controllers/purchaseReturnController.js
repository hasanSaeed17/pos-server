const PurchaseReturn = require('../models/purchaseReturnModel');
const Purchase       = require('../models/purchaseModel');
const Product        = require('../models/productModel');


/* ================= Generate Return Code ================= */
async function generateReturnCode() {
  const count = await PurchaseReturn.countDocuments();
  const next  = count + 1;
  return `PRET-${next.toString().padStart(4, '0')}`;
}


/* ==========================================================
   CREATE PURCHASE RETURN
   POST /api/purchase-returns
   Body: { purchaseId, returnedItems, reason, returnedBy }
   ========================================================== */
exports.createPurchaseReturn = async (req, res) => {
  try {

    const { purchaseId, returnedItems, reason, returnedBy } = req.body;

    // ── Basic validation ──────────────────────────────────
    if (!purchaseId || !returnedItems || returnedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId and at least one returned item are required'
      });
    }

    // ── Fetch original purchase ───────────────────────────
    const purchase = await Purchase.findById(purchaseId);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // ── Only confirmed purchases allowed ──────────────────
    if (purchase.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed purchases can be returned'
      });
    }

    // ── Fetch previous returns for this purchase ──────────
    const previousReturns = await PurchaseReturn.find({ purchaseId });

    // ── Validate each returned item ───────────────────────
    for (let retItem of returnedItems) {

      const purchaseItem = purchase.items.find(
        i => i.productName === retItem.productName
      );

      if (!purchaseItem) {
        return res.status(400).json({
          success: false,
          message: `Product "${retItem.productName}" is not part of this purchase`
        });
      }

      const alreadyReturned = previousReturns.reduce((sum, ret) => {
        const match = ret.returnedItems.find(
          i => i.productName === retItem.productName
        );
        return sum + (match ? match.quantity : 0);
      }, 0);

      const returnable = purchaseItem.quantity - alreadyReturned;

      if (retItem.quantity > returnable) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${retItem.quantity} of "${retItem.productName}". Only ${returnable} returnable.`
        });
      }
    }

    // ── Calculate total return amount ─────────────────────
    const totalReturnAmount = returnedItems.reduce(
      (sum, item) => sum + item.itemTotal, 0
    );

    // ── Deduct inventory ──────────────────────────────────
    for (let retItem of returnedItems) {
      const product = await Product.findOne({
        purchaseId: purchaseId,
        name:       retItem.productName
      });

      if (product) {
        product.currentStock = Math.max(0, product.currentStock - retItem.quantity);
        await product.save();
      }
    }

    // ── Create the return record ──────────────────────────
    const returnCode = await generateReturnCode();

    const purchaseReturn = await PurchaseReturn.create({
      returnCode,
      purchaseId:        purchase._id,
      purchaseCode:      purchase.purchaseCode,
      supplierId:        purchase.supplierId,
      returnedItems,
      totalReturnAmount,
      reason:            reason || '',
      returnedBy
    });

    // ── Update purchase returnStatus ──────────────────────
    const allPreviousQty = [...previousReturns, purchaseReturn];

    const totalReturnedQty = purchase.items.reduce((sum, purchaseItem) => {
      const returnedForItem = allPreviousQty.reduce((s, ret) => {
        const match = ret.returnedItems.find(
          i => i.productName === purchaseItem.productName
        );
        return s + (match ? match.quantity : 0);
      }, 0);
      return sum + returnedForItem;
    }, 0);

    const totalPurchasedQty = purchase.items.reduce(
      (sum, i) => sum + i.quantity, 0
    );

    let returnStatus = 'partial';
    if (totalReturnedQty >= totalPurchasedQty) returnStatus = 'fully_returned';
    if (totalReturnedQty === 0) returnStatus = 'none';

    await Purchase.findByIdAndUpdate(purchaseId, { returnStatus });

    return res.status(201).json({
      success: true,
      message: 'Purchase return processed successfully',
      data: purchaseReturn
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
   GET ALL PURCHASE RETURNS (with filters)
   GET /api/purchase-returns?period=&from=&to=
   ========================================================== */
exports.getAllPurchaseReturns = async (req, res) => {
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

    const returns = await PurchaseReturn.find(filter)
      .populate('purchaseId')
      .populate('supplierId', 'name')
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
   GET RETURNS FOR A SPECIFIC PURCHASE
   GET /api/purchase-returns/purchase/:purchaseId
   ========================================================== */
exports.getReturnsByPurchase = async (req, res) => {
  try {

    const { purchaseId } = req.params;

    const returns = await PurchaseReturn.find({ purchaseId })
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
   GET SINGLE PURCHASE RETURN BY ID
   GET /api/purchase-returns/:id
   ========================================================== */
exports.getPurchaseReturnById = async (req, res) => {
  try {

    const purchaseReturn = await PurchaseReturn.findById(req.params.id)
      .populate('purchaseId')
      .populate('supplierId', 'name');

    if (!purchaseReturn) {
      return res.status(404).json({
        success: false,
        message: 'Purchase return not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: purchaseReturn
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
   GET PURCHASE RETURNS REPORT (WITH FILTERS)
   GET /api/purchase-returns/report?period=&from=&to=&supplierId=
   ========================================================== */
exports.getPurchaseReturnsList = async (req, res) => {
  try {

    const { period, from, to, supplierId } = req.query;
    const filter = {};

    if (supplierId) filter.supplierId = supplierId;

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

    const returns = await PurchaseReturn.find(filter)
      .populate('supplierId', 'name')
      .populate('purchaseId', 'purchaseCode invoiceNumber')
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