import { parse, startOfDay, differenceInDays, isBefore, isAfter, max, min, isValid } from 'date-fns'

const parseDateString = (dateStr: string) => parse(dateStr, 'yyyy-MM-dd', startOfDay(new Date()))

export interface WbsTask {
  id: string
  parent_id: string | null
  task_type: 'TASK' | 'SUMMARY' | 'MILESTONE'
  date_start: string | null
  date_end: string | null
  percent_complete?: number | null
  code?: string | null
  description?: string | null
  responsible?: string | null
}

export interface PtbaActivity {
  wbs_task_id: string
  fiscal_year: number
  budget_planned: number
}

export interface OperationJournal {
  id?: string
  wbs_task_id: string
  status: string
  actual_cost: number | null | undefined
  operation_date: string | null
}

export interface PvCalculationResult {
  pv: number
  warnings: string[]
}

export function calculateTaskPV(
  statusDateStr: string,
  wbsTask: WbsTask,
  ptbaActivities: PtbaActivity[]
): PvCalculationResult {
  let totalPV = 0
  const warnings: string[] = []

  if (wbsTask.task_type !== 'TASK') {
    return { pv: 0, warnings: [] }
  }

  if (!wbsTask.date_start || !wbsTask.date_end) {
    return { pv: 0, warnings: [] }
  }

  const statusDate = parseDateString(statusDateStr)
  const taskStart = parseDateString(wbsTask.date_start)
  const taskEnd = parseDateString(wbsTask.date_end)

  if (!isValid(statusDate) || !isValid(taskStart) || !isValid(taskEnd)) {
    return { pv: 0, warnings: ['Dates invalides dans WBS ou statusDate'] }
  }

  const relevantPtbas = ptbaActivities.filter(p => p.wbs_task_id === wbsTask.id)
  
  if (relevantPtbas.length === 0) {
    return { pv: 0, warnings }
  }

  for (const ptba of relevantPtbas) {
    if (ptba.budget_planned <= 0) continue

    const yearStart = parseDateString(`${ptba.fiscal_year}-01-01`)
    const yearEnd = parseDateString(`${ptba.fiscal_year}-12-31`)

    const segmentStart = max([taskStart, yearStart])
    const segmentEnd = min([taskEnd, yearEnd])

    if (isAfter(segmentStart, segmentEnd)) {
      warnings.push(`PTBA_OUT_OF_BOUNDS: Le budget ${ptba.fiscal_year} (Montant: ${ptba.budget_planned}) est hors de la période de la tâche WBS.`)
      continue
    }

    let elapsedDays = 0
    const totalDays = differenceInDays(segmentEnd, segmentStart)

    if (totalDays === 0) {
      // Cas particulier : le segment ne dure qu'un jour (start = end)
      if (isAfter(statusDate, segmentStart) || statusDate.getTime() === segmentStart.getTime()) {
        elapsedDays = 1
      }
      totalPV += (elapsedDays > 0) ? ptba.budget_planned : 0
      continue
    }

    if (isBefore(statusDate, segmentStart) || statusDate.getTime() === segmentStart.getTime()) {
      elapsedDays = 0
    } else if (isAfter(statusDate, segmentEnd) || statusDate.getTime() === segmentEnd.getTime()) {
      elapsedDays = totalDays
    } else {
      elapsedDays = differenceInDays(statusDate, segmentStart)
    }

    const pvSegment = ptba.budget_planned * (elapsedDays / totalDays)
    totalPV += pvSegment
  }

  return { pv: totalPV, warnings }
}

export function calculateProjectPV(
  statusDateStr: string,
  wbsTasks: WbsTask[],
  ptbaActivities: PtbaActivity[]
): PvCalculationResult {
  let projectPV = 0
  const allWarnings: string[] = []

  const leafTasks = wbsTasks.filter(t => t.task_type === 'TASK')

  for (const task of leafTasks) {
    const res = calculateTaskPV(statusDateStr, task, ptbaActivities)
    projectPV += res.pv
    if (res.warnings.length > 0) {
      allWarnings.push(`Tâche ${task.id}: ${res.warnings.join(', ')}`)
    }
  }

  return {
    pv: projectPV,
    warnings: allWarnings
  }
}

export function calculateTaskBAC(wbsTask: WbsTask, ptbaActivities: PtbaActivity[]): number {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const relevantPtbas = ptbaActivities.filter(p => p.wbs_task_id === wbsTask.id)
  return relevantPtbas.reduce((sum, p) => sum + (p.budget_planned || 0), 0)
}

