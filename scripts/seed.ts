import { createAdminClient } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })
const supabase = createAdminClient()

async function seed() {
  console.log('Seeding demo data...')
  
  // 1. Create a demo user
  const email = 'demo@projetpilote.com'
  const password = 'password123'
  
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  if (userError && userError.message !== 'User already registered') {
    console.error('Error creating user:', userError)
  }
  
  let userId = userData?.user?.id
  if (!userId) {
    const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).single()
    userId = existingUser?.id
  }
  
  if (!userId) {
    // try to get from auth.users (can't directly query from client, but let's assume it works or created)
    const { data: users } = await supabase.auth.admin.listUsers()
    userId = users.users.find(u => u.email === email)?.id
  }

  if (userId) {
    await supabase.from('profiles').upsert({ id: userId, full_name: 'Demo User', email })
    
    // 2. Create a project
    const { data: project, error: pErr } = await supabase.from('projects').insert({
      name: 'Projet Routier National ' + Date.now(),
      code: 'PRN-' + Date.now(),
      evm_control_date: '2026-06-30',
      created_by: userId
    }).select().single()
    
    if (pErr) console.error('Project err:', pErr)

    if (project) {
      const { error: pmErr } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: userId,
        role: 'owner'
      })
      if (pmErr) console.error('Member err:', pmErr)
      
      // 3. Create EVM Task
      await supabase.from('wbs_tasks').insert({
        project_id: project.id,
        code: 'T1',
        description: 'Terrassement',
        date_start: '2026-01-01',
        date_end: '2026-12-31',
        budget_allocated: 5000000,
        percent_complete: 45,
        actual_cost: 2500000
      })
      await supabase.from('wbs_tasks').insert({
        project_id: project.id,
        code: 'T2',
        description: 'Bitumage',
        date_start: '2026-06-01',
        date_end: '2027-06-30',
        budget_allocated: 12000000,
        percent_complete: 10,
        actual_cost: 1500000
      })
      console.log('Seed successful. You can log in with demo@projetpilote.com / password123')
    }
  }
}

seed().catch(console.error)
