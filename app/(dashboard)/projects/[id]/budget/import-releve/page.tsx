import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportReleveClient } from './import-releve-client'

export default async function ImportRelevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Verify access
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .single()

  if (!project) redirect('/projects')

  // Load operations that are NOT yet 'decaisse' (e.g., planifie or engage)
  const { data: operations, error } = await supabase
    .from('operations_journal')
    .select(`
      id, 
      task_code, 
      status, 
      planned_cost, 
      actual_cost, 
      description,
      budget_line_id
    `)
    .eq('project_id', id)
    .neq('status', 'annule')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-danger">Erreur de chargement: {error.message}</div>
  }

  return <ImportReleveClient projectId={id} operations={operations || []} />
}
