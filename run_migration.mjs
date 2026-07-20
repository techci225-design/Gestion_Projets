import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function runMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const sql = fs.readFileSync(path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets\\supabase\\migrations', '20260721000001_v2_budget_rls_fix.sql'), 'utf-8')
    await client.query(sql)
    console.log('Migration successfully applied!')
  } catch (err) {
    console.error('Error applying migration:', err)
  } finally {
    await client.end()
  }
}
runMigration()
