import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlanningClient } from './planning-client'
import { getWbsTasks } from '@/lib/actions/wbs.actions'

export const metadata = {
  title: 'Planning (Gantt) | Gestion de Projets',
  description: 'Planifiez, visualisez et suivez l\'avancement de vos activités.'
}

export default async function PlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // 1. Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 2. Get user role
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .single()
  
  const userRole = member?.role || ''

  // 3. Get Project Members
  const { data: teamMembers } = await supabase
    .from('project_members')
    .select(`
      user_id,
      role,
      profiles:user_id (id, full_name, email)
    `)
    .eq('project_id', id)

  // 4. Get WBS tasks
  const { data: wbsTasks } = await getWbsTasks(id)

  return (
    <PlanningClient
      projectId={id}
      project={project}
      initialTasks={wbsTasks || []}
      teamMembers={teamMembers || []}
      userRole={userRole}
    />
  )
}
