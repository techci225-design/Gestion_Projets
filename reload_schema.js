const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema reloaded");
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
