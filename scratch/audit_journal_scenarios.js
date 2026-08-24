require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function runScenarioAudit() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("===============================================================");
  console.log("=== AUDIT NON DESTRUCTIF DU JOURNAL (TRANSACTIONS ROLLBACK) ===");
  console.log("===============================================================");

  const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
  const projectId = projRes.rows[0].id;

  const blRes = await client.query(`SELECT id, initial_allocated_amount FROM budget_lines WHERE project_id = $1 LIMIT 1;`, [projectId]);
  const budgetLineId = blRes.rows[0]?.id;

  const wbsRes = await client.query(`SELECT id, code, name FROM wbs_tasks WHERE project_id = $1 LIMIT 1;`, [projectId]);
  const wbsTaskId = wbsRes.rows[0]?.id;

  await client.query('BEGIN');

  try {
    // 1. Test A: Création planifiée
    console.log("--- 1. [Test A] Création planifiée (planned_cost = 10000, actual_cost = NULL) ---");
    const op1Res = await client.query(`
      INSERT INTO operations_journal (
        project_id, budget_line_id, wbs_task_id, task_code, status, planned_cost, actual_cost, operation_date
      ) VALUES ($1, $2, $3, '1.1 Tâche Test', 'planifie', 10000, NULL, '2026-06-01')
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [projectId, budgetLineId, wbsTaskId]);
    console.table(op1Res.rows);
    const opId = op1Res.rows[0].id;

    // 2. Test B: Passage engagé
    console.log("\n--- 2. [Test B] Passage engagé ---");
    const op2Res = await client.query(`
      UPDATE operations_journal SET status = 'engage' WHERE id = $1
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [opId]);
    console.table(op2Res.rows);

    // 3. Test C: Passage décaissé avec actual_cost = 9500 (< planned_cost)
    console.log("\n--- 3. [Test C] Passage décaissé avec actual_cost = 9500 ---");
    const op3Res = await client.query(`
      UPDATE operations_journal SET status = 'decaisse', actual_cost = 9500 WHERE id = $1
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [opId]);
    console.table(op3Res.rows);

    // 4. Test E: Décaissé avec actual_cost = NULL (Fallback vers planned_cost)
    console.log("\n--- 4. [Test E] Décaissé avec actual_cost = NULL (Fallback vers planned_cost) ---");
    const op4Res = await client.query(`
      UPDATE operations_journal SET actual_cost = NULL WHERE id = $1
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [opId]);
    console.table(op4Res.rows);

    // 5. Test F: Décaissé avec actual_cost = 15000 (> planned_cost)
    console.log("\n--- 5. [Test F] Décaissé avec dépassement actual_cost = 15000 ---");
    const op5Res = await client.query(`
      UPDATE operations_journal SET actual_cost = 15000 WHERE id = $1
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [opId]);
    console.table(op5Res.rows);

    // 6. Test D: Annulation
    console.log("\n--- 6. [Test D] Annulation (status = 'annule') ---");
    const op6Res = await client.query(`
      UPDATE operations_journal SET status = 'annule' WHERE id = $1
      RETURNING id, status, planned_cost, actual_cost, reste_a_engager, montant_engage, montant_decaisse, ecart_budgetaire;
    `, [opId]);
    console.table(op6Res.rows);

    // 7. Test G: Opération sans WBS (wbs_task_id = NULL)
    console.log("\n--- 7. [Test G] Opération sans WBS (wbs_task_id = NULL) ---");
    const op7Res = await client.query(`
      INSERT INTO operations_journal (
        project_id, budget_line_id, wbs_task_id, task_code, status, planned_cost, actual_cost, operation_date
      ) VALUES ($1, $2, NULL, 'Dépense générale', 'planifie', 5000, NULL, '2026-06-01')
      RETURNING id, wbs_task_id, task_code;
    `, [projectId, budgetLineId]);
    console.log("✓ Insertion sans WBS réussie :", op7Res.rows[0]);

    // 8. Test H: Opération sans budget_line (budget_line_id = NULL)
    console.log("\n--- 8. [Test H] Opération sans budget_line (budget_line_id = NULL) ---");
    await client.query('SAVEPOINT sp_bl_null');
    try {
      await client.query(`
        INSERT INTO operations_journal (
          project_id, budget_line_id, wbs_task_id, task_code, status, planned_cost
        ) VALUES ($1, NULL, $2, 'Sans ligne budget', 'planifie', 5000);
      `, [projectId, wbsTaskId]);
      console.error("❌ Erreur : L'insertion sans budget_line_id aurait dû échouer !");
    } catch (err) {
      console.log("✓ Rejeté par contrainte NOT NULL :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_bl_null');
    }

    // 9. Test J: Tentative de suppression d'une tâche WBS référencée dans le Journal
    console.log("\n--- 9. [Test J] Tentative de suppression WBS liée au Journal ---");
    await client.query('SAVEPOINT sp_wbs_del');
    try {
      await client.query(`DELETE FROM wbs_tasks WHERE id = $1;`, [wbsTaskId]);
      console.error("❌ Erreur : La suppression WBS aurait dû être bloquée par RESTRICT !");
    } catch (err) {
      console.log("✓ Rejeté par contrainte FK RESTRICT (fk_journal_project_wbs) :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_wbs_del');
    }

    // 10. Test de la vue v_budget_consumption
    console.log("\n--- 10. Impact sur la vue v_budget_consumption ---");
    const viewRes = await client.query(`SELECT * FROM v_budget_consumption WHERE budget_line_id = $1;`, [budgetLineId]);
    console.table(viewRes.rows);

  } finally {
    await client.query('ROLLBACK');
    console.log("\n✓ ROLLBACK exécuté avec succès : Aucune donnée modifiée en base.");
    await client.end();
  }
}

runScenarioAudit().catch(console.error);
