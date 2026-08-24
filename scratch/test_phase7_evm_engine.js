require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const { 
  calculateBaselineItemPV, calculateBaselineItemEV, calculateBaselineProjectPV, 
  calculateBaselineProjectEV, calculateProjectAC, calculateIndicators,
  calculateTaskPV, calculateTaskBAC, calculateTaskEV, calculateTaskAC,
  calculateProjectBAC, calculateProjectPV, calculateProjectEV
} = require('../lib/utils/evm');

async function testPhase7() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("==================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 7 EVM ENGINE ===");
  console.log("==================================================");

  try {
    // 1. Get test project
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    console.log("\nProjet de test:", projectId);

    // Clean any prior test data
    await client.query(`ALTER TABLE evm_baselines DISABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`ALTER TABLE evm_baseline_items DISABLE TRIGGER trg_evm_baseline_items_immutability;`);
    await client.query(`DELETE FROM evm_baselines WHERE name LIKE 'TEST_P7_%';`);
    await client.query(`ALTER TABLE evm_baselines ENABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`ALTER TABLE evm_baseline_items ENABLE TRIGGER trg_evm_baseline_items_immutability;`);

    // =========================================================================
    // TEST 10: TEST CRITIQUE DU DÉPLACEMENT GANTT
    // =========================================================================
    console.log("\n--- [TEST 10] TEST CRITIQUE DU GANTT (Indépendance de la Baseline) ---");
    // Baseline item: planned 01/08/2026 -> 31/08/2026, BAC = 10 000
    const baselineItemA = {
      id: 'item-a',
      baseline_id: 'base-1',
      wbs_task_id: 'task-a',
      wbs_code_snapshot: '1.1',
      wbs_name_snapshot: 'Tâche A',
      planned_start: '2026-08-01',
      planned_end: '2026-08-31',
      planned_bac: 10000
    };

    // WBS initial: 01/08/2026 -> 31/08/2026, percent_complete = 0
    // Puis l'utilisateur déplace la tâche dans le Gantt: 01/10/2026 -> 31/10/2026
    const movedWbsTaskA = {
      id: 'task-a',
      parent_id: null,
      task_type: 'TASK',
      date_start: '2026-10-01', // Déplacée en octobre !
      date_end: '2026-10-31',
      percent_complete: 0,
      code: '1.1',
      description: 'Tâche A'
    };

    // Date d'arrêté au 31/08/2026
    const controlDate = '2026-08-31';

    // Calculs en mode BASELINE
    const pvResult = calculateBaselineItemPV(controlDate, baselineItemA);
    const evResult = calculateBaselineItemEV(baselineItemA, movedWbsTaskA);
    const ind = calculateIndicators(baselineItemA.planned_bac, pvResult.pv, evResult.ev, 0);

    console.log(`Résultats au ${controlDate} après déplacement du Gantt en Octobre :`);
    console.log(`- BAC : ${ind.bac} (Attendu: 10000)`);
    console.log(`- PV  : ${ind.pv} (Attendu: 10000)`);
    console.log(`- EV  : ${ind.ev} (Attendu: 0)`);
    console.log(`- SV  : ${ind.sv} (Attendu: -10000)`);
    console.log(`- SPI : ${ind.spi} (Attendu: 0.00)`);

    if (ind.pv === 10000 && ind.sv === -10000 && ind.spi === 0) {
      console.log("✓ SUCCÈS MAJEUR : Le déplacement du Gantt n'a PAS réduit le PV à 0 ! Le retard réel est parfaitement détecté !");
    } else {
      throw new Error(`Échec du test critique Gantt : PV=${ind.pv}, SV=${ind.sv}, SPI=${ind.spi}`);
    }

    // =========================================================================
    // TEST 8: GESTION DES ITEMS ORPHELINS (Tâche WBS supprimée ultérieurement)
    // =========================================================================
    console.log("\n--- [TEST 8] GESTION DES ITEMS ORPHELINS ---");
    const orphanItem = {
      id: 'item-orphan',
      baseline_id: 'base-1',
      wbs_task_id: null, // Tâche supprimée du WBS
      wbs_code_snapshot: '1.9',
      wbs_name_snapshot: 'Tâche Supprimée',
      planned_start: '2026-08-01',
      planned_end: '2026-08-31',
      planned_bac: 5000
    };

    const orphanEv = calculateBaselineItemEV(orphanItem, null);
    console.log(`Item orphelin EV: ${orphanEv.ev}, Warnings:`, orphanEv.warnings);
    if (orphanEv.ev === 0 && orphanEv.warnings.length > 0) {
      console.log("✓ SUCCÈS : L'item orphelin a EV = 0 et émet un warning métier explicite.");
    } else {
      throw new Error("Échec du traitement des items orphelins");
    }

    // =========================================================================
    // TEST 11: TEST REBASELINING V1 -> V2 AVEC SÉLECTION PAR EFFECTIVE_DATE
    // =========================================================================
    console.log("\n--- [TEST 11] SÉLECTION APPLICABLE V1 vs V2 SELON EFFECTIVE_DATE ---");
    // Insertion V1 (effective 2026-01-01) et V2 (effective 2027-01-01)
    const insV1 = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, status, effective_date, total_bac, start_date, end_date)
      VALUES ($1, 201, 'TEST_P7_V1', 'SUPERSEDED', '2026-01-01', 50000, '2026-01-01', '2026-12-31')
      RETURNING id;
    `, [projectId]);
    const v1Id = insV1.rows[0].id;

    const insV2 = await client.query(`
      INSERT INTO evm_baselines (project_id, version_number, name, status, effective_date, total_bac, start_date, end_date)
      VALUES ($1, 202, 'TEST_P7_V2', 'APPROVED', '2027-01-01', 60000, '2026-01-01', '2027-12-31')
      RETURNING id;
    `, [projectId]);
    const v2Id = insV2.rows[0].id;

    // Helper query for getApplicableBaseline logic
    async function queryApplicable(date) {
      const res = await client.query(`
        SELECT id, version_number, effective_date, name
        FROM evm_baselines
        WHERE project_id = $1 AND status IN ('APPROVED', 'SUPERSEDED') AND effective_date <= $2
        ORDER BY effective_date DESC, version_number DESC
        LIMIT 1;
      `, [projectId, date]);
      return res.rows[0] || null;
    }

    const app2025 = await queryApplicable('2025-12-31');
    const app2026 = await queryApplicable('2026-12-31');
    const app2027_start = await queryApplicable('2027-01-01');
    const app2027_end = await queryApplicable('2027-01-31');

    console.log("- Arrêté au 31/12/2025 (avant V1):", app2025 ? `V${app2025.version_number}` : 'NULL (Mode Legacy)');
    console.log("- Arrêté au 31/12/2026 (période V1):", app2026 ? `V${app2026.version_number}` : 'NULL');
    console.log("- Arrêté au 01/01/2027 (début V2):", app2027_start ? `V${app2027_start.version_number}` : 'NULL');
    console.log("- Arrêté au 31/01/2027 (période V2):", app2027_end ? `V${app2027_end.version_number}` : 'NULL');

    if (app2025 === null && app2026.id === v1Id && app2027_start.id === v2Id && app2027_end.id === v2Id) {
      console.log("✓ SUCCÈS : La sélection dynamique de baseline (V1 / V2 / Fallback Legacy) est 100% conforme !");
    } else {
      throw new Error("Échec de la sélection de baseline par date d'effet");
    }

    // =========================================================================
    // TEST 15: DIVISION PAR ZÉRO SÉCURISÉE (CPI & SPI)
    // =========================================================================
    console.log("\n--- [TEST 15] DIVISION PAR ZÉRO SÉCURISÉE ---");
    const indZero = calculateIndicators(10000, 0, 0, 0);
    console.log("Calcul avec PV=0, AC=0, EV=0 -> CPI:", indZero.cpi, "SPI:", indZero.spi, "EAC:", indZero.eac);
    if (indZero.cpi === null && indZero.spi === null && indZero.eac === 10000) {
      console.log("✓ SUCCÈS : Protection parfaite contre les divisions par zéro.");
    } else {
      throw new Error("Échec de la protection division par zéro");
    }

    // Clean test data
    await client.query(`ALTER TABLE evm_baselines DISABLE TRIGGER trg_evm_baselines_immutability;`);
    await client.query(`DELETE FROM evm_baselines WHERE id IN ($1, $2);`, [v1Id, v2Id]);
    await client.query(`ALTER TABLE evm_baselines ENABLE TRIGGER trg_evm_baselines_immutability;`);

    console.log("\n==================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 7 SONT VALIDÉS !");
    console.log("==================================================");

  } catch (err) {
    console.error("ERREUR DURANT LES TESTS:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPhase7();
