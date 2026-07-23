const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  console.log("No .env.local found");
}

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE logframe_items 
      ADD COLUMN IF NOT EXISTS s1_value TEXT,
      ADD COLUMN IF NOT EXISTS s2_value TEXT,
      ADD COLUMN IF NOT EXISTS s3_value TEXT;
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed", err);
  } finally {
    await client.end();
  }
}
run();
