'use client'

import React, { useState } from 'react'
import { Plus, Download, History, ClipboardList, Paperclip, Pencil, CreditCard, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddOperationModal } from './add-operation-modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { AttachmentsTab } from '@/components/dashboard/AttachmentsTab'
import { CommentsTab } from '@/components/dashboard/CommentsTab'
import { addOperationDisbursement, createDisbursementReversalAction } from '@/lib/actions/disbursements.actions'
import { useRouter } from 'next/navigation'

export interface OperationDisbursementItem {
  id: string
  operation_id: string
  project_id: string
  disbursement_date: string
  amount: number
  entry_type?: 'PAYMENT' | 'REVERSAL'
  reversal_of_id?: string | null
  reversal_reason?: string | null
  bank_transaction_id?: string | null
  reference_piece?: string | null
  external_reference?: string | null
  notes?: string | null
  created_at: string
}

export interface OperationJournal {
  id: string
  project_id: string
  wbs_task_id?: string | null
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
  total_paid?: number
  remaining_committed?: number
  payment_state?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  current_wbs_code?: string | null
  current_wbs_name?: string | null
  disbursements?: OperationDisbursementItem[]
  budget_lines?: {
    code: string
    label: string
  }
}

export function JournalClient({ 
  projectId, 
  items,
  initialOperations, 
  budgetLines, 
  fundingSources,
  wbsTasks,
  currency = 'XOF' 
}: { 
  projectId: string
  items?: OperationJournal[]
  initialOperations?: OperationJournal[]
  budgetLines: any[]
  fundingSources: any[]
  wbsTasks: any[]
  currency?: string 
}) {
  const router = useRouter()
  const opsList = items || initialOperations || []
  const [operations, setOperations] = useState(opsList)
  const [selectedOperation, setSelectedOperation] = useState<OperationJournal | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'docs' | 'comments'>('details')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // State for Add Payment
  const [isAddingPayment, setIsAddingPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentRef, setPaymentRef] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string>('')

  // State for Reversal
  const [reversalTarget, setReversalTarget] = useState<OperationDisbursementItem | null>(null)
  const [reversalAmount, setReversalAmount] = useState<number>(0)
  const [reversalReason, setReversalReason] = useState<string>('')
  const [reversalLoading, setReversalLoading] = useState(false)
  const [reversalError, setReversalError] = useState<string>('')

  // Synchronise les opérations si les props changent
  React.useEffect(() => {
    const nextList = items || initialOperations || []
    setOperations(nextList)
    if (selectedOperation) {
      const updated = nextList.find(op => op.id === selectedOperation.id)
      if (updated) setSelectedOperation(updated)
    }
  }, [items, initialOperations])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planifie': return 'bg-amber-100 text-amber-800'
      case 'engage': return 'bg-blue-100 text-blue-700'
      case 'decaisse': return 'bg-emerald-100 text-emerald-800'
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

  const getPaymentStateBadge = (state?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID', status?: string) => {
    if (status === 'annule') return null
    switch (state) {
      case 'PAID':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Soldé</span>
      case 'PARTIALLY_PAID':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Partiellement payé</span>
      case 'UNPAID':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">Non payé</span>
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOperation) return

    setPaymentLoading(true)
    setPaymentError('')

    const res = await addOperationDisbursement({
      projectId,
      operationId: selectedOperation.id,
      amount: Number(paymentAmount),
      disbursementDate: paymentDate,
      referencePiece: paymentRef || undefined,
      notes: paymentNotes || undefined
    })

    setPaymentLoading(false)

    if (res.error) {
      setPaymentError(res.error)
    } else {
      setIsAddingPayment(false)
      setPaymentAmount(0)
      setPaymentRef('')
      setPaymentNotes('')
      router.refresh()
    }
  }

  const handleCreateReversal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reversalTarget || !selectedOperation) return

    setReversalLoading(true)
    setReversalError('')

    const res = await createDisbursementReversalAction({
      projectId,
      paymentId: reversalTarget.id,
      amount: Number(reversalAmount),
      reason: reversalReason
    })

    setReversalLoading(false)

    if (res.error) {
      setReversalError(res.error)
    } else {
      setReversalTarget(null)
      setReversalAmount(0)
      setReversalReason('')
      router.refresh()
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
        <h2 className="text-2xl font-bold text-primary tracking-tight">Journal des opérations & Décaissements</h2>
        <div className="flex items-center gap-3">
          <a 
            href={`/projects/${projectId}/budget/import-releve`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-dim transition-colors text-text-primary"
          >
            <Download className="w-4 h-4 text-text-secondary" />
            Importer un relevé bancaire
          </a>
          <button
            onClick={() => {
              setSelectedOperation(null)
              setIsEditModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle opération
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-dim/50 text-text-secondary font-medium text-xs">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Code / Phase</th>
                <th className="py-3 px-4">Tâche WBS</th>
                <th className="py-3 px-4">Ligne Budgétaire</th>
                <th className="py-3 px-4 text-right">Coût Prévu</th>
                <th className="py-3 px-4 text-right">Décaissé Net</th>
                <th className="py-3 px-4 text-right">Reste à Payer</th>
                <th className="py-3 px-4 text-center">Paiement</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-text-secondary italic">
                    Aucune opération enregistrée dans le journal.
                  </td>
                </tr>
              ) : (
                operations.map((op, idx) => (
                  <tr 
                    key={op.id}
                    className="hover:bg-surface-dim/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedOperation(op)}
                  >
                    <td className="py-3 px-4 text-center text-text-tertiary text-xs font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-medium text-text-primary">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{op.task_code}</span>
                      </div>
                      {op.phase_wbs && (
                        <span className="text-[11px] text-text-tertiary block truncate max-w-[180px]">
                          {op.phase_wbs}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-xs">
                      {op.current_wbs_code ? (
                        <div>
                          <span className="font-mono font-semibold text-primary">{op.current_wbs_code}</span>
                          {op.current_wbs_name && <span className="block truncate max-w-[150px] text-text-tertiary">{op.current_wbs_name}</span>}
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic">Non rattachée</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-xs">
                      {op.budget_lines ? (
                        <div className="truncate max-w-[160px]" title={`${op.budget_lines.code} - ${op.budget_lines.label}`}>
                          <span className="font-mono font-medium text-text-primary">{op.budget_lines.code}</span>
                          <span className="text-text-tertiary block truncate">{op.budget_lines.label}</span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary italic">Non assignée</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-text-primary">
                      {formatCurrency(op.planned_cost, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(op.total_paid || 0, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {op.status === 'annule' ? (
                        <span className="text-text-tertiary">—</span>
                      ) : (
                        <span className={(op.remaining_committed || 0) > 0 ? 'text-amber-700 font-medium' : 'text-text-tertiary'}>
                          {formatCurrency(op.remaining_committed || 0, currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getPaymentStateBadge(op.payment_state, op.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(op.status)}`}>
                        {getStatusLabel(op.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setSelectedOperation(op)
                            setIsEditModalOpen(true)
                          }}
                          className="p-1.5 hover:bg-surface-dim rounded text-text-secondary hover:text-text-primary transition-colors"
                          title="Modifier l'opération"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedOperation(op)}
                          className="p-1.5 hover:bg-surface-dim rounded text-text-secondary hover:text-text-primary transition-colors"
                          title="Voir les paiements et documents"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer latéral */}
      {selectedOperation && !isEditModalOpen && (
        <RightDrawer
          isOpen={true}
          onClose={() => {
            setSelectedOperation(null)
            setIsAddingPayment(false)
            setReversalTarget(null)
          }}
          title={`Opération : ${selectedOperation.task_code}`}
        >
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-border text-sm">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-4 border-b-2 font-medium flex items-center gap-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                <CreditCard className="w-4 h-4" />
                Paiements & Audit
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-2 px-4 border-b-2 font-medium flex items-center gap-2 ${activeTab === 'docs' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                <Paperclip className="w-4 h-4" />
                Justificatifs ({selectedOperation.attachments_count || 0})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-2 px-4 border-b-2 font-medium flex items-center gap-2 ${activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                <ClipboardList className="w-4 h-4" />
                Commentaires
              </button>
            </div>

            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Résumé Financier */}
                <div className="bg-surface-dim/40 rounded-xl p-4 border border-border/60 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-tertiary block">Coût Prévu (Engagement)</span>
                    <span className="text-sm font-bold font-mono text-text-primary">{formatCurrency(selectedOperation.planned_cost, currency)}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Décaissé Net</span>
                    <span className="text-sm font-bold font-mono text-emerald-700">{formatCurrency(selectedOperation.total_paid || 0, currency)}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Reste à Décaisser</span>
                    <span className="text-sm font-bold font-mono text-amber-700">{formatCurrency(selectedOperation.remaining_committed || 0, currency)}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block">Statut Comptable</span>
                    <span className="font-semibold text-text-primary">{getStatusLabel(selectedOperation.status)}</span>
                  </div>
                </div>

                {/* Section Paiements & Décaissements */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Mouvements Financiers ({selectedOperation.disbursements?.length || 0})
                    </h3>
                    {selectedOperation.status !== 'annule' && (selectedOperation.remaining_committed || 0) > 0 && !isAddingPayment && !reversalTarget && (
                      <button
                        onClick={() => {
                          setIsAddingPayment(true)
                          setPaymentAmount(selectedOperation.remaining_committed || 0)
                        }}
                        className="text-xs font-semibold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-2xs"
                      >
                        + Nouveau décaissement
                      </button>
                    )}
                  </div>

                  {/* Formulaire Nouveau Paiement */}
                  {isAddingPayment && (
                    <form onSubmit={handleAddPayment} className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4 mb-4 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-900 uppercase">Enregistrer un décaissement unitaire</h4>
                      {paymentError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{paymentError}</div>}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-text-secondary block mb-1">Montant ({currency}) *</label>
                          <input 
                            type="number" 
                            step="any"
                            required
                            max={selectedOperation.remaining_committed || selectedOperation.planned_cost}
                            value={paymentAmount} 
                            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                            className="w-full text-sm bg-white border border-border rounded px-2.5 py-1.5 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-text-secondary block mb-1">Date de valeur *</label>
                          <input 
                            type="date" 
                            required
                            value={paymentDate} 
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full text-sm bg-white border border-border rounded px-2.5 py-1.5"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-text-secondary block mb-1">Référence pièce / Virement</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Facture F-2026-001, Virement #8839"
                            value={paymentRef} 
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="w-full text-sm bg-white border border-border rounded px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setIsAddingPayment(false)}
                          className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                          Annuler
                        </button>
                        <button 
                          type="submit" 
                          disabled={paymentLoading || paymentAmount <= 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                        >
                          {paymentLoading ? 'Enregistrement...' : 'Valider le paiement'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Formulaire Contre-passation (Reversal) */}
                  {reversalTarget && (
                    <form onSubmit={handleCreateReversal} className="bg-amber-50/80 border border-amber-300 rounded-lg p-4 mb-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
                        <RotateCcw className="w-4 h-4 text-amber-700" />
                        Contre-passation d'un décaissement
                      </div>
                      {reversalError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{reversalError}</div>}
                      
                      <div className="text-xs text-amber-800 bg-amber-100/60 p-2.5 rounded border border-amber-200">
                        Cible : <strong>{formatCurrency(reversalTarget.amount, currency)}</strong> du {new Date(reversalTarget.disbursement_date).toLocaleDateString('fr-FR')} ({reversalTarget.reference_piece || 'Sans réf'})
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-text-secondary block mb-1">Montant à annuler ({currency}) *</label>
                          <input 
                            type="number" 
                            step="any"
                            required
                            max={reversalAmount}
                            value={reversalAmount} 
                            onChange={(e) => setReversalAmount(parseFloat(e.target.value) || 0)}
                            className="w-full text-sm bg-white border border-border rounded px-2.5 py-1.5 font-mono text-red-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-text-secondary block mb-1">Date effective (Serveur)</label>
                          <input 
                            type="text" 
                            disabled
                            value="Aujourd'hui (Immuable)" 
                            className="w-full text-sm bg-slate-100 border border-border rounded px-2.5 py-1.5 text-text-tertiary"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-text-secondary block mb-1">Motif obligatoire de la contre-passation *</label>
                          <textarea 
                            required
                            rows={2}
                            placeholder="Ex: Erreur d'imputation engagement, virement rejeté, trop-perçu fournisseur..."
                            value={reversalReason} 
                            onChange={(e) => setReversalReason(e.target.value)}
                            className="w-full text-xs bg-white border border-border rounded px-2.5 py-1.5 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setReversalTarget(null)}
                          className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                          Annuler
                        </button>
                        <button 
                          type="submit" 
                          disabled={reversalLoading || reversalAmount <= 0 || reversalReason.trim().length < 3}
                          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {reversalLoading ? 'Contre-passation...' : 'Confirmer la contre-passation'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Liste des Décaissements et Contre-passations */}
                  {(!selectedOperation.disbursements || selectedOperation.disbursements.length === 0) ? (
                    <p className="text-xs text-text-secondary italic">Aucun mouvement enregistré pour cet engagement.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOperation.disbursements.map((d, index) => {
                        const isReversal = d.entry_type === 'REVERSAL'
                        
                        // Calcul du montant réversible restant pour un paiement
                        const alreadyReversed = !isReversal 
                          ? (selectedOperation.disbursements || [])
                              .filter(rev => rev.reversal_of_id === d.id)
                              .reduce((sum, rev) => sum + Number(rev.amount), 0)
                          : 0
                        const remainingReversible = Math.max(0, Number(d.amount) - alreadyReversed)

                        return (
                          <div 
                            key={d.id || index} 
                            className={`p-3 border rounded-lg shadow-2xs flex justify-between items-center text-sm transition-colors ${
                              isReversal 
                                ? 'bg-amber-50/40 border-amber-200' 
                                : alreadyReversed >= Number(d.amount)
                                ? 'bg-slate-50 border-slate-200 opacity-75'
                                : 'bg-white border-border'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold font-mono text-sm ${isReversal ? 'text-amber-800' : 'text-emerald-800'}`}>
                                  {isReversal ? '-' : '+'}{formatCurrency(d.amount, currency)}
                                </span>
                                {isReversal ? (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                    Contre-passation
                                  </span>
                                ) : alreadyReversed > 0 ? (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded border border-slate-300">
                                    {alreadyReversed >= Number(d.amount) ? 'Totalement contre-passé' : `Contre-passé à -${formatCurrency(alreadyReversed, currency)}`}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                                <span>Date : {new Date(d.disbursement_date).toLocaleDateString('fr-FR')}</span>
                                {d.reference_piece && <span>• Réf : {d.reference_piece}</span>}
                              </div>
                              {isReversal && d.reversal_reason && (
                                <p className="text-[11px] text-amber-900 mt-1 italic bg-amber-100/50 px-2 py-0.5 rounded">
                                  Motif : {d.reversal_reason}
                                </p>
                              )}
                            </div>

                            {!isReversal && remainingReversible > 0 && selectedOperation.status !== 'annule' && (
                              <button
                                onClick={() => {
                                  setReversalTarget(d)
                                  setReversalAmount(remainingReversible)
                                  setReversalReason('')
                                  setIsAddingPayment(false)
                                }}
                                className="text-xs font-semibold px-2 py-1 border border-amber-300 text-amber-800 hover:bg-amber-100 rounded transition-colors flex items-center gap-1 shrink-0"
                                title="Contre-passer ce paiement"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Contre-passer
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
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

      {isEditModalOpen && selectedOperation && (
        <AddOperationModal 
          projectId={projectId} 
          budgetLines={budgetLines} 
          fundingSources={fundingSources}
          wbsTasks={wbsTasks}
          currency={currency}
          editItem={selectedOperation}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedOperation(null)
          }} 
        />
      )}
    </div>
  )
}
