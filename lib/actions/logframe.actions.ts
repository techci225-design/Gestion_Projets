'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireProjectPermission } from './auth.actions'
import { z } from 'zod'

export type LogframeLevel = 'objectif_global' | 'objectif_specifique' | 'resultat' | 'activite'

export interface LogframeItem {
  id: string
  project_id: string
  parent_id: string | null
  level: LogframeLevel
  intervention_label: string
  indicator: string | null
  baseline: string | null
  target: string | null
  s1_value: string | null
  s2_value: string | null
  s3_value: string | null
  verification_source: string | null
  risks_assumptions: string | null
  created_at: string
}

const logframeItemSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  level: z.enum(['objectif_global', 'objectif_specifique', 'resultat', 'activite']),
  intervention_label: z.string().min(1, "La description est requise"),
  indicator: z.string().nullable().optional(),
  baseline: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  s1_value: z.string().nullable().optional(),
  s2_value: z.string().nullable().optional(),
  s3_value: z.string().nullable().optional(),
  verification_source: z.string().nullable().optional(),
  risks_assumptions: z.string().nullable().optional(),
})

const updateLogframeItemSchema = logframeItemSchema.partial()

export async function getLogframe(projectId: string) {
  await requireProjectPermission(projectId, 'view_project')

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('logframe_items')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching logframe:', error)
    throw new Error('Failed to fetch logframe')
  }

  return data as LogframeItem[]
}

export async function addLogframeItem(
  projectId: string,
  data: Omit<LogframeItem, 'id' | 'project_id' | 'created_at'>
) {
  await requireProjectPermission(projectId, 'manage_logframe')
  
  const validated = logframeItemSchema.parse(data)

  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('logframe_items')
    .insert([
      {
        project_id: projectId,
        ...validated
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error adding logframe item:', error)
    throw new Error('Failed to add logframe item')
  }

  revalidatePath(`/projects/${projectId}/logframe`)
  return item as LogframeItem
}

export async function updateLogframeItem(
  projectId: string,
  id: string,
  data: Partial<Omit<LogframeItem, 'id' | 'project_id' | 'created_at'>>
) {
  await requireProjectPermission(projectId, 'manage_logframe')
  
  const validated = updateLogframeItemSchema.parse(data)

  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('logframe_items')
    .update(validated)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    console.error('Error updating logframe item:', error)
    throw new Error('Failed to update logframe item')
  }

  revalidatePath(`/projects/${projectId}/logframe`)
  return item as LogframeItem
}

export async function deleteLogframeItem(projectId: string, id: string) {
  await requireProjectPermission(projectId, 'manage_logframe')

  const supabase = await createClient()

  // The database has ON DELETE CASCADE for parent_id, so deleting a parent will delete all its children
  const { error } = await supabase
    .from('logframe_items')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error deleting logframe item:', error)
    throw new Error('Failed to delete logframe item')
  }

  revalidatePath(`/projects/${projectId}/logframe`)
}
