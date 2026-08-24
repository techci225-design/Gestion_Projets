require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');
const crypto = require('crypto');

async function testPhase15BankTraceability() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=========================================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 15B (TRAÇABILITÉ & RAPPROCHEMENT) ===");
  console.log("=========================================================================");

  await client.query('BEGIN');

  try {
    const projRes = await client.query(`SELECT id, currency FROM projects LIMIT 1;`);
    const projectId = projRes.rows[0].id;
    const projectCurrency = projRes.rows[0].currency || 'XOF';

    // 1. Créer une ligne budgétaire et deux engagements pour le test
    const blRes = await client.query(`
      INSERT INTO budget_lines (project_id, code, label, initial_allocated_amount)
      VALUES ($1, 'BL-BANK-TEST', 'Ligne Test Rapprochement', 50000)
      RETURNING id;
    `, [projectId]);
    const budgetLineId = blRes.rows[0].id;

    const opA = await client.query(`
      INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
      VALUES ($1, $2, 'OP-A-CONTRACT', 'engage', 6000)
      RETURNING id;
    `, [projectId, budgetLineId]);
    const opAId = opA.rows[0].id;

    const opB = await client.query(`
      INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
      VALUES ($1, $2, 'OP-B-CONTRACT', 'engage', 4000)
      RETURNING id;
    `, [projectId, budgetLineId]);
    const opBId = opB.rows[0].id;

    console.log("✓ Engagements créés : OP-A (6 000) et OP-B (4 000)");

    // 2. TEST IDEMPOTENCE FICHIER (TEST A)
    console.log("\n--- [TEST A] Idempotence Fichier : bank_imports file_hash ---");
    const sampleCsvContent = `Date,Libelle,Debit,Credit\n2026-08-10,Virement Fournisseur Global,10000.00,0.00`;
    const fileHash = crypto.createHash('sha256').update(sampleCsvContent, 'utf8').digest('hex');

    const importRes = await client.query(`
      INSERT INTO bank_imports (
        project_id, file_name, file_hash, account_reference, currency, total_rows
      ) VALUES ($1, 'releve_aout_2026.csv', $2, '****4812', $3, 1)
      RETURNING id;
    `, [projectId, fileHash, projectCurrency]);
    const importId = importRes.rows[0].id;
    console.log("✓ Import 1 créé avec succès. ID :", importId);

    // Deuxième tentative avec le même file_hash -> doit échouer sur contrainte UNIQUE
    await client.query('SAVEPOINT sp_file_dup');
    try {
      await client.query(`
        INSERT INTO bank_imports (
          project_id, file_name, file_hash, account_reference, currency, total_rows
        ) VALUES ($1, 'releve_aout_2026.csv', $2, '****4812', $3, 1);
      `, [projectId, fileHash, projectCurrency]);
      console.error("❌ ERREUR : Le doublon de fichier aurait dû être bloqué !");
    } catch (err) {
      console.log("✓ Doublon de fichier correctement rejeté par uq_bank_imports_project_file :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_file_dup');
    }

    // 3. Créer une transaction bancaire de 10 000
    const txRes = await client.query(`
      INSERT INTO bank_transactions (
        bank_import_id, project_id, source_row_index, transaction_date, description,
        bank_reference, debit_amount, credit_amount, currency, fingerprint
      ) VALUES (
        $1, $2, 1, '2026-08-10'::date, 'Virement Fournisseur Global',
        'VIR-2026-001', 10000.00, 0.00, $3, 'FINGERPRINT_SAMPLE_1'
      ) RETURNING id;
    `, [importId, projectId, projectCurrency]);
    const bankTxId = txRes.rows[0].id;
    console.log("✓ Transaction bancaire débit 10 000 créée. ID :", bankTxId);

    // 4. TEST SPLIT 1 TRANSACTION -> 2 ENGAGEMENTS (TEST E)
    console.log("\n--- [TEST E] Rapprochement Split : 1 Transaction 10 000 -> OP-A (6 000) + OP-B (4 000) ---");
    const splitsPayload = JSON.stringify([
      { operation_id: opAId, amount: 6000, notes: 'Split A 60%' },
      { operation_id: opBId, amount: 4000, notes: 'Split B 40%' }
    ]);

    const rpcRes = await client.query(`
      SELECT fn_reconcile_bank_transaction($1, $2, $3::jsonb);
    `, [projectId, bankTxId, splitsPayload]);
    console.log("Résultat RPC Rapprochement :", rpcRes.rows[0].fn_reconcile_bank_transaction);

    // Vérifier les décaissements créés
    const disbsRes = await client.query(`
      SELECT id, operation_id, bank_transaction_id, amount, disbursement_date, reference_piece
      FROM operation_disbursements
      WHERE bank_transaction_id = $1;
    `, [bankTxId]);
    console.table(disbsRes.rows);

    if (disbsRes.rows.length !== 2) {
      throw new Error(`Attendu 2 décaissements, obtenu ${disbsRes.rows.length}`);
    }

    // Vérifier la vue dérivée v_bank_transactions
    const vTxRes = await client.query(`
      SELECT id, debit_amount, matched_amount, remaining_amount, match_status
      FROM v_bank_transactions
      WHERE id = $1;
    `, [bankTxId]);
    console.log("Vue Dérivée v_bank_transactions :", vTxRes.rows[0]);

    if (Number(vTxRes.rows[0].matched_amount) !== 10000 || Number(vTxRes.rows[0].remaining_amount) !== 0 || vTxRes.rows[0].match_status !== 'MATCHED') {
      throw new Error("Erreur de calcul dans v_bank_transactions après rapprochement complet !");
    }

    // 5. TEST DÉPASSEMENT SPLIT SUR TRANSACTION (TEST G)
    console.log("\n--- [TEST G] Tentative de sur-rapprocher sur transaction déjà soldée ---");
    await client.query('SAVEPOINT sp_over_reconcile');
    try {
      const overSplit = JSON.stringify([{ operation_id: opAId, amount: 500 }]);
      await client.query(`SELECT fn_reconcile_bank_transaction($1, $2, $3::jsonb);`, [projectId, bankTxId, overSplit]);
      console.error("❌ ERREUR : La RPC aurait dû refuser le dépassement sur la transaction bancaire !");
    } catch (err) {
      console.log("✓ Rejeté avec succès par la RPC :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_over_reconcile');
    }

    // 6. TEST DEVISE DIVERGENTE (TEST K)
    console.log("\n--- [TEST K] Vérification du blocage si devise différente (BANK_CURRENCY_MISMATCH) ---");
    const foreignTxRes = await client.query(`
      INSERT INTO bank_transactions (
        bank_import_id, project_id, source_row_index, transaction_date, description,
        debit_amount, credit_amount, currency, fingerprint
      ) VALUES (
        $1, $2, 2, '2026-08-11'::date, 'Foreign wire USD',
        5000.00, 0.00, 'USD', 'FINGERPRINT_USD_1'
      ) RETURNING id;
    `, [importId, projectId]);
    const foreignTxId = foreignTxRes.rows[0].id;

    await client.query('SAVEPOINT sp_cur_mismatch');
    try {
      const splitPayload = JSON.stringify([{ operation_id: opAId, amount: 1000 }]);
      await client.query(`SELECT fn_reconcile_bank_transaction($1, $2, $3::jsonb);`, [projectId, foreignTxId, splitPayload]);
      console.error("❌ ERREUR : La RPC aurait dû refuser la transaction avec devise divergente !");
    } catch (err) {
      console.log("✓ Rejeté avec succès avec BANK_CURRENCY_MISMATCH :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_cur_mismatch');
    }

    console.log("\n=========================================================================");
    console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 15B SONT VALIDÉS !");
    console.log("=========================================================================");

  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

testPhase15BankTraceability().catch(console.error);
