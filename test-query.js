require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing page.tsx query...');
  const res1 = await supabase
    .from('invitations')
    .select('*, invited_by_profile:profiles!invited_by(full_name)')
    .eq('project_id', '20ea93d1-f515-4d4a-8bf2-de6ecae8d061')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  console.log('Res1 error:', res1.error);
  console.log('Res1 data count:', res1.data ? res1.data.length : 0);

  console.log('Testing admin.actions.ts query...');
  const res2 = await supabase
    .from('profiles')
    .select(`
      id,
      invitations!invited_by ( id, status )
    `)
    .limit(1);
  console.log('Res2 error:', res2.error);
}

test();
