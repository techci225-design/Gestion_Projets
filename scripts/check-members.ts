import { createAdminClient } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })
const supabase = createAdminClient()

async function check() {
  const { data: users } = await supabase.auth.admin.listUsers()
  const demo = users.users.find(u => u.email === 'demo@projetpilote.com')
  console.log('Demo user ID:', demo?.id)
  
  const { data: members } = await supabase.from('project_members').select('*').eq('user_id', demo?.id)
  console.log('Demo user members:', members)
}
check().catch(console.error)
