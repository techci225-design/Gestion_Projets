require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditFnUserRole() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const fnRes = await client.query(`
    SELECT pg_get_functiondef('fn_user_role(uuid)'::regprocedure) as def;
  `);
  console.log("Définition de fn_user_role(project_id) :");
  console.log(fnRes.rows[0]?.def);

  await client.end();
}

auditFnUserRole().catch(console.error);
