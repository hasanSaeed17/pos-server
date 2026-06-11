const Purchase = require('../models/purchaseModel');
const Product = require('../models/productModel');


// ===============================
// Generate Purchase Code
// ===============================
async function generatePurchaseCode() {
  const count = await Purchase.countDocuments();
  const next = count + 1;
  return `PUR-${next.toString().padStart(4, '0')}`;
}


// ===============================
// CREATE PURCHASE
// ===============================
exports.createPurchase = async (req, res) => {
  try {
    const {
      supplierId,
      invoiceNumber,
      purchaseDate,
      status,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      createdBy
    } = req.body;

    if (!supplierId || !invoiceNumber || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }

    const purchaseCode = await generatePurchaseCode();

    const purchase = new Purchase({
      purchaseCode,
      supplierId,
      invoiceNumber,
      purchaseDate,
      status: status || 'draft',
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      createdBy
    });

    await purchase.save();

    // If directly confirmed → create products
    if (status === 'confirmed') {

      for (let item of items) {

        await Product.create({
          name: item.productName,
          category: item.category,
          brand: item.brand,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          currentStock: item.quantity,
          lowStockQuantity: 5,
          supplierId,
          purchaseId: purchase._id
        });

      }
    }

    return res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: purchase
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



// ===============================
// CONFIRM PURCHASE
// ===============================
exports.confirmPurchase = async (req, res) => {

  try {

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Purchase already confirmed'
      });
    }

    // Create products
    for (let item of purchase.items) {

      await Product.create({
        name: item.productName,
        category: item.category,
        brand: item.brand,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        currentStock: item.quantity,
        lowStockQuantity: 5,
        supplierId: purchase.supplierId,
        purchaseId: purchase._id
      });

    }

    purchase.status = 'confirmed';
    await purchase.save();

    return res.json({
      success: true,
      message: 'Purchase confirmed successfully'
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



// ===============================
// GET ALL PURCHASES (With Filters)
// ===============================
exports.getPurchases = async (req, res) => {

  try {

    const { status, supplierId, from, to } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;

    if (from && to) {
      filter.purchaseDate = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 });

    res.json(purchases);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases'
    });
  }
};



// ===============================
// GET PURCHASE BY ID
// ===============================
exports.getPurchaseById = async (req, res) => {

  try {

    const purchase = await Purchase.findById(req.params.id)
      .populate('supplierId', 'name');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json(purchase);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Error fetching purchase'
    });
  }
};



// ===============================
// DELETE PURCHASE
// ===============================
exports.deletePurchase = async (req, res) => {

  try {

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete confirmed purchase'
      });
    }

    await purchase.deleteOne();

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Error deleting purchase'
    });
  }
};


exports.getPurchases = async (req, res) => {

  try {

    const { status, supplierId, from, to, period } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;

    // ===============================
    // PERIOD FILTER
    // ===============================
    if (period) {

      const now = new Date();
      let startDate;

      if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      else if (period === 'weekly') {
        const firstDay = now.getDate() - now.getDay();
        startDate = new Date(now.setDate(firstDay));
        startDate.setHours(0, 0, 0, 0);
      }

      else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      filter.purchaseDate = {
        $gte: startDate,
        $lte: new Date()
      };
    }

    // ===============================
    // DATE RANGE FILTER
    // ===============================
    if (from && to) {

      filter.purchaseDate = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 });

    res.json(purchases);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases',
      error: error.message
    });
  }
};


// ===============================
// UPDATE PURCHASE (Draft only)
// ===============================
exports.updatePurchase = async (req, res) => {
  try {

    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a confirmed purchase'
      });
    }

    const {
      supplierId,
      invoiceNumber,
      purchaseDate,
      items,
      subtotal,
      totalDiscount,
      grandTotal
    } = req.body;

    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      { supplierId, invoiceNumber, purchaseDate, items, subtotal, totalDiscount, grandTotal },
      { new: true }
    ).populate('supplierId', 'name');

    return res.status(200).json({
      success: true,
      message: 'Draft updated successfully',
      data: updated
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};