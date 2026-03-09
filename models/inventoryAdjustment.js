const mongoose = require("mongoose");

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false
    },

    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer"
      }
    },

    adjustmentType: {
      type: String,
      enum: ["INCREASE", "DECREASE"],
      required: true
    },

    reason: {
      type: String,
      enum: ["DAMAGED", "LOST", "EXPIRED", "STOCK_COUNT", "OTHER"],
      required: true
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },

    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "InventoryAdjustment",
  inventoryAdjustmentSchema
);