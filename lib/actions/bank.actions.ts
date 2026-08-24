'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireProjectPermission } from './auth.actions'
import { revalidatePath } from 'next/cache'
import { parseBankStatement } from '@/lib/utils/bank-parser'

const reconcileSchema = z.object({
  projectId: z.string().uuid(),
  bankTransactionId: z.string().uuid(),
  splits: z.array(z.object({
    operationId: z.string().uuid(),
    amount: z.number().positive("Le montant doit être strictement positif."),
    notes: z.string().optional()
  })).min(1, "Au moins une affectation d'engagement est requise.")
})

export async function importBankStatementAction(params: {
  projectId: string
  fileName: string
  fileContent: string
  accountReference?: string
  statementCurrency?: string
}) {
  try {
    await requireProjectPermission(params.projectId, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // 1. Récupération du projet et validation devise
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, currency')
    .eq('id', params.projectId)
    .single()

  if (projErr || !project) {
    return { error: 'Projet introuvable' }
  }

  const projectCurrency = project.currency || 'XOF'
  const statementCurrency = params.statementCurrency || projectCurrency

  if (statementCurrency !== projectCurrency) {
    return { 
      error: `BANK_CURRENCY_MISMATCH: La devise du relevé (${statementCurrency}) ne correspond pas à la devise du projet (${projectCurrency}).`,
      code: 'BANK_CURRENCY_MISMATCH' 
    }
  }

  // 2. Parser le relevé bancaire côté serveur
  const parseResult = parseBankStatement(
    params.fileContent,
    params.projectId,
    projectCurrency,
    params.accountReference
  )

  if (parseResult.transactions.length === 0) {
    return { error: 'Aucune transaction valide trouvée dans le fichier.', details: parseResult.errors }
  }

  // 3. Vérification d'idempotence fichier (file_hash)
  const { data: existingImport } = await supabase
    .from('bank_imports')
    .select('id, file_name, imported_at')
    .eq('project_id', params.projectId)
    .eq('file_hash', parseResult.file_hash)
    .maybeSingle()

  if (existingImport) {
    return {
      error: 'BANK_FILE_ALREADY_IMPORTED',
      code: 'BANK_FILE_ALREADY_IMPORTED',
      message: `Ce fichier a déjà été importé le ${new Date(existingImport.imported_at).toLocaleDateString('fr-FR')}`,
      importId: existingImport.id
    }
  }

  // 4. Insertion du relevé (bank_imports)
  const { data: bankImport, error: importErr } = await supabase
    .from('bank_imports')
    .insert({
      project_id: params.projectId,
      file_name: params.fileName,
      file_hash: parseResult.file_hash,
      account_reference: parseResult.account_reference,
      statement_start_date: parseResult.statement_start_date,
      statement_end_date: parseResult.statement_end_date,
      currency: projectCurrency,
      total_rows: parseResult.total_rows,
      imported_by: user.id
    })
    .select()
    .single()

  if (importErr) {
    return { error: `Erreur d'import : ${importErr.message}` }
  }

  // 5. Insertion des transactions bancaires
  const transactionsToInsert = parseResult.transactions.map(tx => ({
    bank_import_id: bankImport.id,
    project_id: params.projectId,
    source_row_index: tx.source_row_index,
    transaction_date: tx.transaction_date,
    value_date: tx.value_date || null,
    description: tx.description,
    bank_reference: tx.bank_reference || null,
    debit_amount: tx.debit_amount,
    credit_amount: tx.credit_amount,
    currency: tx.currency,
    fingerprint: tx.fingerprint
  }))

  const { error: txErr } = await supabase
    .from('bank_transactions')
    .insert(transactionsToInsert)

  if (txErr) {
    // Nettoyage en cas d'échec
    await supabase.from('bank_imports').delete().eq('id', bankImport.id)
    return { error: `Erreur lors de l'enregistrement des transactions : ${txErr.message}` }
  }

  revalidatePath(`/projects/${params.projectId}/budget/import-releve`)
  revalidatePath(`/projects/${params.projectId}/budget/journal`)

  return {
    success: true,
    importId: bankImport.id,
    totalRows: parseResult.total_rows,
    debitCount: parseResult.transactions.filter(t => t.debit_amount > 0).length,
    creditCount: parseResult.transactions.filter(t => t.credit_amount > 0).length
  }
}

export async function getBankTransactionsAction(projectId: string, importId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('v_bank_transactions')
    .select('*')
    .eq('project_id', projectId)
    .order('transaction_date', { ascending: false })

  if (importId) {
    query = query.eq('bank_import_id', importId)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function reconcileBankTransactionAction(data: z.infer<typeof reconcileSchema>) {
  const parsed = reconcileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Données de rapprochement invalides', details: parsed.error.issues }
  }

  try {
    await requireProjectPermission(parsed.data.projectId, 'edit_budget')
  } catch (error: any) {
    return { error: error.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Exécution atomique via RPC PostgreSQL fn_reconcile_bank_transaction
  const { data: rpcResult, error } = await supabase.rpc('fn_reconcile_bank_transaction', {
    p_project_id: parsed.data.projectId,
    p_bank_transaction_id: parsed.data.bankTransactionId,
    p_splits: parsed.data.splits,
    p_user_id: user.id
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${parsed.data.projectId}/budget`)
  revalidatePath(`/projects/${parsed.data.projectId}/budget/journal`)
  revalidatePath(`/projects/${parsed.data.projectId}/budget/import-releve`)
  revalidatePath(`/projects/${parsed.data.projectId}/evm`)

  return { success: true, data: rpcResult }
}
