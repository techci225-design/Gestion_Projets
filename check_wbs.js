require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  return client.query(`SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'wbs_tasks'`);
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
