require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditExistingJournalData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== AUDIT DES DONNÉES EXISTANTES DANS operations_journal ===");

  const countTotal = await client.query(`SELECT count(*) FROM operations_journal;`);
  console.log("Nombre total d'opérations :", countTotal.rows[0].count);

  const countDecaisse = await client.query(`SELECT count(*) FROM operations_journal WHERE status = 'decaisse';`);
  console.log("Nombre d'opérations 'decaisse' :", countDecaisse.rows[0].count);

  const invalidDecaisse = await client.query(`
    SELECT id, project_id, task_code, planned_cost, actual_cost, operation_date, status
    FROM operations_journal
    WHERE status = 'decaisse'
      AND (actual_cost IS NULL OR actual_cost <= 0 OR operation_date IS NULL);
  `);
  console.log("Nombre d'opérations 'decaisse' INVALIDES (actual_cost NULL/<=0 ou operation_date NULL) :", invalidDecaisse.rows.length);
  if (invalidDecaisse.rows.length > 0) {
    console.table(invalidDecaisse.rows);
  }

  await client.end();
}

auditExistingJournalData().catch(console.error);
