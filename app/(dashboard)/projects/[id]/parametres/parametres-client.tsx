'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Trash2, Wallet, Layers, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { addFundingSource, deleteFundingSource } from '@/lib/actions/parametres.actions'
import { AddBudgetModal } from '../budget/add-budget-modal'
import { AddEvmTaskModal } from '../evm/add-evm-task-modal'

interface ParametresClientProps {
  projectId: string
  fundingSources: any[]
  budgetLines: any[]
  wbsTasks: any[]
  userRole: string
}

export function ParametresClient({ projectId, fundingSources, budgetLines, wbsTasks, userRole }: ParametresClientProps) {
  const [activeTab, setActiveTab] = useState<'bailleurs' | 'budget' | 'wbs'>('bailleurs')
  
  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isWbsModalOpen, setIsWbsModalOpen] = useState(false)
  
  // Bailleur form state
  const [isPending, startTransition] = useTransition()
  const [newBailleur, setNewBailleur] = useState({ name: '', amount: '' })
  const [bailleurError, setBailleurError] = useState('')

  const canEdit = ['owner', 'comptable', 'chef_projet'].includes(userRole)

  const handleAddBailleur = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBailleur.name || !newBailleur.amount) return
    
    setBailleurError('')
    startTransition(async () => {
      const res = await addFundingSource({
        project_id: projectId,
        name: newBailleur.name,
        amount_committed: Number(newBailleur.amount)
      })
      
      if (res?.error) {
        setBailleurError(res.error)
      } else {
        setNewBailleur({ name: '', amount: '' })
      }
    })
  }

  const handleDeleteBailleur = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bailleur ?')) return
    startTransition(async () => {
      await deleteFundingSource(projectId, id)
    })
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Paramètres du Projet</h2>
          <p className="text-base text-text-secondary">Le socle de gouvernance : configurez les référentiels essentiels.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col md:flex-row h-full">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 bg-surface-dim border-b md:border-b-0 md:border-r border-border p-4 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('bailleurs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'bailleurs' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <Wallet className="w-5 h-5" />
            Sources de Financement
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'budget' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <FileText className="w-5 h-5" />
            Nomenclature Budgétaire
          </button>
          <button
            onClick={() => setActiveTab('wbs')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'wbs' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <Layers className="w-5 h-5" />
            Structure WBS (Tâches)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 lg:p-8 bg-surface">
          
          {/* TAB: Bailleurs */}
          {activeTab === 'bailleurs' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Bailleurs de fonds</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="space-y-3">
                  {fundingSources.map(fs => (
                    <div key={fs.id} className="p-4 bg-white border border-border shadow-sm rounded-lg flex justify-between items-center group">
                      <div>
                        <h4 className="font-bold text-text-primary">{fs.name}</h4>
                        <p className="text-sm font-mono text-text-secondary mt-1">Montant : {formatCurrency(Number(fs.amount_committed))}</p>
                      </div>
                      {canEdit && (
                        <button 
                          disabled={isPending}
                          onClick={() => handleDeleteBailleur(fs.id)} 
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {fundingSources.length === 0 && (
                    <div className="p-6 text-center text-text-secondary border border-dashed border-border rounded-lg">
                      Aucune source de financement
                    </div>
                  )}
                </div>

                {/* Add Form */}
                {canEdit && (
                  <div className="p-5 bg-surface-dim border border-border rounded-lg h-fit">
                    <h4 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Ajouter un bailleur
                    </h4>
                    <form onSubmit={handleAddBailleur} className="space-y-4">
                      {bailleurError && <div className="p-3 bg-danger/10 text-danger text-sm rounded-md">{bailleurError}</div>}
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Nom du bailleur</label>
                        <input
                          type="text"
                          required
                          value={newBailleur.name}
                          onChange={e => setNewBailleur({...newBailleur, name: e.target.value})}
                          className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Ex: Banque Mondiale"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Montant engagé (FCFA)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newBailleur.amount}
                          onChange={e => setNewBailleur({...newBailleur, amount: e.target.value})}
                          className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          placeholder="Ex: 500000000"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isPending ? 'Enregistrement...' : 'Ajouter la source'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Nomenclature */}
          {activeTab === 'budget' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Nomenclature Budgétaire</h3>
                {canEdit && (
                  <button 
                    onClick={() => setIsBudgetModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Nouvelle Ligne
                  </button>
                )}
              </div>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-dim border-b border-border text-text-secondary">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Libellé</th>
                      <th className="p-3 text-right">Budget Alloué (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {budgetLines.map((line: any) => (
                      <tr key={line.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-text-primary">{line.code}</td>
                        <td className="p-3 text-text-secondary">{line.label}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(Number(line.initial_allocated_amount))}</td>
                      </tr>
                    ))}
                    {budgetLines.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-text-secondary">Aucune ligne budgétaire définie</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: WBS */}
          {activeTab === 'wbs' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Structure de Répartition du Travail (WBS)</h3>
                {canEdit && (
                  <button 
                    onClick={() => setIsWbsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Nouvelle Tâche
                  </button>
                )}
              </div>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-dim border-b border-border text-text-secondary">
                    <tr>
                      <th className="p-3">Code / Phase</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Responsable</th>
                      <th className="p-3 text-right">Budget (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {wbsTasks.map((task: any) => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-text-primary">{task.code}</td>
                        <td className="p-3 text-text-secondary max-w-xs truncate">{task.description}</td>
                        <td className="p-3 text-text-secondary">{task.responsible || '—'}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(Number(task.budget_allocated))}</td>
                      </tr>
                    ))}
                    {wbsTasks.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-text-secondary">Aucune tâche définie</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {isBudgetModalOpen && (
        <AddBudgetModal projectId={projectId} onClose={() => setIsBudgetModalOpen(false)} />
      )}
      
      {isWbsModalOpen && (
        <AddEvmTaskModal projectId={projectId} onClose={() => setIsWbsModalOpen(false)} />
      )}
    </div>
  )
}
