import { NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/format-currency'

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
    .select('currency')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Projet introuvable ou accès refusé.' }, { status: 403 })
  }

  const [budgetResult, indicatorsResult, trackingResult] = await Promise.all([
    supabase.from('v_budget_consumption').select('*').eq('project_id', projectId),
    supabase.from('logframe_indicators').select('id, logframe_item_id, code, name, type, unit, baseline_numeric, baseline_text, target_numeric, target_text, frequency, responsible, verification_source').eq('project_id', projectId),
    supabase.from('logframe_indicator_tracking').select('indicator_id, measured_at, period_type, period_number, period_year, value_numeric, value_text, comment, source_url').eq('project_id', projectId).order('measured_at', { ascending: false }),
  ])
  const { data: budgetData, error: budgetError } = budgetResult

  if (budgetError || indicatorsResult.error || trackingResult.error) {
    return NextResponse.json({ error: 'Impossible de préparer l’export budgétaire.' }, { status: 500 })
  }

  const workbook = new ExcelJS.Workbook()
  const sheetBudget = workbook.addWorksheet('Consommation Budget')
  sheetBudget.columns = [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Libellé', key: 'label', width: 30 },
    { header: 'Alloué initial', key: 'initial_allocated_amount', width: 20 },
    { header: 'Engagé', key: 'total_engage', width: 20 },
    { header: 'Décaissé', key: 'total_decaisse', width: 20 },
    { header: 'Solde', key: 'solde_disponible', width: 20 },
  ]

  for (const row of budgetData ?? []) {
    sheetBudget.addRow({
      code: row.code,
      label: row.label,
      initial_allocated_amount: formatCurrency(row.initial_allocated_amount, project.currency),
      total_engage: formatCurrency(row.total_engage, project.currency),
      total_decaisse: formatCurrency(row.total_decaisse, project.currency),
      solde_disponible: formatCurrency(row.solde_disponible, project.currency),
    })
  }

  const sheetIndicators = workbook.addWorksheet('Indicateurs')
  sheetIndicators.columns = [
    { header: 'Code', key: 'code', width: 14 }, { header: 'Indicateur', key: 'name', width: 45 },
    { header: 'Type', key: 'type', width: 15 }, { header: 'Unité', key: 'unit', width: 14 },
    { header: 'Ligne de base', key: 'baseline', width: 24 }, { header: 'Cible', key: 'target', width: 24 },
    { header: 'Fréquence', key: 'frequency', width: 16 }, { header: 'Source de vérification', key: 'source', width: 35 },
  ]
  for (const indicator of indicatorsResult.data ?? []) {
    sheetIndicators.addRow({ code: indicator.code, name: indicator.name, type: indicator.type, unit: indicator.unit,
      baseline: indicator.baseline_numeric ?? indicator.baseline_text, target: indicator.target_numeric ?? indicator.target_text,
      frequency: indicator.frequency, source: indicator.verification_source })
  }

  const sheetTracking = workbook.addWorksheet('Suivi indicateurs')
  sheetTracking.columns = [
    { header: 'Indicateur', key: 'indicator', width: 45 }, { header: 'Date', key: 'date', width: 14 },
    { header: 'Période', key: 'period', width: 18 }, { header: 'Valeur', key: 'value', width: 20 },
    { header: 'Commentaire', key: 'comment', width: 40 }, { header: 'Source', key: 'source', width: 35 },
  ]
  const indicatorNames = new Map((indicatorsResult.data ?? []).map(indicator => [indicator.id, indicator.name]))
  for (const tracking of trackingResult.data ?? []) {
    const period = tracking.period_type ? `${tracking.period_type} ${tracking.period_number ?? ''} ${tracking.period_year ?? ''}`.trim() : ''
    sheetTracking.addRow({ indicator: indicatorNames.get(tracking.indicator_id) ?? tracking.indicator_id, date: tracking.measured_at,
      period, value: tracking.value_numeric ?? tracking.value_text, comment: tracking.comment, source: tracking.source_url })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="export_projet.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
