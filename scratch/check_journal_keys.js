require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function checkJournalKeys() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'operations_journal'::regclass;
  `);
  console.table(res.rows);
  await client.end();
}
checkJournalKeys();
