require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditProcurementSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("\n=== STRUCTURE DE LA TABLE procurement_plan ===");
  const colsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procurement_plan'
    ORDER BY ordinal_position;
  `);
  console.table(colsRes.rows);

  console.log("\n=== DONNÉES EXISTANTES DANS procurement_plan ===");
  const dataRes = await client.query(`SELECT * FROM procurement_plan;`);
  console.table(dataRes.rows);

  await client.end();
}

auditProcurementSchema();
