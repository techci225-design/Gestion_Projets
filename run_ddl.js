require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function runDDL() {
  const connectionString = process.env.DATABASE_URL; // or construct it from supabase url if not present. Wait, usually DATABASE_URL is there.
  if (!connectionString) {
    console.error("DATABASE_URL is missing");
    return;
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    await client.query(`
      ALTER TABLE public.operations_journal ADD COLUMN IF NOT EXISTS operation_date DATE;
      UPDATE public.operations_journal SET operation_date = DATE(created_at) WHERE operation_date IS NULL;
    `);

    console.log("DDL executed successfully.");
  } catch (err) {
    console.error("Error executing DDL:", err);
  } finally {
    await client.end();
  }
}

runDDL();
