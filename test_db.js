const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.uyordjelzsqtyzgsytri:Mo2passeo@@@@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  try {
    const resPtba = await pool.query('SELECT count(*) FROM ptba_activities');
    console.log('PTBA Activities:', resPtba.rows[0].count);
    
    const resWbs = await pool.query('SELECT count(*) FROM wbs_tasks');
    console.log('WBS Tasks:', resWbs.rows[0].count);

    const resBudget = await pool.query('SELECT count(*) FROM budget_lines');
    console.log('Budget Lines:', resBudget.rows[0].count);
    
    const resOps = await pool.query('SELECT count(*) FROM operations_journal');
    console.log('Operations:', resOps.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
