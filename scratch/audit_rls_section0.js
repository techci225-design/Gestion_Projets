require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function auditRlsSection0() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== 0. INSPECTION DÉTAILLÉE DE LA RLS SUR operations_journal ===");
  const polRes = await client.query(`
    SELECT 
      polname,
      polcmd,
      polroles::regrole[],
      pg_get_expr(polqual, polrelid) as using_expr,
      pg_get_expr(polwithcheck, polrelid) as with_check_expr
    FROM pg_policy
    WHERE polrelid = 'operations_journal'::regclass;
  `);
  console.table(polRes.rows);

  // Exécutons des tests en transaction avec rollback
  await client.query('BEGIN');

  try {
    const projRes = await client.query(`SELECT id FROM projects LIMIT 2;`);
    const projectA = projRes.rows[0].id;
    const projectB = projRes.rows[1]?.id;
    const blRes = await client.query(`SELECT id FROM budget_lines WHERE project_id = $1 LIMIT 1;`, [projectA]);
    const blA = blRes.rows[0].id;

    console.log(`Projet A: ${projectA}, Projet B: ${projectB}`);

    // Créons un utilisateur temporaire ou simulons auth.uid()
    // En SQL Supabase : set local role authenticated; set local "request.jwt.claims" = '{"sub": "..."}';
    console.log("RLS inspectée avec succès.");
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
}

auditRlsSection0().catch(console.error);
