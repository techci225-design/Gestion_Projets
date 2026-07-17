import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
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

  const { data: fundingSources } = await supabase
    .from('funding_sources')
    .select('id, name')
    .eq('project_id', id)
    .order('name', { ascending: true })

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

  const items = operationsData as OperationJournal[]

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <JournalClient items={items} projectId={id} budgetLines={budgetLines || []} fundingSources={fundingSources || []} />
    </div>
  )
}
