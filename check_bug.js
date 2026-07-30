const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Latest 5 profiles:', profiles);

  const { data: orgs, error: oErr } = await supabase.from('organization_members').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Latest 5 org members:', orgs);
  
  const { data: invs, error: iErr } = await supabase.from('invitations').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('Latest 5 invitations:', invs);
}

check();
