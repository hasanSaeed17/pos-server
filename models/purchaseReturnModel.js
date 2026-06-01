const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema({
  productName:  { type: String, required: true },
  category:     { type: String },
  brand:        { type: String },
  costPrice:    { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  quantity:     { type: Number, required: true, min: 1 },
  itemTotal:    { type: Number, required: true }
}, { _id: false });


const purchaseReturnSchema = new mongoose.Schema({

  returnCode: {
    type: String,
    required: true,
    unique: true
  },

  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: true
  },

  purchaseCode:  { type: String, required: true },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },

  returnedItems: {
    type: [returnItemSchema],
    required: true
  },

  totalReturnAmount: { type: Number, required: true },
  reason:            { type: String, default: '' },
  returnedBy:        { type: String, required: true }

}, { timestamps: true });


module.exports = mongoose.model('PurchaseReturn', purchaseReturnSchema);