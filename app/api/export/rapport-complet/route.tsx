import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { RapportDocument } from '@/lib/pdf/RapportDocument'
import React from 'react'

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
    { data: evmSummary },
    { data: evmIndicators },
    { data: procurementPlan },
    { data: risks }
  ] = await Promise.all([
    supabase.from('logframe_items').select('*').eq('project_id', projectId).order('level').order('parent_id'),
    supabase.from('v_budget_consumption').select('*').eq('project_id', projectId),
    supabase.from('v_evm_project_summary').select('*').eq('project_id', projectId).single(),
    supabase.from('v_evm_indicators').select('*').eq('project_id', projectId),
    supabase.from('procurement_plan').select('*').eq('project_id', projectId).order('planned_notice_date'),
    supabase.from('risks').select('*').eq('project_id', projectId).order('criticality', { ascending: false })
  ])

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
      total_budget: evmSummary?.bac_total,
      cpi: evmSummary?.cpi_global,
      spi: evmSummary?.spi_global,
      risks: risks?.length || 0,
      budget_consumption_rate: (budgetConsumption.reduce((acc: number, curr: any) => acc + (curr.total_decaisse || 0), 0) / budgetConsumption.reduce((acc: number, curr: any) => acc + (curr.initial_allocated_amount || 0), 0)) * 100
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
