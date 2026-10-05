"use strict";

const express = require("express");
const userController = require("../controllers/userController");
const {
  validateIdParam,
  validateUserCreate,
  validateUserUpdate,
} = require("../middleware/validation");

const router = express.Router();

router.post("/", validateUserCreate, userController.createUser);
router.get("/", userController.listUsers);
router.get("/:id", validateIdParam("id"), userController.getUser);
router.put("/:id", validateIdParam("id"), validateUserUpdate, userController.updateUser);
router.delete("/:id", validateIdParam("id"), userController.deleteUser);

module.exports = router;
