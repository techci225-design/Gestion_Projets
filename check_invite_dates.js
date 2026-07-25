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
      SELECT invited_email, status, created_at, updated_at
      FROM invitations
      WHERE organization_id = 'caac3384-fd5d-4bc6-8b1e-45616eccd7a9'
      ORDER BY created_at DESC
    `);
    
    console.log(`Invites for Groupe 3:`, res.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
