import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  calculateTaskBAC, calculateTaskPV, calculateTaskEV, calculateTaskAC,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const projectId = resolvedParams.id

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Hybrid Auth
  let user = null
  const authHeader = request.headers.get('Authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data, error } = await supabase.auth.getUser(token)
    if (data?.user) {
      user = data.user
    }
  } else {
    const { data, error } = await supabase.auth.getUser()
    if (data?.user) {
      user = data.user
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Projet & RBAC
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: projErr ? 403 : 404 })
  }

  // WBS, PTBA, Journal
  const { data: wbsTasksData } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete')
    .eq('project_id', projectId)

  const { data: ptbaActivitiesData } = await supabase
    .from('ptba_activities')
    .select('wbs_task_id, fiscal_year, budget_planned')
    .in('wbs_task_id', (wbsTasksData || []).map((t: any) => t.id))

  const { data: journalData } = await supabase
    .from('operations_journal')
    .select('wbs_task_id, status, actual_cost, operation_date')
    .in('wbs_task_id', (wbsTasksData || []).map((t: any) => t.id))

  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]
  
  const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]

  // Global EVM Calculations
  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
  const pPVRes = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities)
  const pPV = pPVRes.pv
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations)
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)
  const eacGlobal = pInd.cpi && pInd.cpi !== 0 ? pBAC / pInd.cpi : pBAC

  const summary = {
    bac: pBAC,
    pv: pPV,
    ev: pEV,
    ac: pAC,
    cv: pInd.cv,
    sv: pInd.sv,
    cpi: pInd.cpi,
    spi: pInd.spi,
    eac: eacGlobal
  }

  const leafTasks = wbsTasks.filter(t => t.task_type !== 'SUMMARY')
  const indicators = leafTasks.map(task => {
    const bac = calculateTaskBAC(task, ptbaActivities)
    const pvRes = calculateTaskPV(statusDateStr, task, ptbaActivities)
    const ev = calculateTaskEV(task, ptbaActivities)
    const ac = calculateTaskAC(statusDateStr, task, operations)
    return {
      ...task,
      bac,
      pv: pvRes.pv,
      ev,
      ac,
      ...calculateIndicators(bac, pvRes.pv, ev, ac),
      warnings: pvRes.warnings
    }
  })

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      currency: project.currency,
      controlDate: statusDateStr
    },
    summary,
    indicators
  })
}
