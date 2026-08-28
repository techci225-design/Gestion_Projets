import { NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToStream } from '@react-pdf/renderer'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { RapportDocument } from '@/lib/pdf/RapportDocument'
import {
  calculateBaselineItemEV,
  calculateBaselineItemPV,
  calculateBaselineProjectAC,
  calculateBaselineProjectEV,
  calculateBaselineProjectPV,
  calculateIndicators,
  calculateProjectAC,
  calculateProjectBAC,
  calculateProjectEV,
  calculateProjectPV,
  calculateTaskAC,
  calculateTaskBAC,
  calculateTaskEV,
  calculateTaskPV,
  EvmBaselineItemInput,
  OperationJournal,
  PtbaActivity,
  WbsTask,
} from '@/lib/utils/evm'

const projectIdSchema = z.string().uuid()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsedProjectId = projectIdSchema.safeParse(searchParams.get('projectId'))

  if (!parsedProjectId.success) {
    return NextResponse.json({ error: 'Identifiant de projet invalide.' }, { status: 400 })
  }

  const projectId = parsedProjectId.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 })
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Projet introuvable ou accès refusé.' }, { status: 403 })
  }

  const [
    { data: logframeItems, error: logframeError },
    { data: budgetConsumption, error: budgetError },
    { data: procurementPlan, error: procurementError },
    { data: risks, error: risksError },
    { data: wbsTasksData, error: wbsError },
    { data: ptbaActivitiesData, error: ptbaError },
    { data: journalData, error: journalError },
    { data: disbursementsData, error: disbursementsError },
    { data: baselinesData, error: baselinesError },
    { data: logframeIndicators, error: logframeIndicatorsError },
    { data: indicatorTracking, error: indicatorTrackingError },
  ] = await Promise.all([
    supabase.from('logframe_items').select('*').eq('project_id', projectId).order('level').order('parent_id'),
    supabase.from('v_budget_consumption').select('*').eq('project_id', projectId),
    supabase.from('procurement_plan').select('*').eq('project_id', projectId).order('planned_notice_date'),
    supabase.from('risks').select('*').eq('project_id', projectId).order('criticality', { ascending: false }),
    supabase.from('wbs_tasks').select('id, parent_id, task_type, code, description, responsible, date_start, date_end, percent_complete').eq('project_id', projectId),
    supabase.from('ptba_activities').select('wbs_task_id, fiscal_year, budget_planned').eq('project_id', projectId),
    supabase.from('operations_journal').select('id, wbs_task_id, status, actual_cost, operation_date').eq('project_id', projectId),
    supabase.from('operation_disbursements').select('id, operation_id, project_id, disbursement_date, amount, entry_type').eq('project_id', projectId),
    supabase.from('evm_baselines').select('*').eq('project_id', projectId).in('status', ['APPROVED', 'SUPERSEDED']),
    supabase.from('logframe_indicators').select('*').eq('project_id', projectId),
    supabase.from('logframe_indicator_tracking').select('*').eq('project_id', projectId).order('measured_at', { ascending: false }),
  ])

  if (logframeError || budgetError || procurementError || risksError || wbsError || ptbaError || journalError || disbursementsError || baselinesError || logframeIndicatorsError || indicatorTrackingError) {
    return NextResponse.json({ error: 'Impossible de rassembler les données du rapport.' }, { status: 500 })
  }

  const wbsTasks = (wbsTasksData ?? []) as WbsTask[]
  const ptbaActivities = (ptbaActivitiesData ?? []) as PtbaActivity[]
  const operations = (journalData ?? []) as OperationJournal[]
  const disbursements = disbursementsData ?? []
  const controlDate = project.evm_control_date ?? new Date().toISOString().split('T')[0]
  const applicableBaseline = (baselinesData ?? [])
    .filter(b => b.effective_date && b.effective_date <= controlDate)
    .sort((a, b) => b.effective_date!.localeCompare(a.effective_date!) || b.version_number - a.version_number)[0] ?? null

  let evmIndicators: Array<Record<string, unknown>> = []
  let evmSummary: Record<string, unknown>

  if (applicableBaseline) {
    const { data: baselineItemsData, error: baselineItemsError } = await supabase
      .from('evm_baseline_items')
      .select('*')
      .eq('baseline_id', applicableBaseline.id)
      .order('wbs_code_snapshot', { ascending: true })

    if (baselineItemsError) {
      return NextResponse.json({ error: 'Impossible de lire la baseline EVM.' }, { status: 500 })
    }

    const baselineItems = (baselineItemsData ?? []) as EvmBaselineItemInput[]
    const taskMap = new Map(wbsTasks.map(task => [task.id, task]))

    evmIndicators = baselineItems.map(item => {
      const task = item.wbs_task_id ? taskMap.get(item.wbs_task_id) : null
      const bac = Number(item.planned_bac) || 0
      const pv = calculateBaselineItemPV(controlDate, item).pv
      const ev = calculateBaselineItemEV(item, task).ev
      const ac = item.wbs_task_id
        ? calculateTaskAC(controlDate, task ?? { id: item.wbs_task_id, task_type: 'TASK' } as WbsTask, operations, disbursements)
        : 0

      return {
        id: item.id,
        task_type: task?.task_type ?? 'TASK',
        code: item.wbs_code_snapshot,
        description: item.wbs_name_snapshot,
        percent_complete: task?.percent_complete ?? 0,
        ...calculateIndicators(bac, pv, ev, ac),
      }
    })

    const bac = baselineItems.reduce((total, item) => total + (Number(item.planned_bac) || 0), 0)
    const pv = calculateBaselineProjectPV(controlDate, baselineItems).pv
    const ev = calculateBaselineProjectEV(baselineItems, wbsTasks).ev
    const ac = calculateBaselineProjectAC(controlDate, baselineItems, operations, disbursements)
    const indicators = calculateIndicators(bac, pv, ev, ac.ac_total)

    evmSummary = {
      mode: 'BASELINE',
      baseline: applicableBaseline,
      bac_total: bac,
      pv_total: pv,
      ev_total: ev,
      ac_total: ac.ac_total,
      ac_baseline: ac.ac_baseline,
      ac_out_of_baseline: ac.ac_out_of_baseline,
      cpi_global: indicators.cpi,
      spi_global: indicators.spi,
      eac_global: indicators.eac,
      vac_global: indicators.vac,
    }
  } else {
    const bac = calculateProjectBAC(wbsTasks, ptbaActivities)
    const pv = calculateProjectPV(controlDate, wbsTasks, ptbaActivities).pv
    const ev = calculateProjectEV(wbsTasks, ptbaActivities)
    const ac = calculateProjectAC(controlDate, wbsTasks, operations, disbursements)
    const indicators = calculateIndicators(bac, pv, ev, ac)

    evmIndicators = wbsTasks
      .filter(task => task.task_type !== 'SUMMARY')
      .map(task => {
        const taskBac = calculateTaskBAC(task, ptbaActivities)
        const taskPv = calculateTaskPV(controlDate, task, ptbaActivities).pv
        const taskEv = calculateTaskEV(task, ptbaActivities)
        const taskAc = calculateTaskAC(controlDate, task, operations, disbursements)
        return { ...task, ...calculateIndicators(taskBac, taskPv, taskEv, taskAc) }
      })

    evmSummary = {
      mode: 'LEGACY',
      bac_total: bac,
      pv_total: pv,
      ev_total: ev,
      ac_total: ac,
      cpi_global: indicators.cpi,
      spi_global: indicators.spi,
      eac_global: indicators.eac,
      vac_global: indicators.vac,
    }
  }

  const dateString = new Date(controlDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const { generateExecutiveSummary } = await import('@/lib/ai/claude')
  let executiveSummary = ''
  try {
    const totalBudget = (budgetConsumption ?? []).reduce((total: number, row: any) => total + Number(row.initial_allocated_amount || 0), 0)
    const totalDecaisse = (budgetConsumption ?? []).reduce((total: number, row: any) => total + Number(row.total_decaisse || 0), 0)
    executiveSummary = await generateExecutiveSummary({
      project,
      total_budget: Number(evmSummary.bac_total),
      cpi: evmSummary.cpi_global as number | null,
      spi: evmSummary.spi_global as number | null,
      risks: risks?.length ?? 0,
      budget_consumption_rate: totalBudget > 0 ? (totalDecaisse / totalBudget) * 100 : 0,
    })
  } catch (error) {
    console.error('Résumé exécutif indisponible:', error)
  }

  try {
    const stream = await renderToStream(<RapportDocument data={{
      project,
      logframeItems: logframeItems ?? [],
      logframeIndicators: logframeIndicators ?? [],
      indicatorTracking: indicatorTracking ?? [],
      budgetConsumption: budgetConsumption ?? [],
      evmSummary,
      evmIndicators,
      procurementPlan: procurementPlan ?? [],
      risks: risks ?? [],
      dateString,
      executiveSummary,
    }} />)

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', chunk => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', error => controller.error(error))
      },
    })

    const filename = `Rapport_${project.code ?? projectId}_${controlDate}.pdf`
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Erreur de génération PDF:', error)
    return NextResponse.json({ error: 'Impossible de générer le rapport PDF.' }, { status: 500 })
  }
}
