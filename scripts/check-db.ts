import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo@projetpilote.com',
    password: 'password123'
  })
  
  if (authErr) {
    console.error('Auth err:', authErr)
    return
  }
  
  const { data: projects, error: pErr } = await supabase.from('projects').select('*')
  console.log('Projects Error:', pErr)
  console.log('Projects:', projects)
}

check().catch(console.error)
