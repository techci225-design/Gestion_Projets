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
  const { data: projects } = await supabase.from('projects').select('id, name, organization_id, created_by').eq('name', 'hjghjh');
  const { data: project_members } = await supabase.from('project_members').select('*');

  console.log('hjghjh Projects:', JSON.stringify(projects, null, 2));
  if (projects && projects.length > 0) {
    const pIds = projects.map(p => p.id);
    console.log('hjghjh Members:', JSON.stringify(project_members.filter(m => pIds.includes(m.project_id)), null, 2));
  }
}

checkDb();
