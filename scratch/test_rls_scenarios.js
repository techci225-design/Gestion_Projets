require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function testRlsScenarios() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== TEST DES CAS A, B, C, D AVEC RLS ===");

  await client.query('BEGIN');

  try {
    // Récupérer un user PM ou Owner sur Projet A
    const memberRes = await client.query(`
      SELECT pm.project_id, pm.user_id, pm.role 
      FROM project_members pm 
      WHERE pm.role IN ('OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT') 
      LIMIT 1;
    `);
    const pmMember = memberRes.rows[0];
    const projectA = pmMember.project_id;
    const userA = pmMember.user_id;

    // Trouver un projet B où cet utilisateur n'est PAS membre ou n'est pas autorisé
    const otherProjRes = await client.query(`
      SELECT id FROM projects 
      WHERE id <> $1 
        AND id NOT IN (SELECT project_id FROM project_members WHERE user_id = $2)
      LIMIT 1;
    `, [projectA, userA]);
    const projectB = otherProjRes.rows[0]?.id || '00000000-0000-0000-0000-000000000001';

    const blRes = await client.query(`SELECT id FROM budget_lines WHERE project_id = $1 LIMIT 1;`, [projectA]);
    const blA = blRes.rows[0].id;

    console.log(`User: ${userA}, Role: ${pmMember.role}, Projet Autorisé A: ${projectA}, Projet Non Autorisé B: ${projectB}`);

    // Configurer la session PostgreSQL comme utilisateur Supabase connecté
    await client.query(`SET LOCAL ROLE authenticated;`);
    await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: userA, role: 'authenticated' })}';`);

    // TEST A: INSERT dans Projet A (Autorisé)
    console.log("\n--- [TEST A] INSERT dans projet autorisé A ---");
    const insertARes = await client.query(`
      INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
      VALUES ($1, $2, 'Test RLS A', 'planifie', 5000)
      RETURNING id;
    `, [projectA, blA]);
    const opId = insertARes.rows[0].id;
    console.log("✓ INSERT dans projet autorisé A réussi. Opération ID :", opId);

    // TEST B: INSERT dans Projet B (Non autorisé)
    console.log("\n--- [TEST B] INSERT dans projet non autorisé B ---");
    await client.query('SAVEPOINT sp_insert_b');
    try {
      await client.query(`
        INSERT INTO operations_journal (project_id, budget_line_id, task_code, status, planned_cost)
        VALUES ($1, $2, 'Test RLS B', 'planifie', 5000)
        RETURNING id;
      `, [projectB, blA]);
      console.error("❌ ERREUR: L'INSERT dans le projet B aurait dû être refusé par la RLS !");
    } catch (err) {
      console.log("✓ Refusé par RLS (WITH CHECK implicite / policy violation) :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_insert_b');
    }

    // TEST C: UPDATE d'une opération autorisée dans Projet A
    console.log("\n--- [TEST C] UPDATE d'une opération autorisée dans Projet A ---");
    await client.query(`
      UPDATE operations_journal SET planned_cost = 6000 WHERE id = $1;
    `, [opId]);
    console.log("✓ UPDATE dans projet autorisé A réussi.");

    // TEST D: Tentative de changer project_id vers Projet B (Non autorisé)
    console.log("\n--- [TEST D] UPDATE tentant de changer project_id vers Projet B ---");
    await client.query('SAVEPOINT sp_update_d');
    try {
      await client.query(`
        UPDATE operations_journal SET project_id = $1 WHERE id = $2;
      `, [projectB, opId]);
      console.error("❌ ERREUR: Le changement de project_id vers B aurait dû être refusé par RLS !");
    } catch (err) {
      console.log("✓ Refusé par RLS :", err.message);
      await client.query('ROLLBACK TO SAVEPOINT sp_update_d');
    }

  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

testRlsScenarios().catch(console.error);
