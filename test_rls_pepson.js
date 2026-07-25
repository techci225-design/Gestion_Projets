const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function test() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    // Get user id
    const uRes = await client.query(`SELECT id FROM profiles WHERE email = 'pepson201920@gmail.com'`);
    const userId = uRes.rows[0].id;
    
    await client.query(`
      set local role authenticated;
      set local "request.jwt.claim.sub" = '${userId}';
    `);
    
    const res = await client.query(`SELECT id, name FROM projects`);
    console.log("Projects visible to pepson:", res.rows);
    
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
test();
