'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireProjectPermission } from './auth.actions'
import { ProjectRole, ProjectAction } from '@/lib/permissions/project-permissions'

const memberSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'CONSULTANT', 'FUNDER_READONLY'])
})

export async function addMember(data: z.infer<typeof memberSchema>) {
  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  try {
    await requireProjectPermission(parsed.data.project_id, 'invite_members')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: result, error } = await supabase.from('project_members').insert(parsed.data).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${parsed.data.project_id}/membres`)
  return { data: result }
}

export async function updateMemberRole(projectId: string, userId: string, newRole: string) {
  try {
    await requireProjectPermission(projectId, 'manage_roles')
    
    if (newRole === 'OWNER') {
      return { error: 'Le rôle de propriétaire ne peut pas être attribué de cette manière. Utilisez la fonction de transfert de propriété.' }
    }
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .match({ project_id: projectId, user_id: userId })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/membres`)
  return { success: true }
}

export async function removeMember(projectId: string, userId: string) {
  try {
    await requireProjectPermission(projectId, 'manage_team')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  
  // Basic check: don't allow removing the last owner
  const { data: owners } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('role', 'OWNER')
    
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .match({ project_id: projectId, user_id: userId })
    .single()

  if (member?.role === 'OWNER' && owners && owners.length <= 1) {
    return { error: 'Impossible de supprimer le seul propriétaire du projet. Veuillez transférer la propriété avant.' }
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .match({ project_id: projectId, user_id: userId })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/membres`)
  return { success: true }
}

export async function transferOwnership(projectId: string, newOwnerId: string) {
  try {
    await requireProjectPermission(projectId, 'transfer_ownership')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  // Use the secure RPC function to ensure atomicity
  const { error } = await supabase.rpc('transfer_project_ownership', {
    p_project_id: projectId,
    p_new_owner_id: newOwnerId
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}/membres`)
  return { success: true }
}
