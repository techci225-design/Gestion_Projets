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
      SELECT p.email, om.org_role
      FROM organization_members om
      JOIN profiles p ON om.user_id = p.id
      WHERE om.organization_id = $1
    `, [orgId]);
    
    console.log(`Members of Groupe 3:`, res.rows);
    
    // Check pending invites for Groupe 3
    const res2 = await client.query(`
      SELECT invited_email, status
      FROM invitations
      WHERE organization_id = $1
    `, [orgId]);
    console.log(`Invites for Groupe 3:`, res2.rows);
    
    // Find empty orgs created by members of Groupe 3 or people invited to Groupe 3
    const res3 = await client.query(`
      SELECT o.id, o.name, p.email
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      JOIN profiles p ON om.user_id = p.id
      WHERE p.email IN (SELECT invited_email FROM invitations WHERE organization_id = $1)
      AND o.id != $1
    `, [orgId]);
    console.log(`Other orgs created by invitees of Groupe 3:`, res3.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
