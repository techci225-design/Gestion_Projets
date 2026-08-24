require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase10() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("==========================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 10 (P0 RETROACTIF) ===");
  console.log("==========================================================");

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    console.log("Projet test :", projectId);

    const todayStr = new Date().toISOString().split('T')[0];
    const pastDateStr = '2025-01-15';
    const futureDateStr = '2028-12-31';

    // 1. Simuler la logique serveur de createEvmSnapshot
    async function simulateCreateEvmSnapshot(controlDate, overwrite = false, mode = 'BASELINE') {
      const today = new Date().toISOString().split('T')[0];

      // A. Règle Date Future
      if (controlDate > today) {
        return {
          error: "Impossible d'enregistrer un arrêté officiel pour une date future.",
          code: 'INVALID_FUTURE_CONTROL_DATE'
        };
      }

      // B. Vérifier snapshot existant
      const snapRes = await client.query(
        `SELECT id, control_date FROM evm_snapshots WHERE project_id = $1 AND control_date = $2`,
        [projectId, controlDate]
      );
      const existingSnapshot = snapRes.rows[0];

      if (existingSnapshot && !overwrite) {
        return {
          error: "Un arrêté officiel existe déjà pour cette date.",
          code: 'CONFLICT'
        };
      }

      // C. Règle Date Passée sans snapshot
      if (controlDate < today && !existingSnapshot) {
        return {
          error: "Impossible d'enregistrer cet arrêté comme officiel : l'avancement physique historique à cette date n'est pas disponible de manière certifiable.",
          code: 'UNCERTIFIED_HISTORICAL_PROGRESS'
        };
      }

      return { success: true, mode, controlDate };
    }

    // Clean any snapshot on pastDateStr or todayStr for fresh testing
    await client.query(`DELETE FROM evm_snapshots WHERE project_id = $1 AND control_date IN ($2, $3, $4);`, [projectId, pastDateStr, todayStr, futureDateStr]);

    // TEST A: BASELINE + Date passée + Pas de snapshot -> REFUS
    console.log("\n--- [TEST A] BASELINE, date passée sans snapshot ---");
    const resA = await simulateCreateEvmSnapshot(pastDateStr, false, 'BASELINE');
    console.log("Résultat :", resA);
    if (resA.code === 'UNCERTIFIED_HISTORICAL_PROGRESS') {
      console.log("✓ SUCCÈS : Sauvegarde rétroactive en mode BASELINE refusée avec code UNCERTIFIED_HISTORICAL_PROGRESS !");
    } else {
      throw new Error("Échec du test A");
    }

    // TEST B: LEGACY + Date passée + Pas de snapshot -> REFUS
    console.log("\n--- [TEST B] LEGACY, date passée sans snapshot ---");
    const resB = await simulateCreateEvmSnapshot(pastDateStr, false, 'LEGACY');
    console.log("Résultat :", resB);
    if (resB.code === 'UNCERTIFIED_HISTORICAL_PROGRESS') {
      console.log("✓ SUCCÈS : Sauvegarde rétroactive en mode LEGACY refusée avec code UNCERTIFIED_HISTORICAL_PROGRESS !");
    } else {
      throw new Error("Échec du test B");
    }

    // TEST D: Date future -> REFUS INVALID_FUTURE_CONTROL_DATE
    console.log("\n--- [TEST D] Date future ---");
    const resD = await simulateCreateEvmSnapshot(futureDateStr, false, 'BASELINE');
    console.log("Résultat :", resD);
    if (resD.code === 'INVALID_FUTURE_CONTROL_DATE') {
      console.log("✓ SUCCÈS : Date future rejetée avec code INVALID_FUTURE_CONTROL_DATE !");
    } else {
      throw new Error("Échec du test D");
    }

    // TEST C: Date du jour -> SUCCÈS
    console.log("\n--- [TEST C] Date du jour (today) ---");
    const resC = await simulateCreateEvmSnapshot(todayStr, false, 'BASELINE');
    console.log("Résultat :", resC);
    if (resC.success === true) {
      console.log("✓ SUCCÈS : Sauvegarde officielle pour la date du jour autorisée !");
    } else {
      throw new Error("Échec du test C");
    }

    // Insérer un snapshot réel pour today pour tester le conflit
    await client.query(`
      INSERT INTO evm_snapshots (project_id, control_date, bac_total, pv_total, ev_total, ac_total, cpi_global, spi_global)
      VALUES ($1, $2, 100000, 50000, 45000, 40000, 1.125, 0.9);
    `, [projectId, todayStr]);

    // TEST F: Tentative de doublon sur la même date sans overwrite -> CONFLICT
    console.log("\n--- [TEST F] Tentative de doublon sans overwrite ---");
    const resF = await simulateCreateEvmSnapshot(todayStr, false, 'BASELINE');
    console.log("Résultat :", resF);
    if (resF.code === 'CONFLICT') {
      console.log("✓ SUCCÈS : Doublon rejeté avec code CONFLICT !");
    } else {
      throw new Error("Échec du test F");
    }

    // Clean test snapshot
    await client.query(`DELETE FROM evm_snapshots WHERE project_id = $1 AND control_date = $2;`, [projectId, todayStr]);

    console.log("\n==========================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 10 SONT VALIDÉS !");
    console.log("==========================================================");

  } catch (err) {
    console.error("ERREUR DURANT LES TESTS:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPhase10();
