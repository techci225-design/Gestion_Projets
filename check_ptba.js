require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  try {
    // 1. Find WBS task 1.1 "Études préliminaires"
    const { data: wbsTasks, error: wbsError } = await supabase
      .from('wbs_tasks')
      .select('id, code, name')
      .ilike('name', '%Études préliminaires%');

    if (wbsError) throw wbsError;
    console.log("WBS Tasks found:", wbsTasks);
    
    if (!wbsTasks || wbsTasks.length === 0) {
      console.log("Tâche WBS introuvable.");
      return;
    }
    
    const wbsTaskId = wbsTasks[0].id;

    // 2. Query PTBA activities for this task and fiscal year 2026
    const { data: ptbaData, error: ptbaError } = await supabase
      .from('ptba_activities')
      .select('*')
      .eq('wbs_task_id', wbsTaskId)
      .eq('fiscal_year', 2026);
      
    if (ptbaError) throw ptbaError;
    
    console.log("\n--- RESULTATS ---");
    if (ptbaData && ptbaData.length > 0) {
      console.log("Ligne trouvée : OUI");
      const row = ptbaData[0];
      console.log("ID :", row.id);
      console.log("WBS Task ID :", row.wbs_task_id);
      console.log("Budget Line ID :", row.budget_line_id);
      console.log("Budget Planned :", row.budget_planned);
      console.log(`Q1: ${row.q1}, Q2: ${row.q2}, Q3: ${row.q3}, Q4: ${row.q4}`);
      console.log("Status :", row.status || "N/A (champ inexistant ou null)");
    } else {
      console.log("Ligne trouvée : NON");
    }

  } catch (err) {
    console.error("Erreur :", err);
  }
}

checkData();
