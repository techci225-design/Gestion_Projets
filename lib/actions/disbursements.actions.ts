'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from './auth.actions'
import { revalidatePath } from 'next/cache'

const disbursementSchema = z.object({
  projectId: z.string().uuid(),
  operationId: z.string().uuid(),
  amount: z.number().positive("Le montant du décaissement doit être strictement positif."),
  disbursementDate: z.string().min(1, "La date de décaissement est obligatoire."),
  referencePiece: z.string().optional().nullable(),
  fundingSourceId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable()
})

const reversalSchema = z.object({
  projectId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amount: z.number().positive("Le montant à contre-passer doit être strictement positif."),
  reason: z.string().min(3, "Un motif explicite est obligatoire (min 3 caractères).")
})

export async function addOperationDisbursement(data: z.infer<typeof disbursementSchema>) {
  const parsed = disbursementSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Données invalides', details: parsed.error.issues }
  }

  try {
    await requireProjectPermission(parsed.data.projectId, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Exécution via la RPC PostgreSQL transactionnelle (verrouillage anti-concurrence et anti-dépassement)
  const { data: disbursement, error } = await supabase.rpc('fn_add_operation_disbursement', {
    p_project_id: parsed.data.projectId,
    p_operation_id: parsed.data.operationId,
    p_disbursement_date: parsed.data.disbursementDate,
    p_amount: parsed.data.amount,
    p_reference_piece: parsed.data.referencePiece || null,
    p_funding_source_id: parsed.data.fundingSourceId || null,
    p_notes: parsed.data.notes || null,
    p_created_by: user.id
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.projectId}/budget`)
  revalidatePath(`/projects/${parsed.data.projectId}/budget/journal`)
  revalidatePath(`/projects/${parsed.data.projectId}/evm`)

  return { success: true, data: disbursement }
}

export async function createDisbursementReversalAction(data: z.infer<typeof reversalSchema>) {
  const parsed = reversalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Données invalides', details: parsed.error.issues }
  }

  try {
    await requireProjectPermission(parsed.data.projectId, 'edit_budget')
  } catch (error: any) {
    return { error: error.message, code: 'FORBIDDEN' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Exécution via la RPC PostgreSQL atomique fn_create_disbursement_reversal
  const { data: result, error } = await supabase.rpc('fn_create_disbursement_reversal', {
    p_project_id: parsed.data.projectId,
    p_payment_id: parsed.data.paymentId,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason,
    p_user_id: user.id
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.projectId}/budget`)
  revalidatePath(`/projects/${parsed.data.projectId}/budget/journal`)
  revalidatePath(`/projects/${parsed.data.projectId}/evm`)

  return { success: true, data: result }
}

export async function getOperationDisbursements(projectId: string, operationId?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('operation_disbursements')
    .select(`
      id,
      operation_id,
      project_id,
      disbursement_date,
      amount,
      entry_type,
      reversal_of_id,
      reversal_reason,
      bank_transaction_id,
      reference_piece,
      external_reference,
      funding_source_id,
      notes,
      created_at,
      funding_sources (
        name
      )
    `)
    .eq('project_id', projectId)
    .order('disbursement_date', { ascending: true })

  if (operationId) {
    query = query.eq('operation_id', operationId)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
