'use client'

import React, { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddOperationModal } from './add-operation-modal'

export interface OperationJournal {
  id: string
  project_id: string
  task_code: string
  status: 'planifie' | 'engage' | 'decaisse' | 'annule'
  planned_cost: number
  actual_cost: number | null
  reste_a_engager: number
  montant_engage: number
  montant_decaisse: number
  ecart_budgetaire: number
  budget_lines?: {
    id: string
    code: string
    label: string
  }
}

export function JournalClient({ items, projectId, budgetLines }: { items: OperationJournal[], projectId: string, budgetLines: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifie': return 'bg-slate-100 text-slate-600'
      case 'engage': return 'bg-blue-100 text-blue-700'
      case 'decaisse': return 'bg-green-100 text-green-700'
      case 'annule': return 'bg-red-100 text-red-500 line-through'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifie': return 'Planifié'
      case 'engage': return 'Engagé'
      case 'decaisse': return 'Décaissé'
      case 'annule': return 'Annulé'
      default: return status
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Journal des opérations</h2>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-surface-dim border border-border rounded-lg text-sm font-medium text-primary flex items-center gap-2 hover:bg-border transition-colors">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nouvelle opération
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-surface-dim border-b border-border text-text-secondary font-medium">
              <tr>
                <th className="p-4 whitespace-nowrap">ID Tâche</th>
                <th className="p-4">Ligne Budgétaire</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Coût Prévu (FCFA)</th>
                <th className="p-4 text-right">Coût Réel (FCFA)</th>
                <th className="p-4 text-right">Reste à Engager (FCFA)</th>
                <th className="p-4 text-right">Montant Engagé (FCFA)</th>
                <th className="p-4 text-right">Montant Décaissé (FCFA)</th>
                <th className="p-4 text-right">Écart (FCFA)</th>
              </tr>
            </thead>
            <tbody className="text-text-primary">
              {items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-border/30 h-10 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${item.status === 'annule' ? 'opacity-70' : ''}`}>
                  <td className={`p-4 font-medium text-primary ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {item.task_code}
                  </td>
                  <td className={`p-4 truncate max-w-[200px] ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {item.budget_lines?.code} {item.budget_lines?.label}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {formatCurrency(item.planned_cost)}
                  </td>
                  <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {item.actual_cost !== null ? formatCurrency(item.actual_cost) : '—'}
                  </td>
                  <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {formatCurrency(item.reste_a_engager)}
                  </td>
                  <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {formatCurrency(item.montant_engage)}
                  </td>
                  <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                    {formatCurrency(item.montant_decaisse)}
                  </td>
                  <td className={`p-4 text-right font-mono font-medium ${
                    item.status === 'annule' ? 'text-text-secondary line-through' :
                    item.ecart_budgetaire > 0 ? 'text-success' :
                    item.ecart_budgetaire < 0 ? 'text-danger' : 'text-text-secondary'
                  }`}>
                    {item.status === 'decaisse' 
                      ? (item.ecart_budgetaire > 0 ? '+' : '') + formatCurrency(item.ecart_budgetaire) 
                      : '—'}
                  </td>
                </tr>
              ))}
              
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-secondary">Aucune opération trouvée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddOperationModal 
          projectId={projectId}
          budgetLines={budgetLines}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
