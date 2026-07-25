const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    const email = 'kassidivine7@gmail.com';
    const res = await client.query(`
      SELECT o.id, o.name, om.org_role
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id
      JOIN profiles p ON om.user_id = p.id
      WHERE p.email = $1
    `, [email]);
    
    console.log(`Orgs for ${email}:`, res.rows);
    
    const res2 = await client.query(`
      SELECT * FROM invitations WHERE invited_email = $1
    `, [email]);
    console.log(`Invites for ${email}:`, res2.rows.map(r => ({ org: r.organization_id, status: r.status })));
    
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
