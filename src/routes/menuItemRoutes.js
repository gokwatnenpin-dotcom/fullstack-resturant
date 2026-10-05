"use strict";

const express = require("express");
const menuItemController = require("../controllers/menuItemController");
const {
  validateIdParam,
  validateMenuItemCreate,
  validateMenuItemUpdate,
} = require("../middleware/validation");

const router = express.Router();

router.post("/", validateMenuItemCreate, menuItemController.createMenuItem);
router.get("/", menuItemController.listMenuItems);
router.get("/category/:categoryId", validateIdParam("categoryId"), (req, res, next) => {
  req.query.category_id = req.params.categoryId;
  return menuItemController.listMenuItems(req, res, next);
});
router.get("/:id", validateIdParam("id"), menuItemController.getMenuItem);
router.put("/:id", validateIdParam("id"), validateMenuItemUpdate, menuItemController.updateMenuItem);
router.delete("/:id", validateIdParam("id"), menuItemController.deleteMenuItem);

module.exports = router;
