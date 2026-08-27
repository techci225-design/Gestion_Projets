'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hasProjectPermission, ProjectRole } from '@/lib/permissions/project-permissions'

export interface RiskItem {
  id: string
  project_id: string
  category: string
  description: string
  probability: number
  impact: number
  criticality: number
  mitigation_strategy: string | null
  responsible: string | null
  status: 'ouvert' | 'en_cours' | 'clos'
  created_at: string
}

const riskSchema = z.object({
  category: z.string().trim().min(1, 'La catégorie est requise.').max(100),
  description: z.string().trim().min(1, 'La description est requise.').max(1000),
  probability: z.number().int().min(1).max(3),
  impact: z.number().int().min(1).max(3),
  mitigation_strategy: z.string().trim().max(2000).nullable().optional(),
  responsible: z.string().trim().max(200).nullable().optional(),
  status: z.enum(['ouvert', 'en_cours', 'clos']),
})

async function requireRiskPermission(projectId: string, permission: 'view' | 'manage') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Non autorisé')

  const { data: member, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  if (error || !member?.role) throw new Error('Accès refusé')

  const role = member.role as ProjectRole
  const allowed = permission === 'view'
    ? hasProjectPermission(role, 'view_project')
    : role === 'OWNER' || role === 'PROJECT_MANAGER' || role === 'CONSULTANT'

  if (!allowed) throw new Error('Permissions insuffisantes')

  return { supabase, role }
}

export async function getRisks(projectId: string) {
  const { supabase } = await requireRiskPermission(projectId, 'view')

  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching risks:', error)
    throw new Error('Failed to fetch risks')
  }

  return data as RiskItem[]
}

export async function addRisk(
  projectId: string,
  data: Omit<RiskItem, 'id' | 'project_id' | 'criticality' | 'created_at'>
) {
  const validatedData = riskSchema.parse(data)
  const { supabase } = await requireRiskPermission(projectId, 'manage')

  const { data: item, error } = await supabase
    .from('risks')
    .insert([{ project_id: projectId, ...validatedData }])
    .select()
    .single()

  if (error) {
    console.error('Error adding risk:', error)
    throw new Error('Failed to add risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
  return item as RiskItem
}

export async function updateRisk(
  projectId: string,
  id: string,
  data: Partial<Omit<RiskItem, 'id' | 'project_id' | 'criticality' | 'created_at'>>
) {
  const validatedData = riskSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    'Au moins un champ doit être modifié.'
  ).parse(data)
  const { supabase } = await requireRiskPermission(projectId, 'manage')

  const { data: item, error } = await supabase
    .from('risks')
    .update(validatedData)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating risk:', error)
    throw new Error('Failed to update risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
  return item as RiskItem
}

export async function deleteRisk(projectId: string, id: string) {
  const { supabase } = await requireRiskPermission(projectId, 'manage')

  const { error } = await supabase
    .from('risks')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting risk:', error)
    throw new Error('Failed to delete risk')
  }

  revalidatePath(`/projects/${projectId}/risques`)
}
