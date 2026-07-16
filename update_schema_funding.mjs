import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function run() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()
  
  try {
    await client.query('BEGIN')
    
    // Add column
    await client.query(`
      ALTER TABLE operations_journal
      ADD COLUMN IF NOT EXISTS funding_source_id uuid references funding_sources(id);
    `)

    // Create view
    await client.query(`DROP VIEW IF EXISTS v_funding_tracking;`)
    await client.query(`
      CREATE VIEW v_funding_tracking AS
      SELECT
        fs.id as funding_source_id,
        fs.project_id,
        fs.name as bailleur_name,
        fs.type,
        fs.amount_committed,
        COALESCE(SUM(oj.montant_engage), 0) as total_engage,
        COALESCE(SUM(oj.montant_decaisse), 0) as total_decaisse,
        fs.amount_committed
          - COALESCE(SUM(oj.montant_engage), 0)
          - COALESCE(SUM(oj.montant_decaisse), 0) as solde_restant,
        CASE WHEN fs.amount_committed = 0 THEN 0
          ELSE (COALESCE(SUM(oj.montant_engage),0)
            + COALESCE(SUM(oj.montant_decaisse),0))
            / fs.amount_committed
        END as taux_utilisation
      FROM funding_sources fs
      LEFT JOIN operations_journal oj
        ON oj.budget_line_id IN (
          SELECT id FROM budget_lines WHERE funding_source_id = fs.id
        ) OR oj.funding_source_id = fs.id
      GROUP BY fs.id, fs.project_id, fs.name, fs.type, fs.amount_committed;
    `)

    await client.query('COMMIT')
    console.log('Funding tracking schema updated successfully.')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Error updating schema', e)
  } finally {
    await client.end()
  }
}

run().catch(console.error)
