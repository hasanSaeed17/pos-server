const Sale       = require('../models/saleModel');
const SaleReturn = require('../models/saleReturnModel');

/* ==========================================================
   GET PROFIT REPORT
   GET /api/profits?period=&from=&to=&paymentMethod=
   ========================================================== */
exports.getProfitReport = async (req, res) => {
  try {

    const { period, from, to, paymentMethod } = req.query;
    const filter = {};

    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (period) {
      const now = new Date();
      let startDate;

      if (period === 'daily')   startDate = new Date(now.setHours(0, 0, 0, 0));
      if (period === 'weekly')  { startDate = new Date(); startDate.setDate(startDate.getDate() - 7); }
      if (period === 'monthly') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1); }

      if (startDate) filter.createdAt = { $gte: startDate };
    }

    if (from && to) {
      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    // ── Fetch sales & returns ─────────────────────────────
    const sales   = await Sale.find(filter).sort({ createdAt: 1 });
    const returns = await SaleReturn.find().populate('saleId', 'paymentMethod');

    // ── Build return map: saleId → returned items ─────────
    const returnMap = {};
    returns.forEach(ret => {
      const sid = ret.saleId?._id?.toString() || ret.saleId?.toString();
      if (!returnMap[sid]) returnMap[sid] = [];
      ret.returnedItems.forEach(ri => returnMap[sid].push(ri));
    });

    // ── Calculate profit per sale ─────────────────────────
    let totalRevenue       = 0;
    let totalCost          = 0;
    let totalReturnedProfit = 0;

    const dailyMap = {};

    const salesData = sales.map(sale => {

      const sid = sale._id.toString();

      // Gross profit from items
      let saleRevenue = 0;
      let saleCost    = 0;

      sale.items.forEach(item => {
        saleRevenue += item.sellingPrice * item.quantity;
        saleCost    += item.costPrice    * item.quantity;
      });

      // Deduct returned items profit
      let returnedProfit = 0;
      if (returnMap[sid]) {
        returnMap[sid].forEach(ri => {
          returnedProfit += (ri.sellingPrice - ri.costPrice) * ri.quantity;
        });
      }

      const grossProfit = saleRevenue - saleCost;
      const netProfit   = grossProfit - returnedProfit;

      // Daily grouping
      const dateKey = new Date(sale.createdAt).toLocaleDateString('en-CA'); // YYYY-MM-DD
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + netProfit;

      totalRevenue        += saleRevenue;
      totalCost           += saleCost;
      totalReturnedProfit += returnedProfit;

      return {
        saleCode:      sale.saleCode,
        customerName:  sale.customerName || 'Walk-in',
        paymentMethod: sale.paymentMethod,
        date:          sale.createdAt,
        grossProfit:   +grossProfit.toFixed(2),
        returnedProfit:+returnedProfit.toFixed(2),
        netProfit:     +netProfit.toFixed(2)
      };
    });

    // ── Daily chart data ──────────────────────────────────
    const dailyChartData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, profit]) => ({ date, profit: +profit.toFixed(2) }));

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue:        +totalRevenue.toFixed(2),
        totalCost:           +totalCost.toFixed(2),
        totalGrossProfit:    +(totalRevenue - totalCost).toFixed(2),
        totalReturnedProfit: +totalReturnedProfit.toFixed(2),
        totalNetProfit:      +(totalRevenue - totalCost - totalReturnedProfit).toFixed(2),
        totalSales:          sales.length
      },
      dailyChartData,
      data: salesData
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:   error.message
    });
  }
};