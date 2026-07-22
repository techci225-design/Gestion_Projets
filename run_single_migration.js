import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  const connectionString = process.env.DATABASE_URL
  const client = new Client({ connectionString })
  await client.connect()

  const file = process.argv[2] || 'supabase/migrations/20260722000007_ai_analyses.sql'
  const sql = fs.readFileSync(path.join(process.cwd(), file), 'utf-8')
  try {
    await client.query(sql)
    console.log('Migration ai_analyses applied successfully.')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    await client.end()
  }
}
run()
