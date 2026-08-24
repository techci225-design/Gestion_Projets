require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditJournalSchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== 1. COLONNES DE operations_journal ===");
  const colsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default, is_generated, generation_expression
    FROM information_schema.columns
    WHERE table_name = 'operations_journal'
    ORDER BY ordinal_position;
  `);
  console.table(colsRes.rows);

  console.log("\n=== 2. CONTRAINTES & CLES ETRANGERES ===");
  const constrRes = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'operations_journal'::regclass;
  `);
  console.table(constrRes.rows);

  console.log("\n=== 3. INDEXES ===");
  const idxRes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'operations_journal';
  `);
  console.table(idxRes.rows);

  console.log("\n=== 4. TRIGGERS ===");
  const trgRes = await client.query(`
    SELECT tgname, pg_get_triggerdef(oid) as def
    FROM pg_trigger
    WHERE tgrelid = 'operations_journal'::regclass AND NOT tgisinternal;
  `);
  console.table(trgRes.rows);

  console.log("\n=== 5. RLS POLICIES ===");
  const polRes = await client.query(`
    SELECT polname, polcmd, polroles::regrole[], polqual, polwithcheck
    FROM pg_policy
    WHERE polrelid = 'operations_journal'::regclass;
  `);
  console.table(polRes.rows);

  console.log("\n=== 6. DEFINITION DE LA VUE v_budget_consumption ===");
  const viewRes = await client.query(`
    SELECT pg_get_viewdef('v_budget_consumption'::regclass, true) as view_def;
  `);
  console.log(viewRes.rows[0]?.view_def);

  await client.end();
}

auditJournalSchema().catch(console.error);