export function calculateTaskEV(wbsTask: WbsTask, ptbaActivities: PtbaActivity[]): number {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const bac = calculateTaskBAC(wbsTask, ptbaActivities)
  const percent = wbsTask.percent_complete ?? 0
  return bac * (percent / 100)
}

export interface OperationDisbursement {
  id: string
  operation_id: string
  project_id: string
  disbursement_date: string
  amount: number
  entry_type?: 'PAYMENT' | 'REVERSAL'
  reversal_of_id?: string | null
  reference_piece?: string | null
}

export function calculateTaskAC(
  statusDateStr: string, 
  wbsTask: WbsTask, 
  operations: OperationJournal[],
  disbursements?: OperationDisbursement[]
): number {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const statusDate = parseDateString(statusDateStr).getTime()
  
  if (disbursements && disbursements.length > 0) {
    const opIdsForTask = new Set(operations.filter(o => o.wbs_task_id === wbsTask.id && o.id).map(o => o.id!))
    const relevantDisbs = disbursements.filter(d => {
      if (!opIdsForTask.has(d.operation_id) || !d.disbursement_date) return false
      const dDate = parseDateString(d.disbursement_date).getTime()
      return dDate <= statusDate
    })
    const netAc = relevantDisbs.reduce((sum, d) => {
      const amt = Number(d.amount) || 0
      return d.entry_type === 'REVERSAL' ? sum - amt : sum + amt
    }, 0)
    return Math.max(0, netAc)
  }

  const relevantOps = operations.filter(o => {
    if (o.wbs_task_id !== wbsTask.id || o.status !== 'decaisse' || !o.operation_date) return false
    const opDate = parseDateString(o.operation_date).getTime()
    return opDate <= statusDate
  })
  
  return relevantOps.reduce((sum, o) => sum + (o.actual_cost || 0), 0)
}

export interface EvmIndicators {
  bac: number
  pv: number
  ev: number
  ac: number
  cv: number
  sv: number
  cpi: number | null
  spi: number | null
  eac: number
  vac: number
}

export function calculateIndicators(bac: number, pv: number, ev: number, ac: number): EvmIndicators {
  const cv = ev - ac
  const sv = ev - pv
  const cpi = ac === 0 ? null : ev / ac
  const spi = pv === 0 ? null : ev / pv
  
  const eac = (cpi !== null && cpi > 0) ? bac / cpi : bac
  const vac = bac - eac
  
  return {
    bac,
    pv,
    ev,
    ac,
    cv,
    sv,
    cpi,
    spi,
    eac,
    vac
  }
}

export function calculateProjectBAC(wbsTasks: WbsTask[], ptbaActivities: PtbaActivity[]): number {
  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  return leafTasks.reduce((sum, task) => sum + calculateTaskBAC(task, ptbaActivities), 0)
}

export function calculateProjectEV(wbsTasks: WbsTask[], ptbaActivities: PtbaActivity[]): number {
  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  return leafTasks.reduce((sum, task) => sum + calculateTaskEV(task, ptbaActivities), 0)
}

export function calculateProjectAC(
  statusDateStr: string, 
  wbsTasks: WbsTask[], 
  operations: OperationJournal[],
  disbursements?: OperationDisbursement[]
): number {
  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  return leafTasks.reduce((sum, task) => sum + calculateTaskAC(statusDateStr, task, operations, disbursements), 0)
}

// =========================================================
// MOTEUR BASELINE EVM (PHASE 7)
// =========================================================

export interface EvmBaselineItemInput {
  id: string
  baseline_id: string
  wbs_task_id: string | null
  wbs_code_snapshot: string
  wbs_name_snapshot: string
  planned_start: string
  planned_end: string
  planned_bac: number
}

export function calculateBaselineItemPV(
  statusDateStr: string,
  item: EvmBaselineItemInput
): PvCalculationResult {
  if (!item.planned_start || !item.planned_end || item.planned_bac <= 0) {
    return { pv: 0, warnings: [] }
  }

  const statusDate = parseDateString(statusDateStr)
  const planStart = parseDateString(item.planned_start)
  const planEnd = parseDateString(item.planned_end)

  if (!isValid(statusDate) || !isValid(planStart) || !isValid(planEnd)) {
    return { pv: 0, warnings: [`Dates invalides pour l'item baseline ${item.wbs_code_snapshot}`] }
  }

  if (isBefore(statusDate, planStart)) {
    return { pv: 0, warnings: [] }
  }

  const totalDays = differenceInDays(planEnd, planStart)
  if (totalDays === 0) {
    // Tâche d'une seule journée ou jalon
    const pv = (isAfter(statusDate, planStart) || statusDate.getTime() === planStart.getTime()) ? Number(item.planned_bac) : 0
    return { pv, warnings: [] }
  }

  if (isAfter(statusDate, planEnd) || statusDate.getTime() === planEnd.getTime()) {
    return { pv: Number(item.planned_bac), warnings: [] }
  }

  const elapsedDays = differenceInDays(statusDate, planStart)
  const pv = Number(item.planned_bac) * (elapsedDays / totalDays)
  return { pv, warnings: [] }
}

