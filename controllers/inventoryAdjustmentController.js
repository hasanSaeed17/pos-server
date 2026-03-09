const InventoryAdjustment = require("../models/inventoryAdjustment");
const Product = require("../models/productModel");

/*
CREATE INVENTORY ADJUSTMENT
*/
exports.createAdjustment = async (req, res) => {
  try {
    const {
      productId,
      quantity,
      adjustmentType,
      reason,
      notes,
      createdBy
    } = req.body;

    if (!productId || !quantity || !adjustmentType || !reason || !createdBy) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    let stockChange = quantity;

    if (adjustmentType === "DECREASE") {
      stockChange = -quantity;
    }

    const newStock = product.currentStock + stockChange;

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot go below zero"
      });
    }

    const adjustment = new InventoryAdjustment({
      productId,
      supplierId: product.supplierId,
      quantity: stockChange,
      adjustmentType,
      reason,
      notes,
      createdBy
    });

    await adjustment.save();

    product.currentStock = newStock;

    await product.save();

    res.status(201).json({
      success: true,
      message: "Inventory adjusted successfully",
      data: adjustment
    });
  } catch (error) {
    console.error("Create Adjustment Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create adjustment",
      error: error.message
    });
  }
};

/*
GET ADJUSTMENTS LIST
*/
exports.getAdjustments = async (req, res) => {
  try {
    const adjustments = await InventoryAdjustment.find()
      .populate("productId", "name category brand")
      .populate("supplierId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: adjustments
    });
  } catch (error) {
    console.error("Get Adjustments Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch adjustments",
      error: error.message
    });
  }
};