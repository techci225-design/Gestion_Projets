require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing in .env.local");
    return;
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260824000000_evm_baselines_foundation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log("Migration 20260824000000_evm_baselines_foundation.sql applied successfully!");
  } catch (err) {
    console.error("Error applying migration:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
