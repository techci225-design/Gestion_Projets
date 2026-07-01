import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from './lib/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

async function main() {
  const admin = createAdminClient();
  const p = await admin.from('projects').insert({name: 'R', code: 'R' + Date.now()}).select().single();
  const u = await admin.auth.admin.createUser({email: 'c' + Date.now() + '@t.com', password: 'password123', email_confirm: true});
  await admin.from('profiles').insert({id: u.data.user?.id, full_name: 'C'});
  await admin.from('project_members').insert({project_id: p.data.id, user_id: u.data.user?.id, role: 'comptable'});
  
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await c.auth.signInWithPassword({email: u.data.user?.email || '', password: 'password123'});
  
  const resRPC = await c.rpc('fn_user_role', {p_project_id: p.data.id});
  console.log('RPC RESULT:', resRPC);

  const res = await c.from('budget_lines').insert({project_id: p.data.id, code: 'BL', label: 'BL', initial_allocated_amount: 100}).select();
  console.log('INSERT RESULT:', res);
}
main();
