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

  const { data: budgetData, error: budgetError } = await supabase
    .from('v_budget_consumption')
    .select('*')
    .eq('project_id', projectId)

  if (budgetError) {
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

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="export_projet.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
