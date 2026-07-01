import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/format-currency'

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
    
  const { data: evmData } = await supabase
    .from('v_evm_project_summary')
    .select('*')
    .eq('project_id', projectId)
    .single()

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
        ${evmData ? `
        <table>
          <tr><th>BAC</th><th>PV</th><th>EV</th><th>AC</th><th>CPI</th><th>SPI</th></tr>
          <tr>
            <td>${formatCurrency(evmData.bac_total)}</td>
            <td>${formatCurrency(evmData.pv_total)}</td>
            <td>${formatCurrency(evmData.ev_total)}</td>
            <td>${formatCurrency(evmData.ac_total)}</td>
            <td>${Number(evmData.cpi_global).toFixed(2)}</td>
            <td>${Number(evmData.spi_global).toFixed(2)}</td>
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
            <td>${formatCurrency(row.initial_allocated_amount)}</td>
            <td>${formatCurrency(row.total_engage)}</td>
            <td>${formatCurrency(row.total_decaisse)}</td>
            <td>${formatCurrency(row.solde_disponible)}</td>
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
