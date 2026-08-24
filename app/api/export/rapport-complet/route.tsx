import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { RapportDocument } from '@/lib/pdf/RapportDocument'
import React from 'react'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  calculateTaskBAC, calculateTaskPV, calculateTaskEV, calculateTaskAC,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Vérifier l'accès au projet
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projErr || !project) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 })
  }

  // Récupération en parallèle
  const [
    { data: logframeItems },
    { data: budgetConsumption },
    { data: procurementPlan },
    { data: risks },
    { data: wbsTasksData },
  ] = await Promise.all([
    supabase.from('logframe_items').select('*').eq('project_id', projectId).order('level').order('parent_id'),
    supabase.from('v_budget_consumption').select('*').eq('project_id', projectId),
    supabase.from('procurement_plan').select('*').eq('project_id', projectId).order('planned_notice_date'),
    supabase.from('risks').select('*').eq('project_id', projectId).order('criticality', { ascending: false }),
    supabase.from('wbs_tasks').select('id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete').eq('project_id', projectId)
  ])

  const [
    { data: ptbaActivitiesData },
    { data: journalData },
    { data: disbursementsData }
  ] = await Promise.all([
    supabase
      .from('ptba_activities')
      .select('wbs_task_id, fiscal_year, budget_planned')
      .in('wbs_task_id', (wbsTasksData || []).map((t: any) => t.id)),
    supabase
      .from('operations_journal')
      .select('id, wbs_task_id, status, actual_cost, operation_date')
      .in('wbs_task_id', (wbsTasksData || []).map((t: any) => t.id)),
    supabase
      .from('operation_disbursements')
      .select('id, operation_id, project_id, disbursement_date, amount')
      .eq('project_id', projectId)
  ])

  const wbsTasks = (wbsTasksData || []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData || []) as PtbaActivity[]
  const operations = (journalData || []) as OperationJournal[]
  const disbursements = (disbursementsData || []) as any[]
  
  const statusDateStr = project.evm_control_date || new Date().toISOString().split('T')[0]

  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
  const pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations, disbursements)
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)

  const evmSummary = {
    bac_total: pBAC,
    pv_total: pPV,
    ev_total: pEV,
    ac_total: pAC,
    cpi_global: pInd.cpi,
    spi_global: pInd.spi,
    eac_global: pInd.eac,
    vac_global: pInd.vac
  }

  const evmIndicators = wbsTasks.map(task => {
    const bac = calculateTaskBAC(task, ptbaActivities)
    const pvRes = calculateTaskPV(statusDateStr, task, ptbaActivities)
    const ev = calculateTaskEV(task, ptbaActivities)
    const ac = calculateTaskAC(statusDateStr, task, operations, disbursements)
    return {
      ...task,
      ...calculateIndicators(bac, pvRes.pv, ev, ac)
    }
  })

  const dateString = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Appel à Claude pour le résumé exécutif
  const { generateExecutiveSummary } = await import('@/lib/ai/claude')
  let executiveSummary = ''
  try {
    executiveSummary = await generateExecutiveSummary({
      project,
      total_budget: evmSummary.bac_total,
      cpi: evmSummary.cpi_global,
      spi: evmSummary.spi_global,
      risks: risks?.length || 0,
      budget_consumption_rate: ((budgetConsumption ?? []).reduce((acc: number, curr: any) => acc + (curr.total_decaisse || 0), 0) / (budgetConsumption ?? []).reduce((acc: number, curr: any) => acc + (curr.initial_allocated_amount || 0), 1)) * 100
    })
  } catch (e) {
    console.error('Claude AI Error:', e)
  }

  const data = {
    project,
    logframeItems: logframeItems || [],
    budgetConsumption: budgetConsumption || [],
    evmSummary: evmSummary || null,
    evmIndicators: evmIndicators || [],
    procurementPlan: procurementPlan || [],
    risks: risks || [],
    dateString,
    executiveSummary
  }

  try {
    const stream = await renderToStream(<RapportDocument data={data} />)
    
    // Transform Node.js ReadableStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      }
    })

    const currentDate = new Date().toISOString().split('T')[0]
    const filename = `Rapport_${project.code}_${currentDate}.pdf`

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (err: any) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
