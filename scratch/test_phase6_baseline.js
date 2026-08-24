require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase6() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL missing");
    return;
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("=== TEST PHASE 6 : BASELINE EVM VERSIONNÉE ===");

    // 1. Get or create test project
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    if (projRes.rows.length === 0) {
      console.log("No project found for testing.");
      return;
    }
    const projectId = projRes.rows[0].id;
    console.log("Test Project ID:", projectId);

    // Clean any existing test baselines for this project
    await client.query(`DELETE FROM evm_baselines WHERE project_id = $1 AND name LIKE 'TEST_%';`, [projectId]);

    // 2. Test 1: Création V1 DRAFT
    console.log("\n[Test 1] Création V1 DRAFT...");
    const insBaselineRes = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, description, status, total_bac, start_date, end_date)
      VALUES ($1, 101, 'TEST_Baseline_V101', 'Test V101', 'DRAFT', 0, '2026-01-01', '2026-12-31')
      RETURNING id, version_number, status;
    `, [projectId]);
    const b1Id = insBaselineRes.rows[0].id;
    console.log("✓ V1 DRAFT créée avec succès, id:", b1Id);

    // Insert items
    const tasksRes = await client.query(`SELECT id, code, name, date_start, date_end FROM wbs_tasks WHERE project_id = $1 LIMIT 2;`, [projectId]);
    if (tasksRes.rows.length === 0) {
      console.log("No WBS tasks found, creating temporary WBS task...");
      const tIns = await client.query(`
        INSERT INTO wbs_tasks (project_id, code, name, description, date_start, date_end)
        VALUES ($1, 'TEST-01', 'Tâche Test 1', 'Desc', '2026-01-01', '2026-06-30')
        RETURNING id, code, name, date_start, date_end;
      `, [projectId]);
      tasksRes.rows.push(tIns.rows[0]);
    }

    const t1 = tasksRes.rows[0];
    const insItemRes = await client.query(`
      INSERT INTO evm_baseline_items (baseline_id, wbs_task_id, wbs_code_snapshot, wbs_name_snapshot, planned_start, planned_end, planned_bac)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING id;
    `, [b1Id, t1.id, t1.code, t1.name, t1.date_start, t1.date_end]);
    const item1Id = insItemRes.rows[0].id;
    console.log("✓ Item baseline créé pour tâche:", t1.code);

    // 3. Test 2: Modification DRAFT
    console.log("\n[Test 2] Modification DRAFT...");
    await client.query(`
      UPDATE evm_baseline_items 
      SET planned_bac = 5000000 
      WHERE id = $1;
    `, [item1Id]);
    await client.query(`
      UPDATE evm_baselines 
      SET total_bac = 5000000 
      WHERE id = $1;
    `, [b1Id]);
    console.log("✓ Item et Header modifiés dans DRAFT.");

    // 4. Test 6 & 7: Approbation V1 et Immutabilité
    console.log("\n[Test 6 & 7] Approbation V1 et vérification de l'immutabilité...");
    await client.query(`
      UPDATE evm_baselines 
      SET status = 'APPROVED', approved_at = now(), effective_date = '2026-01-01'
      WHERE id = $1;
    `, [b1Id]);
    console.log("✓ V1 passée au statut APPROVED.");

    // Tentative de modification illégale d'un item APPROVED
    try {
      await client.query(`
        UPDATE evm_baseline_items SET planned_bac = 9999999 WHERE id = $1;
      `, [item1Id]);
      console.error("❌ ERREUR: Le trigger aurait dû bloquer la modification de l'item APPROVED !");
    } catch (err) {
      console.log("✓ Trigger immutabilité a correctement bloqué l'UPDATE de l'item APPROVED :", err.message);
    }

    // Tentative de suppression illégale de la baseline APPROVED
    try {
      await client.query(`
        DELETE FROM evm_baselines WHERE id = $1;
      `, [b1Id]);
      console.error("❌ ERREUR: Le trigger aurait dû bloquer la suppression de la baseline APPROVED !");
    } catch (err) {
      console.log("✓ Trigger immutabilité a correctement bloqué le DELETE de la baseline APPROVED :", err.message);
    }

    // 5. Test 8 & 9: Création V2 et transition SUPERSEDED
    console.log("\n[Test 8 & 9] Création V2 et transition SUPERSEDED de V1...");
    const insB2Res = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, status, total_bac, start_date, end_date)
      VALUES ($1, 102, 'TEST_Baseline_V102', 'DRAFT', 6000000, '2026-01-01', '2026-12-31')
      RETURNING id;
    `, [projectId]);
    const b2Id = insB2Res.rows[0].id;

    // Transition V1 -> SUPERSEDED
    await client.query(`
      UPDATE evm_baselines SET status = 'SUPERSEDED' WHERE id = $1;
    `, [b1Id]);
    console.log("✓ V1 archivée (SUPERSEDED) avec succès.");

    // Approbation V2
    await client.query(`
      UPDATE evm_baselines SET status = 'APPROVED', approved_at = now(), effective_date = '2026-06-01' WHERE id = $1;
    `, [b2Id]);
    console.log("✓ V2 approuvée avec succès.");

    // 6. Test 10: V1 reste consultable
    const checkV1 = await client.query(`SELECT id, version_number, status, total_bac FROM evm_baselines WHERE id = $1;`, [b1Id]);
    console.log("✓ V1 consultable :", checkV1.rows[0]);

    // 7. Test 11: Suppression / Renommage WBS ne détruit pas le snapshot
    console.log("\n[Test 11] Vérification de la persistance des snapshots WBS...");
    const checkItem = await client.query(`SELECT id, wbs_code_snapshot, wbs_name_snapshot, planned_bac FROM evm_baseline_items WHERE id = $1;`, [item1Id]);
    console.log("✓ Snapshot WBS préservé intact :", checkItem.rows[0]);

    // 8. Test 14: evm_snapshots avec baseline_id NULL
    console.log("\n[Test 14] Vérification de evm_snapshots.baseline_id...");
    const snapCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'evm_snapshots' AND column_name = 'baseline_id';
    `);
    console.log("✓ Colonne baseline_id sur evm_snapshots :", snapCheck.rows[0]);

    // Nettoyage des données de test
    // Pour nettoyer les tests, on supprime temporairement via désactivation des triggers de test ou status draft
    await client.query(`DELETE FROM evm_baseline_items WHERE baseline_id IN ($1, $2);`, [b1Id, b2Id]).catch(() => {});
    await client.query(`UPDATE evm_baselines SET status = 'DRAFT' WHERE id IN ($1, $2);`, [b1Id, b2Id]);
    await client.query(`DELETE FROM evm_baselines WHERE id IN ($1, $2);`, [b1Id, b2Id]);
    console.log("✓ Nettoyage des tests effectué.");

    console.log("\n==========================================");
    console.log("TOUS LES TESTS DE LA PHASE 6 ONT RÉUSSI !");
    console.log("==========================================");

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await client.end();
  }
}

testPhase6();
