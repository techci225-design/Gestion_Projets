import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()
  
  try {
    await client.query('BEGIN')
    
    // Fix audit_log
    await client.query(`
      ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_project_id_fkey;
      ALTER TABLE audit_log ADD CONSTRAINT audit_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    `)
    
    // Fix project_members
    await client.query(`
      ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
      ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    `)
    
    // Fix funding_sources
    await client.query(`
      ALTER TABLE funding_sources DROP CONSTRAINT IF EXISTS funding_sources_project_id_fkey;
      ALTER TABLE funding_sources ADD CONSTRAINT funding_sources_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    `)
    
    // Fix risks
    await client.query(`
      ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_project_id_fkey;
      ALTER TABLE risks ADD CONSTRAINT risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    `)

    await client.query('COMMIT')
    console.log('Successfully updated foreign keys to ON DELETE CASCADE!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

run()
