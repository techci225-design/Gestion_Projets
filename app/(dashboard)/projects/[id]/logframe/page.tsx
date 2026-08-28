import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogframeClient } from './logframe-client'
import { getLogframe } from '@/lib/actions/logframe.actions'
import { getLogframeIndicators } from '@/lib/actions/logframe-indicators.actions'
import { getUserRole } from '@/lib/actions/auth.actions'
import { hasProjectPermission } from '@/lib/permissions/project-permissions'

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

  // 2. Compute permissions
  const role = await getUserRole(id)
  const canManage = hasProjectPermission(role, 'manage_logframe')

  // 3. Fetch Logframe Items (already secured by getLogframe with requireProjectPermission('view_project'))
  const [logframeItems, logframeIndicators] = await Promise.all([
    getLogframe(id),
    getLogframeIndicators(id),
  ])

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cadre Logique</h1>
          <p className="text-text-secondary mt-1">Structurez l'intervention de votre projet du niveau stratégique (Impact) au niveau opérationnel (Activités).</p>
        </div>

        <LogframeClient
          projectId={id}
          initialData={logframeItems}
          initialIndicators={logframeIndicators}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
