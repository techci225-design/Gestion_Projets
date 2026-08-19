import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/format-currency'
import { 
  calculateProjectBAC, calculateProjectPV, calculateProjectEV, calculateProjectAC, calculateIndicators,
  WbsTask, PtbaActivity, OperationJournal
} from '@/lib/utils/evm'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: budgetData } = await supabase
    .from('v_budget_consumption')
    .select('*')
    .eq('project_id', projectId)
    
  const { data: projectData } = await supabase
    .from('projects')
    .select('currency, evm_control_date')
    .eq('id', projectId)
    .single()

  const currency = projectData?.currency || 'XOF'
  const statusDateStr = projectData?.evm_control_date || new Date().toISOString().split('T')[0]

  // EVM Engine
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

  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities)
  const pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities)
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations)
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC)

  // In a real application, you would use @react-pdf/renderer or puppeteer here.
  // For the backend plan, we generate a simple HTML string that can be sent to a PDF generator.
  
  const htmlContent = `
    <html>
      <head>
        <title>Rapport de Projet</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Rapport de Synthèse</h1>
        
        <h2>Indicateurs EVM (Global)</h2>
        ${pBAC > 0 || pPV > 0 || pEV > 0 || pAC > 0 ? `
        <table>
          <tr><th>BAC</th><th>PV</th><th>EV</th><th>AC</th><th>CPI</th><th>SPI</th></tr>
          <tr>
            <td>${formatCurrency(pBAC, currency)}</td>
            <td>${formatCurrency(pPV, currency)}</td>
            <td>${formatCurrency(pEV, currency)}</td>
            <td>${formatCurrency(pAC, currency)}</td>
            <td>${pInd.cpi === null ? 'N/A' : pInd.cpi.toFixed(2)}</td>
            <td>${pInd.spi === null ? 'N/A' : pInd.spi.toFixed(2)}</td>
          </tr>
        </table>
        ` : '<p>Aucune donnée EVM</p>'}

        <h2>Consommation Budgétaire</h2>
        <table>
          <tr>
            <th>Ligne Budgétaire</th>
            <th>Alloué</th>
            <th>Engagé</th>
            <th>Décaissé</th>
            <th>Solde</th>
          </tr>
          ${budgetData?.map(row => `
          <tr>
            <td>${row.code} - ${row.label}</td>
            <td>${formatCurrency(row.initial_allocated_amount, currency)}</td>
            <td>${formatCurrency(row.total_engage, currency)}</td>
            <td>${formatCurrency(row.total_decaisse, currency)}</td>
            <td>${formatCurrency(row.solde_disponible, currency)}</td>
          </tr>
          `).join('') || '<tr><td colspan="5">Aucune donnée</td></tr>'}
        </table>
      </body>
    </html>
  `

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html' // Can be modified to 'application/pdf' when using a generator
    }
  })
}
