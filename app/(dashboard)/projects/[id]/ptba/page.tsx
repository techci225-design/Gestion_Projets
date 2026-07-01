import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { Check } from 'lucide-react'

export default async function PTBAPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch PTBA activities
  const { data: ptba, error } = await supabase
    .from('ptba_activities')
    .select(`
      *,
      logframe_items(intervention_label)
    `)
    .eq('project_id', id)
    .order('code', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <Header title="PTBA (Plan de Travail)" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="PTBA (Plan de Travail et Budget Annuel)" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-24">Code</th>
                  <th className="p-4 w-64">Description</th>
                  <th className="p-4">Responsable</th>
                  <th className="p-4 text-center">Q1</th>
                  <th className="p-4 text-center">Q2</th>
                  <th className="p-4 text-center">Q3</th>
                  <th className="p-4 text-center">Q4</th>
                  <th className="p-4 text-right">Budget Prévu</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {ptba && ptba.length > 0 ? (
                  ptba.map((activity) => (
                    <tr key={activity.id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                      <td className="p-4 font-semibold text-primary">{activity.code}</td>
                      <td className="p-4">
                        <div className="text-text-primary">{activity.description}</div>
                        {activity.logframe_items && (
                          <div className="text-[11px] text-text-secondary mt-1">
                            Lien: {activity.logframe_items.intervention_label}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-text-secondary">{activity.responsible || '—'}</td>
                      <td className="p-4 text-center">
                        {activity.q1 && <Check className="w-4 h-4 text-success inline-block" />}
                      </td>
                      <td className="p-4 text-center">
                        {activity.q2 && <Check className="w-4 h-4 text-success inline-block" />}
                      </td>
                      <td className="p-4 text-center">
                        {activity.q3 && <Check className="w-4 h-4 text-success inline-block" />}
                      </td>
                      <td className="p-4 text-center">
                        {activity.q4 && <Check className="w-4 h-4 text-success inline-block" />}
                      </td>
                      <td className="p-4 text-right font-medium text-text-primary">
                        {formatCurrency(activity.budget_planned)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary">
                      Aucune activité PTBA définie.
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
