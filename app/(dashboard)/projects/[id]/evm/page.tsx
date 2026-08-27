import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EvmClient } from './evm-client'
import { 
  calculateTaskBAC, calculateTaskPV, calculateTaskEV, calculateTaskAC, calculateIndicators,
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC,
  calculateBaselineItemPV, calculateBaselineItemEV, calculateBaselineProjectPV, calculateBaselineProjectEV, calculateBaselineProjectAC,
  EvmBaselineItemInput,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

import { getProjectBaselines } from '@/lib/actions/baseline.actions'
import { getUserRole } from '@/lib/actions/auth.actions'

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

  // 1. Fetch raw data in parallel
  const [
    { data: wbsTasksData },
    { data: ptbaActivitiesData },
    { data: journalData },
    { data: disbursementsData },
    { data: snapshots },
    baselinesRes,
    { data: budgetLinesData },
    currentUserRole
  ] = await Promise.all([
    supabase
      .from('wbs_tasks')
      .select('id, parent_id, task_type, code, description, responsible_user_id, responsible, date_start, date_end, percent_complete')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('ptba_activities')
      .select('wbs_task_id, fiscal_year, budget_planned')
      .eq('project_id', id),
    supabase
      .from('operations_journal')
      .select('id, wbs_task_id, status, actual_cost, operation_date')
      .eq('project_id', id),
    supabase
      .from('operation_disbursements')
      .select('id, operation_id, project_id, disbursement_date, amount')
      .eq('project_id', id),
    supabase
      .from('evm_snapshots')
      .select('*')
      .eq('project_id', id)
      .order('control_date', { ascending: true }),
    getProjectBaselines(id),
    supabase
      .from('budget_lines')
      .select('id, code, label, initial_allocated_amount')
      .eq('project_id', id),
    getUserRole(id)
  ])

  // 2. Prepare typed data
  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]
  const disbursements = (disbursementsData || []) as any[]
  const allBaselines = baselinesRes.data || []
  
  const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]

  // 3. Determine applicable baseline for statusDateStr
  const candidateBaselines = allBaselines
    .filter(b => (b.status === 'APPROVED' || b.status === 'SUPERSEDED') && b.effective_date && b.effective_date <= statusDateStr)
    .sort((a, b) => {
      if (b.effective_date! !== a.effective_date!) {
        return b.effective_date!.localeCompare(a.effective_date!)
      }
      return b.version_number - a.version_number
    })

  const applicableBaselineHeader = candidateBaselines.length > 0 ? candidateBaselines[0] : null

  let indicators: any[] = []
  let summaryData: any = null

  if (applicableBaselineHeader) {
    // === MODE BASELINE ===
    const { data: baselineItems } = await supabase
      .from('evm_baseline_items')
      .select('*')
      .eq('baseline_id', applicableBaselineHeader.id)
      .order('wbs_code_snapshot', { ascending: true })

    const items = (baselineItems || []) as EvmBaselineItemInput[]

    // Map tasks for fast lookup
    const taskMap = new Map(wbsTasks.map(t => [t.id, t]))

    indicators = items.map((item: EvmBaselineItemInput) => {
      const task = item.wbs_task_id ? taskMap.get(item.wbs_task_id) : null
      const bac = Number(item.planned_bac) || 0
      const pvRes = calculateBaselineItemPV(statusDateStr, item)
      const evRes = calculateBaselineItemEV(item, task)
      const ac = item.wbs_task_id ? calculateTaskAC(statusDateStr, task || { id: item.wbs_task_id, task_type: 'TASK' } as any, operations, disbursements) : 0
      const ind = calculateIndicators(bac, pvRes.pv, evRes.ev, ac)

      return {
        id: item.id,
        code: item.wbs_code_snapshot,
        description: item.wbs_name_snapshot,
        responsible: task?.responsible || null,
        date_start: item.planned_start,
        date_end: item.planned_end,
        percent_complete: task ? (task.percent_complete ?? 0) : 0,
        budget_allocated: bac,
        actual_cost: ac,
        pv: pvRes.pv,
        ev: evRes.ev,
        cv: ind.cv,
        sv: ind.sv,
        cpi: ind.cpi,
        spi: ind.spi,
        warnings: [...pvRes.warnings, ...evRes.warnings],
        is_orphan: !task
      }
    })

    const todayStr = new Date().toISOString().split('T')[0]
    const isPast = statusDateStr < todayStr
    const isFuture = statusDateStr > todayStr
    const hasSavedSnapshot = (snapshots || []).some((s: any) => s.control_date === statusDateStr)

    const temporalWarnings: string[] = []
    if (isPast && !hasSavedSnapshot) {
      temporalWarnings.push("UNCERTIFIED_HISTORICAL_PROGRESS: Simulation historique non certifiée — L'avancement physique (% achevé) provient de l'état actuel et n'est pas garanti historiquement pour cette date passée.")
    } else if (isFuture) {
      temporalWarnings.push("INVALID_FUTURE_CONTROL_DATE: Date de contrôle future — Simulation prévisionnelle uniquement.")
    }

    const pBAC = items.reduce((sum, it) => sum + (Number(it.planned_bac) || 0), 0)
    const pPVRes = calculateBaselineProjectPV(statusDateStr, items)
    const pEVRes = calculateBaselineProjectEV(items, wbsTasks)
    const acRes = calculateBaselineProjectAC(statusDateStr, items, operations, disbursements)
    const pInd = calculateIndicators(pBAC, pPVRes.pv, pEVRes.ev, acRes.ac_total)

    summaryData = {
      mode: 'BASELINE',
      baseline: applicableBaselineHeader,
      bac_total: pBAC,
      pv_total: pPVRes.pv,
      ev_total: pEVRes.ev,
      ac_baseline: acRes.ac_baseline,
      ac_out_of_baseline: acRes.ac_out_of_baseline,
      ac_total: acRes.ac_total,
      cpi_global: pInd.cpi,
      spi_global: pInd.spi,
      eac_global: pInd.eac,
      warnings: [...temporalWarnings, ...pPVRes.warnings, ...pEVRes.warnings, ...acRes.warnings]
    }
  } else {
    // === MODE LEGACY ===
    const todayStr = new Date().toISOString().split('T')[0]
    const isPast = statusDateStr < todayStr
    const isFuture = statusDateStr > todayStr
    const hasSavedSnapshot = (snapshots || []).some((s: any) => s.control_date === statusDateStr)

    const legacyWarnings: string[] = ['LEGACY_MODE: Calcul EVM historique basé sur le PTBA et les dates opérationnelles du Gantt.']
    if (isPast && !hasSavedSnapshot) {
      legacyWarnings.push("UNCERTIFIED_HISTORICAL_PROGRESS: Simulation historique non certifiée — L'avancement physique (% achevé) provient de l'état actuel et n'est pas garanti pour une date antérieure à aujourd'hui sans arrêté officiel préalablement sauvegardé.")
    } else if (isFuture) {
      legacyWarnings.push("INVALID_FUTURE_CONTROL_DATE: Date de contrôle future — Simulation prévisionnelle uniquement.")
    }

    const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
    indicators = leafTasks.map(task => {
      const bac = calculateTaskBAC(task, ptbaActivities)
      const pvRes = calculateTaskPV(statusDateStr, task, ptbaActivities)
      const ev = calculateTaskEV(task, ptbaActivities)
      const ac = calculateTaskAC(statusDateStr, task, operations, disbursements)
      const ind = calculateIndicators(bac, pvRes.pv, ev, ac)
      
      return {
        id: task.id,
        code: task.code,
        description: task.description,
        responsible: task.responsible,
        date_start: task.date_start,
        date_end: task.date_end,
        percent_complete: task.percent_complete ?? 0,
        budget_allocated: bac,
        actual_cost: ac,
        pv: pvRes.pv,
        ev: ev,
        cv: ind.cv,
        sv: ind.sv,
        cpi: ind.cpi,
        spi: ind.spi,
        warnings: pvRes.warnings,
        is_orphan: false
      }
    })

    const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
    const pPVRes = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities)
    const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
    const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations, disbursements)
    const pInd = calculateIndicators(pBAC, pPVRes.pv, pEV, pAC)

    summaryData = {
      mode: 'LEGACY',
      baseline: null,
      bac_total: pBAC,
      pv_total: pPVRes.pv,
      ev_total: pEV,
      ac_baseline: pAC,
      ac_out_of_baseline: 0,
      ac_total: pAC,
      cpi_global: pInd.cpi,
      spi_global: pInd.spi,
      eac_global: pInd.eac,
      warnings: [...legacyWarnings, ...pPVRes.warnings]
    }
  }

  return (
    <EvmClient 
      projectId={id}
      project={project}
      summary={summaryData}
      indicators={indicators}
      snapshots={snapshots || []}
      baselines={baselinesRes.data || []}
      budgetLines={budgetLinesData || []}
      canManageSnapshots={currentUserRole === 'OWNER' || currentUserRole === 'PROJECT_MANAGER'}
    />
  )
}
