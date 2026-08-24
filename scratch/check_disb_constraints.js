require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function checkDisb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'operation_disbursements'::regclass;
  `);
  console.log("=== CONTRAINTES SUR operation_disbursements ===");
  console.table(res.rows);

  const idx = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'operation_disbursements';
  `);
  console.log("=== INDEX SUR operation_disbursements ===");
  console.table(idx.rows);

  await client.end();
}
checkDisb();
