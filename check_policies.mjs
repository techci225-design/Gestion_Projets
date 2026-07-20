import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function checkPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const res = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'budget_lines';
    `)
    console.log(JSON.stringify(res.rows, null, 2))
  } finally {
    await client.end()
  }
}
checkPolicies()
