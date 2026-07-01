import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: budgetLines, error } = await supabase
    .from('v_budget_consumption')
    .select('*')
    .eq('project_id', id)
    .order('code', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <Header title="Nomenclature Budgétaire" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Nomenclature Budgétaire & Consommation" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-24">Code</th>
                  <th className="p-4 w-64">Libellé</th>
                  <th className="p-4 text-right">Budget Alloué</th>
                  <th className="p-4 text-right">Engagé</th>
                  <th className="p-4 text-right">Décaissé</th>
                  <th className="p-4 text-right">Solde Disponible</th>
                  <th className="p-4 text-center">Taux</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {budgetLines && budgetLines.length > 0 ? (
                  budgetLines.map((line) => {
                    const taux = (line.taux_consommation * 100).toFixed(1)
                    let statusColor = 'text-success bg-success/10' // default vert
                    if (line.niveau_alerte === 'orange') statusColor = 'text-warning bg-warning/10'
                    if (line.niveau_alerte === 'rouge') statusColor = 'text-danger bg-danger/10'
                    if (line.niveau_alerte === 'neutre') statusColor = 'text-text-secondary bg-surface-dim'

                    return (
                      <tr key={line.budget_line_id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                        <td className="p-4 font-semibold text-primary">{line.code}</td>
                        <td className="p-4 text-text-primary">{line.label}</td>
                        <td className="p-4 text-right font-medium text-text-primary">
                          {formatCurrency(line.initial_allocated_amount)}
                        </td>
                        <td className="p-4 text-right text-text-secondary">
                          {formatCurrency(line.total_engage)}
                        </td>
                        <td className="p-4 text-right text-text-secondary">
                          {formatCurrency(line.total_decaisse)}
                        </td>
                        <td className="p-4 text-right font-semibold text-primary">
                          {formatCurrency(line.solde_disponible)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>
                            {taux}%
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      Aucune ligne budgétaire définie.
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
