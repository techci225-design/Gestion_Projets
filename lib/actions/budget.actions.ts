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

export async function deleteBudgetLine(projectId: string, budgetLineId: string) {
  try {
    await requireRole(projectId, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  let adminClient;
  try {
    const { createAdminClient } = await import('../supabase/admin')
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur serveur (Clé Admin)' }
  }

  // Verify it doesn't have operations (or let the DB constraint handle it)
  const { error } = await adminClient
    .from('budget_lines')
    .delete()
    .eq('id', budgetLineId)
    .eq('project_id', projectId) // Extra security

  if (error) {
    return { error: "Impossible de supprimer cette ligne car elle contient déjà des opérations, ou une erreur technique est survenue." }
  }

  revalidatePath(`/projects/${projectId}/budget`)
  return { success: true }
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

export async function batchUpdateOperationsFromBank(projectId: string, updates: { operationId: string, actualCost: number, newStatus: string }[]) {
  const supabase = await createClient()
  
  // Verify access
  try {
    await requireRole(projectId, ['owner', 'comptable'])
  } catch (error: any) {
    return { error: error.message }
  }

  // Update operations in batch
  const errors = []
  for (const update of updates) {
    const { error } = await supabase
      .from('operations_journal')
      .update({
        actual_cost: update.actualCost,
        status: update.newStatus as any
      })
      .eq('id', update.operationId)

    if (error) {
      errors.push({ id: update.operationId, error: error.message })
    }
  }

  if (errors.length > 0) {
    return { error: 'Certaines mises à jour ont échoué', details: errors }
  }

  revalidatePath(`/projects/${projectId}/budget`)
  revalidatePath(`/projects/${projectId}/budget/journal`)
  revalidatePath(`/projects/${projectId}/budget/bailleurs`)
  
  return { success: true }
}

const fundingSourceSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['bailleur', 'donateur', 'etat', 'contrepartie', 'autre']),
  amount_committed: z.number().min(0)
})

export async function createFundingSource(payload: any) {
  try {
    await requireRole(payload.project_id, ['owner', 'chef_projet'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('funding_sources')
    .insert({
      project_id: payload.project_id,
      name: payload.name,
      type: payload.type,
      amount_committed: payload.amount_committed
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${payload.project_id}/budget`)
  return { success: true, data }
}

export async function updateFundingSource(id: string, payload: any) {
  try {
    await requireRole(payload.project_id, ['owner', 'chef_projet'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('funding_sources')
    .update({
      name: payload.name,
      type: payload.type,
      amount_committed: payload.amount_committed
    })
    .eq('id', id)
    .eq('project_id', payload.project_id)
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath(`/projects/${payload.project_id}/budget`)
  return { success: true, data }
}
