import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()
  
  try {
    await client.query('BEGIN')
    
    // Create the table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evm_snapshots (
        id uuid primary key default uuid_generate_v4(),
        project_id uuid not null references projects(id) on delete cascade,
        control_date date not null,
        bac_total numeric(16,2),
        pv_total numeric(16,2),
        ev_total numeric(16,2),
        ac_total numeric(16,2),
        cpi_global numeric(6,4),
        spi_global numeric(6,4),
        eac_global numeric(16,2),
        notes text,
        created_by uuid references profiles(id),
        created_at timestamptz not null default now(),
        unique (project_id, control_date)
      );
    `)

    // RLS Policies
    await client.query(`ALTER TABLE evm_snapshots ENABLE ROW LEVEL SECURITY;`)
    
    // Drop policies if they exist to recreate them
    await client.query(`DROP POLICY IF EXISTS "lecture_membres" ON evm_snapshots;`)
    await client.query(`DROP POLICY IF EXISTS "ecriture_autorises" ON evm_snapshots;`)
    await client.query(`DROP POLICY IF EXISTS "modification_autorises" ON evm_snapshots;`)
    await client.query(`DROP POLICY IF EXISTS "suppression_autorises" ON evm_snapshots;`)

    await client.query(`
      CREATE POLICY "lecture_membres" ON evm_snapshots FOR SELECT
        USING (EXISTS (SELECT 1 FROM project_members
          WHERE project_id = evm_snapshots.project_id AND user_id = auth.uid()));
    `)

    await client.query(`
      CREATE POLICY "ecriture_autorises" ON evm_snapshots FOR INSERT
        WITH CHECK (fn_user_role(project_id) IN ('owner','chef_projet'));
    `)
    
    await client.query(`
      CREATE POLICY "modification_autorises" ON evm_snapshots FOR UPDATE
        USING (fn_user_role(project_id) IN ('owner','chef_projet'));
    `)

    await client.query(`
      CREATE POLICY "suppression_autorises" ON evm_snapshots FOR DELETE
        USING (fn_user_role(project_id) IN ('owner','chef_projet'));
    `)

    await client.query('COMMIT')
    console.log('Schema updated successfully.')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Error updating schema', e)
  } finally {
    await client.end()
  }
}

run().catch(console.error)
