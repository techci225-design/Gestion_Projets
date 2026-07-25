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
      SELECT name, created_at
      FROM projects
      WHERE id = 'c94bc799-fd38-4140-9039-5faf496d3a4d'
    `);
    
    console.log(`Project:`, res.rows[0]);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
