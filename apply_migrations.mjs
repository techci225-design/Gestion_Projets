import { Client } from 'pg'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()
  
  try {
    console.log('Applying 20260721000000_v2_rls_fix.sql...')
    const sql1 = fs.readFileSync('c:\\Users\\BAYO\\Desktop\\Gestion_Projets\\supabase\\migrations\\20260721000000_v2_rls_fix.sql', 'utf8')
    await client.query(sql1)
    console.log('Applied RLS fix.')

    console.log('Applying 20260721000001_fix_spi.sql...')
    const sql2 = fs.readFileSync('c:\\Users\\BAYO\\Desktop\\Gestion_Projets\\supabase\\migrations\\20260721000001_fix_spi.sql', 'utf8')
    await client.query(sql2)
    console.log('Applied SPI fix.')

    console.log('All migrations applied successfully!')
  } catch (err) {
    console.error('Error applying migrations:', err)
  } finally {
    await client.end()
  }
}

run()
