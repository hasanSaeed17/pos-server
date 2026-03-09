const express = require("express");

const router = express.Router();

const {
  createAdjustment,
  getAdjustments
} = require("../controllers/inventoryAdjustmentController");

router.post("/", createAdjustment);

router.get("/", getAdjustments);

module.exports = router;