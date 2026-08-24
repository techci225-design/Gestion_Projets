require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function clean() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  // Disable trigger temporarily to delete test rows only
  await client.query(`ALTER TABLE evm_baselines DISABLE TRIGGER trg_evm_baselines_immutability;`);
  await client.query(`ALTER TABLE evm_baseline_items DISABLE TRIGGER trg_evm_baseline_items_immutability;`);
  await client.query(`DELETE FROM evm_baselines WHERE name LIKE 'TEST_%';`);
  await client.query(`ALTER TABLE evm_baselines ENABLE TRIGGER trg_evm_baselines_immutability;`);
  await client.query(`ALTER TABLE evm_baseline_items ENABLE TRIGGER trg_evm_baseline_items_immutability;`);
  await client.end();
  console.log("Test baselines cleaned.");
}
clean();
