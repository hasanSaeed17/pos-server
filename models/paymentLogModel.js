const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({

  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },

  saleCode:     { type: String, required: true },
  customerName: { type: String, default: 'Walk-in Customer' },

  amountPaid:    { type: Number, required: true },  // amount paid in THIS transaction
  previousPaid:  { type: Number, required: true },  // paidAmount before this payment
  newTotalPaid:  { type: Number, required: true },  // paidAmount after this payment
  remainingAfter:{ type: Number, required: true },  // grandTotal - newTotalPaid

  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Online Wallets'],
    required: true
  },

  isFullyPaid:  { type: Boolean, default: false },
  recordedBy:   { type: String, required: true }

}, { timestamps: true });

module.exports = mongoose.model('PaymentLog', paymentLogSchema);