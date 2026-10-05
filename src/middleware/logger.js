"use strict";

const config = require("../config/env");

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.path,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      })
    );
  });

  next();
}

function requestLoggerMiddleware(req, res, next) {
  if (config.isTest) {
    return next();
  }
  return requestLogger(req, res, next);
}

module.exports = requestLoggerMiddleware;
