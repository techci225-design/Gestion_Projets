require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function checkBankTables() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%bank%';
  `);
  console.log("=== TABLES BANCAIRES EXISTANTES ===");
  console.table(res.rows);

  await client.end();
}
checkBankTables();
