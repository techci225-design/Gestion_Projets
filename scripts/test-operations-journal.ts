import { createAdminClient } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabase = createAdminClient()

async function main() {
  console.log('--- TEST JOURNAL DES OPÉRATIONS ---')
  
  // 1. Setup Data
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: `test_${Date.now()}@test.com`,
    password: 'password123',
    email_confirm: true
  })
  if (userError) throw userError

  const { data: profile } = await supabase.from('profiles').insert({
    id: user.user.id,
    full_name: 'Test User',
    email: user.user.email
  }).select().single()

  const { data: project } = await supabase.from('projects').insert({
    name: 'Test Project',
    code: `TEST-${Date.now()}`,
    created_by: profile.id
  }).select().single()

  const { data: funding } = await supabase.from('funding_sources').insert({
    project_id: project.id,
    name: 'Test Funding'
  }).select().single()

  const { data: budget } = await supabase.from('budget_lines').insert({
    project_id: project.id,
    code: '1.1',
    label: 'Test Budget',
    initial_allocated_amount: 100000,
    funding_source_id: funding.id
  }).select().single()

  // Test Cases
  // Case 1: planned_cost=15000, actual_cost=15500, status='decaisse'
  const { data: op1, error: e1 } = await supabase.from('operations_journal').insert({
    project_id: project.id,
    budget_line_id: budget.id,
    task_code: 'T1',
    status: 'decaisse',
    planned_cost: 15000,
    actual_cost: 15500
  }).select().single()
  
  if (op1.montant_decaisse !== 15500 || op1.ecart_budgetaire !== -500) {
    console.error('❌ Case 1 Failed:', op1)
    process.exit(1)
  }
  console.log('✅ Case 1 Passed')

  // Case 2: planned_cost=5000, status='engage'
  const { data: op2 } = await supabase.from('operations_journal').insert({
    project_id: project.id,
    budget_line_id: budget.id,
    task_code: 'T2',
    status: 'engage',
    planned_cost: 5000
  }).select().single()

  if (op2.montant_engage !== 5000 || op2.montant_decaisse !== 0 || op2.ecart_budgetaire !== 0) {
    console.error('❌ Case 2 Failed:', op2)
    process.exit(1)
  }
  console.log('✅ Case 2 Passed')

  // Case 3: planned_cost=10000, status='planifie'
  const { data: op3 } = await supabase.from('operations_journal').insert({
    project_id: project.id,
    budget_line_id: budget.id,
    task_code: 'T3',
    status: 'planifie',
    planned_cost: 10000
  }).select().single()

  if (op3.reste_a_engager !== 10000 || op3.montant_engage !== 0 || op3.montant_decaisse !== 0) {
    console.error('❌ Case 3 Failed:', op3)
    process.exit(1)
  }
  console.log('✅ Case 3 Passed')

  console.log('--- ALL TESTS PASSED ---')
  process.exit(0)
}

main().catch(console.error)
