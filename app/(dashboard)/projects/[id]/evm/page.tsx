import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EvmClient } from './evm-client'
import { 
  calculateTaskBAC, calculateTaskPV, calculateTaskEV, calculateTaskAC, calculateIndicators,
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export default async function EvmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    redirect('/projects')
  }

  // 1. Fetch raw data
  const { data: wbsTasksData } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, task_type, code, description, responsible_user_id, responsible, date_start, date_end, percent_complete')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })

  const { data: ptbaActivitiesData } = await supabase
    .from('ptba_activities')
    .select('wbs_task_id, fiscal_year, budget_planned')
    .in('wbs_task_id', (wbsTasksData || []).map(t => t.id))

  const { data: journalData } = await supabase
    .from('operations_journal')
    .select('wbs_task_id, status, actual_cost, operation_date')
    .in('wbs_task_id', (wbsTasksData || []).map(t => t.id))

  const { data: snapshots } = await supabase
    .from('evm_snapshots')
    .select('*')
    .eq('project_id', id)
    .order('control_date', { ascending: true })

  // 2. Prepare typed data
  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]
  
  const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]

  // 3. Compute indicators per task (leaf nodes only for display)
  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  const indicators = leafTasks.map(task => {
    const bac = calculateTaskBAC(task, ptbaActivities)
    const pvRes = calculateTaskPV(statusDateStr, task, ptbaActivities)
    const ev = calculateTaskEV(task, ptbaActivities)
    const ac = calculateTaskAC(statusDateStr, task, operations)
    const ind = calculateIndicators(bac, pvRes.pv, ev, ac)
    
    return {
      id: task.id,
      code: task.code,
      description: task.description,
      responsible: task.responsible,
      date_start: task.date_start,
      date_end: task.date_end,
      percent_complete: task.percent_complete,
      budget_allocated: bac, // Overriding with PTBA BAC
      actual_cost: ac,
      pv: pvRes.pv,
      ev: ev,
      cv: ind.cv,
      sv: ind.sv,
      cpi: ind.cpi,
      spi: ind.spi,
      warnings: pvRes.warnings,
    }
  })

  // 4. Compute global summary
  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
  const pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations)
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)
  
  const eacGlobal = pInd.eac

  const summaryData = {
    bac_total: pBAC,
    pv_total: pPV,
    ev_total: pEV,
    ac_total: pAC,
    cpi_global: pInd.cpi,
    spi_global: pInd.spi,
    eac_global: eacGlobal
  }

  return (
    <EvmClient 
      projectId={id}
      project={project}
      summary={summaryData}
      indicators={indicators}
      snapshots={snapshots || []}
    />
  )
}
