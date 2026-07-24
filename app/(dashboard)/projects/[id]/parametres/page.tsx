import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParametresClient } from './parametres-client'

export const metadata = {
  title: 'Paramètres du Projet | Gestion de Projets',
  description: 'Le socle de gouvernance du projet'
}

export default async function ParametresPage({ params }: { params: Promise<{ id: string }> }) {
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

  // 1b. Get user role in project
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .single()
  
  const userRole = member?.role || ''

  // 2. Fetch Funding Sources
  const { data: fundingSources } = await supabase
    .from('funding_sources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // 3. Fetch Budget Lines
  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('project_id', id)
    .order('code', { ascending: true })

  // 4. Fetch WBS Tasks
  const { data: wbsTasks } = await supabase
    .from('wbs_tasks')
    .select('*')
    .eq('project_id', id)
    .order('code', { ascending: true })

  // 5. Fetch Members
  const { data: members } = await supabase
    .from('project_members')
    .select('*, profiles(email, full_name)')
    .eq('project_id', id)

  // 6. Fetch Invitations
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*, invited_by_profile:profiles!invited_by(full_name)')
    .eq('project_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <ParametresClient
      projectId={id}
      project={project}
      fundingSources={fundingSources || []}
      budgetLines={budgetLines || []}
      wbsTasks={wbsTasks || []}
      userRole={userRole}
      members={members || []}
      invitations={invitations || []}
    />
  )
}
