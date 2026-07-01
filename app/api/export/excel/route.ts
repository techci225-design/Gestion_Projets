import { NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/format-currency'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Récupérer les données
  const { data: budgetData } = await supabase
    .from('v_budget_consumption')
    .select('*')
    .eq('project_id', projectId)

  const workbook = new ExcelJS.Workbook()
  
  // Onglet Budget
  const sheetBudget = workbook.addWorksheet('Consommation Budget')
  sheetBudget.columns = [
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Libellé', key: 'label', width: 30 },
    { header: 'Alloué Initial', key: 'initial_allocated_amount', width: 20 },
    { header: 'Engagé', key: 'total_engage', width: 20 },
    { header: 'Décaissé', key: 'total_decaisse', width: 20 },
    { header: 'Solde', key: 'solde_disponible', width: 20 },
  ]

  if (budgetData) {
    budgetData.forEach(row => {
      sheetBudget.addRow({
        code: row.code,
        label: row.label,
        initial_allocated_amount: formatCurrency(row.initial_allocated_amount),
        total_engage: formatCurrency(row.total_engage),
        total_decaisse: formatCurrency(row.total_decaisse),
        solde_disponible: formatCurrency(row.solde_disponible)
      })
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename="export_projet.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
}
