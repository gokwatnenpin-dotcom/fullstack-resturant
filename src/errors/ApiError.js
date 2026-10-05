"use strict";

class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code || "API_ERROR";
    this.details = options.details;

    Error.captureStackTrace(this, ApiError);
  }
}

module.exports = ApiError;
