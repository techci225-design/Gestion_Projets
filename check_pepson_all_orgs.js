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
    const res = await client.query(`
      SELECT o.id, o.name, om.org_role, o.created_at
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id
      JOIN profiles p ON om.user_id = p.id
      WHERE p.email = $1
    `, [email]);
    
    console.log(`All orgs for ${email}:`, res.rows);
    
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
