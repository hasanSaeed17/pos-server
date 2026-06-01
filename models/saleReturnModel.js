const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: { type: String, required: true },
  costPrice:    { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  lineTotal:    { type: Number, required: true }
}, { _id: false });


const saleReturnSchema = new mongoose.Schema({

  returnCode: {
    type: String,
    required: true,
    unique: true
  },

  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },

  saleCode:     { type: String, required: true },
  customerName: { type: String, default: 'Walk-in Customer' },

  returnedItems: {
    type: [returnItemSchema],
    required: true
  },

  totalReturnAmount: { type: Number, required: true },

  reason:     { type: String, default: '' },
  returnedBy: { type: String, required: true }

}, { timestamps: true });


module.exports = mongoose.model('SaleReturn', saleReturnSchema);