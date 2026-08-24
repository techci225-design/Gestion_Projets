import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { JournalClient, OperationJournal } from './journal-client'
import { getDisplayCurrency } from '@/lib/utils/currency'

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: operationsData, error } = await supabase
    .from('operations_journal')
    .select('*, budget_lines(id, code, label)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: attachments } = await supabase
    .from('attachments')
    .select('id, related_id')
    .eq('project_id', id)
    .eq('related_table', 'operations_journal')

  const attachmentCounts: Record<string, number> = {}
  attachments?.forEach(a => {
    attachmentCounts[a.related_id] = (attachmentCounts[a.related_id] || 0) + 1
  })

  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('id, code, label')
    .eq('project_id', id)
    .order('code', { ascending: true })

  const { data: fundingSources } = await supabase
    .from('funding_sources')
    .select('id, name')
    .eq('project_id', id)
    .order('name', { ascending: true })

  const { data: wbsTasksRes } = await supabase
    .from('wbs_tasks')
    .select('id, code, name')
    .eq('project_id', id)
    .order('code', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Erreur de chargement: {error.message}
        </div>
      </div>
    )
  }

  if (!budgetLines || budgetLines.length === 0) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-surface m-6 rounded-xl border border-border shadow-sm text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Aucune ligne budgétaire</h2>
        <p className="text-text-secondary mb-6 max-w-md">Vous devez d'abord définir le budget de votre projet avant de pouvoir y saisir des opérations financières.</p>
        <Link href={`/projects/${id}/budget`} className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Définissez d'abord votre budget →
        </Link>
      </div>
    )
  }

  const { data: disbursementsData } = await supabase
    .from('operation_disbursements')
    .select('id, operation_id, project_id, disbursement_date, amount, entry_type, reversal_of_id, reversal_reason, bank_transaction_id, reference_piece, external_reference, notes, created_at, funding_source_id')
    .eq('project_id', id)
    .order('disbursement_date', { ascending: true })

  const disbursementsByOp: Record<string, any[]> = {}
  disbursementsData?.forEach(d => {
    if (!disbursementsByOp[d.operation_id]) disbursementsByOp[d.operation_id] = []
    disbursementsByOp[d.operation_id].push(d)
  })

  const wbsMap = new Map((wbsTasksRes || []).map(t => [t.id, t]))

  const items = (operationsData as any[]).map(op => {
    const opDisbs = disbursementsByOp[op.id] || []
    const totalPaid = opDisbs.reduce((sum, d) => {
      const amt = Number(d.amount) || 0
      return d.entry_type === 'REVERSAL' ? sum - amt : sum + amt
    }, 0)
    const plannedCost = Number(op.planned_cost) || 0
    const remainingCommitted = op.status === 'annule' ? 0 : Math.max(0, plannedCost - totalPaid)
    
    let paymentState: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID'
    if (totalPaid >= plannedCost && plannedCost > 0) {
      paymentState = 'PAID'
    } else if (totalPaid > 0) {
      paymentState = 'PARTIALLY_PAID'
    }

    const currentWbsTask = op.wbs_task_id ? wbsMap.get(op.wbs_task_id) : null

    return {
      ...op,
      attachments_count: attachmentCounts[op.id] || 0,
      disbursements: opDisbs,
      total_paid: totalPaid,
      remaining_committed: remainingCommitted,
      payment_state: paymentState,
      current_wbs_code: currentWbsTask?.code || null,
      current_wbs_name: currentWbsTask?.name || null
    }
  }) as OperationJournal[]

  const { data: project } = await supabase
    .from('projects')
    .select('currency')
    .eq('id', id)
    .single()
  const currency = getDisplayCurrency(project?.currency)

  return (
    <div className="p-6 pb-24 md:pb-6">
      <JournalClient 
        items={items} 
        projectId={id} 
        budgetLines={budgetLines || []} 
        fundingSources={fundingSources || []} 
        wbsTasks={wbsTasksRes || []}
        currency={currency} 
      />
    </div>
  )
}
