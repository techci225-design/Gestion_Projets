import { createAdminClient } from '../lib/supabase/admin'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })
const supabase = createAdminClient()

async function main() {
  console.log('--- TEST MOTEUR EVM ---')
  
  // 1. Setup Data
  const { data: project } = await supabase.from('projects').insert({
    name: 'EVM Project',
    code: `EVM-${Date.now()}`,
    evm_control_date: '2026-04-01'
  }).select().single()

  const { data: task, error: taskErr } = await supabase.from('wbs_tasks').insert({
    project_id: project.id,
    code: 'T-EVM',
    description: 'EVM Task',
    date_start: '2026-01-01',
    date_end: '2026-06-30',
    budget_allocated: 1000000,
    percent_complete: 40,
    actual_cost: 450000
  }).select().single()
  
  if (taskErr) throw taskErr

  // 2. Read from view
  const { data: indicator, error: viewErr } = await supabase.from('v_evm_indicators').select('*').eq('id', task.id).single()
  if (viewErr) throw viewErr

  // 3. Assertions
  const checkTolerance = (name: string, actual: number, expected: number, tol: number) => {
    if (Math.abs(actual - expected) > tol) {
      console.error(`❌ ${name} Failed: expected ${expected}, got ${actual}`)
      return false
    }
    return true
  }

  let passed = true
  // pv=500000, ev=400000, cv=-50000, sv=-100000
  passed = checkTolerance('PV', indicator.pv, 500000, 1) && passed
  passed = checkTolerance('EV', indicator.ev, 400000, 1) && passed
  passed = checkTolerance('CV', indicator.cv, -50000, 1) && passed
  passed = checkTolerance('SV', indicator.sv, -100000, 1) && passed
  
  // cpi≈0.889, spi=0.8, eac≈1125000
  passed = checkTolerance('CPI', indicator.cpi, 0.8888, 0.001) && passed
  passed = checkTolerance('SPI', indicator.spi, 0.8, 0.001) && passed
  passed = checkTolerance('EAC', indicator.eac, 1125000, 1) && passed

  if (!passed) {
    process.exit(1)
  }

  console.log('✅ EVM Test Passed')
  console.log(indicator)
  process.exit(0)
}

main().catch(console.error)
