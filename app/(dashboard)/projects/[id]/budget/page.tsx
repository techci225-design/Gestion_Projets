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
  let logframeData = null
  let projectCurrency = 'FCFA'
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

    const resRawBudget = await supabase
      .from('budget_lines')
      .select('*')
      .eq('project_id', id)
    const rawBudget = resRawBudget.data || []
    
    // Merge raw budget fields into budgetData
    if (budgetData && rawBudget) {
      budgetData = budgetData.map((item: any) => {
        const raw = rawBudget.find((r: any) => r.id === item.budget_line_id)
        return {
          ...item,
          unit: raw?.unit,
          quantity: raw?.quantity,
          unit_cost: raw?.unit_cost,
          funding_source_id: raw?.funding_source_id,
        }
      })
    }

    const resOps = await supabase
      .from('operations_journal')
      .select('*')
      .eq('project_id', id)
      .eq('status', 'decaisse')
      .order('created_at', { ascending: true })
    operationsData = resOps.data

    const resLogframe = await supabase
      .from('logframe_items')
      .select('intervention_label, created_at')
      .eq('project_id', id)
      .eq('level', 'objectif_specifique')
      .order('created_at', { ascending: true })
    logframeData = resLogframe.data || []

    const resProject = await supabase
      .from('projects')
      .select('currency')
      .eq('id', id)
      .single()
    projectCurrency = resProject.data?.currency || 'FCFA'

    queryError = res.error || resFunding.error || resRawBudget.error || resOps.error || resLogframe.error || resProject.error
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
  const objectifsSpecifiques = logframeData?.map((l: any) => l.intervention_label) || []

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <BudgetClient 
        items={items} 
        fundingSources={fundingData || []} 
        operations={operationsData || []}
        objectifsSpecifiques={objectifsSpecifiques}
        projectId={id}
        currency={projectCurrency}
        isNewProject={isNewProject === 'true'}
      />
    </div>
  )
}
