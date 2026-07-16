import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RisksClient } from './risks-client'
import { getRisks } from '@/lib/actions/risks.actions'

export const metadata = {
  title: 'Risques | Gestion de Projets',
  description: 'Matrice de gestion des risques'
}

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // 1. Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('*, project_members!inner(role)')
    .eq('id', id)
    .eq('project_members.user_id', user.id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 2. Fetch Risks
  const risks = await getRisks(id)

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Matrice des Risques</h1>
          <p className="text-text-secondary mt-1">Identifiez et évaluez les risques potentiels pouvant impacter le projet.</p>
        </div>

        <RisksClient 
          projectId={id} 
          initialData={risks} 
        />
      </div>
    </div>
  )
}
