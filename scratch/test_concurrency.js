require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testConcurrency() {
  const client1 = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const client2 = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const setupClient = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  await setupClient.connect();
  await client1.connect();
  await client2.connect();

  console.log("=== TEST DE CONCURRENCE : DEUX PAIEMENTS SIMULTANÉS DE 6 000 SUR CONTRAT DE 10 000 ===");

  const projRes = await setupClient.query(`SELECT id FROM projects LIMIT 1;`);
  const projectId = projRes.rows[0].id;

  const blRes = await setupClient.query(`SELECT id FROM budget_lines WHERE project_id = $1 LIMIT 1;`, [projectId]);
  const budgetLineId = blRes.rows[0].id;

  const opRes = await setupClient.query(`
    INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
    VALUES ($1, $2, 'CONCURRENCY-OP', 'engage', 10000)
    RETURNING id;
  `, [projectId, budgetLineId]);
  const opId = opRes.rows[0].id;

  console.log("Engagement créé avec planned_cost = 10 000. Lancement de 2 paiements concurrents de 6 000...");

  const promise1 = client1.query(`SELECT fn_add_operation_disbursement($1, $2, '2026-08-10'::date, 6000, 'Client 1');`, [projectId, opId]);
  const promise2 = client2.query(`SELECT fn_add_operation_disbursement($1, $2, '2026-08-10'::date, 6000, 'Client 2');`, [projectId, opId]);

  const results = await Promise.allSettled([promise1, promise2]);

  let successes = 0;
  let failures = 0;

  results.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      successes++;
      console.log(`✓ Paiement ${i + 1} validé avec succès.`);
    } else {
      failures++;
      console.log(`✓ Paiement ${i + 1} rejeté pour dépassement : ${res.reason.message}`);
    }
  });

  if (successes === 1 && failures === 1) {
    console.log("✓ SUCCÈS CONCURRENCE : Exactement un paiement a été accepté et le second a été rejeté sans race condition.");
  } else {
    throw new Error(`Incohérence concurrence: ${successes} succès, ${failures} échecs.`);
  }

  // Cleanup
  await setupClient.query(`DELETE FROM operation_disbursements WHERE operation_id = $1;`, [opId]);
  await setupClient.query(`DELETE FROM operations_journal WHERE id = $1;`, [opId]);

  await setupClient.end();
  await client1.end();
  await client2.end();
}

testConcurrency().catch(console.error);
