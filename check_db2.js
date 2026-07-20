const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let url = '';
let key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function checkDb() {
  const { data: orgs } = await supabase.from('organizations').select('id, name');
  const { data: projects } = await supabase.from('projects').select('id, name, organization_id, created_by').eq('name', 'PONT');
  const { data: project_members } = await supabase.from('project_members').select('*');

  console.log('Orgs:', JSON.stringify(orgs, null, 2));
  console.log('PONT Projects:', JSON.stringify(projects, null, 2));
  const pontIds = projects.map(p => p.id);
  console.log('PONT Members:', JSON.stringify(project_members.filter(m => pontIds.includes(m.project_id)), null, 2));
}

checkDb();
