import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const { data, error } = await supabase.from('profiles').select('*')
  console.log("Profiles:", data)
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log("Users:", authUsers?.users?.map(u => ({ email: u.email })))
}

run()
