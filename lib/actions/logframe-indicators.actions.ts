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

export interface LogframeIndicatorTracking {
  id: string
  project_id: string
  indicator_id: string
  measured_at: string | null
  period_type: 'semester' | 'quarter' | 'month' | 'year' | null
  period_number: number | null
  period_year: number | null
  value_numeric: number | null
  value_text: string | null
  comment: string | null
  source_url: string | null
  created_by: string | null
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
const trackingIdSchema = z.string().uuid()

const trackingSchema = z.object({
  indicator_id: z.string().uuid(),
  measured_at: z.string().date(),
  period_type: z.enum(['semester', 'quarter', 'month', 'year']).nullable().optional(),
  period_number: z.number().int().min(1).max(12).nullable().optional(),
  period_year: z.number().int().min(2000).max(2100).nullable().optional(),
  value_numeric: z.number().finite().nullable().optional(),
  value_text: z.string().trim().min(1).max(1000).nullable().optional(),
  comment: z.string().trim().max(2000).nullable().optional(),
  source_url: z.string().url().max(2000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.value_numeric === null || value.value_numeric === undefined) {
    if (!value.value_text) ctx.addIssue({ code: 'custom', path: ['value_text'], message: 'La valeur mesurée est requise' })
  }
  if (value.period_type && (!value.period_number || !value.period_year)) {
    ctx.addIssue({ code: 'custom', path: ['period_number'], message: 'La période doit préciser son numéro et son année' })
  }
})

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

async function getIndicatorForTracking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  indicatorId: string,
) {
  const { data, error } = await supabase
    .from('logframe_indicators')
    .select('id, type')
    .eq('id', indicatorId)
    .eq('project_id', projectId)
    .single()

  if (error || !data) throw new Error('Indicateur introuvable dans ce projet')
  return data as Pick<LogframeIndicator, 'id' | 'type'>
}

export async function getLogframeIndicatorTracking(projectId: string, indicatorId?: string) {
  projectIdSchema.parse(projectId)
  if (indicatorId) indicatorIdSchema.parse(indicatorId)
  await requireProjectPermission(projectId, 'view_project')
  const supabase = await createClient()
  let query = supabase
    .from('logframe_indicator_tracking')
    .select('*')
    .eq('project_id', projectId)
    .order('measured_at', { ascending: false })

  if (indicatorId) query = query.eq('indicator_id', indicatorId)
  const { data, error } = await query
  if (error) throw new Error('Impossible de charger les relevés')
  return (data ?? []) as LogframeIndicatorTracking[]
}

export async function addLogframeIndicatorTracking(projectId: string, input: unknown) {
  projectIdSchema.parse(projectId)
  await requireProjectPermission(projectId, 'manage_logframe')
  const data = trackingSchema.parse(input)
  const supabase = await createClient()
  const indicator = await getIndicatorForTracking(supabase, projectId, data.indicator_id)

  if (indicator.type === 'quantitative' && (data.value_numeric === null || data.value_numeric === undefined)) {
    throw new Error('Un indicateur quantitatif requiert une valeur numérique')
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: tracking, error } = await supabase
    .from('logframe_indicator_tracking')
    .insert({ project_id: projectId, ...data, created_by: user?.id ?? null })
    .select()
    .single()

  if (error) throw new Error('Impossible d’ajouter le relevé')
  revalidatePath(`/projects/${projectId}/logframe`)
  return tracking as LogframeIndicatorTracking
}

export async function deleteLogframeIndicatorTracking(projectId: string, id: string) {
  projectIdSchema.parse(projectId)
  trackingIdSchema.parse(id)
  await requireProjectPermission(projectId, 'manage_logframe')
  const supabase = await createClient()
  const { error } = await supabase
    .from('logframe_indicator_tracking')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId)

  if (error) throw new Error('Impossible de supprimer le relevé')
  revalidatePath(`/projects/${projectId}/logframe`)
}
