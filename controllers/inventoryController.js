const Product = require("../models/productModel");

exports.getInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      supplier,
      sortField = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const query = {};

    // search
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // filter by category
    if (category) {
      query.category = category;
    }

    // filter by supplier
    if (supplier) {
      query.supplierId = supplier;
    }

    const products = await Product.find(query)
      .populate("supplierId", "name")
      .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      data: products,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};