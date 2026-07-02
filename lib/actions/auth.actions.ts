import { createClient } from '../supabase/server'

export type ProjectRole = 'owner' | 'chef_projet' | 'comptable' | 'bailleur_lecture' | 'consultant'

export async function getUserRole(projectId: string): Promise<ProjectRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return data.role as ProjectRole
}

export async function requireRole(projectId: string, allowedRoles: ProjectRole[]) {
  const role = await getUserRole(projectId)
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Non autorisé')
  }
  return role
}
