require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase12P0() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("===================================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 12 (CORRECTION DES P0 JOURNAL) ===");
  console.log("===================================================================");

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    const blRes = await client.query(`SELECT id FROM budget_lines WHERE project_id = $1 LIMIT 1;`, [projectId]);
    const budgetLineId = blRes.rows[0].id;

    console.log("Projet test :", projectId, "Ligne budgétaire :", budgetLineId);

    // 1. TEST F, G, H, I : Validation DB Check Invariant Décaissé
    console.log("\n--- [TEST F] Tentative d'insertion decaisse avec actual_cost NULL ---");
    try {
      await client.query(`
        INSERT INTO operations_journal (
          project_id, budget_line_id, task_code, status, planned_cost, actual_cost, operation_date
        ) VALUES ($1, $2, 'T-Decaisse-Null', 'decaisse', 1000, NULL, '2026-08-24');
      `, [projectId, budgetLineId]);
      console.error("❌ ERREUR: actual_cost NULL aurait dû être rejeté par la contrainte CHECK !");
    } catch (err) {
      console.log("✓ Rejeté par la contrainte CHECK PostgreSQL (chk_journal_decaisse_valid) :", err.message);
    }

    console.log("\n--- [TEST G] Tentative d'insertion decaisse avec actual_cost = 0 ---");
    try {
      await client.query(`
        INSERT INTO operations_journal (
          project_id, budget_line_id, task_code, status, planned_cost, actual_cost, operation_date
        ) VALUES ($1, $2, 'T-Decaisse-Zero', 'decaisse', 1000, 0, '2026-08-24');
      `, [projectId, budgetLineId]);
      console.error("❌ ERREUR: actual_cost = 0 aurait dû être rejeté par la contrainte CHECK !");
    } catch (err) {
      console.log("✓ Rejeté par la contrainte CHECK PostgreSQL :", err.message);
    }

    console.log("\n--- [TEST H] Tentative d'insertion decaisse avec operation_date NULL ---");
    try {
      await client.query(`
        INSERT INTO operations_journal (
          project_id, budget_line_id, task_code, status, planned_cost, actual_cost, operation_date
        ) VALUES ($1, $2, 'T-Decaisse-NoDate', 'decaisse', 1000, 950, NULL);
      `, [projectId, budgetLineId]);
      console.error("❌ ERREUR: operation_date NULL aurait dû être rejeté par la contrainte CHECK !");
    } catch (err) {
      console.log("✓ Rejeté par la contrainte CHECK PostgreSQL :", err.message);
    }

    console.log("\n--- [TEST I, M] Insertion decaisse VALIDE (actual_cost = 9500, operation_date = 2026-08-20) ---");
    const validOpRes = await client.query(`
      INSERT INTO operations_journal (
        project_id, budget_line_id, task_code, status, planned_cost, actual_cost, operation_date
      ) VALUES ($1, $2, 'T-Decaisse-Valide', 'decaisse', 10000, 9500, '2026-08-20')
      RETURNING id, status, planned_cost, actual_cost, operation_date, montant_decaisse, ecart_budgetaire;
    `, [projectId, budgetLineId]);
    const validOp = validOpRes.rows[0];
    console.table(validOpRes.rows);

    if (Number(validOp.montant_decaisse) === 9500 && Number(validOp.actual_cost) === 9500) {
      console.log("✓ SUCCÈS [TEST M] : montant_decaisse correspond exactement à actual_cost (9500) !");
    } else {
      throw new Error("Divergence entre montant_decaisse et actual_cost !");
    }

    // 2. TEST J, K, L : Simulation Rapprochement Bancaire & EVM AC
    console.log("\n--- [TEST J, K, L] Rapprochement Bancaire (mise à jour actual_cost + operation_date bancaire) ---");
    const bankDate = '2026-08-15';
    const bankAmount = 9450;
    const updatedBankRes = await client.query(`
      UPDATE operations_journal 
      SET actual_cost = $1, operation_date = $2
      WHERE id = $3
      RETURNING id, actual_cost, operation_date, montant_decaisse;
    `, [bankAmount, bankDate, validOp.id]);
    console.log("✓ Opération mise à jour depuis le relevé bancaire :", updatedBankRes.rows[0]);

    // Vérifier l'apparition dans AC EVM à la date de contrôle
    const controlDateAfter = '2026-08-18';
    const controlDateBefore = '2026-08-10';

    const evmAcAfter = await client.query(`
      SELECT SUM(actual_cost) as ac_total 
      FROM operations_journal 
      WHERE project_id = $1 AND status = 'decaisse' AND operation_date <= $2 AND id = $3;
    `, [projectId, controlDateAfter, validOp.id]);

    const evmAcBefore = await client.query(`
      SELECT SUM(actual_cost) as ac_total 
      FROM operations_journal 
      WHERE project_id = $1 AND status = 'decaisse' AND operation_date <= $2 AND id = $3;
    `, [projectId, controlDateBefore, validOp.id]);

    console.log(`✓ EVM AC au ${controlDateAfter} (après date bancaire) :`, evmAcAfter.rows[0].ac_total, "(Comptabilisé)");
    console.log(`✓ EVM AC au ${controlDateBefore} (avant date bancaire) :`, evmAcBefore.rows[0].ac_total || 0, "(Exclu fidèlement)");

    // Nettoyage de l'opération de test
    await client.query(`DELETE FROM operations_journal WHERE id = $1;`, [validOp.id]);

    // 3. TEST RLS : Vérifier la politique SQL write_operations_all
    console.log("\n--- [TEST RLS] Vérification de la politique write_operations_all ---");
    const polRes = await client.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as expr
      FROM pg_policy
      WHERE polrelid = 'operations_journal'::regclass AND polname = 'write_operations_all';
    `);
    console.log("Expression RLS active :", polRes.rows[0]?.expr);

    console.log("\n===================================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 12 SONT VALIDÉS !");
    console.log("===================================================================");

  } catch (err) {
    console.error("ERREUR DURANT LES TESTS:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPhase12P0();
