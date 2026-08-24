require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function checkBackfill() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT od.id, od.operation_id, od.amount, od.disbursement_date, od.reference_piece, od.external_reference, oj.task_code
    FROM operation_disbursements od
    JOIN operations_journal oj ON oj.id = od.operation_id;
  `);
  console.log("=== ENREGISTREMENTS DANS operation_disbursements ===");
  console.table(res.rows);

  const sumActual = await client.query(`SELECT SUM(actual_cost) as total FROM operations_journal WHERE status = 'decaisse';`);
  const sumDisb = await client.query(`SELECT SUM(amount) as total FROM operation_disbursements;`);

  console.log("SUM(actual_cost decaisse) :", sumActual.rows[0].total);
  console.log("SUM(disbursements amount) :", sumDisb.rows[0].total);

  await client.end();
}
checkBackfill();
