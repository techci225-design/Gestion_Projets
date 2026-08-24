require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function viewAllOps() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`SELECT id, task_code, status, planned_cost, actual_cost, operation_date, montant_engage, montant_decaisse FROM operations_journal;`);
  console.table(res.rows);
  await client.end();
}
viewAllOps();
