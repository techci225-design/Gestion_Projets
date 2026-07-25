const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    const email = 'pepson201920@gmail.com';
    const res2 = await client.query(`
      SELECT organization_id, status
      FROM invitations
      WHERE invited_email = $1
    `, [email]);
    console.log(`Invites for ${email}:`, res2.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
