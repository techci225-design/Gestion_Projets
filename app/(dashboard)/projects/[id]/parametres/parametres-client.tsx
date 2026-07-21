'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Trash2, Wallet, Layers, FileText, CheckSquare, Settings, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { addFundingSource, deleteFundingSource } from '@/lib/actions/parametres.actions'
import { updateProject, deleteProject } from '@/lib/actions/projects.actions'
import { useRouter } from 'next/navigation'
import { AddBudgetModal } from '../budget/add-budget-modal'
import { AddEvmTaskModal } from '../evm/add-evm-task-modal'

interface ParametresClientProps {
  projectId: string
  fundingSources: any[]
  budgetLines: any[]
  wbsTasks: any[]
  userRole: string
  project?: any
}

export function ParametresClient({ projectId, fundingSources, budgetLines, wbsTasks, userRole, project }: ParametresClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'general' | 'bailleurs' | 'budget' | 'wbs' | 'statuts'>('general')
  
  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isWbsModalOpen, setIsWbsModalOpen] = useState(false)
  
  // Bailleur form state
  const [isPending, startTransition] = useTransition()
  const [newBailleur, setNewBailleur] = useState({ name: '', amount: '' })
  const [bailleurError, setBailleurError] = useState('')

  
  // General form state
  const [generalError, setGeneralError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    code: project?.code || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    description: project?.description || '',
    status: project?.status || 'actif',
    evm_control_date: project?.evm_control_date ? new Date(project.evm_control_date).toISOString().split('T')[0] : ''
  })

  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    startTransition(async () => {
      const res = await updateProject(projectId, formData)
      if (res?.error) setGeneralError(res.error)
    })
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    const res = await deleteProject(projectId)
    if (res?.error) {
      setGeneralError(res.error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/projects')
    }
  }

  const handleArchiveProject = async () => {
    if (!confirm('Voulez-vous vraiment archiver ce projet ? Il passera en statut "Clos".')) return;
    setGeneralError('')
    startTransition(async () => {
      const res = await updateProject(projectId, { ...formData, status: 'clos' })
      if (res?.error) setGeneralError(res.error)
      else setFormData({ ...formData, status: 'clos' })
    })
  }

  const canEdit = ['owner', 'comptable', 'chef_projet'].includes(userRole) || userRole === undefined

  const handleAddBailleur = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBailleur.name || !newBailleur.amount) return
    
    setBailleurError('')
    startTransition(async () => {
      const res = await addFundingSource({
        project_id: projectId,
        name: newBailleur.name,
        type: 'bailleur',
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
    <div className="flex flex-col space-y-6 min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Paramètres du Projet</h2>
          <p className="text-base text-text-secondary">Le socle de gouvernance : configurez les référentiels essentiels.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden flex flex-col md:flex-row">
        
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
          <button
            onClick={() => setActiveTab('statuts')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'statuts' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            Statuts des Opérations
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 lg:p-8 bg-surface">
          
          
          {/* TAB: General */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Informations générales</h3>
                <p className="text-sm text-text-secondary mt-1">Modifiez les informations principales du projet.</p>
              </div>

              {generalError && (
                <div className="p-3 rounded-md bg-danger/10 text-danger text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {generalError}
                </div>
              )}

              <form onSubmit={handleUpdateGeneral} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Nom du projet</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Code court</label>
                    <input 
                      type="text" 
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Date de début</label>
                    <input 
                      type="date" 
                      value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Date de fin</label>
                    <input 
                      type="date" 
                      value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2 border-t border-border pt-4 mt-2">
                    <h4 className="font-medium text-text-primary text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" /> Paramètres EVM
                    </h4>
                    <p className="text-xs text-text-secondary mb-2">La date d'arrêté sert de point de référence temporel pour calculer la Valeur Planifiée (PV) au prorata.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Date d'arrêté des comptes (EVM)</label>
                        <input 
                          type="date" 
                          value={formData.evm_control_date}
                          onChange={e => setFormData({...formData, evm_control_date: e.target.value})}
                          disabled={isPending}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2 border-t border-border pt-4">
                    <label className="block text-sm font-medium text-text-primary">Statut</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    >
                      <option value="actif">Actif</option>
                      <option value="clos">Clos</option>
                      <option value="en pause">En pause</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      disabled={isPending}
                      rows={3}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="mt-12">
                <div className="border-b border-danger/20 pb-4 mb-6">
                  <h3 className="text-xl font-semibold text-danger">Zone de danger</h3>
                  <p className="text-sm text-text-secondary mt-1">Actions irréversibles concernant ce projet.</p>
                </div>
                
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h4 className="font-bold text-warning-dark">Archiver le projet</h4>
                    <p className="text-sm text-warning-dark/80 mt-1 max-w-xl">
                      Le projet passera en statut "Clos". Il n'apparaîtra plus dans les rapports actifs et ne générera plus d'alertes.
                    </p>
                  </div>
                  <button 
                    onClick={handleArchiveProject}
                    disabled={isPending || formData.status === 'clos'}
                    className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {formData.status === 'clos' ? 'Déjà archivé' : 'Archiver ce projet'}
                  </button>
                </div>

                <div className="bg-danger/5 border border-danger/20 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-text-primary">Supprimer le projet</h4>
                    <p className="text-sm text-text-secondary mt-1 max-w-xl">Cette action est définitive. Toutes les données associées (tâches, budget, documents) doivent d'abord être supprimées.</p>
                  </div>
                  
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-surface border border-danger text-danger rounded-lg text-sm font-medium hover:bg-danger hover:text-white transition-colors whitespace-nowrap"
                    >
                      Supprimer ce projet
                    </button>
                  ) : (
                    <div className="flex flex-col items-end gap-3 w-full max-w-xs">
                      <div className="w-full">
                        <label className="block text-xs font-medium text-danger mb-1">Tapez <strong>{project?.name}</strong> pour confirmer</label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={e => setDeleteConfirmText(e.target.value)}
                          placeholder="Nom du projet"
                          className="w-full px-3 py-2 bg-white border border-danger/30 rounded-lg text-sm focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                          disabled={isDeleting}
                          className="px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
                        >
                          Annuler
                        </button>
                        <button 
                          onClick={handleDeleteProject}
                          disabled={isDeleting || deleteConfirmText !== project?.name}
                          className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                        <label className="block text-sm font-medium text-text-secondary mb-1">Nom du prêteur</label>
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
                        <label className="block text-sm font-medium text-text-secondary mb-1">Montant demandé</label>
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

          {/* TAB: Statuts */}
          {activeTab === 'statuts' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Statuts des Opérations (Validation Stricte)</h3>
              </div>
              <div className="bg-surface-dim p-4 rounded-lg border border-border text-sm text-text-secondary mb-6">
                Pour garantir l'intégrité des données et éviter les erreurs de saisie, les statuts sont strictement validés et codés en dur dans le système (Base de données et Interface). Il n'est pas possible d'en ajouter de nouveaux afin de ne pas fausser les calculs automatiques.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                    <h4 className="font-bold text-text-primary">Planifié</h4>
                  </div>
                  <p className="text-sm text-text-secondary">L'opération est budgétée mais aucun engagement formel n'a encore été pris. Ne modifie pas le solde disponible ni les indicateurs d'alerte.</p>
                </div>
                <div className="p-5 bg-white border border-border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-warning"></span>
                    <h4 className="font-bold text-text-primary">Engagé</h4>
                  </div>
                  <p className="text-sm text-text-secondary">Un contrat ou un bon de commande a été signé. Le montant est déduit du solde disponible (Reste à engager) de la ligne budgétaire.</p>
                </div>
                <div className="p-5 bg-white border border-border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-success"></span>
                    <h4 className="font-bold text-text-primary">Décaissé</h4>
                  </div>
                  <p className="text-sm text-text-secondary">Le paiement a été effectivement réalisé. Ce statut permet de saisir un "Coût Réel" si le montant final diffère de l'engagement initial.</p>
                </div>
                <div className="p-5 bg-white border border-border rounded-lg shadow-sm opacity-70">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-danger"></span>
                    <h4 className="font-bold text-text-primary text-danger">Annulé</h4>
                  </div>
                  <p className="text-sm text-text-secondary">L'opération est annulée. Ses montants ne sont plus pris en compte dans les calculs de consommation du budget.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {isBudgetModalOpen && (
        <AddBudgetModal projectId={projectId} onClose={() => setIsBudgetModalOpen(false)} />
      )}
      
      {isWbsModalOpen && (
        <AddEvmTaskModal projectId={projectId} isOpen={isWbsModalOpen} onClose={() => setIsWbsModalOpen(false)} />
      )}
    </div>
  )
}
