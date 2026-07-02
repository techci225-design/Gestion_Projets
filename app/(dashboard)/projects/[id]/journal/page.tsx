import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/Header'
import { formatCurrency } from '@/lib/utils/format-currency'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let journal = null
  let queryError = null

  try {
    const res = await supabase
      .from('operations_journal')
      .select(`
        *,
        budget_lines(code, label)
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false })
    journal = res.data
    queryError = res.error
  } catch (err: any) {
    queryError = { message: err.message || 'Erreur de connexion à la base de données' }
  }

  if (queryError) {
    return (
      <div className="p-6">
        <Header title="Journal des Opérations" />
        <div className="mt-6 text-danger bg-red-50 border border-red-200 p-4 rounded-lg">Erreur de chargement: {queryError.message}</div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifie':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Planifié</span>
      case 'engage':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Engagé</span>
      case 'decaisse':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Décaissé</span>
      case 'annulé':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500 line-through">Annulé</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Journal des Opérations" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                  <th className="p-4 w-32">Date</th>
                  <th className="p-4 w-64">Description</th>
                  <th className="p-4">Ligne Budget</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 text-right">Prévu</th>
                  <th className="p-4 text-right">Engagé</th>
                  <th className="p-4 text-right">Décaissé</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {journal && journal.length > 0 ? (
                  journal.map((op) => (
                    <tr key={op.id} className="border-b border-border hover:bg-surface-dim/50 transition-colors">
                      <td className="p-4 text-text-secondary">
                        {format(new Date(op.created_at), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="p-4 text-text-primary font-medium">{op.task_code} {op.phase_wbs ? `- ${op.phase_wbs}` : ''}</td>
                      <td className="p-4 text-text-secondary">
                        {op.budget_lines ? `${op.budget_lines.code} - ${op.budget_lines.label}` : '—'}
                      </td>
                      <td className="p-4 text-center">{getStatusBadge(op.status)}</td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatCurrency(op.planned_cost)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatCurrency(op.montant_engage)}
                      </td>
                      <td className="p-4 text-right font-semibold text-primary">
                        {formatCurrency(op.montant_decaisse)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      Aucune opération enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col p-4 gap-4 bg-background-main">
            {journal && journal.length > 0 ? (
              journal.map((op) => (
                <div key={op.id} className="bg-surface p-4 rounded-xl shadow-sm border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-on-surface">{op.task_code} {op.phase_wbs ? `- ${op.phase_wbs}` : ''}</h4>
                      <p className="text-xs text-on-surface-variant">{format(new Date(op.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                    </div>
                    {getStatusBadge(op.status)}
                  </div>
                  <div className="text-sm text-on-surface-variant mb-4 pb-4 border-b border-border">
                    Ligne : {op.budget_lines ? `${op.budget_lines.code}` : '—'}
                  </div>
                  <div className="flex justify-between items-end text-sm">
                    <div>
                      <p className="text-on-surface-variant text-xs">Engagé</p>
                      <p className="font-medium">{formatCurrency(op.montant_engage)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-on-surface-variant text-xs">Décaissé</p>
                      <p className="font-bold text-primary">{formatCurrency(op.montant_decaisse)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-on-surface-variant bg-surface rounded-xl">
                Aucune opération enregistrée.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
