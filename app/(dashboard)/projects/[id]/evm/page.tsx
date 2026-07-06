import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EvmClient } from './evm-client'

export default async function EvmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    redirect('/projects')
  }

  const { data: summaryData } = await supabase
    .from('v_evm_project_summary')
    .select('*')
    .eq('project_id', id)
    .single()

  const { data: indicators } = await supabase
    .from('v_evm_indicators')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: snapshots } = await supabase
    .from('evm_snapshots')
    .select('*')
    .eq('project_id', id)
    .order('control_date', { ascending: true })

  return (
    <EvmClient 
      projectId={id}
      project={project}
      summary={summaryData || null}
      indicators={indicators || []}
      snapshots={snapshots || []}
    />
  )
}
