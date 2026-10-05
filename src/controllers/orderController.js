"use strict";

const store = require("../database/store");
const ApiError = require("../errors/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const createOrder = asyncHandler(async (req, res) => {
  const order = await store.createOrder(req.validatedBody);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: order,
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const filters = {
    user_id: req.query.user_id,
    status: req.query.status,
  };

  const orders = await store.listOrders(filters);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await store.findOrderById(req.validatedParams.id);

  if (!order) {
    throw new ApiError(404, `Order with ID ${req.validatedParams.id} not found`, {
      code: "ORDER_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

const updateOrder = asyncHandler(async (req, res) => {
  const existing = await store.findOrderById(req.validatedParams.id);

  if (!existing) {
    throw new ApiError(404, `Order with ID ${req.validatedParams.id} not found`, {
      code: "ORDER_NOT_FOUND",
    });
  }

  const updated = await store.updateOrder(req.validatedParams.id, req.validatedBody);

  res.status(200).json({
    success: true,
    message: "Order updated successfully",
    data: updated,
  });
});

const deleteOrder = asyncHandler(async (req, res) => {
  const existing = await store.findOrderById(req.validatedParams.id);

  if (!existing) {
    throw new ApiError(404, `Order with ID ${req.validatedParams.id} not found`, {
      code: "ORDER_NOT_FOUND",
    });
  }

  await store.deleteOrder(req.validatedParams.id);

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
    data: { id: req.validatedParams.id },
  });
});

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrder,
  deleteOrder,
};
