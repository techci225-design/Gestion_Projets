'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'

const memberSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'chef_projet', 'comptable', 'bailleur_lecture', 'consultant'])
})

export async function addMember(data: z.infer<typeof memberSchema>) {
  const parsed = memberSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid data', details: parsed.error.issues }

  try {
    await requireRole(parsed.data.project_id, ['owner'])
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
    await requireRole(projectId, ['owner'])
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
    await requireRole(projectId, ['owner'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  
  // Basic check: don't allow removing the last owner
  const { data: owners } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('role', 'owner')
    
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .match({ project_id: projectId, user_id: userId })
    .single()

  if (member?.role === 'owner' && owners && owners.length <= 1) {
    return { error: 'Impossible de supprimer le seul propriétaire du projet.' }
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .match({ project_id: projectId, user_id: userId })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/membres`)
  return { success: true }
}
