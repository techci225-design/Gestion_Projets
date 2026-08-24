require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function apply() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260824000001_single_approved_baseline_invariant.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
  console.log("Migration 20260824000001 applied successfully!");
  await client.end();
}
apply();
