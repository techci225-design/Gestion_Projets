'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from './auth.actions'

export async function updateEvmDate(projectId: string, date: string) {
  try {
    await requireRole(projectId, ['owner', 'chef_projet'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .update({ evm_control_date: date })
    .eq('id', projectId)

  if (error) {
    return { error: 'Failed to update EVM date' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/evm`)
  return { success: true }
}

const evmTaskSchema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().min(1),
  responsible: z.string().optional(),
  date_start: z.string(),
  date_end: z.string(),
  budget_allocated: z.number().min(0),
  percent_complete: z.number().min(0).max(100).default(0),
  actual_cost: z.number().min(0).default(0)
})

export async function createEvmTask(data: z.infer<typeof evmTaskSchema>) {
  const parsed = evmTaskSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['owner', 'chef_projet', 'consultant'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('wbs_tasks')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Créer l'entrée PTBA correspondante pour l'année de début
  const startYear = new Date(parsed.data.date_start).getFullYear()
  await supabase.from('ptba_activities').insert({
    project_id: parsed.data.project_id,
    wbs_task_id: result.id,
    code: parsed.data.code,
    description: parsed.data.description,
    responsible: parsed.data.responsible,
    fiscal_year: startYear,
    budget_planned: parsed.data.budget_allocated,
    q1: false, q2: false, q3: false, q4: false
  });

  revalidatePath(`/projects/${parsed.data.project_id}/evm`)
  return { data: result }
}
