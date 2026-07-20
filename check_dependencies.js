const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local'), 'utf8');
let url = '';
let key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function check() {
  const { data: projects } = await supabase.from('projects').select('id, name').eq('name', 'hjghjh');
  if (!projects || projects.length === 0) {
    console.log("No project hjghjh found");
    return;
  }
  
  for (const p of projects) {
    console.log(`\nProject: ${p.name} (ID: ${p.id})`);
    
    const { count: tasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
    console.log(`Tasks: ${tasks}`);
    
    const { count: budgets } = await supabase.from('budget_lines').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
    console.log(`Budget lines: ${budgets}`);
    
    const { count: members } = await supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
    console.log(`Members: ${members}`);
  }
}

check();
