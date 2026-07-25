const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE logframe_items 
      ADD COLUMN IF NOT EXISTS s1_value text,
      ADD COLUMN IF NOT EXISTS s2_value text,
      ADD COLUMN IF NOT EXISTS s3_value text;
    `);
    
    console.log("Columns added successfully");
    
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
run();
