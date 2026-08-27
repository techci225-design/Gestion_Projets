'use server'

import { z } from 'zod'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

const budgetLineSchema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional().nullable(),
  quantity: z.number().min(0).optional().nullable(),
  unit_cost: z.number().min(0).optional().nullable(),
  initial_allocated_amount: z.number().min(0),
  funding_source_id: z.string().uuid().optional().nullable(),
  counterpart_amount: z.number().min(0).default(0),
  responsible: z.string().optional().nullable()
})

import { requireRole, requireProjectPermission } from './auth.actions'

export async function createBudgetLine(data: z.infer<typeof budgetLineSchema>) {
  const parsed = budgetLineSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['OWNER', 'ACCOUNTANT'])
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

const updateBudgetLineSchema = budgetLineSchema.extend({
  id: z.string().uuid()
})

export async function updateBudgetLine(data: z.infer<typeof updateBudgetLineSchema>) {
  const parsed = updateBudgetLineSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  try {
    await requireRole(parsed.data.project_id, ['OWNER', 'ACCOUNTANT'])
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  const { data: result, error } = await supabase
    .from('budget_lines')
    .update({
      code: parsed.data.code,
      label: parsed.data.label,
      unit: parsed.data.unit,
      quantity: parsed.data.quantity,
      unit_cost: parsed.data.unit_cost,
      initial_allocated_amount: parsed.data.initial_allocated_amount,
      responsible: parsed.data.responsible
    })
    .eq('id', parsed.data.id)
    .eq('project_id', parsed.data.project_id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.project_id}/budget`)
  return { data: result }
}

export async function getBudgetLines(projectId: string) {
  try {
    await requireRole(projectId, ['OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT', 'CONSULTANT'])
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('budget_lines')
      .select('id, code, label, initial_allocated_amount')
      .eq('project_id', projectId)
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err: any) {
    console.error('Error fetching budget lines:', err)
    return []
  }
}

export async function deleteBudgetLine(projectId: string, budgetLineId: string) {
  try {
    await requireRole(projectId, ['OWNER', 'ACCOUNTANT'])
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
  wbs_task_id: z.string().uuid().optional().nullable(),
  task_code: z.string().optional().nullable(),
  phase_wbs: z.string().optional().nullable(),
  status: z.enum(['planifie', 'engage', 'decaisse', 'annule']),
  planned_cost: z.number().min(0),
  actual_cost: z.number().min(0).optional(),
  funding_source_id: z.string().uuid().optional(),
  operation_date: z.string().optional().nullable()
})

export async function createOperation(data: z.infer<typeof operationJournalSchema>) {
  const parsed = operationJournalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  // Invariant Décaissé
  if (parsed.data.status === 'decaisse') {
    if (!parsed.data.actual_cost || parsed.data.actual_cost <= 0 || !parsed.data.operation_date) {
      return { error: "Pour une opération décaissée, le coût réel (> 0) et la date d'opération sont obligatoires." }
    }
  }

  try {
    await requireProjectPermission(parsed.data.project_id, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  // Validate budget_line_id belongs to this project
  if (parsed.data.budget_line_id) {
    const { data: bl } = await supabase.from('budget_lines').select('project_id').eq('id', parsed.data.budget_line_id).single()
    if (!bl || bl.project_id !== parsed.data.project_id) {
      return { error: 'La ligne budgétaire est invalide ou appartient à un autre projet.' }
    }
  }

  // Validate wbs_task_id belongs to this project
  if (parsed.data.wbs_task_id) {
    const { data: wbs } = await supabase.from('wbs_tasks').select('project_id').eq('id', parsed.data.wbs_task_id).single()
    if (!wbs || wbs.project_id !== parsed.data.project_id) {
      return { error: 'La tâche WBS est invalide ou appartient à un autre projet.' }
    }
  }

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

const updateOperationJournalSchema = operationJournalSchema.extend({
  id: z.string().uuid()
})

export async function updateOperation(data: z.infer<typeof updateOperationJournalSchema>) {
  const parsed = updateOperationJournalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues }
  }

  // Invariant Décaissé
  if (parsed.data.status === 'decaisse') {
    if (!parsed.data.actual_cost || parsed.data.actual_cost <= 0 || !parsed.data.operation_date) {
      return { error: "Pour une opération décaissée, le coût réel (> 0) et la date d'opération sont obligatoires." }
    }
  }

  try {
    await requireProjectPermission(parsed.data.project_id, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()

  // Validate budget_line_id belongs to this project
  if (parsed.data.budget_line_id) {
    const { data: bl } = await supabase.from('budget_lines').select('project_id').eq('id', parsed.data.budget_line_id).single()
    if (!bl || bl.project_id !== parsed.data.project_id) {
      return { error: 'La ligne budgétaire est invalide ou appartient à un autre projet.' }
    }
  }

  // Validate wbs_task_id belongs to this project
  if (parsed.data.wbs_task_id) {
    const { data: wbs } = await supabase.from('wbs_tasks').select('project_id').eq('id', parsed.data.wbs_task_id).single()
    if (!wbs || wbs.project_id !== parsed.data.project_id) {
      return { error: 'La tâche WBS est invalide ou appartient à un autre projet.' }
    }
  }

  const { data: result, error } = await supabase
    .from('operations_journal')
    .update({
      budget_line_id: parsed.data.budget_line_id,
      wbs_task_id: parsed.data.wbs_task_id,
      task_code: parsed.data.task_code,
      phase_wbs: parsed.data.phase_wbs,
      status: parsed.data.status,
      planned_cost: parsed.data.planned_cost,
      actual_cost: parsed.data.actual_cost,
      funding_source_id: parsed.data.funding_source_id,
      operation_date: parsed.data.operation_date
    })
    .eq('id', parsed.data.id)
    .eq('project_id', parsed.data.project_id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.project_id}/budget/journal`)
  return { data: result }
}

