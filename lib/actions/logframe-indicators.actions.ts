'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireProjectPermission } from './auth.actions'
import { createClient } from '@/lib/supabase/server'

export interface LogframeIndicator {
  id: string
  project_id: string
  logframe_item_id: string
  code: string | null
  name: string
  type: 'quantitative' | 'qualitative'
  unit: string | null
  baseline_numeric: number | null
  baseline_text: string | null
  target_numeric: number | null
  target_text: string | null
  frequency: string | null
  responsible: string | null
  verification_source: string | null
  created_at: string
  updated_at: string
}

const indicatorSchema = z.object({
  logframe_item_id: z.string().uuid(),
  code: z.string().trim().min(1).max(80).nullable().optional(),
  name: z.string().trim().min(1, 'Le libellé de l’indicateur est requis').max(500),
  type: z.enum(['quantitative', 'qualitative']),
  unit: z.string().trim().max(100).nullable().optional(),
  baseline_numeric: z.number().finite().nullable().optional(),
  baseline_text: z.string().trim().max(1000).nullable().optional(),
  target_numeric: z.number().finite().nullable().optional(),
  target_text: z.string().trim().max(1000).nullable().optional(),
  frequency: z.string().trim().max(100).nullable().optional(),
  responsible: z.string().trim().max(200).nullable().optional(),
  verification_source: z.string().trim().max(1000).nullable().optional(),
}).superRefine((value, ctx) => {
  const hasBaseline = value.baseline_numeric !== null && value.baseline_numeric !== undefined
    || Boolean(value.baseline_text)
  const hasTarget = value.target_numeric !== null && value.target_numeric !== undefined
    || Boolean(value.target_text)

  if (!hasBaseline) {
    ctx.addIssue({ code: 'custom', path: ['baseline_text'], message: 'La ligne de base est requise' })
  }
  if (!hasTarget) {
    ctx.addIssue({ code: 'custom', path: ['target_text'], message: 'La cible est requise' })
  }
  if (value.type === 'quantitative' && (value.baseline_numeric === null || value.baseline_numeric === undefined || value.target_numeric === null || value.target_numeric === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: 'Un indicateur quantitatif requiert une ligne de base et une cible numériques' })
  }
})

const projectIdSchema = z.string().uuid()
const indicatorIdSchema = z.string().uuid()

async function assertLogframeItemInProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  logframeItemId: string,
) {
  const { data, error } = await supabase
    .from('logframe_items')
    .select('id')
    .eq('id', logframeItemId)
    .eq('project_id', projectId)
    .single()

  if (error || !data) {
    throw new Error('Élément du Cadre Logique introuvable dans ce projet')
  }
}

export async function getLogframeIndicators(projectId: string) {
  projectIdSchema.parse(projectId)
  await requireProjectPermission(projectId, 'view_project')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('logframe_indicators')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')

  if (error) throw new Error('Impossible de charger les indicateurs')
  return (data ?? []) as LogframeIndicator[]
}

export async function addLogframeIndicator(projectId: string, input: unknown) {
  projectIdSchema.parse(projectId)
  await requireProjectPermission(projectId, 'manage_logframe')
  const data = indicatorSchema.parse(input)
  const supabase = await createClient()

  await assertLogframeItemInProject(supabase, projectId, data.logframe_item_id)

  const { data: indicator, error } = await supabase
    .from('logframe_indicators')
    .insert({ project_id: projectId, ...data })
    .select()
    .single()

  if (error) throw new Error('Impossible d’ajouter l’indicateur')
  revalidatePath(`/projects/${projectId}/logframe`)
  return indicator as LogframeIndicator
}

export async function updateLogframeIndicator(projectId: string, id: string, input: unknown) {
  projectIdSchema.parse(projectId)
  indicatorIdSchema.parse(id)
  await requireProjectPermission(projectId, 'manage_logframe')
  const data = indicatorSchema.partial().omit({ logframe_item_id: true }).parse(input)
  const supabase = await createClient()

  const { data: indicator, error } = await supabase
    .from('logframe_indicators')
    .update(data)
    .eq('id', id)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error || !indicator) throw new Error('Indicateur introuvable dans ce projet')
  revalidatePath(`/projects/${projectId}/logframe`)
  return indicator as LogframeIndicator
}

export async function deleteLogframeIndicator(projectId: string, id: string) {
  projectIdSchema.parse(projectId)
  indicatorIdSchema.parse(id)
  await requireProjectPermission(projectId, 'manage_logframe')
  const supabase = await createClient()

  const { error } = await supabase
    .from('logframe_indicators')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) throw new Error('Impossible de supprimer l’indicateur')
  revalidatePath(`/projects/${projectId}/logframe`)
}
