"use strict";

const express = require("express");
const orderController = require("../controllers/orderController");
const {
  validateIdParam,
  validateOrderCreate,
  validateOrderUpdate,
} = require("../middleware/validation");

const router = express.Router();

router.post("/", validateOrderCreate, orderController.createOrder);
router.get("/", orderController.listOrders);
router.get("/:id", validateIdParam("id"), orderController.getOrder);
router.put("/:id", validateIdParam("id"), validateOrderUpdate, orderController.updateOrder);
router.delete("/:id", validateIdParam("id"), orderController.deleteOrder);

module.exports = router;
