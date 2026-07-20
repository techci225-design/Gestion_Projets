import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function checkView() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const res = await client.query(`
      SELECT pg_get_viewdef('v_evm_tasks', true) AS view_def;
    `)
    console.log(res.rows[0].view_def)
  } finally {
    await client.end()
  }
}
checkView()
