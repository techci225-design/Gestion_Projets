import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportReleveClient } from './import-releve-client'

export default async function ImportRelevePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Verify access
  const { data: project } = await supabase
    .from('projects')
    .select('id, currency')
    .eq('id', id)
    .single()

  if (!project?.currency) redirect('/projects')

  // Load operations with budget lines
  const [
    { data: operationsData, error },
    { data: disbursementsData },
    { data: pendingTxData }
  ] = await Promise.all([
    supabase
      .from('operations_journal')
      .select(`
        id, 
        task_code, 
        status, 
        planned_cost, 
        budget_line_id,
        budget_lines (
          code,
          label
        )
      `)
      .eq('project_id', id)
      .neq('status', 'annule')
      .order('created_at', { ascending: false }),
    supabase
      .from('operation_disbursements')
      .select('operation_id, amount, entry_type')
      .eq('project_id', id),
    supabase
      .from('v_bank_transactions')
      .select('*')
      .eq('project_id', id)
      .order('transaction_date', { ascending: false })
  ])

  if (error) {
    return <div className="p-6 text-danger">Erreur de chargement: {error.message}</div>
  }

  const disbsByOp: Record<string, number> = {}
  disbursementsData?.forEach(d => {
    const amount = Number(d.amount) || 0
    disbsByOp[d.operation_id] = (disbsByOp[d.operation_id] || 0) + (d.entry_type === 'REVERSAL' ? -amount : amount)
  })

  const operations = (operationsData || []).map(op => {
    const totalPaid = disbsByOp[op.id] || 0
    const remainingCommitted = Math.max(0, (Number(op.planned_cost) || 0) - totalPaid)
    return {
      ...op,
      total_paid: totalPaid,
      remaining_committed: remainingCommitted
    }
  }).filter(op => op.remaining_committed > 0)

  return (
    <ImportReleveClient 
      projectId={id} 
      operations={operations} 
      pendingTransactions={pendingTxData || []} 
      currency={project.currency}
    />
  )
}
