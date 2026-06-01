const mongoose = require('mongoose');

// PURCHASE ITEM (SNAPSHOT)
const purchaseItemSchema = new mongoose.Schema({

  productName: { type: String, required: true, trim: true },

  category: { type: String, trim: true },

  brand: { type: String, trim: true },

  costPrice: { type: Number, required: true, min: 0 },

  sellingPrice: { type: Number, required: true, min: 0 },

  quantity: { type: Number, required: true, min: 1 },

  itemTotal: { type: Number, required: true, min: 0}

}, { _id: false });


// PURCHASE HEADER
const purchaseSchema = new mongoose.Schema({

  purchaseCode: { type: String, required: true, unique: true },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },

  invoiceNumber: { type: String, trim: true },

  purchaseDate: { type: Date, required: true },

  status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },

  items: {
    type: [purchaseItemSchema],
    validate: {
      validator: function (value) {
        return value.length > 0;
      },
      message: 'Purchase must contain at least one item'
    }
  },

  subtotal: { type: Number, required: true, min: 0 },

  totalDiscount: { type: Number, default: 0, min: 0 },

  grandTotal: { type: Number, required: true, min: 0 },

  createdBy: { type: String, required: true },

returnStatus: {
  type: String,
  enum: ['none', 'partial', 'fully_returned'],
  default: 'none'
},


}, {
  timestamps: true
});

module.exports = mongoose.model('Purchase', purchaseSchema);
