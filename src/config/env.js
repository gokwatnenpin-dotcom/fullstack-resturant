"use strict";

const path = require("node:path");
const dotenv = require("dotenv");

const projectRoot = path.resolve(__dirname, "../..");

dotenv.config({
  path: path.join(projectRoot, ".env"),
  quiet: true,
});

function readInteger(name, fallback, { min, max }) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }

  return value;
}

function readHost(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const host = rawValue.trim();

  if (!host) {
    throw new Error(`${name} cannot be blank`);
  }

  return host;
}

const nodeEnv = process.env.NODE_ENV || "development";

const database = Object.freeze({
  host: readHost("PGHOST", "127.0.0.1"),
  port: readInteger("PGPORT", 5432, { min: 1, max: 65535 }),
  user: readHost("PGUSER", "postgres"),
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "resturant_db",
});

module.exports = Object.freeze({
  projectRoot,
  nodeEnv,
  isTest: nodeEnv === "test",
  host: readHost("HOST", "127.0.0.1"),
  port: readInteger("PORT", 5000, { min: 1, max: 65535 }),
  database,
});
