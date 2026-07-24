import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogframeClient } from './logframe-client'
import { getLogframe } from '@/lib/actions/logframe.actions'

export const metadata = {
  title: 'Cadre Logique | Gestion de Projets',
  description: 'Le socle stratégique du projet'
}

export default async function LogframePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // 1. Get project details and role
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 2. Fetch Logframe items
  const logframeItems = await getLogframe(id)

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Cadre Logique</h1>
          <p className="text-text-secondary mt-1">Structurez l'intervention de votre projet du niveau stratégique (Impact) au niveau opérationnel (Activités).</p>
        </div>

        <LogframeClient 
          projectId={id} 
          initialData={logframeItems || []} 
          project={project}
        />
      </div>
    </div>
  )
}
