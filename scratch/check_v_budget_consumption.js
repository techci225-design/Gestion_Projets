const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    console.log("--- v_budget_consumption ---");
    const res1 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'v_budget_consumption'
    `);
    console.table(res1.rows);

  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
