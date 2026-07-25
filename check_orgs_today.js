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
      SELECT o.id, o.name, o.created_at, p.email
      FROM organizations o
      LEFT JOIN organization_members om ON o.id = om.organization_id AND om.org_role = 'owner'
      LEFT JOIN profiles p ON om.user_id = p.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    res.rows.forEach(r => console.log(`${r.name} created by ${r.email} at ${r.created_at}`));
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
