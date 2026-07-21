import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { BudgetClient, BudgetConsumption } from './budget-client'

export default async function BudgetPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const { new: isNewProject } = await searchParams
  const supabase = await createClient()

  let budgetData = null
  let fundingData = null
  let operationsData = null
  let queryError = null

  try {
    const res = await supabase
      .from('v_budget_consumption')
      .select('*')
      .eq('project_id', id)
      .order('code', { ascending: true })
    budgetData = res.data

    const resFunding = await supabase
      .from('v_funding_tracking')
      .select('*')
      .eq('project_id', id)
    fundingData = resFunding.data

    const resOps = await supabase
      .from('operations_journal')
      .select('*')
      .eq('project_id', id)
      .eq('status', 'decaisse')
      .order('created_at', { ascending: true })
    operationsData = resOps.data

    queryError = res.error || resFunding.error || resOps.error
  } catch (err: any) {
    queryError = { message: err.message || 'Erreur de connexion à la base de données' }
  }

  if (queryError) {
    return (
      <div className="p-6">
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Erreur de chargement: {queryError.message}
        </div>
      </div>
    )
  }

  const items = (budgetData || []) as BudgetConsumption[]

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <BudgetClient 
        items={items} 
        fundingSources={fundingData || []} 
        operations={operationsData || []}
        projectId={id} 
        isNewProject={isNewProject === 'true'}
      />
    </div>
  )
}
