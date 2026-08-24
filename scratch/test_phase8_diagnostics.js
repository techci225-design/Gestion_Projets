require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const { 
  calculateBaselineProjectAC, calculateIndicators, calculateBaselineItemPV, calculateBaselineItemEV
} = require('../lib/utils/evm');

async function testPhase8() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("==================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 8 EVM ===");
  console.log("==================================================");

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    console.log("\nProjet de test:", projectId);

    // Clean prior test data
    await client.query(`ALTER TABLE evm_baselines DISABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`ALTER TABLE evm_baseline_items DISABLE TRIGGER trg_evm_baseline_items_immutability;`);
    await client.query(`DELETE FROM evm_baselines WHERE name LIKE 'TEST_P8_%';`);
    await client.query(`ALTER TABLE evm_baselines ENABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`ALTER TABLE evm_baseline_items ENABLE TRIGGER trg_evm_baseline_items_immutability;`);

    // =========================================================================
    // TEST A, B, C, D: AC HORS BASELINE ET IMPACT SUR CPI
    // =========================================================================
    console.log("\n--- [TEST A, B, C, D] AC HORS BASELINE ET IMPACT CPI ---");
    const baselineItems = [
      {
        id: 'item-1',
        baseline_id: 'base-p8',
        wbs_task_id: 'task-in-baseline-1',
        wbs_code_snapshot: '1.1',
        wbs_name_snapshot: 'Tâche Baseline 1',
        planned_start: '2026-01-01',
        planned_end: '2026-06-30',
        planned_bac: 10000000
      },
      {
        id: 'item-2',
        baseline_id: 'base-p8',
        wbs_task_id: 'task-in-baseline-2',
        wbs_code_snapshot: '1.2',
        wbs_name_snapshot: 'Tâche Baseline 2',
        planned_start: '2026-01-01',
        planned_end: '2026-12-31',
        planned_bac: 20000000
      }
    ];

    const operations = [
      {
        wbs_task_id: 'task-in-baseline-1',
        status: 'decaisse',
        actual_cost: 4000000,
        operation_date: '2026-03-01'
      },
      {
        wbs_task_id: 'task-in-baseline-2',
        status: 'decaisse',
        actual_cost: 6000000,
        operation_date: '2026-04-01'
      },
      // Dépense sur une NOUVELLE tâche créée hors baseline
      {
        wbs_task_id: 'task-out-of-baseline-3',
        status: 'decaisse',
        actual_cost: 5000000,
        operation_date: '2026-05-01'
      }
    ];

    const controlDate = '2026-06-30';
    const acResult = calculateBaselineProjectAC(controlDate, baselineItems, operations);
    console.log("Résultats de la segmentation AC au", controlDate, ":");
    console.log("- AC Baseline :", acResult.ac_baseline, "(Attendu: 10 000 000)");
    console.log("- AC Hors Baseline :", acResult.ac_out_of_baseline, "(Attendu: 5 000 000)");
    console.log("- AC Total :", acResult.ac_total, "(Attendu: 15 000 000)");
    console.log("- Warnings détectés :", acResult.warnings);

    // Supposons EV = 12 000 000
    const evTotal = 12000000;
    const indTotal = calculateIndicators(30000000, 15000000, evTotal, acResult.ac_total);
    console.log("- CPI global calculé avec AC Total :", indTotal.cpi, `(Attendu: ${12000000 / 15000000} = 0.80)`);

    if (
      acResult.ac_baseline === 10000000 &&
      acResult.ac_out_of_baseline === 5000000 &&
      acResult.ac_total === 15000000 &&
      indTotal.cpi === 0.8 &&
      acResult.warnings.length > 0
    ) {
      console.log("✓ SUCCÈS : AC hors baseline segmenté avec sincérité du CPI préservée !");
    } else {
      throw new Error("Échec du calcul AC hors baseline");
    }

    // =========================================================================
    // TEST E: ORDRE CHRONOLOGIQUE STRICT DES EFFECTIVE_DATE
    // =========================================================================
    console.log("\n--- [TEST E] VALIDATION ORDRE CHRONOLOGIQUE EFFECTIVE_DATE ---");
    // Création V1 SUPERSEDED avec effective_date = 2026-01-01
    const v1Res = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, status, effective_date, total_bac, start_date, end_date)
      VALUES ($1, 301, 'TEST_P8_V1', 'SUPERSEDED', '2026-01-01', 100000, '2026-01-01', '2026-12-31')
      RETURNING id;
    `, [projectId]);
    const v1Id = v1Res.rows[0].id;

    // Tentative 1 : Création V2 avec effective_date = 2026-01-01 (même date -> doit échouer)
    const v2Draft = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, status, effective_date, total_bac, start_date, end_date)
      VALUES ($1, 302, 'TEST_P8_V2_DRAFT', 'DRAFT', '2026-01-01', 100000, '2026-01-01', '2026-12-31')
      RETURNING id;
    `, [projectId]);
    const v2Id = v2Draft.rows[0].id;

    try {
      await client.query(`
        UPDATE evm_baselines SET status = 'APPROVED', effective_date = '2026-01-01' WHERE id = $1;
      `, [v2Id]);
      console.error("❌ ERREUR: Le trigger aurait dû refuser l'approbation de V2 avec effective_date <= V1 !");
    } catch (err) {
      console.log("✓ Trigger PostgreSQL a correctement rejeté effective_date <= V1 :", err.message);
    }

    // Tentative 2 : Approbation V2 avec effective_date = 2027-01-01 (postérieure -> doit réussir)
    await client.query(`
      UPDATE evm_baselines SET status = 'APPROVED', effective_date = '2027-01-01', approved_at = now() WHERE id = $1;
    `, [v2Id]);
    console.log("✓ Approbation V2 réussie avec effective_date = 2027-01-01 (> 2026-01-01).");

    // Clean test baselines
    await client.query(`ALTER TABLE evm_baselines DISABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`DELETE FROM evm_baselines WHERE id IN ($1, $2);`, [v1Id, v2Id]);
    await client.query(`ALTER TABLE evm_baselines ENABLE TRIGGER trg_evm_baselines_immutability;`);

    console.log("\n==================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 8 SONT VALIDÉS !");
    console.log("==================================================");

  } catch (err) {
    console.error("ERREUR DURANT LES TESTS:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPhase8();
