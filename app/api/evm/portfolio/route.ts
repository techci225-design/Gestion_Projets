import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function GET(request: Request) {
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

  // Projet & RBAC: Only active projects
  const { data: projectList, error: projErr } = await supabase
    .from('projects')
    .select('id, name, code, currency, evm_control_date, status')
    .eq('status', 'actif')

  if (projErr || !projectList || projectList.length === 0) {
    return NextResponse.json({ portfolio: [], projects: [] })
  }

  const projectIds = projectList.map(p => p.id)

  // WBS, PTBA, Journal
  const { data: wbsTasksData } = await supabase
    .from('wbs_tasks')
    .select('id, project_id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete')
    .in('project_id', projectIds)

  const wbsTaskIds = (wbsTasksData || []).map((t: any) => t.id)

  const { data: ptbaActivitiesData } = await supabase
    .from('ptba_activities')
    .select('wbs_task_id, fiscal_year, budget_planned')
    .in('wbs_task_id', wbsTaskIds)

  const { data: journalData } = await supabase
    .from('operations_journal')
    .select('wbs_task_id, status, actual_cost, operation_date')
    .in('wbs_task_id', wbsTaskIds)

  // Risks for alerts
  const { data: risksData } = await supabase
    .from('risks')
    .select('project_id')
    .eq('status', 'ouvert')
    .eq('criticality', 9)
    .in('project_id', projectIds)

  const allWbsTasks = (wbsTasksData || []) as (WbsTask & { project_id: string })[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]

  // Compute EVM per project
  const projectSummaries = projectList.map(project => {
    const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]
    
    // Filter WBS tasks for this project
    const pWbsTasks = allWbsTasks.filter(t => t.project_id === project.id)
    const pWbsTaskIds = pWbsTasks.map(t => t.id)
    
    // Filter PTBA and operations
    const pPtba = ptbaActivities.filter(p => pWbsTaskIds.includes(p.wbs_task_id))
    const pOps = operations.filter(o => pWbsTaskIds.includes(o.wbs_task_id))

    const pBAC = calculateProjectBAC(pWbsTasks, pPtba)
    const pPVRes = calculateProjectPV(statusDateStr, pWbsTasks, pPtba)
    const pPV = pPVRes.pv
    const pEV = calculateProjectEV(pWbsTasks, pPtba)
    const pAC = calculateProjectAC(statusDateStr, pWbsTasks, pOps)
    const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)
    const eacGlobal = pInd.cpi !== null && pInd.cpi > 0 ? pBAC / pInd.cpi : pBAC

    return {
      project,
      bac: pBAC,
      pv: pPV,
      ev: pEV,
      ac: pAC,
      cpi: pInd.cpi,
      spi: pInd.spi,
      eac: eacGlobal
    }
  })

  // Group by currency
  const currencies = Array.from(new Set(projectList.map(p => p.currency || 'XOF')))
  
  const portfolio = currencies.map(currency => {
    const projs = projectSummaries.filter(ps => (ps.project.currency || 'XOF') === currency)
    
    const sumBac = projs.reduce((sum, p) => sum + p.bac, 0)
    const sumPv = projs.reduce((sum, p) => sum + p.pv, 0)
    const sumEv = projs.reduce((sum, p) => sum + p.ev, 0)
    const sumAc = projs.reduce((sum, p) => sum + p.ac, 0)
    
    const cv = sumEv - sumAc
    const sv = sumEv - sumPv
    
    const cpi = sumAc === 0 ? null : sumEv / sumAc
    const spi = sumPv === 0 ? null : sumEv / sumPv
    
    const eac = (cpi !== null && cpi > 0) ? sumBac / cpi : sumBac

    return {
      currency,
      activeProjectsCount: projs.length,
      bac: sumBac,
      pv: sumPv,
      ev: sumEv,
      ac: sumAc,
      cv,
      sv,
      cpi,
      spi,
      eac
    }
  })

  const projectsResponse = projectSummaries.map(ps => {
    const pRisks = (risksData || []).filter(r => r.project_id === ps.project.id)
    
    const alertReasons = []
    if (ps.cpi !== null && ps.cpi < 0.9) alertReasons.push(`CPI = ${ps.cpi.toFixed(2)}`)
    if (ps.spi !== null && ps.spi < 0.9) alertReasons.push(`SPI = ${ps.spi.toFixed(2)}`)
    if (pRisks.length > 0) alertReasons.push(`${pRisks.length} Risque(s)`)
    
    return {
      id: ps.project.id,
      name: ps.project.name,
      code: ps.project.code,
      currency: ps.project.currency || 'XOF',
      cpi: ps.cpi,
      spi: ps.spi,
      isAlert: alertReasons.length > 0,
      alertReasons
    }
  })

  return NextResponse.json({
    portfolio,
    projects: projectsResponse
  })
}
