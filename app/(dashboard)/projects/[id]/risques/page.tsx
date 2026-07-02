import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RisquesClient } from './risques-client'

export default async function RisquesPage({ params }: { params: Promise<{ id: string }> }) {
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

  // order by criticality desc
  const { data: risks } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', id)
    .order('criticality', { ascending: false })

  return (
    <RisquesClient 
      projectId={id} 
      risks={risks || []} 
    />
  )
}
