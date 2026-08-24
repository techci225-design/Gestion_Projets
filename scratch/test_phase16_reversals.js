require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase16Reversals() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=========================================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 16B (CONTRE-PASSATIONS APPEND-ONLY) ===");
  console.log("=========================================================================");

  await client.query('BEGIN');

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    const projectCurrency = projRes.rows[0].currency || 'XOF';

    // 1. Créer une ligne budgétaire et un engagement
    const blRes = await client.query(`
      INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount)
      VALUES ($1, 'BL-REV-TEST', 'Ligne Test Reversals', 50000)
      RETURNING id;
    `, [projectId]);
    const budgetLineId = blRes.rows[0].id;

    const opRes = await client.query(`
      INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
      VALUES ($1, $2, 'OP-REV-TEST', 'engage', 10000)
      RETURNING id;
    `, [projectId, budgetLineId]);
    const operationId = opRes.rows[0].id;
    console.log("✓ Engagement créé : OP-REV-TEST (10 000 FCFA)");

    // 2. Créer un paiement original (PAYMENT de 4 000)
    const payRes = await client.query(`
      INSERT INTO operation_disbursements (
        operation_id, project_id, disbursement_date, amount, entry_type, reference_piece
      ) VALUES ($1, $2, '2026-08-01'::date, 4000.00, 'PAYMENT', 'FACTURE-001')
      RETURNING id;
    `, [operationId, projectId]);
    const paymentId = payRes.rows[0].id;
    console.log("✓ Paiement 1 créé (PAYMENT 4 000). ID :", paymentId);

    // 3. TEST B : REVERSAL PARTIEL (2 000 sur 4 000)
    console.log("\n--- [TEST B] Reversal partiel de 2 000 sur 4 000 ---");
    const rev1Res = await client.query(`
      SELECT fn_create_disbursement_reversal($1, $2, 2000.00, 'Erreur partielle sur facture');
    `, [projectId, paymentId]);
    console.log("Résultat RPC Reversal 1 :", rev1Res.rows[0].fn_create_disbursement_reversal);
    const reversal1Id = rev1Res.rows[0].fn_create_disbursement_reversal.reversal_id;

    // Vérifier l'état net de l'engagement parent
    const opCheck1 = await client.query(`SELECT status, actual_cost FROM operations_journal WHERE id = $1;`, [operationId]);
    console.log("État engagement après reversal partiel :", opCheck1.rows[0]);
    if (Number(opCheck1.rows[0].actual_cost) !== 2000 || opCheck1.rows[0].status !== 'engage') {
      throw new Error("Erreur actual_cost/status après reversal partiel !");
    }

    // 4. TEST C : TENTATIVE DE REVERSAL EXÉDENTAIRE (3 000 alors qu'il ne reste que 2 000 réversible)
    console.log("\n--- [TEST C] Tentative de contre-passer 3 000 de plus sur le paiement de 4 000 ---");
    await client.query('SAVEPOINT sp_over_rev');
    try {
      await client.query(`
        SELECT fn_create_disbursement_reversal($1, $2, 3000.00, 'Tentative dépassement');
      `, [projectId, paymentId]);
      console.error("❌ ERREUR : La RPC aurait dû refuser le dépassement du paiement original !");
    } catch (err) {
      console.log("✓ Rejeté avec succès par la RPC :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_over_rev');
    }

    // 5. TEST E : TENTATIVE DE CONTRE-PASSER UN REVERSAL
    console.log("\n--- [TEST E] Tentative de contre-passer un REVERSAL existant ---");
    await client.query('SAVEPOINT sp_rev_on_rev');
    try {
      await client.query(`
        SELECT fn_create_disbursement_reversal($1, $2, 1000.00, 'Contre-passation de contre-passation');
      `, [projectId, reversal1Id]);
      console.error("❌ ERREUR : La RPC aurait dû refuser de cibler un REVERSAL !");
    } catch (err) {
      console.log("✓ Rejeté avec succès (INVALID_REVERSAL_TARGET) :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_rev_on_rev');
    }

    // 6. TEST A : REVERSAL DU SOLDE RESTANT (2 000) -> NET PAID = 0
    console.log("\n--- [TEST A] Reversal des 2 000 restants -> Net Paid = 0 ---");
    const rev2Res = await client.query(`
      SELECT fn_create_disbursement_reversal($1, $2, 2000.00, 'Annulation totale du solde');
    `, [projectId, paymentId]);
    console.log("Résultat RPC Reversal 2 :", rev2Res.rows[0].fn_create_disbursement_reversal);

    const opCheck2 = await client.query(`SELECT status, actual_cost FROM operations_journal WHERE id = $1;`, [operationId]);
    console.log("État engagement après reversal total :", opCheck2.rows[0]);
    if (Number(opCheck2.rows[0].actual_cost) !== 0 || opCheck2.rows[0].status !== 'engage') {
      throw new Error("Erreur actual_cost/status après reversal total !");
    }

    // 7. TEST M : IMMUTABILITÉ DB (Tentative d'UPDATE d'un décaissement)
    console.log("\n--- [TEST M] Tentative d'UPDATE direct d'un montant de décaissement ---");
    await client.query('SAVEPOINT sp_immutability');
    try {
      await client.query(`
        UPDATE operation_disbursements
        SET amount = 9999.00
        WHERE id = $1;
      `, [paymentId]);
      console.error("❌ ERREUR : Le trigger d'immutabilité aurait dû bloquer l'UPDATE !");
    } catch (err) {
      console.log("✓ Bloqué avec succès par le trigger d'immutabilité :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_immutability');
    }

    // 8. TEST VUE BUDGET (v_budget_consumption)
    console.log("\n--- [TEST J] Vérification de la vue v_budget_consumption ---");
    const vBudgetRes = await client.query(`
      SELECT * FROM v_budget_consumption WHERE budget_line_id = $1;
    `, [budgetLineId]);
    console.log("v_budget_consumption :", vBudgetRes.rows[0]);

    if (Number(vBudgetRes.rows[0].total_decaisse) !== 0 || Number(vBudgetRes.rows[0].total_engage) !== 10000 || Number(vBudgetRes.rows[0].solde_disponible) !== 40000) {
      throw new Error("Erreur dans v_budget_consumption avec les contre-passations !");
    }

    console.log("\n=========================================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 16B SONT VALIDÉS AVEC SUCCÈS !");
    console.log("=========================================================================");

  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

testPhase16Reversals().catch(console.error);
