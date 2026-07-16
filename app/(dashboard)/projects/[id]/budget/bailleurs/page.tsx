import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BailleursClient } from './bailleurs-client'

export default async function BailleursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Verify access
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .single()

  if (!project) redirect('/projects')

  const { data: bailleurs, error } = await supabase
    .from('v_funding_tracking')
    .select('*')
    .eq('project_id', id)
    .order('bailleur_name', { ascending: true })

  if (error) {
    return <div className="p-6 text-danger">Erreur de chargement: {error.message}</div>
  }

  return <BailleursClient projectId={id} bailleurs={bailleurs || []} />
}