export function calculateBaselineItemEV(
  item: EvmBaselineItemInput,
  wbsTask?: WbsTask | null
): { ev: number, warnings: string[] } {
  if (!wbsTask || !item.wbs_task_id) {
    return {
      ev: 0,
      warnings: [`ORPHAN_ITEM: L'activité ${item.wbs_code_snapshot} (${item.wbs_name_snapshot}) est orpheline dans la baseline. EV fixé à 0.`]
    }
  }
  const percent = wbsTask.percent_complete ?? 0
  return {
    ev: Number(item.planned_bac) * (percent / 100),
    warnings: []
  }
}

export function calculateBaselineProjectPV(
  statusDateStr: string,
  items: EvmBaselineItemInput[]
): PvCalculationResult {
  let totalPV = 0
  const allWarnings: string[] = []

  for (const item of items) {
    const res = calculateBaselineItemPV(statusDateStr, item)
    totalPV += res.pv
    if (res.warnings.length > 0) {
      allWarnings.push(...res.warnings)
    }
  }

  return { pv: totalPV, warnings: allWarnings }
}

export function calculateBaselineProjectEV(
  items: EvmBaselineItemInput[],
  wbsTasks: WbsTask[]
): { ev: number, warnings: string[] } {
  let totalEV = 0
  const allWarnings: string[] = []
  const taskMap = new Map(wbsTasks.map(t => [t.id, t]))

  for (const item of items) {
    const task = item.wbs_task_id ? taskMap.get(item.wbs_task_id) : null
    const res = calculateBaselineItemEV(item, task)
    totalEV += res.ev
    if (res.warnings.length > 0) {
      allWarnings.push(...res.warnings)
    }
  }

  return { ev: totalEV, warnings: allWarnings }
}

export interface BaselineAcResult {
  ac_baseline: number
  ac_out_of_baseline: number
  ac_total: number
  warnings: string[]
}

export function calculateBaselineProjectAC(
  statusDateStr: string,
  baselineItems: EvmBaselineItemInput[],
  operations: OperationJournal[],
  disbursements?: OperationDisbursement[]
): BaselineAcResult {
  const statusDate = parseDateString(statusDateStr).getTime()
  const baselineTaskIds = new Set(
    baselineItems.map(it => it.wbs_task_id).filter((id): id is string => Boolean(id))
  )

  let acBaseline = 0
  let acOutOfBaseline = 0
  const warnings: string[] = []

  if (disbursements && disbursements.length > 0) {
    const opToTaskMap = new Map<string, string | null>()
    operations.forEach(op => {
      if (op.id) opToTaskMap.set(op.id, op.wbs_task_id)
    })

    for (const d of disbursements) {
      if (!d.disbursement_date) continue
      const dDate = parseDateString(d.disbursement_date).getTime()
      if (dDate > statusDate) continue

      const rawAmount = Number(d.amount) || 0
      if (rawAmount <= 0) continue
      const signedAmount = d.entry_type === 'REVERSAL' ? -rawAmount : rawAmount

      const taskId = opToTaskMap.get(d.operation_id)
      if (taskId && baselineTaskIds.has(taskId)) {
        acBaseline += signedAmount
      } else {
        acOutOfBaseline += signedAmount
      }
    }

    acBaseline = Math.max(0, acBaseline)
    acOutOfBaseline = Math.max(0, acOutOfBaseline)
  } else {
    for (const op of operations) {
      if (op.status !== 'decaisse' || !op.operation_date) continue
      const opDate = parseDateString(op.operation_date).getTime()
      if (opDate > statusDate) continue

      const cost = Number(op.actual_cost) || 0
      if (cost <= 0) continue

      if (baselineTaskIds.has(op.wbs_task_id)) {
        acBaseline += cost
      } else {
        acOutOfBaseline += cost
      }
    }
  }

  const acTotal = acBaseline + acOutOfBaseline

  if (acOutOfBaseline > 0) {
    warnings.push(`OUT_OF_BASELINE_COST: Dépenses hors périmètre de baseline détectées (${acOutOfBaseline.toLocaleString('fr-FR')} FCFA).`)
  }

  return {
    ac_baseline: acBaseline,
    ac_out_of_baseline: acOutOfBaseline,
    ac_total: acTotal,
    warnings
  }
}


