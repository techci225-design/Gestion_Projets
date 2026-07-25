const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    const projectId = 'c94bc799-fd38-4140-9039-5faf496d3a4d';
    const res = await client.query(`
      SELECT p.email, pm.role
      FROM project_members pm
      JOIN profiles p ON pm.user_id = p.id
      WHERE pm.project_id = $1
    `, [projectId]);
    
    console.log(`Members of Project EDUCATIF EN HAITI:`, res.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
