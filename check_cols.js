const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({connectionString: process.env.DIRECT_URL});
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'logframe_items'")).then(res => console.log(res.rows.map(r=>r.column_name))).finally(() => client.end());
