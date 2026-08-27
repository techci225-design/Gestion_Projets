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

const expectedParentLevel: Record<LogframeLevel, LogframeLevel | null> = {
  objectif_global: null,
  objectif_specifique: 'objectif_global',
  resultat: 'objectif_specifique',
  activite: 'resultat',
}

async function validateLogframeHierarchy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  level: LogframeLevel,
  parentId: string | null | undefined,
) {
  const expectedLevel = expectedParentLevel[level]

  if (!expectedLevel) {
    if (parentId) {
      throw new Error("Un objectif global ne peut pas avoir de parent")
    }
    return
  }

  if (!parentId) {
    throw new Error(`Un élément de niveau ${level} doit avoir un parent`)
  }

  const { data: parent, error } = await supabase
    .from('logframe_items')
    .select('id, project_id, level')
    .eq('id', parentId)
    .single()

  if (error || !parent || parent.project_id !== projectId) {
    throw new Error("Le parent du Cadre Logique est introuvable dans ce projet")
  }

  if (parent.level !== expectedLevel) {
    throw new Error(`Le parent sélectionné doit être de niveau ${expectedLevel}`)
  }
}

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

  await validateLogframeHierarchy(
    supabase,
    projectId,
    validated.level,
    validated.parent_id,
  )

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

  if (validated.level !== undefined || validated.parent_id !== undefined) {
    const { data: currentItem, error: currentItemError } = await supabase
      .from('logframe_items')
      .select('level, parent_id')
      .eq('id', id)
      .eq('project_id', projectId)
      .single()

    if (currentItemError || !currentItem) {
      throw new Error("Élément du Cadre Logique introuvable dans ce projet")
    }

    await validateLogframeHierarchy(
      supabase,
      projectId,
      (validated.level ?? currentItem.level) as LogframeLevel,
      validated.parent_id !== undefined ? validated.parent_id : currentItem.parent_id,
    )
  }

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
