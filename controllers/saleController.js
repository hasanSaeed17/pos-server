const mongoose = require('mongoose');
const Sale = require('../models/saleModel');
const Product = require('../models/productModel');
const Counter = require('../models/counterModel');


/* ================= Generate Sale Code ================= */
async function generateSaleCode() {
  const count = await Sale.countDocuments();
  const next = count + 1;
  return `SALE-${next.toString().padStart(4, '0')}`;
}



// exports.createSale = async (req, res) => {

//   try {

//     const {
//       customerName,
//       items,
//       subtotal,
//       totalDiscount,
//       grandTotal,
//       paidAmount,
//       paymentMethod,
//       createdBy
//     } = req.body;

//     if (!items || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Sale must contain at least one product'
//       });
//     }

//     // Validate and deduct stock
//     for (let item of items) {

//       const product = await Product.findById(item.productId);

//       if (!product) {
//         return res.status(400).json({
//           success: false,
//           message: `Product not found`
//         });
//       }

//       if (product.currentStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${product.name}`
//         });
//       }

//       product.currentStock -= item.quantity;
//       await product.save();
//     }

//     const saleCode = await generateSaleCode();

//     const sale = await Sale.create({
//       saleCode,
//       customerName,
//       items,
//       subtotal,
//       totalDiscount,
//       grandTotal,
//       paidAmount,
//       isFullyPaid: paidAmount >= grandTotal,
//       paymentMethod,
//       createdBy
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Sale created successfully',
//       data: sale
//     });

//   } catch (error) {

//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };

exports.createSale = async (req, res) => {
  try {

    const {
      customerName,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      paidAmount,
      paymentMethod,
      createdBy
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sale must contain at least one product"
      });
    }

    // Generate sale codes
    const saleCode = await generateSaleCode();
    const saleId = saleCode; // using same value to avoid null issue

    // Validate stock first
    for (let item of items) {

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Product not found"
        });
      }

      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

    }

    // Deduct stock after validation
    for (let item of items) {

      const product = await Product.findById(item.productId);

      product.currentStock -= item.quantity;
      await product.save();

    }

    // Create sale
    const sale = await Sale.create({
      saleId,
      saleCode,
      customerName,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      paidAmount,
      isFullyPaid: paidAmount >= grandTotal,
      paymentMethod,
      createdBy
    });

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: sale
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });

  }
};

