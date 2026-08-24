require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function checkDisbTriggers() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'operation_disbursements';
  `);
  console.log("=== TRIGGERS SUR operation_disbursements ===");
  console.table(res.rows);

  const rls = await client.query(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'operation_disbursements';
  `);
  console.log("=== POLICIES RLS SUR operation_disbursements ===");
  console.table(rls.rows);

  await client.end();
}
checkDisbTriggers();
