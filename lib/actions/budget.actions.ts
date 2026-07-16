'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const budgetLineSchema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  initial_allocated_amount: z.number().min(0),
  funding_source_id: z.string().uuid().optional(),
  counterpart_amount: z.number().min(0).default(0),
  responsible: z.string().optional()
})

import { requireRole } from './auth.actions'

export async function createBudgetLine(data: z.infer<typeof budgetLineSchema>) {
  const parsed = budgetLineSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  // The insert implicitly triggers the RLS check and the audit_log trigger on the Postgres side
  const { data: result, error } = await supabase
    .from('budget_lines')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.project_id}/budget`)
  return { data: result }
}

const operationJournalSchema = z.object({
  project_id: z.string().uuid(),
  budget_line_id: z.string().uuid(),
  task_code: z.string().min(1),
  phase_wbs: z.string().optional(),
  status: z.enum(['planifie', 'engage', 'decaisse', 'annule']),
  planned_cost: z.number().min(0),
  actual_cost: z.number().min(0).optional(),
  funding_source_id: z.string().uuid().optional()
})

export async function createOperation(data: z.infer<typeof operationJournalSchema>) {
  const parsed = operationJournalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('operations_journal')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.project_id}/budget/journal`)
  return { data: result }
}
