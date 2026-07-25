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
      SELECT o.id, o.name, COUNT(om.user_id) as members_count
      FROM organizations o
      LEFT JOIN organization_members om ON o.id = om.organization_id
      GROUP BY o.id, o.name
      ORDER BY members_count DESC
    `);
    res.rows.forEach(r => console.log(`${r.name} (${r.id}): ${r.members_count} members`));
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
