require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase14Disbursements() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("===================================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 14 (OPERATION_DISBURSEMENTS) ===");
  console.log("===================================================================");

  await client.query('BEGIN');

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;

    // Créer une ligne budgétaire de 20 000 pour le test
    const blRes = await client.query(`
      INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount)
      VALUES ($1, 'BL-TEST-14', 'Ligne Test Phase 14', 20000)
      RETURNING id;
    `, [projectId]);
    const budgetLineId = blRes.rows[0].id;

    // Créer une tâche WBS
    const wbsRes = await client.query(`
      INSERT INTO wbs_tasks (project_id, code, description, name, task_type, percent_complete, date_start, date_end)
      VALUES ($1, 'T-P14', 'Tâche Test Phase 14', 'Tâche Test Phase 14', 'TASK', 50, '2026-08-01', '2026-08-31')
      RETURNING id;
    `, [projectId]);
    const wbsTaskId = wbsRes.rows[0].id;

    // Créer un engagement de 10 000
    const opRes = await client.query(`
      INSERT INTO operations_journal (
        project_id, budget_line_id, wbs_task_id, task_code, status, planned_cost
      ) VALUES ($1, $2, $3, 'Engagement Contrat 10k', 'engage', 10000)
      RETURNING id, status, planned_cost;
    `, [projectId, budgetLineId, wbsTaskId]);
    const opId = opRes.rows[0].id;

    console.log("✓ Engagement créé. ID :", opId, "Planned Cost : 10000");

    // 1. Paiement 1 (01/08 : 4000)
    console.log("\n--- [ÉTAPE 1] Paiement 1 : 4 000 au 2026-08-01 ---");
    await client.query(`
      SELECT fn_add_operation_disbursement($1, $2, '2026-08-01'::date, 4000, 'Acompte 40%');
    `, [projectId, opId]);

    const view1 = await client.query(`SELECT total_engage, total_decaisse, solde_disponible FROM v_budget_consumption WHERE budget_line_id = $1;`, [budgetLineId]);
    console.log("Vue Budget après Paiement 1 :", view1.rows[0]);
    if (Number(view1.rows[0].total_decaisse) !== 4000 || Number(view1.rows[0].total_engage) !== 6000 || Number(view1.rows[0].solde_disponible) !== 10000) {
      throw new Error("Erreur de calcul budgétaire après Paiement 1 !");
    }

    // 2. Paiement 2 (15/08 : 3000)
    console.log("\n--- [ÉTAPE 2] Paiement 2 : 3 000 au 2026-08-15 ---");
    await client.query(`
      SELECT fn_add_operation_disbursement($1, $2, '2026-08-15'::date, 3000, 'Intermédiaire 30%');
    `, [projectId, opId]);

    const view2 = await client.query(`SELECT total_engage, total_decaisse, solde_disponible FROM v_budget_consumption WHERE budget_line_id = $1;`, [budgetLineId]);
    console.log("Vue Budget après Paiement 2 :", view2.rows[0]);
    if (Number(view2.rows[0].total_decaisse) !== 7000 || Number(view2.rows[0].total_engage) !== 3000 || Number(view2.rows[0].solde_disponible) !== 10000) {
      throw new Error("Erreur de calcul budgétaire après Paiement 2 !");
    }

    // 3. Paiement 3 (30/08 : 3000)
    console.log("\n--- [ÉTAPE 3] Paiement 3 : 3 000 au 2026-08-30 (Soldé) ---");
    await client.query(`
      SELECT fn_add_operation_disbursement($1, $2, '2026-08-30'::date, 3000, 'Solde 30%');
    `, [projectId, opId]);

    const view3 = await client.query(`SELECT total_engage, total_decaisse, solde_disponible FROM v_budget_consumption WHERE budget_line_id = $1;`, [budgetLineId]);
    console.log("Vue Budget après Paiement 3 :", view3.rows[0]);
    if (Number(view3.rows[0].total_decaisse) !== 10000 || Number(view3.rows[0].total_engage) !== 0 || Number(view3.rows[0].solde_disponible) !== 10000) {
      throw new Error("Erreur de calcul budgétaire après Paiement 3 !");
    }

    // 4. Test EVM Temporel Exact aux 3 dates
    console.log("\n--- [TEST EVM TEMPOREL EXACT] ---");
    const evm10 = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as ac 
      FROM operation_disbursements 
      WHERE operation_id = $1 AND disbursement_date <= '2026-08-10'::date;
    `, [opId]);
    console.log("AC au 10/08 (attendu: 4000) :", Number(evm10.rows[0].ac));

    const evm20 = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as ac 
      FROM operation_disbursements 
      WHERE operation_id = $1 AND disbursement_date <= '2026-08-20'::date;
    `, [opId]);
    console.log("AC au 20/08 (attendu: 7000) :", Number(evm20.rows[0].ac));

    const evm31 = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as ac 
      FROM operation_disbursements 
      WHERE operation_id = $1 AND disbursement_date <= '2026-08-31'::date;
    `, [opId]);
    console.log("AC au 31/08 (attendu: 10000) :", Number(evm31.rows[0].ac));

    if (Number(evm10.rows[0].ac) !== 4000 || Number(evm20.rows[0].ac) !== 7000 || Number(evm31.rows[0].ac) !== 10000) {
      throw new Error("Erreur dans la chronologie EVM AC !");
    }

    // 5. Test Dépassement d'engagement (Tentative de payer 1000 de plus sur un contrat soldé)
    console.log("\n--- [TEST DÉPASSEMENT] Tentative de payer 1 000 supplémentaires sur contrat déjà à 10 000 ---");
    await client.query('SAVEPOINT sp_overpay');
    try {
      await client.query(`
        SELECT fn_add_operation_disbursement($1, $2, '2026-09-01'::date, 1000, 'Trop payé');
      `, [projectId, opId]);
      console.error("❌ ERREUR : Le dépassement aurait dû être rejeté par la RPC !");
    } catch (err) {
      console.log("✓ Rejeté avec succès par la RPC :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_overpay');
    }

    // 6. Test FK Composite Projet
    console.log("\n--- [TEST INTÉGRITÉ FK PROJET] Tentative de créer un paiement avec project_id erroné ---");
    await client.query('SAVEPOINT sp_fk_err');
    try {
      await client.query(`
        INSERT INTO operation_disbursements (
          project_id, operation_id, disbursement_date, amount
        ) VALUES (
          '00000000-0000-0000-0000-000000000001', $1, '2026-08-20', 500
        );
      `, [opId]);
      console.error("❌ ERREUR : La FK composite aurait dû refuser la ligne !");
    } catch (err) {
      console.log("✓ Rejeté avec succès par la FK composite (fk_disbursement_operation_project) :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_fk_err');
    }

    console.log("\n===================================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 14 SONT VALIDÉS !");
    console.log("===================================================================");

  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

testPhase14Disbursements().catch(console.error);
