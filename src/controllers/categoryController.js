"use strict";

const store = require("../database/store");
const ApiError = require("../errors/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const createCategory = asyncHandler(async (req, res) => {
  const category = await store.createCategory(req.validatedBody);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await store.listCategories();

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await store.findCategoryById(req.validatedParams.id);

  if (!category) {
    throw new ApiError(404, `Category with ID ${req.validatedParams.id} not found`, {
      code: "CATEGORY_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await store.findCategoryById(req.validatedParams.id);
  if (!category) {
    throw new ApiError(404, `Category with ID ${req.validatedParams.id} not found`, {
      code: "CATEGORY_NOT_FOUND",
    });
  }

  const updated = await store.updateCategory(req.validatedParams.id, req.validatedBody);

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: updated,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await store.deleteCategory(req.validatedParams.id);

  if (!category) {
    throw new ApiError(404, `Category with ID ${req.validatedParams.id} not found`, {
      code: "CATEGORY_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
    data: category,
  });
});

module.exports = {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
