import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProcurementClient } from './procurement-client'
import { getProcurementPlan } from '@/lib/actions/procurement.actions'

export const metadata = {
  title: 'PPM | Gestion de Projets',
  description: 'Plan de Passation des Marchés'
}

export default async function ProcurementPage({ params }: { params: Promise<{ id: string }> }) {
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

  // 2. Fetch Procurement Plan
  const procurementPlan = await getProcurementPlan(id)

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Plan de Passation des Marchés (PPM)</h1>
          <p className="text-text-secondary mt-1">Planification des acquisitions (Travaux, Biens et Services) du projet.</p>
        </div>

        <ProcurementClient 
          projectId={id} 
          initialData={procurementPlan} 
        />
      </div>
    </div>
  )
}
