import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'

export default async function LogframePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: logframeItems, error } = await supabase
    .from('logframe_items')
    .select('*')
    .eq('project_id', id)
    .order('level', { ascending: true }) // Not ideal ordering, but fine for basic view

  if (error) {
    return (
      <div className="p-6">
        <Header title="Cadre Logique" />
        <div className="mt-6 text-danger">Erreur de chargement: {error.message}</div>
      </div>
    )
  }

  // Helper to map levels to readable strings
  const levelLabels: Record<string, string> = {
    objectif_global: 'Objectif Global',
    objectif_specifique: 'Objectif Spécifique',
    resultat: 'Résultat',
    activite: 'Activité',
  }

  // Sort logically if possible, or just render flat
  return (
    <div className="flex flex-col h-full">
      <Header title="Cadre Logique" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-48">Niveau</th>
                  <th className="p-4 w-64">Intervention</th>
                  <th className="p-4">Indicateur (IOV)</th>
                  <th className="p-4">Cible</th>
                  <th className="p-4">Sources de vérification</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {logframeItems && logframeItems.length > 0 ? (
                  logframeItems.map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                      <td className="p-4 font-medium text-text-secondary">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold ${
                          item.level === 'objectif_global' ? 'bg-primary text-white' :
                          item.level === 'objectif_specifique' ? 'bg-primary/20 text-primary' :
                          item.level === 'resultat' ? 'bg-success/20 text-success' :
                          'bg-surface-dim text-text-secondary'
                        }`}>
                          {levelLabels[item.level] || item.level}
                        </span>
                      </td>
                      <td className="p-4 text-text-primary">{item.intervention_label}</td>
                      <td className="p-4 text-text-secondary">{item.indicator || '—'}</td>
                      <td className="p-4 text-text-secondary">{item.target || '—'}</td>
                      <td className="p-4 text-text-secondary">{item.verification_source || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary">
                      Aucun élément dans le cadre logique.
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
