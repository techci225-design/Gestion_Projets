import { parse, startOfDay, differenceInDays, isBefore, isAfter, max, min, isValid } from 'date-fns'

const parseDateString = (dateStr: string) => parse(dateStr, 'yyyy-MM-dd', startOfDay(new Date()))

export interface WbsTask {
  id: string
  parent_id: string | null
  task_type: 'TASK' | 'SUMMARY' | 'MILESTONE'
  date_start: string | null
  date_end: string | null
  percent_complete?: number | null
}

export interface PtbaActivity {
  wbs_task_id: string
  fiscal_year: number
  budget_planned: number
}

export interface OperationJournal {
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

export function calculateTaskAC(statusDateStr: string, wbsTask: WbsTask, operations: OperationJournal[]): number {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const statusDate = parseDateString(statusDateStr).getTime()
  
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
}

export function calculateIndicators(bac: number, pv: number, ev: number, ac: number): EvmIndicators {
  const cv = ev - ac
  const sv = ev - pv
  const cpi = ac === 0 ? null : ev / ac
  const spi = pv === 0 ? null : ev / pv
  
  return {
    bac,
    pv,
    ev,
    ac,
    cv,
    sv,
    cpi,
    spi
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

export function calculateProjectAC(statusDateStr: string, wbsTasks: WbsTask[], operations: OperationJournal[]): number {
  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  return leafTasks.reduce((sum, task) => sum + calculateTaskAC(statusDateStr, task, operations), 0)
}
