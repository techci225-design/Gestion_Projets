'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { Plus } from 'lucide-react'

function AlertBadge({ value }: { value: number }) {
  if (value >= 0.8) {
    return <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">{Math.round(value * 100)}%</span>
  }
  if (value >= 0.5) {
    return <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">{Math.round(value * 100)}%</span>
  }
  return <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">{Math.round(value * 100)}%</span>
}

function ProgressBar({ percentage }: { percentage: number }) {
  const p = Math.min(Math.max(percentage, 0), 100)
  let color = 'bg-[#DC2626]'
  if (p >= 50) color = 'bg-[#F59E0B]'
  if (p >= 80) color = 'bg-[#16A34A]'
  
  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-dim rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{Math.round(p)}%</span>
    </div>
  )
}

import { AddBailleurModal } from './add-bailleur-modal'

export function BailleursClient({ projectId, bailleurs }: { projectId: string, bailleurs: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="p-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Sources de financement</h2>
          <p className="text-base text-text-secondary">Suivi des engagements et décaissements par bailleur.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nouvelle source
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-dim border-b border-border">
                <th className="p-4 text-xs font-medium text-text-secondary">Bailleur</th>
                <th className="p-4 text-xs font-medium text-text-secondary">Type</th>
                <th className="p-4 text-xs font-medium text-text-secondary text-right">Montant Engagé (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary text-right">Total Décaissé (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary text-right">Solde Restant (FCFA)</th>
                <th className="p-4 text-xs font-medium text-text-secondary w-40">Taux d'utilisation</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {bailleurs.map((item, index) => (
                <tr key={item.funding_source_id} className={`border-b border-border hover:bg-surface-bright transition-colors h-12 ${index % 2 !== 0 ? 'bg-surface-dim/30' : ''}`}>
                  <td className="p-4 font-semibold">{item.bailleur_name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-surface-dim text-text-secondary border border-border rounded-md text-xs font-medium">
                      {item.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">{formatCurrency(item.total_engage)}</td>
                  <td className="p-4 text-right font-medium">{formatCurrency(item.total_decaisse)}</td>
                  <td className="p-4 text-right font-semibold">{formatCurrency(item.solde_restant)}</td>
                  <td className="p-4">
                    <ProgressBar percentage={Number(item.taux_utilisation) * 100} />
                  </td>
                </tr>
              ))}
              {bailleurs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary">Aucune source de financement trouvée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddBailleurModal 
        projectId={projectId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  )
}
