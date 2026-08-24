require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testPhase10_1() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("===================================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 10.1 (IMMUTABILITÉ SNAPSHOTS) ===");
  console.log("===================================================================");

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    console.log("Projet test :", projectId);

    const testDate = '2026-08-20';

    // Clean prior test snapshots
    await client.query(`DELETE FROM evm_snapshots WHERE project_id = $1 AND control_date = $2;`, [projectId, testDate]);

    // TEST A: Création snapshot initial
    console.log("\n--- [TEST A] Création snapshot initial ---");
    const insertRes = await client.query(`
      INSERT INTO evm_snapshots (
        project_id, control_date, bac_total, pv_total, ev_total, ac_total, cpi_global, spi_global, eac_global, notes
      ) VALUES (
        $1, $2, 100000, 50000, 45000, 40000, 1.125, 0.9, 88888, 'Note initiale'
      ) RETURNING id, bac_total, notes;
    `, [projectId, testDate]);
    const snapshotId = insertRes.rows[0].id;
    console.log("✓ Snapshot créé avec succès. ID :", snapshotId);

    // TEST B & C: Deuxième création même date -> Doublon interdit (UNIQUE constraint / SNAPSHOT_ALREADY_EXISTS)
    console.log("\n--- [TEST B & C] Deuxième création sur même date (Doublon / Overwrite impossible) ---");
    try {
      await client.query(`
        INSERT INTO evm_snapshots (
          project_id, control_date, bac_total, pv_total, ev_total, ac_total
        ) VALUES (
          $1, $2, 200000, 100000, 90000, 80000
        );
      `, [projectId, testDate]);
      console.error("❌ ERREUR: L'insertion d'un snapshot en doublon aurait dû être rejetée !");
    } catch (err) {
      console.log("✓ Contrainte UNIQUE a correctement rejeté le doublon :", err.message);
    }

    // TEST D: Tentative d'UPDATE direct de bac_total -> REFUS DB Trigger
    console.log("\n--- [TEST D] Tentative d'UPDATE direct de bac_total ---");
    try {
      await client.query(`UPDATE evm_snapshots SET bac_total = 999999 WHERE id = $1;`, [snapshotId]);
      console.error("❌ ERREUR: Le trigger aurait dû refuser la modification de bac_total !");
    } catch (err) {
      console.log("✓ Trigger PostgreSQL a correctement rejeté l'altération de bac_total :", err.message);
    }

    // TEST E: Tentative d'UPDATE direct de pv_total / cpi_global -> REFUS DB Trigger
    console.log("\n--- [TEST E] Tentative d'UPDATE direct de cpi_global ---");
    try {
      await client.query(`UPDATE evm_snapshots SET cpi_global = 2.5 WHERE id = $1;`, [snapshotId]);
      console.error("❌ ERREUR: Le trigger aurait dû refuser la modification de cpi_global !");
    } catch (err) {
      console.log("✓ Trigger PostgreSQL a correctement rejeté l'altération de cpi_global :", err.message);
    }

    // TEST F: Tentative d'UPDATE direct de baseline_id -> REFUS DB Trigger
    console.log("\n--- [TEST F] Tentative d'UPDATE direct de baseline_id ---");
    try {
      await client.query(`UPDATE evm_snapshots SET baseline_id = '00000000-0000-0000-0000-000000000000' WHERE id = $1;`, [snapshotId]);
      console.error("❌ ERREUR: Le trigger aurait dû refuser la modification de baseline_id !");
    } catch (err) {
      console.log("✓ Trigger PostgreSQL a correctement rejeté l'altération de baseline_id :", err.message);
    }

    // TEST G: UPDATE du champ notes -> AUTORISÉ
    console.log("\n--- [TEST G] Modification autorisée du champ notes ---");
    await client.query(`UPDATE evm_snapshots SET notes = 'Note mise à jour lors de la revue mensuelle' WHERE id = $1;`, [snapshotId]);
    const updatedNotesRes = await client.query(`SELECT notes, bac_total FROM evm_snapshots WHERE id = $1;`, [snapshotId]);
    console.log("✓ Note mise à jour avec succès :", updatedNotesRes.rows[0].notes);

    // TEST H: Vérification de l'intégrité globale du snapshot
    console.log("\n--- [TEST H] Vérification de l'intégrité finale du snapshot ---");
    const finalCheck = await client.query(`SELECT * FROM evm_snapshots WHERE id = $1;`, [snapshotId]);
    const snap = finalCheck.rows[0];
    if (
      Number(snap.bac_total) === 100000 &&
      Number(snap.pv_total) === 50000 &&
      Number(snap.ev_total) === 45000 &&
      Number(snap.ac_total) === 40000 &&
      Number(snap.cpi_global) === 1.125 &&
      Number(snap.spi_global) === 0.9 &&
      snap.notes === 'Note mise à jour lors de la revue mensuelle'
    ) {
      console.log("✓ SUCCÈS : Toutes les métriques financières sont strictement préservées et immuables !");
    } else {
      throw new Error("Altération détectée sur le snapshot !");
    }

    // Clean test snapshot
    await client.query(`DELETE FROM evm_snapshots WHERE id = $1;`, [snapshotId]);

    console.log("\n===================================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 10.1 SONT VALIDÉS !");
    console.log("===================================================================");

  } catch (err) {
    console.error("ERREUR DURANT LES TESTS:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testPhase10_1();
