const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

/* -------------------- MIDDLEWARES -------------------- */
app.use(express.json());
app.use(morgan('dev'));

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));


/* -------------------- ROUTES -------------------- */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use("/api/inventory-adjustments", require("./routes/inventoryAdjustmentRoutes"));

app.use('/api/sale-returns', require('./routes/saleReturnRoutes'));
app.use('/api/purchase-returns', require('./routes/purchaseReturnRoutes'));

app.use('/api/profits', require('./routes/profitRoutes'));

app.use('/api/payments', require('./routes/paymentRoutes'));

app.use('/api/analytics', require('./routes/analyticsRoutes'));

/* -------------------- HEALTH CHECK -------------------- */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'POS API is running'
  });
});

/* -------------------- 404 HANDLER -------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

module.exports = app;
