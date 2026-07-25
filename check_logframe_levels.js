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
      SELECT DISTINCT level 
      FROM logframe_items 
    `);
    console.log("Distinct levels in DB:", res.rows.map(r => r.level));
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
