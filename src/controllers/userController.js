"use strict";

const store = require("../database/store");
const ApiError = require("../errors/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const { hashPassword } = require("./authController");

const createUser = asyncHandler(async (req, res) => {
  const existing = await store.findUserByEmail(req.validatedBody.email);
  if (existing) {
    throw new ApiError(409, `User with email '${req.validatedBody.email}' already exists`, {
      code: "EMAIL_ALREADY_EXISTS",
    });
  }

  const payload = { ...req.validatedBody };
  delete payload.password;
  if (req.validatedBody.password) {
    if (req.validatedBody.password.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters", { code: "VALIDATION_ERROR" });
    }
    payload.password_hash = hashPassword(req.validatedBody.password);
  }

  const user = await store.createUser(payload);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await store.listUsers();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await store.findUserById(req.validatedParams.id);

  if (!user) {
    throw new ApiError(404, `User with ID ${req.validatedParams.id} not found`, {
      code: "USER_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await store.findUserById(req.validatedParams.id);
  if (!user) {
    throw new ApiError(404, `User with ID ${req.validatedParams.id} not found`, {
      code: "USER_NOT_FOUND",
    });
  }

  if (req.validatedBody.email && req.validatedBody.email !== user.email) {
    const existing = await store.findUserByEmail(req.validatedBody.email);
    if (existing) {
      throw new ApiError(409, `User with email '${req.validatedBody.email}' already exists`, {
        code: "EMAIL_ALREADY_EXISTS",
      });
    }
  }

  const updated = await store.updateUser(req.validatedParams.id, req.validatedBody);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: updated,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await store.deleteUser(req.validatedParams.id);

  if (!user) {
    throw new ApiError(404, `User with ID ${req.validatedParams.id} not found`, {
      code: "USER_NOT_FOUND",
    });
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: user,
  });
});

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
};
