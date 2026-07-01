import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const adminClient = createAdminClient()

async function createUserClient(email: string, role: string, projectId: string) {
  // 1. Create User
  const { data: user, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  })
  if (error) throw error

  const userId = user.user.id

  // 2. Insert Profile and Member
  await adminClient.from('profiles').insert({
    id: userId,
    full_name: `Test ${role}`,
    email
  })

  await adminClient.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role
  })

  // 3. Create client and login
  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: 'password123'
  })
  if (signInErr) throw signInErr

  return { client, userId }
}

async function main() {
  console.log('--- TEST RLS ET RBAC ---')
  const timestamp = Date.now()
  let passed = true

  // 1. Setup Admin Data
  const { data: adminUser } = await adminClient.auth.admin.createUser({
    email: `admin_${timestamp}@test.com`,
    password: 'password123',
    email_confirm: true
  })
  await adminClient.from('profiles').insert({ id: adminUser.user.id, full_name: 'Admin', email: adminUser.user.email })

  const { data: project } = await adminClient.from('projects').insert({
    name: 'RLS Project',
    code: `RLS-${timestamp}`,
    created_by: adminUser.user.id
  }).select().single()

  // 2. Create Users
  const roles = ['owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant']
  const users = await Promise.all(
    roles.map(r => createUserClient(`${r}_${timestamp}@test.com`, r, project.id))
  )

  const clients = users.reduce((acc, curr, idx) => {
    acc[roles[idx]] = curr.client
    return acc
  }, {} as Record<string, any>)

  // Helper to test write
  const testInsert = async (client: any, table: string, data: any) => {
    const { error } = await client.from(table).insert(data)
    return error ? false : true
  }

  const testUpdate = async (client: any, table: string, id: string, data: any) => {
    const { error } = await client.from(table).update(data).eq('id', id)
    return error ? false : true
  }

  // --- TESTS ---
  
  // A. bailleur_lecture ne peut jamais écrire
  console.log('Test: bailleur_lecture ne peut pas écrire (wbs_tasks)...')
  const bailleurCanWrite = await testInsert(clients['bailleur_lecture'], 'wbs_tasks', {
    project_id: project.id, code: 'X', description: 'X', date_start: '2026-01-01', date_end: '2026-01-02'
  })
  if (bailleurCanWrite) {
    console.error('❌ FAIL: bailleur_lecture a pu écrire')
    passed = false
  } else {
    console.log('✅ PASS')
  }

  // B. personne ne peut modifier audit_log
  console.log('Test: personne ne peut modifier audit_log...')
  // D'abord on vérifie qu'un owner peut insérer (déjà testé implicitement si les triggers marchent)
  // On crée un mock id pour tester l'update
  const auditUpdateOwner = await testUpdate(clients['owner'], 'audit_log', '00000000-0000-0000-0000-000000000000', { action: 'hacked' })
  if (auditUpdateOwner) {
    console.error('❌ FAIL: owner a pu modifier audit_log')
    passed = false
  } else {
    console.log('✅ PASS')
  }

  // C. comptable écrit sur budget mais pas sur cadre logique
  console.log('Test: comptable écrit sur budget...')
  const comptableCanWriteBudget = await testInsert(clients['comptable'], 'budget_lines', {
    project_id: project.id, code: 'BL', label: 'BL'
  })
  if (!comptableCanWriteBudget) {
    console.error('❌ FAIL: comptable n\'a pas pu écrire sur budget')
    passed = false
  } else {
    console.log('✅ PASS')
  }

  console.log('Test: comptable NE PEUT PAS écrire sur cadre logique...')
  const comptableCanWriteLogframe = await testInsert(clients['comptable'], 'logframe_items', {
    project_id: project.id, level: 'activite', intervention_label: 'Act'
  })
  if (comptableCanWriteLogframe) {
    console.error('❌ FAIL: comptable a pu écrire sur cadre logique')
    passed = false
  } else {
    console.log('✅ PASS')
  }

  // 3. Cleanup
  console.log('Cleaning up test users...')
  for (const u of users) {
    await adminClient.auth.admin.deleteUser(u.userId)
  }
  await adminClient.auth.admin.deleteUser(adminUser.user.id)

  if (!passed) {
    console.error('❌ SOME TESTS FAILED')
    process.exit(1)
  }
  console.log('✅ ALL RLS TESTS PASSED')
  process.exit(0)
}

main().catch(console.error)
