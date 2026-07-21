'use client'

import React, { useState } from 'react'
import { Plus, Download, History, ClipboardList, Paperclip } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddOperationModal } from './add-operation-modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { AttachmentsTab } from '@/components/dashboard/AttachmentsTab'
import { CommentsTab } from '@/components/dashboard/CommentsTab'

export interface OperationJournal {
  id: string
  project_id: string
  task_code: string
  phase_wbs?: string
  status: 'planifie' | 'engage' | 'decaisse' | 'annule'
  planned_cost: number
  actual_cost: number | null
  reste_a_engager: number
  montant_engage: number
  montant_decaisse: number
  ecart_budgetaire: number
  attachments_count?: number
  budget_lines?: {
    id: string
    code: string
    label: string
  }
}

export function JournalClient({ items, projectId, budgetLines, fundingSources }: { items: OperationJournal[], projectId: string, budgetLines: any[], fundingSources: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<OperationJournal | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'docs' | 'comments'>('details')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifie': return 'bg-gray-100 text-gray-600'
      case 'engage': return 'bg-blue-100 text-blue-700'
      case 'decaisse': return 'bg-green-100 text-green-700'
      case 'annule': return 'bg-red-100 text-red-500 line-through'
      default: return 'bg-gray-100 text-gray-600'
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

  if (!budgetLines || budgetLines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="bg-surface border border-border rounded-xl p-8 max-w-md text-center shadow-sm">
          <h3 className="text-xl font-bold text-text-primary mb-3">Budget non défini</h3>
          <p className="text-text-secondary mb-6">
            Vous devez d'abord définir votre nomenclature budgétaire avant de saisir des opérations.
          </p>
          <a 
            href={`/projects/${projectId}/budget`}
            className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            Définir le budget
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Journal des opérations</h2>
        <div className="flex items-center gap-3">
          <a 
            href={`/api/export/excel?module=journal&project_id=${projectId}`}
            className="p-2 bg-surface-dim border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-border transition-colors flex items-center justify-center"
            title="Exporter en Excel"
          >
            <Download className="w-5 h-5" />
          </a>
          <a 
            href={`/projects/${projectId}/audit`}
            className="p-2 bg-surface-dim border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-border transition-colors flex items-center justify-center"
            title="Historique & Audit"
          >
            <History className="w-5 h-5" />
          </a>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#0f172a] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#1e293b] transition-colors shadow-sm ml-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle opération
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface border border-dashed border-border rounded-xl text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Aucune opération enregistrée</h3>
          <p className="text-text-secondary max-w-md mx-auto mb-8">
            Commencez par enregistrer votre première dépense ou engagement sur ce projet.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle opération
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-dim border-b border-border text-text-secondary font-medium">
                <tr>
                  <th className="p-4 whitespace-nowrap">ID Tâche</th>
                  <th className="p-4 whitespace-nowrap">Phase / WBS</th>
                  <th className="p-4">Ligne Budgétaire</th>
                  <th className="p-4">Docs</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right whitespace-nowrap">Coût Prévu (FCFA)</th>
                  <th className="p-4 text-right whitespace-nowrap">Coût Réel (FCFA)</th>
                  <th className="p-4 text-right whitespace-nowrap">Reste à Engager (FCFA)</th>
                  <th className="p-4 text-right whitespace-nowrap">Montant Engagé (FCFA)</th>
                  <th className="p-4 text-right whitespace-nowrap">Montant Décaissé (FCFA)</th>
                  <th className="p-4 text-right whitespace-nowrap">Écart (FCFA)</th>
                </tr>
              </thead>
              <tbody className="text-text-primary">
                {items.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-border/30 h-10 transition-colors cursor-pointer hover:bg-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${item.status === 'annule' ? 'opacity-70' : ''}`}
                    onClick={() => {
                      setSelectedOperation(item)
                      setActiveTab('details')
                    }}
                  >
                    <td className={`p-4 font-medium text-primary ${item.status === 'annule' ? 'line-through' : ''}`}>
                      {item.task_code}
                    </td>
                    <td className={`p-4 text-text-secondary ${item.status === 'annule' ? 'line-through' : ''}`}>
                      {item.phase_wbs || '—'}
                    </td>
                    <td className={`p-4 truncate max-w-[200px] ${item.status === 'annule' ? 'line-through' : ''}`}>
                      {item.budget_lines?.code} {item.budget_lines?.label}
                    </td>
                    <td className="p-4">
                      {item.attachments_count && item.attachments_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {item.attachments_count} <Paperclip className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through' : ''}`}>
                      {formatCurrency(item.planned_cost)}
                    </td>
                    <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through text-text-secondary' : ''}`}>
                      {item.actual_cost !== null && item.status === 'decaisse' ? formatCurrency(item.actual_cost) : '—'}
                    </td>
                    <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through text-text-secondary' : ''}`}>
                      {item.reste_a_engager > 0 ? formatCurrency(item.reste_a_engager) : '—'}
                    </td>
                    <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through text-text-secondary' : ''}`}>
                      {item.montant_engage > 0 ? formatCurrency(item.montant_engage) : '—'}
                    </td>
                    <td className={`p-4 text-right font-mono ${item.status === 'annule' ? 'line-through text-text-secondary' : ''}`}>
                      {item.montant_decaisse > 0 ? formatCurrency(item.montant_decaisse) : '—'}
                    </td>
                    <td className={`p-4 text-right font-mono font-medium ${
                      item.status === 'annule' ? 'text-text-secondary line-through' :
                      item.status === 'decaisse' ? (item.ecart_budgetaire >= 0 ? 'text-green-600' : 'text-red-600') : 'text-text-secondary'
                    }`}>
                      {item.status === 'decaisse' 
                        ? (item.ecart_budgetaire > 0 ? '+' : '') + formatCurrency(item.ecart_budgetaire) 
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddOperationModal 
          projectId={projectId}
          budgetLines={budgetLines}
          fundingSources={fundingSources}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {selectedOperation && (
        <RightDrawer
          isOpen={!!selectedOperation}
          onClose={() => setSelectedOperation(null)}
          title={`Opération ${selectedOperation.task_code}`}
        >
          <div className="flex border-b border-border px-4 pt-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Détails
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'docs' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Documents {selectedOperation.attachments_count ? <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{selectedOperation.attachments_count}</span> : ''}
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              Commentaires
            </button>
          </div>

          <div className="h-[calc(100vh-130px)] overflow-y-auto">
            {activeTab === 'details' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">ID Tâche</h4>
                    <p className="font-medium text-text-primary">{selectedOperation.task_code}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Phase / WBS</h4>
                    <p className="font-medium text-text-primary">{selectedOperation.phase_wbs || '—'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Ligne Budgétaire</h4>
                    <p className="font-medium text-text-primary">{selectedOperation.budget_lines?.code} {selectedOperation.budget_lines?.label}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Statut</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getStatusBadge(selectedOperation.status)}`}>
                      {getStatusLabel(selectedOperation.status)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Coût Prévu</h4>
                    <p className="font-mono text-text-primary">{formatCurrency(selectedOperation.planned_cost)} FCFA</p>
                  </div>
                  {selectedOperation.actual_cost !== null && (
                    <div>
                      <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Coût Réel</h4>
                      <p className="font-mono text-text-primary">{formatCurrency(selectedOperation.actual_cost)} FCFA</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Reste à Engager</h4>
                    <p className="font-mono text-text-primary">{formatCurrency(selectedOperation.reste_a_engager)} FCFA</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Écart</h4>
                    <p className={`font-mono ${selectedOperation.ecart_budgetaire >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedOperation.status === 'decaisse' 
                        ? (selectedOperation.ecart_budgetaire > 0 ? '+' : '') + formatCurrency(selectedOperation.ecart_budgetaire) + ' FCFA'
                        : '—'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'docs' && (
              <AttachmentsTab 
                projectId={projectId}
                relatedTable="operations_journal"
                relatedId={selectedOperation.id}
              />
            )}
            
            {activeTab === 'comments' && (
              <CommentsTab 
                projectId={projectId}
                relatedTable="operations_journal"
                relatedId={selectedOperation.id}
              />
            )}
          </div>
        </RightDrawer>
      )}
    </div>
  )
}
