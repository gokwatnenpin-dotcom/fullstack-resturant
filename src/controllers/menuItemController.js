"use strict";

const store = require("../database/store");
const ApiError = require("../errors/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const createMenuItem = asyncHandler(async (req, res) => {
  const category = await store.findCategoryById(req.validatedBody.category_id);
  if (!category) {
    throw new ApiError(404, `Category with ID ${req.validatedBody.category_id} not found`, {
      code: "CATEGORY_NOT_FOUND",
    });
  }

  const menuItem = await store.createMenuItem(req.validatedBody);

  res.status(201).json({
    success: true,
    message: "Menu item created successfully",
    data: menuItem,
  });
});

const listMenuItems = asyncHandler(async (req, res) => {
  const filters = {
    category_id: req.query.category_id,
    is_available: req.query.is_available,
    search: req.query.search,
  };

  const menuItems = await store.listMenuItems(filters);

  res.status(200).json({
    success: true,
    count: menuItems.length,
    data: menuItems,
  });
});

const getMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await store.findMenuItemById(req.validatedParams.id);

  if (!menuItem) {
    throw new ApiError(404, `Menu item with ID ${req.validatedParams.id} not found`, {
      code: "MENU_ITEM_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    data: menuItem,
  });
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const existing = await store.findMenuItemById(req.validatedParams.id);
  if (!existing) {
    throw new ApiError(404, `Menu item with ID ${req.validatedParams.id} not found`, {
      code: "MENU_ITEM_NOT_FOUND",
    });
  }

  if (req.validatedBody.category_id !== undefined) {
    const category = await store.findCategoryById(req.validatedBody.category_id);
    if (!category) {
      throw new ApiError(404, `Category with ID ${req.validatedBody.category_id} not found`, {
        code: "CATEGORY_NOT_FOUND",
      });
    }
  }

  const updated = await store.updateMenuItem(req.validatedParams.id, req.validatedBody);

  res.status(200).json({
    success: true,
    message: "Menu item updated successfully",
    data: updated,
  });
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await store.deleteMenuItem(req.validatedParams.id);

  if (!menuItem) {
    throw new ApiError(404, `Menu item with ID ${req.validatedParams.id} not found`, {
      code: "MENU_ITEM_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    message: "Menu item deleted successfully",
    data: menuItem,
  });
});

module.exports = {
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
