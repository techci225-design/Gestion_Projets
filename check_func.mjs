import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function checkPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const res = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'fn_user_role';
    `)
    console.log(res.rows[0].pg_get_functiondef)
  } finally {
    await client.end()
  }
}
checkPolicies()
