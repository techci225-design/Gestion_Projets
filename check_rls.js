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
      SELECT cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'logframe_items';
    `);
    console.log("Policies:", res.rows);
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
