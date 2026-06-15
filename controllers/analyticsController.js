const Sale        = require('../models/saleModel');
const Purchase    = require('../models/purchaseModel');
const Product     = require('../models/productModel');
const SaleReturn  = require('../models/saleReturnModel');

/* ==========================================================
   HELPER — build date filter based on period
   ========================================================== */
function buildDateFilter(period) {
  const now   = new Date();
  const filter = {};

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    filter.$gte = start;
    filter.$lte = new Date();
  }

  else if (period === 'week') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    filter.$gte = start;
    filter.$lte = new Date();
  }

  else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    filter.$gte = start;
    filter.$lte = new Date();
  }

  else if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    filter.$gte = start;
    filter.$lte = new Date();
  }

  // 'overall' → no filter
  return Object.keys(filter).length ? filter : null;
}


/* ==========================================================
   MAIN ANALYTICS ENDPOINT
   GET /api/analytics?period=month
   ========================================================== */
exports.getAnalytics = async (req, res) => {
  try {

    const period     = req.query.period || 'month';
    const dateFilter = buildDateFilter(period);

    const salesFilter     = dateFilter ? { createdAt: dateFilter } : {};
    const purchaseFilter  = dateFilter ? { createdAt: dateFilter } : {};
    const returnFilter    = dateFilter ? { createdAt: dateFilter } : {};

    // ── Fetch all data in parallel ────────────────────────
    const [sales, purchases, returns, products] = await Promise.all([
      Sale.find(salesFilter).lean(),
      Purchase.find({ ...purchaseFilter, status: 'confirmed' }).lean(),
      SaleReturn.find(returnFilter).lean(),
      Product.find({}).lean()
    ]);

    // ── Sales Summary ─────────────────────────────────────
    const totalRevenue     = sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalPaid        = sales.reduce((s, x) => s + x.paidAmount, 0);
    const totalPending     = totalRevenue - totalPaid;
    const totalSalesCount  = sales.length;

    // ── Purchase Summary ──────────────────────────────────
    const totalPurchaseAmount = purchases.reduce((s, x) => s + x.grandTotal, 0);
    const totalPurchaseCount  = purchases.length;

    // ── Profit Summary ────────────────────────────────────
    let totalGrossProfit = 0;
    let totalReturnedProfit = 0;

    sales.forEach(sale => {
      sale.items.forEach((item) => {
        totalGrossProfit += (item.sellingPrice - item.costPrice) * item.quantity;
      });
    });

    returns.forEach(ret => {
      ret.returnedItems.forEach((item) => {
        totalReturnedProfit += (item.sellingPrice - item.costPrice) * item.quantity;
      });
    });

    const totalNetProfit = totalGrossProfit - totalReturnedProfit;

    // ── Returns Summary ───────────────────────────────────
    const totalReturnsCount  = returns.length;
    const totalReturnAmount  = returns.reduce((s, x) => s + x.totalReturnAmount, 0);

    // ── Inventory Summary ─────────────────────────────────
    const totalProducts   = products.length;
    const lowStockProducts = products.filter(p => p.currentStock <= p.lowStockQuantity);
    const outOfStock       = products.filter(p => p.currentStock === 0);

    // ── Payment Method Breakdown ──────────────────────────
    const paymentMethodMap = { Cash: 0, 'Bank Transfer': 0, 'Online Wallets': 0 };
    sales.forEach(s => {
      if (paymentMethodMap[s.paymentMethod] !== undefined) {
        paymentMethodMap[s.paymentMethod] += s.grandTotal;
      }
    });

    const paymentMethodData = Object.entries(paymentMethodMap).map(
      ([method, amount]) => ({ method, amount })
    );

    // ── Daily Revenue Chart Data ──────────────────────────
    const dailyRevenueMap = {};
    sales.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toLocaleDateString('en-CA');
      dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + sale.grandTotal;
    });

    const dailyRevenueData = Object.entries(dailyRevenueMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    // ── Daily Profit Chart Data ───────────────────────────
    const dailyProfitMap = {};
    sales.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toLocaleDateString('en-CA');
      let saleProfit = 0;
      sale.items.forEach((item) => {
        saleProfit += (item.sellingPrice - item.costPrice) * item.quantity;
      });
      dailyProfitMap[dateKey] = (dailyProfitMap[dateKey] || 0) + saleProfit;
    });

    // Deduct returns from daily profit
    returns.forEach(ret => {
      const dateKey = new Date(ret.createdAt).toLocaleDateString('en-CA');
      let retProfit = 0;
      ret.returnedItems.forEach((item) => {
        retProfit += (item.sellingPrice - item.costPrice) * item.quantity;
      });
      if (dailyProfitMap[dateKey] !== undefined) {
        dailyProfitMap[dateKey] -= retProfit;
      }
    });

    const dailyProfitData = Object.entries(dailyProfitMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, profit]) => ({ date, profit }));

    // ── Daily Purchase Chart Data ─────────────────────────
    const dailyPurchaseMap = {};
    purchases.forEach(purchase => {
      const dateKey = new Date(purchase.createdAt).toLocaleDateString('en-CA');
      dailyPurchaseMap[dateKey] = (dailyPurchaseMap[dateKey] || 0) + purchase.grandTotal;
    });

    const dailyPurchaseData = Object.entries(dailyPurchaseMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    // ── Top 5 Selling Products ────────────────────────────
    const productSalesMap = {};
    sales.forEach(sale => {
      sale.items.forEach((item) => {
        const name = item.productName;
        if (!productSalesMap[name]) {
          productSalesMap[name] = { quantity: 0, revenue: 0 };
        }
        productSalesMap[name].quantity += item.quantity;
        productSalesMap[name].revenue  += item.lineTotal;
      });
    });

    const topProducts = Object.entries(productSalesMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // ── Response ──────────────────────────────────────────
    return res.status(200).json({
      success: true,
      period,
      summary: {
        sales: {
          totalRevenue:    +totalRevenue.toFixed(2),
          totalPaid:       +totalPaid.toFixed(2),
          totalPending:    +totalPending.toFixed(2),
          totalSalesCount
        },
        purchases: {
          totalPurchaseAmount: +totalPurchaseAmount.toFixed(2),
          totalPurchaseCount
        },
        profit: {
          totalGrossProfit:    +totalGrossProfit.toFixed(2),
          totalReturnedProfit: +totalReturnedProfit.toFixed(2),
          totalNetProfit:      +totalNetProfit.toFixed(2)
        },
        returns: {
          totalReturnsCount,
          totalReturnAmount: +totalReturnAmount.toFixed(2)
        },
        inventory: {
          totalProducts,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStock.length
        }
      },
      charts: {
        dailyRevenue:   dailyRevenueData,
        dailyProfit:    dailyProfitData,
        dailyPurchase:  dailyPurchaseData,
        paymentMethods: paymentMethodData,
        topProducts
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};