require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditEnum() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const enumRes = await client.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'operation_status'
    ORDER BY enumsortorder;
  `);
  console.log("Valeurs de l'enum operation_status :");
  console.table(enumRes.rows);

  await client.end();
}

auditEnum().catch(console.error);
