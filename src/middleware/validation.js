"use strict";

const ApiError = require("../errors/ApiError");

function validateIdParam(paramName = "id") {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const parsed = Number(raw);

    if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
      return next(
        new ApiError(400, `Invalid ${paramName} parameter: must be a positive integer`, {
          code: "INVALID_ID_PARAM",
        })
      );
    }

    req.validatedParams = req.validatedParams || {};
    req.validatedParams[paramName] = parsed;
    next();
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUserCreate(req, res, next) {
  const { name, email, phone, role } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new ApiError(400, "Field 'name' is required and must be a non-empty string"));
  }

  if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
    return next(new ApiError(400, "Field 'email' is required and must be a valid email address"));
  }

  req.validatedBody = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone && typeof phone === "string" ? phone.trim() : null,
    role: role && typeof role === "string" ? role.trim() : "customer",
    password: req.body.password && typeof req.body.password === "string" ? req.body.password : undefined,
  };

  next();
}

function validateUserUpdate(req, res, next) {
  const { name, email, phone, role } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return next(new ApiError(400, "'name' must be a non-empty string"));
    }
    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !isValidEmail(email.trim())) {
      return next(new ApiError(400, "'email' must be a valid email address"));
    }
    updates.email = email.trim().toLowerCase();
  }

  if (phone !== undefined) {
    updates.phone = phone && typeof phone === "string" ? phone.trim() : null;
  }

  if (role !== undefined) {
    if (typeof role !== "string" || !role.trim()) {
      return next(new ApiError(400, "'role' must be a non-empty string"));
    }
    updates.role = role.trim();
  }

  if (Object.keys(updates).length === 0) {
    return next(new ApiError(400, "At least one field (name, email, phone, role) must be provided for update"));
  }

  req.validatedBody = updates;
  next();
}

function validateCategoryCreate(req, res, next) {
  const { name, description } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new ApiError(400, "Field 'name' is required for category"));
  }

  req.validatedBody = {
    name: name.trim(),
    description: description && typeof description === "string" ? description.trim() : "",
  };

  next();
}

function validateCategoryUpdate(req, res, next) {
  const { name, description } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return next(new ApiError(400, "'name' must be a non-empty string"));
    }
    updates.name = name.trim();
  }

  if (description !== undefined) {
    updates.description = typeof description === "string" ? description.trim() : "";
  }

  if (Object.keys(updates).length === 0) {
    return next(new ApiError(400, "At least one field (name, description) must be provided for update"));
  }

  req.validatedBody = updates;
  next();
}

function validateMenuItemCreate(req, res, next) {
  const { category_id, name, description, price, is_available } = req.body;

  if (!category_id || !Number.isInteger(Number(category_id)) || Number(category_id) <= 0) {
    return next(new ApiError(400, "Field 'category_id' must be a valid positive integer"));
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new ApiError(400, "Field 'name' is required for menu item"));
  }

  const numPrice = Number(price);
  if (price === undefined || Number.isNaN(numPrice) || numPrice < 0) {
    return next(new ApiError(400, "Field 'price' must be a non-negative number"));
  }

  req.validatedBody = {
    category_id: Number(category_id),
    name: name.trim(),
    description: description && typeof description === "string" ? description.trim() : "",
    price: Number(numPrice.toFixed(2)),
    is_available: is_available !== undefined ? Boolean(is_available) : true,
  };

  next();
}

function validateMenuItemUpdate(req, res, next) {
  const { category_id, name, description, price, is_available } = req.body;
  const updates = {};

  if (category_id !== undefined) {
    if (!Number.isInteger(Number(category_id)) || Number(category_id) <= 0) {
      return next(new ApiError(400, "'category_id' must be a positive integer"));
    }
    updates.category_id = Number(category_id);
  }

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return next(new ApiError(400, "'name' cannot be empty"));
    }
    updates.name = name.trim();
  }

  if (description !== undefined) {
    updates.description = typeof description === "string" ? description.trim() : "";
  }

  if (price !== undefined) {
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice < 0) {
      return next(new ApiError(400, "'price' must be a non-negative number"));
    }
    updates.price = Number(numPrice.toFixed(2));
  }

  if (is_available !== undefined) {
    updates.is_available = Boolean(is_available);
  }

  if (Object.keys(updates).length === 0) {
    return next(new ApiError(400, "At least one field must be provided for update"));
  }

  req.validatedBody = updates;
  next();
}

function validateOrderCreate(req, res, next) {
  const { user_id, table_number, notes, items } = req.body;

  if (!user_id || !Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
    return next(new ApiError(400, "Field 'user_id' must be a valid positive integer"));
  }

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ApiError(400, "Field 'items' must be a non-empty array of order items"));
  }

  const validatedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const menuItemId = Number(item.menu_item_id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return next(new ApiError(400, `Item at index ${i}: 'menu_item_id' must be a valid positive integer`));
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return next(new ApiError(400, `Item at index ${i}: 'quantity' must be a positive integer (>= 1)`));
    }

    validatedItems.push({
      menu_item_id: menuItemId,
      quantity,
    });
  }

  req.validatedBody = {
    user_id: Number(user_id),
    table_number: table_number !== undefined && table_number !== null ? Number(table_number) : null,
    notes: notes && typeof notes === "string" ? notes.trim() : "",
    items: validatedItems,
  };

  next();
}

function validateOrderUpdate(req, res, next) {
  const { status, table_number, notes } = req.body;
  const updates = {};

  const allowedStatuses = ["pending", "in-progress", "completed", "cancelled"];

  if (status !== undefined) {
    if (typeof status !== "string" || !allowedStatuses.includes(status.toLowerCase())) {
      return next(new ApiError(400, `'status' must be one of: ${allowedStatuses.join(", ")}`));
    }
    updates.status = status.toLowerCase();
  }

  if (table_number !== undefined) {
    updates.table_number = table_number !== null ? Number(table_number) : null;
  }

  if (notes !== undefined) {
    updates.notes = typeof notes === "string" ? notes.trim() : "";
  }

  if (Object.keys(updates).length === 0) {
    return next(new ApiError(400, "At least one field (status, table_number, notes) must be provided for update"));
  }

  req.validatedBody = updates;
  next();
}

module.exports = {
  validateIdParam,
  validateUserCreate,
  validateUserUpdate,
  validateCategoryCreate,
  validateCategoryUpdate,
  validateMenuItemCreate,
  validateMenuItemUpdate,
  validateOrderCreate,
  validateOrderUpdate,
};
