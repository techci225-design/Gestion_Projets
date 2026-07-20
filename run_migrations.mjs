import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function runMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const sql1 = fs.readFileSync(path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets\\supabase\\migrations', '20260721000004_v2_rls_org_fix.sql'), 'utf-8')
    await client.query(sql1)
    console.log('Migration 1 successfully applied!')
    
    const sql2 = fs.readFileSync(path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets\\supabase\\migrations', '20260721000005_fix_spi.sql'), 'utf-8')
    await client.query(sql2)
    console.log('Migration 2 successfully applied!')
  } catch (err) {
    console.error('Error applying migration:', err)
  } finally {
    await client.end()
  }
}
runMigration()
