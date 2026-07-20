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
  const { data: org_members } = await supabase.from('organization_members')
    .select('*')
    .eq('user_id', '4dc1f4be-04bb-4726-a661-1fc56796989c')
    .eq('organization_id', 'f1776a96-aece-45e4-9075-55959dd307db');

  console.log('Demo User Memberships in KIIT US:', JSON.stringify(org_members, null, 2));
}

checkDb();
