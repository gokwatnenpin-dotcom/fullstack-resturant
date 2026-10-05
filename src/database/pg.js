"use strict";

const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../config/env");

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
});

async function ensureSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);
  console.log("Database schema verified / initialized.");
}

async function seedDatabase() {
  const seedPath = path.join(__dirname, "seed.sql");
  const seedSql = fs.readFileSync(seedPath, "utf8");
  await pool.query(seedSql);
  console.log("Database seed data applied successfully.");
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  ensureSchema,
  seedDatabase,
  closePool,
};
