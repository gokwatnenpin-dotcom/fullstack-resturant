"use strict";

const crypto = require("node:crypto");
const store = require("../database/store");
const ApiError = require("../errors/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required", { code: "VALIDATION_ERROR" });
  }
  if (String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters", { code: "VALIDATION_ERROR" });
  }

  const existing = await store.findUserByEmail(String(email).toLowerCase());
  if (existing) {
    throw new ApiError(409, `Email '${email}' is already registered`, { code: "EMAIL_ALREADY_EXISTS" });
  }

  const user = await store.createUser({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    phone: phone || "",
    role: "customer",
    password_hash: hashPassword(String(password)),
  });

  res.status(201).json({ success: true, message: "Account created", data: user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required", { code: "VALIDATION_ERROR" });
  }

  const row = await store.findUserAuthByEmail(String(email).toLowerCase().trim());
  if (!row || !verifyPassword(String(password), row.password_hash)) {
    throw new ApiError(401, "Invalid email or password", { code: "INVALID_CREDENTIALS" });
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
    },
  });
});

module.exports = { register, login, hashPassword };
