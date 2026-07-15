import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ParametresClient } from './parametres-client'

export const metadata = {
  title: 'Paramètres du Projet | Smart Budget',
  description: 'Le socle de gouvernance du projet'
}

export default async function ParametresPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  // 1. Get project details and role
  const { data: project } = await supabase
    .from('projects')
    .select('*, project_members!inner(role)')
    .eq('id', id)
    .eq('project_members.user_id', user.id)
    .single()

  if (!project) {
    redirect('/projects')
  }

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

  return (
    <ParametresClient
      projectId={id}
      fundingSources={fundingSources || []}
      budgetLines={budgetLines || []}
      wbsTasks={wbsTasks || []}
      userRole={project.project_members[0]?.role}
    />
  )
}
