'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function getLogframe(projectId: string) {
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
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('logframe_items')
    .insert([
      {
        project_id: projectId,
        ...data
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
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('logframe_items')
    .update(data)
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
