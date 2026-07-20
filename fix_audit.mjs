import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()
  
  try {
    await client.query('BEGIN')
    
    // Drop the constraint entirely
    await client.query(`
      ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_project_id_fkey;
    `)
    
    await client.query('COMMIT')
    console.log('Successfully dropped foreign key on audit_log!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

run()