exports.updateSale = async (req, res) => {

  try {

    const { id } = req.params;
    const updatedData = req.body;

    const existingSale = await Sale.findById(id);

    if (!existingSale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Restore old stock
    for (let item of existingSale.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.currentStock += item.quantity;
        await product.save();
      }
    }

    // Validate and deduct new stock
    for (let item of updatedData.items) {

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found`
        });
      }

      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      product.currentStock -= item.quantity;
      await product.save();
    }

    updatedData.isFullyPaid =
      updatedData.paidAmount >= updatedData.grandTotal;

    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Sale updated successfully',
      data: updatedSale
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


exports.deleteSale = async (req, res) => {

  try {

    const { id } = req.params;

    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Restore stock
    for (let item of sale.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.currentStock += item.quantity;
        await product.save();
      }
    }

    await Sale.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};












































/* ================= CREATE SALE ================= */

// exports.createSale = async (req, res) => {

//   try {

//     const {
//       customerName,
//       items,
//       subtotal,
//       totalDiscount,
//       grandTotal,
//       paidAmount,
//       paymentMethod,
//       createdBy
//     } = req.body;

//     if (!items || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Sale must contain at least one product'
//       });
//     }

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {

//       // Validate stock
//       for (let item of items) {

//         const product = await Product.findById(item.productId).session(session);

//         if (!product) {
//           throw new Error(`Product not found`);
//         }

//         if (product.currentStock < item.quantity) {
//           throw new Error(`Insufficient stock for ${product.name}`);
//         }

//         // Deduct stock
//         product.currentStock -= item.quantity;
//         await product.save({ session });
//       }

//       const saleCode = await generateSaleCode();

//       const sale = new Sale({
//         saleCode,
//         customerName,
//         items,
//         subtotal,
//         totalDiscount,
//         grandTotal,
//         paidAmount,
//         isFullyPaid: paidAmount >= grandTotal,
//         paymentMethod,
//         createdBy
//       });

//       await sale.save({ session });

//       await session.commitTransaction();
//       session.endSession();

//       return res.status(201).json({
//         success: true,
//         message: 'Sale created successfully',
//         data: sale
//       });

//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {

//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };


/* ================= UPDATE SALE ================= */

// exports.updateSale = async (req, res) => {

//   try {

//     const { id } = req.params;
//     const updatedData = req.body;

//     const existingSale = await Sale.findById(id);

//     if (!existingSale) {
//       return res.status(404).json({
//         success: false,
//         message: 'Sale not found'
//       });
//     }

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {

//       // Restore old stock
//       for (let item of existingSale.items) {
//         const product = await Product.findById(item.productId).session(session);
//         product.currentStock += item.quantity;
//         await product.save({ session });
//       }

//       // Validate new stock and deduct
//       for (let item of updatedData.items) {

//         const product = await Product.findById(item.productId).session(session);

//         if (product.currentStock < item.quantity) {
//           throw new Error(`Insufficient stock for ${product.name}`);
//         }

//         product.currentStock -= item.quantity;
//         await product.save({ session });
//       }

//       updatedData.isFullyPaid = updatedData.paidAmount >= updatedData.grandTotal;

//       const updatedSale = await Sale.findByIdAndUpdate(
//         id,
//         updatedData,
//         { new: true, session }
//       );

//       await session.commitTransaction();
//       session.endSession();

//       return res.status(200).json({
//         success: true,
//         message: 'Sale updated successfully',
//         data: updatedSale
//       });

//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {

//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };


/* ================= DELETE SALE ================= */

// exports.deleteSale = async (req, res) => {

//   try {

//     const { id } = req.params;

//     const sale = await Sale.findById(id);

//     if (!sale) {
//       return res.status(404).json({
//         success: false,
//         message: 'Sale not found'
//       });
//     }

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {

//       // Restore stock
//       for (let item of sale.items) {
//         const product = await Product.findById(item.productId).session(session);
//         product.currentStock += item.quantity;
//         await product.save({ session });
//       }

//       await Sale.findByIdAndDelete(id, { session });

//       await session.commitTransaction();
//       session.endSession();

//       return res.status(200).json({
//         success: true,
//         message: 'Sale deleted successfully'
//       });

//     } catch (error) {
//       await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {

//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };


/* ================= GET ALL SALES ================= */

exports.getAllSales = async (req, res) => {

  try {

    const sales = await Sale.find()
      .populate('items.productId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: sales
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


/* ================= GET SALE BY ID ================= */

exports.getSaleById = async (req, res) => {

  try {

    const { id } = req.params;

    const sale = await Sale.findById(id)
      .populate('items.productId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: sale
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getSales = async (req, res) => {

  try {

    const { status, paymentMethod, period, from, to } = req.query;

    const filter = {};

    // ---------------------------
    // Status Filter
    // ---------------------------
    if (status === 'paid') {
      filter.$expr = { $gte: ['$paidAmount', '$grandTotal'] };
    }

    if (status === 'partial') {
      filter.$expr = {
        $and: [
          { $gt: ['$paidAmount', 0] },
          { $lt: ['$paidAmount', '$grandTotal'] }
        ]
      };
    }

    if (status === 'unpaid') {
      filter.paidAmount = 0;
    }

    // ---------------------------
    // Payment Method
    // ---------------------------
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // ---------------------------
    // Period Filter
    // ---------------------------
    if (period) {

      const now = new Date();
      let startDate;

      if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      if (period === 'weekly') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      }

      if (period === 'monthly') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    // ---------------------------
    // Date Range Filter
    // ---------------------------
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
      data: sales
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};



/* =====================================================
   GET SALES FOR REPORT (WITH FILTERS)
   ===================================================== */

exports.getSalesReport = async (req, res) => {

  try {

    const { period, paymentMethod, from, to } = req.query;

    const filter = {};

    /* ===============================
       PAYMENT METHOD FILTER
       =============================== */

    if (paymentMethod) {

      const allowedMethods = ['Cash', 'Bank Transfer', 'Online Wallets'];

      if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
      }

      filter.paymentMethod = paymentMethod;
    }

    /* ===============================
       PERIOD FILTER
       =============================== */

    if (period) {

      const now = new Date();
      let startDate;

      if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      else if (period === 'weekly') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      }

      else if (period === 'monthly') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      }

      else {
        return res.status(400).json({
          success: false,
          message: 'Invalid period filter'
        });
      }

      filter.createdAt = { $gte: startDate };
    }

    /* ===============================
       DATE RANGE FILTER
       =============================== */

    if (from || to) {

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: 'Both "from" and "to" dates are required'
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate) || isNaN(toDate)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      if (fromDate > toDate) {
        return res.status(400).json({
          success: false,
          message: '"From" date cannot be greater than "To" date'
        });
      }

      filter.createdAt = {
        $gte: fromDate,
        $lte: toDate
      };
    }

    /* ===============================
       FETCH SALES
       =============================== */

    const sales = await Sale.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });

  }

  catch (error) {

    console.error('Sales Report Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};