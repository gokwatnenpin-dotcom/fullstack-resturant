"use strict";

const express = require("express");
const categoryController = require("../controllers/categoryController");
const {
  validateIdParam,
  validateCategoryCreate,
  validateCategoryUpdate,
} = require("../middleware/validation");

const router = express.Router();

router.post("/", validateCategoryCreate, categoryController.createCategory);
router.get("/", categoryController.listCategories);
router.get("/:id", validateIdParam("id"), categoryController.getCategory);
router.put("/:id", validateIdParam("id"), validateCategoryUpdate, categoryController.updateCategory);
router.delete("/:id", validateIdParam("id"), categoryController.deleteCategory);

module.exports = router;
