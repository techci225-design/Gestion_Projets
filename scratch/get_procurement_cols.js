require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function getCols() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'procurement_plan' 
    ORDER BY ordinal_position;
  `);
  console.log("=== COLONNES EXACTES DE procurement_plan ===");
  console.table(res.rows);

  await client.end();
}
getCols();
