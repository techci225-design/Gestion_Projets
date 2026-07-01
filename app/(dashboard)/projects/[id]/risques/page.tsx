import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'

export default async function RisquesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: risques, error } = await supabase
    .from('risks')
    .select('*')
    .eq('project_id', id)

  if (error) {
    return (
      <div className="p-6">
        <Header title="Matrice des Risques" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  // Calculate criticality and sort by it descending
  const sortedRisks = risques?.map(r => ({
    ...r,
    criticality: r.probability * r.impact
  })).sort((a, b) => b.criticality - a.criticality) || []

  const getCriticalityBadge = (crit: number) => {
    if (crit >= 6) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-danger/10 text-danger">Élevée ({crit})</span>
    if (crit >= 3) return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-warning/10 text-warning">Moyenne ({crit})</span>
    return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-success/10 text-success">Faible ({crit})</span>
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Matrice des Risques" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-48">Catégorie</th>
                  <th className="p-4 w-64">Description</th>
                  <th className="p-4 text-center">Probabilité</th>
                  <th className="p-4 text-center">Impact</th>
                  <th className="p-4 text-center">Criticité</th>
                  <th className="p-4">Stratégie d'atténuation</th>
                  <th className="p-4">Responsable</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {sortedRisks.length > 0 ? (
                  sortedRisks.map((risque) => (
                    <tr key={risque.id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                      <td className="p-4 font-medium text-primary">{risque.category}</td>
                      <td className="p-4 text-text-primary">{risque.description}</td>
                      <td className="p-4 text-center text-text-secondary">{risque.probability}</td>
                      <td className="p-4 text-center text-text-secondary">{risque.impact}</td>
                      <td className="p-4 text-center">{getCriticalityBadge(risque.criticality)}</td>
                      <td className="p-4 text-text-secondary text-sm">{risque.mitigation_strategy || '—'}</td>
                      <td className="p-4 text-text-secondary">{risque.responsible || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      Aucun risque identifié.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
