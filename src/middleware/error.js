"use strict";

const ApiError = require("../errors/ApiError");

function notFoundHandler(req, res, next) {
  next(
    new ApiError(404, `Route not found: ${req.method} ${req.originalUrl || req.path}`, {
      code: "ROUTE_NOT_FOUND",
    })
  );
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let normalizedError = error;

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    normalizedError = new ApiError(400, "Request body contains invalid JSON", {
      code: "INVALID_JSON",
    });
  }

  // Handle common Postgres errors
  if (error && error.code) {
    if (error.code === "23505") {
      // Unique constraint violation
      normalizedError = new ApiError(409, error.detail || "Unique constraint violation", {
        code: "UNIQUE_VIOLATION",
        details: error.detail,
      });
    } else if (error.code === "23503") {
      // Foreign key violation
      normalizedError = new ApiError(400, error.detail || "Referenced entity does not exist or is constrained", {
        code: "FOREIGN_KEY_VIOLATION",
        details: error.detail,
      });
    } else if (error.code === "22P02") {
      // Invalid text representation (e.g. invalid integer syntax)
      normalizedError = new ApiError(400, "Invalid parameter or numeric value provided", {
        code: "INVALID_INPUT_SYNTAX",
      });
    }
  }

  const statusCode = Number.isInteger(normalizedError.statusCode)
    ? normalizedError.statusCode
    : 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error("Unhandled Error:", normalizedError);
  }

  const response = {
    success: false,
    error: {
      code: isServerError ? "INTERNAL_SERVER_ERROR" : normalizedError.code || "API_ERROR",
      message: isServerError ? "Internal server error" : normalizedError.message,
    },
  };

  if (!isServerError && normalizedError.details !== undefined) {
    response.error.details = normalizedError.details;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
