"use strict";

const { ensureSchema, seedDatabase, closePool } = require("./pg");

async function runSeed() {
  try {
    console.log("Ensuring schema...");
    await ensureSchema();
    console.log("Seeding database...");
    await seedDatabase();

    // Give every seeded user a default password: their name + "1234"
    const { hashPassword } = require("../controllers/authController");
    const { query } = require("./pg");
    const { rows } = await query("SELECT id, name FROM users ORDER BY id");
    for (const u of rows) {
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        hashPassword(`${u.name}1234`),
        u.id,
      ]);
    }
    console.log(`Default passwords set for ${rows.length} users (name + "1234").`);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

runSeed();
