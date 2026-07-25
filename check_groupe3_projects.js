const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    const orgId = 'caac3384-fd5d-4bc6-8b1e-45616eccd7a9';
    const res = await client.query(`
      SELECT id, name
      FROM projects
      WHERE organization_id = $1
    `, [orgId]);
    
    console.log(`Projects of Groupe 3:`, res.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
