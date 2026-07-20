const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local to get Supabase URL and Key
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let url = '';
let key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function checkDb() {
  const { data: orgs } = await supabase.from('organizations').select('*');
  const { data: projects } = await supabase.from('projects').select('id, name, organization_id, created_by');
  const { data: members } = await supabase.from('organization_members').select('*');
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');

  console.log('Organizations:', orgs);
  console.log('Projects:', projects);
  console.log('Org Members:', members);
  console.log('Profiles:', profiles);
}

checkDb();
