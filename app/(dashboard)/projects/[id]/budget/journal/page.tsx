import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { JournalClient, OperationJournal } from './journal-client'

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: operationsData, error } = await supabase
    .from('operations_journal')
    .select('*, budget_lines(id, code, label)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: budgetLines } = await supabase
    .from('budget_lines')
    .select('id, code, label')
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

  const items = operationsData as OperationJournal[]

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <JournalClient items={items} projectId={id} budgetLines={budgetLines || []} />
    </div>
  )
}
