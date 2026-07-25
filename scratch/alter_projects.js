const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    // Check if columns exist
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
    `);
    const cols = res.rows.map(r => r.column_name);
    
    if (!cols.includes('budget')) {
      console.log('Adding budget column...');
      await client.query(`ALTER TABLE projects ADD COLUMN budget NUMERIC;`);
    }
    if (!cols.includes('funder')) {
      console.log('Adding funder column...');
      await client.query(`ALTER TABLE projects ADD COLUMN funder TEXT;`);
    }
    if (!cols.includes('implementing_agency')) {
      console.log('Adding implementing_agency column...');
      await client.query(`ALTER TABLE projects ADD COLUMN implementing_agency TEXT;`);
    }
    
    console.log("Migration complete. Updated 'projects' table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
