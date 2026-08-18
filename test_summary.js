require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const projectId = '98567222-ad82-4b8c-91b1-1bd271929340';

async function recalculateSummaryDates(supabase, projectId) {
  const { data: allTasks, error } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, task_type, date_start, date_end')
    .eq('project_id', projectId);

  if (error || !allTasks) return;

  const updates = [];
  const childrenMap = new Map();
  allTasks.forEach(t => {
    if (t.parent_id) {
      if (!childrenMap.has(t.parent_id)) childrenMap.set(t.parent_id, []);
      childrenMap.get(t.parent_id).push(t);
    }
  });

  const computedBounds = new Map();

  function computeBounds(nodeId) {
    if (computedBounds.has(nodeId)) return computedBounds.get(nodeId);

    const node = allTasks.find(t => t.id === nodeId);
    if (!node) return { start: null, end: null };

    const children = childrenMap.get(nodeId) || [];
    let minStart = null;
    let maxEnd = null;

    if (node.task_type === 'SUMMARY') {
      for (const child of children) {
        const childBounds = computeBounds(child.id);
        if (childBounds.start) {
          if (!minStart || new Date(childBounds.start) < new Date(minStart)) minStart = childBounds.start;
        }
        if (childBounds.end) {
          if (!maxEnd || new Date(childBounds.end) > new Date(maxEnd)) maxEnd = childBounds.end;
        }
      }
      
      let newStart = node.date_start;
      let newEnd = node.date_end;

      if (minStart && maxEnd) {
        newStart = minStart;
        newEnd = maxEnd;
      }

      if (newStart !== node.date_start || newEnd !== node.date_end) {
        updates.push({ id: node.id, date_start: newStart, date_end: newEnd });
        node.date_start = newStart;
        node.date_end = newEnd;
      }

      const result = { start: newStart, end: newEnd };
      computedBounds.set(nodeId, result);
      return result;
    } else {
      const result = { start: node.date_start, end: node.date_end };
      computedBounds.set(nodeId, result);
      return result;
    }
  }

  const rootNodes = allTasks.filter(t => !t.parent_id);
  for (const root of rootNodes) {
    computeBounds(root.id);
  }

  for (const update of updates) {
    await supabase.from('wbs_tasks').update({ 
      date_start: update.date_start, 
      date_end: update.date_end 
    }).eq('id', update.id);
  }
}

async function runTests() {
  const summaryId = '74bd1157-98f4-4d4c-8bce-e5c12ecdebf2'; // 1
  const t11Id = '453bc347-0740-4aa9-9395-27cc2fc872f4'; // 1.1
  const t12Id = 'd1f9d891-459b-48e9-89d1-33a56f566d44'; // 1.2

  async function printState(msg) {
    const { data } = await supabase.from('wbs_tasks').select('code, date_start, date_end').in('id', [summaryId, t11Id, t12Id]).order('code');
    console.log(`\n--- ${msg} ---`);
    data.forEach(d => console.log(`${d.code} : ${d.date_start} -> ${d.date_end}`));
  }

  // Set initial state
  await supabase.from('wbs_tasks').update({ date_start: '2026-09-01', date_end: '2026-09-30' }).eq('id', t11Id);
  await supabase.from('wbs_tasks').update({ date_start: '2026-08-17', date_end: '2026-08-30' }).eq('id', t12Id);
  await supabase.from('wbs_tasks').update({ date_start: '2026-08-17', date_end: '2026-09-17' }).eq('id', summaryId);

  await printState("INITIAL STATE (Avant recalcul)");

  // TEST 1: Recalculate
  await recalculateSummaryDates(supabase, projectId);
  await printState("TEST 1 - Après recalcul (1.1 déplacé à 01/09 -> 30/09)");

  // TEST 2: Enfant déplacé vers l'intérieur
  await supabase.from('wbs_tasks').update({ date_start: '2026-09-05', date_end: '2026-09-25' }).eq('id', t11Id);
  await recalculateSummaryDates(supabase, projectId);
  await printState("TEST 2 - Après déplacement de 1.1 vers l'intérieur (05/09 -> 25/09)");

  // TEST 3: Suppression d'un enfant (on le détache)
  await supabase.from('wbs_tasks').update({ parent_id: null }).eq('id', t11Id);
  await recalculateSummaryDates(supabase, projectId);
  await printState("TEST 3 - Après détachement de 1.1 (le parent n'a plus que 1.2)");
  // Remettre
  await supabase.from('wbs_tasks').update({ parent_id: summaryId }).eq('id', t11Id);

  // TEST 4: Nested Summary
  // Create a new nested summary 1.1 -> 1.1.1, 1.1.2
  // We will convert 1.1 to SUMMARY and add two children
  await supabase.from('wbs_tasks').update({ task_type: 'SUMMARY' }).eq('id', t11Id);
  const { data: child1 } = await supabase.from('wbs_tasks').insert({
    project_id: projectId, parent_id: t11Id, name: '1.1.1', code: '1.1.1', task_type: 'TASK',
    date_start: '2026-09-10', date_end: '2026-09-15'
  }).select().single();
  const { data: child2 } = await supabase.from('wbs_tasks').insert({
    project_id: projectId, parent_id: t11Id, name: '1.1.2', code: '1.1.2', task_type: 'TASK',
    date_start: '2026-09-20', date_end: '2026-09-25'
  }).select().single();

  await recalculateSummaryDates(supabase, projectId);
  
  const { data: nested } = await supabase.from('wbs_tasks').select('code, task_type, date_start, date_end').in('id', [summaryId, t11Id, t12Id, child1.id, child2.id]).order('code');
  console.log(`\n--- TEST 4 - Après création sous-tâches 1.1.1 et 1.1.2 ---`);
  nested.forEach(d => console.log(`${d.code} (${d.task_type}) : ${d.date_start} -> ${d.date_end}`));

  // Cleanup
  await supabase.from('wbs_tasks').delete().in('id', [child1.id, child2.id]);
  await supabase.from('wbs_tasks').update({ task_type: 'TASK', date_start: '2026-09-01', date_end: '2026-09-30' }).eq('id', t11Id);
  await recalculateSummaryDates(supabase, projectId);
}

runTests();
