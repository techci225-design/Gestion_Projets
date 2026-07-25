const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    // Find all pending invitations where the user has already registered
    const res = await client.query(`
      SELECT i.id as inv_id, i.organization_id, i.project_id, i.invited_role, p.id as user_id, p.email
      FROM invitations i
      JOIN profiles p ON lower(i.invited_email) = lower(p.email)
      WHERE i.status = 'pending'
    `);
    
    if (res.rows.length === 0) {
      console.log("No pending invitations matching existing users.");
      return;
    }

    console.log(`Found ${res.rows.length} pending invitations for existing users.`);

    for (const row of res.rows) {
      console.log(`Processing invitation for ${row.email}...`);
      
      // 1. Add to organization
      await client.query(`
        INSERT INTO organization_members (organization_id, user_id, org_role)
        VALUES ($1, $2, 'member')
        ON CONFLICT (organization_id, user_id) DO NOTHING
      `, [row.organization_id, row.user_id]);

      // 2. Add to project if exists
      if (row.project_id) {
        await client.query(`
          INSERT INTO project_members (project_id, user_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
        `, [row.project_id, row.user_id, row.invited_role]);
      }

      // 3. Mark invitation as accepted
      await client.query(`
        UPDATE invitations SET status = 'accepted' WHERE id = $1
      `, [row.inv_id]);

      console.log(`Successfully accepted invitation for ${row.email}`);
    }
    
    console.log("All done.");
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
run();