export async function batchUpdateOperationsFromBank(
  projectId: string, 
  updates: { operationId: string, actualCost: number, newStatus: string, operationDate?: string }[]
) {
  const supabase = await createClient()
  
  // Verify access
  try {
    await requireProjectPermission(projectId, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  // Validate updates before executing
  for (const update of updates) {
    if (update.newStatus === 'decaisse') {
      if (!update.actualCost || update.actualCost <= 0) {
        return { error: `Montant débité invalide pour l'opération ${update.operationId}` }
      }
      if (!update.operationDate || isNaN(new Date(update.operationDate).getTime())) {
        return { error: `Date d'opération bancaire invalide pour l'opération ${update.operationId}` }
      }
    }
  }

  // Update operations in batch
  const errors = []
  for (const update of updates) {
    if (update.newStatus === 'decaisse') {
      const { error } = await supabase.rpc('fn_add_operation_disbursement', {
        p_project_id: projectId,
        p_operation_id: update.operationId,
        p_disbursement_date: update.operationDate,
        p_amount: update.actualCost,
        p_reference_piece: 'Rapprochement bancaire'
      })
      if (error) {
        errors.push({ id: update.operationId, error: error.message })
      }
    } else {
      const { error } = await supabase
        .from('operations_journal')
        .update({
          status: update.newStatus as any
        })
        .eq('id', update.operationId)

      if (error) {
        errors.push({ id: update.operationId, error: error.message })
      }
    }
  }

  if (errors.length > 0) {
    return { error: 'Certaines mises à jour ont échoué', details: errors }
  }

  revalidatePath(`/projects/${projectId}/budget`)
  revalidatePath(`/projects/${projectId}/budget/journal`)
  revalidatePath(`/projects/${projectId}/budget/bailleurs`)
  revalidatePath(`/projects/${projectId}/evm`)
  
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
    await requireRole(payload.project_id, ['OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT'])
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
    await requireRole(payload.project_id, ['OWNER', 'PROJECT_MANAGER', 'ACCOUNTANT'])
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
