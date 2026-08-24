require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testReversalConcurrency() {
  const clientMaster = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await clientMaster.connect();

  console.log("=== TEST DE CONCURRENCE : DEUX REVERSALS SIMULTANÉS DE 3 000 SUR UN PAIEMENT DE 4 000 ===");

  const projRes = await clientMaster.query(`SELECT id FROM projects LIMIT 1;`);
  const projectId = projRes.rows[0].id;

  const bl = await clientMaster.query(`
    INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount)
    VALUES ($1, 'BL-CONC-REV', 'Test Concurrence Reversal', 50000)
    RETURNING id;
  `, [projectId]);
  const blId = bl.rows[0].id;

  const op = await clientMaster.query(`
    INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
    VALUES ($1, $2, 'OP-CONC-REV', 'engage', 4000)
    RETURNING id;
  `, [projectId, blId]);
  const opId = op.rows[0].id;

  const pay = await clientMaster.query(`
    INSERT INTO operation_disbursements (
      operation_id, project_id, disbursement_date, amount, entry_type
    ) VALUES ($1, $2, '2026-08-01'::date, 4000.00, 'PAYMENT')
    RETURNING id;
  `, [opId, projectId]);
  const paymentId = pay.rows[0].id;

  console.log("Paiement créé avec amount = 4 000. Lancement de 2 requêtes simultanées de 3 000...");

  const c1 = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const c2 = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await Promise.all([c1.connect(), c2.connect()]);

  const p1 = c1.query(`SELECT fn_create_disbursement_reversal($1, $2, 3000.00, 'Reversal concurrent 1');`, [projectId, paymentId]);
  const p2 = c2.query(`SELECT fn_create_disbursement_reversal($1, $2, 3000.00, 'Reversal concurrent 2');`, [projectId, paymentId]);

  const results = await Promise.allSettled([p1, p2]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  console.log(`Résultats : ${fulfilled.length} succès, ${rejected.length} rejet(s).`);

  if (fulfilled.length === 1 && rejected.length === 1) {
    console.log("✓ SUCCÈS CONCURRENCE REVERSAL : Exactement une contre-passation a été acceptée et la seconde a été rejetée sans race condition.");
  } else {
    throw new Error(`Échec concurrence ! Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
  }

  // Nettoyage
  await clientMaster.query(`DELETE FROM operation_disbursements WHERE operation_id = $1;`, [opId]);
  await clientMaster.query(`DELETE FROM operations_journal WHERE id = $1;`, [opId]);
  await clientMaster.query(`DELETE FROM budget_lines WHERE id = $1;`, [blId]);

  await Promise.all([c1.end(), c2.end(), clientMaster.end()]);
}

testReversalConcurrency().catch(console.error);
