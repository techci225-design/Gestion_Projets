const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function check() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });
  try {
    await client.connect();
    
    // get one logframe item
    const res = await client.query(`SELECT id FROM logframe_items LIMIT 1`);
    if (res.rows.length > 0) {
      const id = res.rows[0].id;
      console.log("Found item", id);
      const updateRes = await client.query(`UPDATE logframe_items SET s1_value = 'test_value' WHERE id = $1 RETURNING *`, [id]);
      console.log("Update result", updateRes.rows[0].s1_value);
    } else {
      console.log("No items found");
    }
  } catch (err) {
    console.error("Failed", err);
  } finally {
    await client.end();
  }
}
check();
