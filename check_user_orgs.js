const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    const emails = ['kassidivine7@gmail.com', 'pepson201920@gmail.com', 'bensilue45@gmail.com'];
    
    for (const email of emails) {
      console.log(`Checking orgs for ${email}...`);
      const res = await client.query(`
        SELECT o.id, o.name, p.email
        FROM organization_members om
        JOIN organizations o ON om.organization_id = o.id
        JOIN profiles p ON om.user_id = p.id
        WHERE p.email = $1
      `, [email]);
      
      res.rows.forEach(r => console.log(`  - Org: ${r.name} (ID: ${r.id})`));
    }
    
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
