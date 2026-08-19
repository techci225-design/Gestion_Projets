require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  return client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
  `);
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
