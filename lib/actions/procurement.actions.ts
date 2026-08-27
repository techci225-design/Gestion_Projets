'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hasProjectPermission, ProjectRole } from '@/lib/permissions/project-permissions'

export interface ProcurementItem {
  id: string
  project_id: string
  description: string
  market_type: string | null
  method: string | null
  review_type: 'a_priori' | 'a_posteriori' | null
  planned_notice_date: string | null
  contract_signature_date: string | null
  estimated_amount: number | null
  status: string
  created_at: string
}

const procurementSchema = z.object({
  description: z.string().trim().min(1, 'La description est requise.').max(500),
  market_type: z.string().trim().max(100).nullable().optional(),
  method: z.string().trim().max(250).nullable().optional(),
  review_type: z.enum(['a_priori', 'a_posteriori']).nullable().optional(),
  planned_notice_date: z.string().date().nullable().optional(),
  contract_signature_date: z.string().date().nullable().optional(),
  estimated_amount: z.number().finite().min(0),
  // The database historically accepts free-form statuses. Keep that compatibility
  // while rejecting empty or oversized values at the server boundary.
  status: z.string().trim().min(1).max(50),
})

async function requireProcurementPermission(projectId: string, permission: 'view' | 'manage') {
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
    : role === 'OWNER' || role === 'PROJECT_MANAGER'

  if (!allowed) throw new Error('Permissions insuffisantes')

  return { supabase, role }
}

export async function getProcurementPlan(projectId: string) {
  const { supabase } = await requireProcurementPermission(projectId, 'view')

  const { data, error } = await supabase
    .from('procurement_plan')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching procurement plan:', error)
    throw new Error('Failed to fetch procurement plan')
  }

  return data as ProcurementItem[]
}

export async function addProcurement(
  projectId: string,
  data: Omit<ProcurementItem, 'id' | 'project_id' | 'created_at'>
) {
  const validatedData = procurementSchema.parse(data)
  const { supabase } = await requireProcurementPermission(projectId, 'manage')

  const { data: item, error } = await supabase
    .from('procurement_plan')
    .insert([{ project_id: projectId, ...validatedData }])
    .select()
    .single()

  if (error) {
    console.error('Error adding procurement item:', error)
    throw new Error('Failed to add procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
  return item as ProcurementItem
}

export async function updateProcurement(
  projectId: string,
  id: string,
  data: Partial<Omit<ProcurementItem, 'id' | 'project_id' | 'created_at'>>
) {
  const validatedData = procurementSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    'Au moins un champ doit être modifié.'
  ).parse(data)
  const { supabase } = await requireProcurementPermission(projectId, 'manage')

  const { data: item, error } = await supabase
    .from('procurement_plan')
    .update(validatedData)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating procurement item:', error)
    throw new Error('Failed to update procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
  return item as ProcurementItem
}

export async function deleteProcurement(projectId: string, id: string) {
  const { supabase } = await requireProcurementPermission(projectId, 'manage')

  const { error } = await supabase
    .from('procurement_plan')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting procurement item:', error)
    throw new Error('Failed to delete procurement item')
  }

  revalidatePath(`/projects/${projectId}/marches`)
}
