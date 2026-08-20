import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // Secure server-to-server auth using the service role key
  if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectIds } = await request.json()

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Invalid projectIds array' }, { status: 400 })
    }

    // Initialize Supabase admin client to bypass RLS since this is an internal trusted service call
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Ensure we only fetch for the requested project_ids
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, evm_control_date')
      .in('id', projectIds)

    if (projectsError) {
      throw new Error(projectsError.message)
    }

    const validProjectIds = projectsData.map(p => p.id)

    if (validProjectIds.length === 0) {
      return NextResponse.json({})
    }

    const { data: wbsTasksData } = await supabaseAdmin
      .from('wbs_tasks')
      .select('id, project_id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete')
      .in('project_id', validProjectIds)

    const wbsTaskIds = (wbsTasksData || []).map((t: any) => t.id)

    let ptbaActivitiesData: any[] = []
    let journalData: any[] = []

    if (wbsTaskIds.length > 0) {
      const [{ data: ptba }, { data: ops }] = await Promise.all([
        supabaseAdmin
          .from('ptba_activities')
          .select('wbs_task_id, fiscal_year, budget_planned')
          .in('wbs_task_id', wbsTaskIds),
        supabaseAdmin
          .from('operations_journal')
          .select('wbs_task_id, status, actual_cost, operation_date')
          .in('wbs_task_id', wbsTaskIds)
      ])
      ptbaActivitiesData = ptba || []
      journalData = ops || []
    }

    const allWbsTasks = (wbsTasksData || []) as (WbsTask & { project_id: string })[]
    const allPtba = ptbaActivitiesData as PtbaActivity[]
    const allOps = journalData as OperationJournal[]

    const results: Record<string, any> = {}

    for (const project of projectsData) {
      const pWbsTasks = allWbsTasks.filter(t => t.project_id === project.id)
      const pWbsTaskIds = pWbsTasks.map(t => t.id)
      const pPtba = allPtba.filter(p => pWbsTaskIds.includes(p.wbs_task_id))
      const pOps = allOps.filter(o => pWbsTaskIds.includes(o.wbs_task_id))
      
      const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]
      const pBAC = calculateProjectBAC(pWbsTasks, pPtba)
      const pPV = calculateProjectPV(statusDateStr, pWbsTasks, pPtba).pv
      const pEV = calculateProjectEV(pWbsTasks, pPtba)
      const pAC = calculateProjectAC(statusDateStr, pWbsTasks, pOps)
      const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)

      results[project.id] = {
        project_id: project.id,
        bac_total: pBAC,
        pv_total: pPV,
        ev_total: pEV,
        ac_total: pAC,
        cv_global: pInd.cv,
        sv_global: pInd.sv,
        cpi_global: pInd.cpi,
        spi_global: pInd.spi,
        vac_global: pInd.vac,
        eac_global: pInd.eac
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Internal EVM API error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
