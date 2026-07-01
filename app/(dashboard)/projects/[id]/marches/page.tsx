import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function MarchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: marches, error } = await supabase
    .from('procurement_plan')
    .select('*')
    .eq('project_id', id)
    .order('planned_publication_date', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <Header title="Passation des Marchés" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Plan de Passation des Marchés (PPM)" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-64">Description du Marché</th>
                  <th className="p-4 text-center">Type</th>
                  <th className="p-4 text-center">Méthode</th>
                  <th className="p-4 text-center">Revue</th>
                  <th className="p-4 text-right">Montant Estimé</th>
                  <th className="p-4 text-center">Avis Prévu</th>
                  <th className="p-4 text-center">Signature Prévue</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {marches && marches.length > 0 ? (
                  marches.map((marche) => (
                    <tr key={marche.id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                      <td className="p-4 text-text-primary font-medium">{marche.description}</td>
                      <td className="p-4 text-center text-text-secondary">
                        <span className="bg-surface-dim text-text-primary px-2 py-1 rounded text-xs">{marche.procurement_type}</span>
                      </td>
                      <td className="p-4 text-center text-text-secondary">{marche.procurement_method}</td>
                      <td className="p-4 text-center text-text-secondary">{marche.review_type}</td>
                      <td className="p-4 text-right font-medium text-text-primary">
                        {formatCurrency(marche.estimated_amount)}
                      </td>
                      <td className="p-4 text-center text-text-secondary">
                        {marche.planned_publication_date ? format(new Date(marche.planned_publication_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="p-4 text-center text-text-secondary">
                        {marche.planned_signing_date ? format(new Date(marche.planned_signing_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      Aucun marché prévu dans le plan.
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
