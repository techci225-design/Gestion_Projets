require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditDetails() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== COLONNES ===");
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default, is_generated, generation_expression
    FROM information_schema.columns
    WHERE table_name = 'operations_journal'
    ORDER BY ordinal_position;
  `);
  cols.rows.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n=== CONTRAINTES ===");
  const constrs = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'operations_journal'::regclass;
  `);
  constrs.rows.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n=== TRIGGERS ===");
  const trgs = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) as def
    FROM pg_trigger
    WHERE tgrelid = 'operations_journal'::regclass AND NOT tgisinternal;
  `);
  trgs.rows.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n=== RLS POLICIES ===");
  const policies = await client.query(`
    SELECT polname, polcmd, polroles::regrole[], polqual, polwithcheck
    FROM pg_policy
    WHERE polrelid = 'operations_journal'::regclass;
  `);
  policies.rows.forEach(r => console.log(JSON.stringify(r)));

  await client.end();
}

auditDetails().catch(console.error);
