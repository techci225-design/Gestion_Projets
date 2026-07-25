const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, parent_id, level, intervention_label, indicator 
      FROM logframe_items 
      ORDER BY created_at ASC
    `);
    console.log("Logframe items:");
    res.rows.forEach(r => {
      console.log(`${r.level}: ${r.intervention_label} | Ind: ${r.indicator} (parent: ${r.parent_id})`);
    });
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
