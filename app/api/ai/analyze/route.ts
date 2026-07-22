import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeProject, generateInputHash } from '@/lib/ai/claude'
import { requireRole } from '@/lib/actions/auth.actions'

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })

    await requireRole(projectId, ['owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant'])
    
    const supabase = await createClient()

    // Collect Data
    const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
    const { data: evm } = await supabase.from('evm_snapshots').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(3)
    const { data: risks } = await supabase.from('risks').select('*').eq('project_id', projectId).eq('status', 'ouvert')
    const { data: tasks } = await supabase.from('wbs_tasks').select('*').eq('project_id', projectId)

    const projectData = {
      name: project?.name,
      start_date: project?.start_date,
      end_date: project?.end_date,
      total_budget: project?.total_budget,
      currency: project?.currency,
      evm_recent: evm,
      open_risks_count: risks?.length || 0,
      open_risks: risks?.map(r => ({ title: r.title, severity: r.severity })),
      tasks_count: tasks?.length || 0
    }

    const inputHash = generateInputHash(projectData)

    // Check Cache (less than 1 hour old)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: cached } = await supabase.from('ai_analyses')
      .select('result')
      .eq('project_id', projectId)
      .eq('analysis_type', 'evm_dashboard')
      .eq('input_hash', inputHash)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (cached) {
      return NextResponse.json(cached.result)
    }

    // Call Claude
    const rawResult = await analyzeProject(projectData)
    let jsonResult = null
    try {
      jsonResult = JSON.parse(rawResult)
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Save to DB
    await supabase.from('ai_analyses').insert({
      project_id: projectId,
      analysis_type: 'evm_dashboard',
      input_hash: inputHash,
      result: jsonResult
    })

    return NextResponse.json(jsonResult)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
