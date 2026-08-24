'use client'

import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  ShieldAlert, ShieldCheck, Plus, CheckCircle, Edit3, Trash2, 
  Calendar, Layers, FileText, AlertCircle, ArrowRight, X, Sparkles
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { 
  EvmBaseline, EvmBaselineItem, 
  createDraftBaseline, updateDraftBaseline, deleteDraftBaseline, approveBaseline, getBaselineWithItems
} from '@/lib/actions/baseline.actions'
import { useRouter } from 'next/navigation'

interface EvmBaselineManagerProps {
  projectId: string
  currency?: string
  initialBaselines: EvmBaseline[]
  budgetLines: any[]
}

export function EvmBaselineManager({
  projectId,
  currency = 'XOF',
  initialBaselines,
  budgetLines
}: EvmBaselineManagerProps) {
  const router = useRouter()
  const [baselines, setBaselines] = useState<EvmBaseline[]>(initialBaselines)
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false)
  const [activeDraft, setActiveDraft] = useState<EvmBaseline | null>(null)
  const [draftItems, setDraftItems] = useState<EvmBaselineItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState<string>('')
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const activeApproved = useMemo(() => {
    return baselines.find(b => b.status === 'APPROVED') || null
  }, [baselines])

  const currentDraft = useMemo(() => {
    return baselines.find(b => b.status === 'DRAFT') || null
  }, [baselines])

  const referenceBudget = useMemo(() => {
    return (budgetLines || []).reduce((sum, bl) => sum + (Number(bl.initial_allocated_amount) || 0), 0)
  }, [budgetLines])

  const draftTotalBac = useMemo(() => {
    return draftItems.reduce((sum, it) => sum + (Number(it.planned_bac) || 0), 0)
  }, [draftItems])

  const budgetDifference = useMemo(() => {
    return draftTotalBac - referenceBudget
  }, [draftTotalBac, referenceBudget])

  const handleOpenDraftEditor = async (draft: EvmBaseline) => {
    setActiveDraft(draft)
    setDraftName(draft.name)
    setDraftDescription(draft.description || '')
    setEffectiveDate(draft.effective_date || new Date().toISOString().split('T')[0])
    setIsLoadingItems(true)
    setIsDraftModalOpen(true)

    const res = await getBaselineWithItems(projectId, draft.id)
    setIsLoadingItems(false)
    if (res.items) {
      setDraftItems(res.items)
    }
  }

  const handleCreateDraft = async () => {
    if (!confirm("Voulez-vous initialiser un nouveau brouillon de Baseline à partir des tâches WBS actuelles ?")) return
    setIsSubmitting(true)
    try {
      const res = await createDraftBaseline(projectId)
      if (res.error) {
        alert(res.error)
      } else if (res.data) {
        setBaselines(prev => [res.data, ...prev])
        handleOpenDraftEditor(res.data)
        router.refresh()
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleItemChange = (itemId: string, field: 'planned_start' | 'planned_end' | 'planned_bac', value: any) => {
    setDraftItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          [field]: field === 'planned_bac' ? (Number(value) || 0) : value
        }
      }
      return item
    }))
  }

  const handleSaveDraft = async () => {
    if (!activeDraft) return
    setIsSubmitting(true)
    try {
      const res = await updateDraftBaseline(projectId, activeDraft.id, {
        name: draftName,
        description: draftDescription,
        effective_date: effectiveDate,
        items: draftItems.map(it => ({
          id: it.id,
          planned_start: it.planned_start,
          planned_end: it.planned_end,
          planned_bac: it.planned_bac
        }))
      })
      if (res.error) {
        alert(res.error)
      } else {
        alert("Brouillon de baseline enregistré avec succès.")
        setIsDraftModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement ce brouillon de baseline ?")) return
    setIsSubmitting(true)
    try {
      const res = await deleteDraftBaseline(projectId, draftId)
      if (res.error) {
        alert(res.error)
      } else {
        setBaselines(prev => prev.filter(b => b.id !== draftId))
        setIsDraftModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!activeDraft) return
    if (!effectiveDate) {
      alert("Veuillez sélectionner une date d'effet contractuelle.")
      return
    }
    if (Math.abs(budgetDifference) > 0.01) {
      alert(`Impossible d'approuver : le budget alloué sur la baseline (${formatCurrency(draftTotalBac, currency)}) doit être strictement égal au budget analytique approuvé (${formatCurrency(referenceBudget, currency)}).`)
      return
    }

    if (!confirm(`Confirmez-vous l'approbation formelle de la Baseline ${draftName} ?\n\nDate d'effet : ${effectiveDate}\nBAC Total : ${formatCurrency(draftTotalBac, currency)}\n\nATTENTION : Cette action est irréversible et fige le référentiel contractuel.`)) return

    setIsSubmitting(true)
    try {
      // 1. Save items first
      await updateDraftBaseline(projectId, activeDraft.id, {
        name: draftName,
        description: draftDescription,
        effective_date: effectiveDate,
        items: draftItems.map(it => ({
          id: it.id,
          planned_start: it.planned_start,
          planned_end: it.planned_end,
          planned_bac: it.planned_bac
        }))
      })

      // 2. Formally approve
      const res = await approveBaseline(projectId, activeDraft.id, effectiveDate)
      if (res.error) {
        alert(res.error)
      } else {
        alert("Baseline officiellement approuvée et activée !")
        setIsDraftModalOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'approbation")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-base">Référentiel Contractuel & Baseline EVM</h3>
            <p className="text-xs text-text-secondary">Gestion des versions de référence approuvées et opposables pour l'analyse de performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentDraft && (
            <button
              onClick={handleCreateDraft}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {activeApproved ? 'Créer un avenant (V' + (activeApproved.version_number + 1) + ')' : 'Créer Baseline V1 (Brouillon)'}
            </button>
          )}
          {currentDraft && (
            <button
              onClick={() => handleOpenDraftEditor(currentDraft)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Éditer le Brouillon (V{currentDraft.version_number})
            </button>
          )}
        </div>
      </div>

      {/* Baseline status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Active Approved Baseline */}
        <div className={`p-4 rounded-xl border ${
          activeApproved 
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30' 
            : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30'
        } flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Statut Baseline Officielle</span>
              {activeApproved ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300">
                  Approuvée (V{activeApproved.version_number})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300">
                  Mode Historique
                </span>
              )}
            </div>

            {activeApproved ? (
              <div className="space-y-1 mt-2">
                <p className="text-sm font-bold text-text-primary">{activeApproved.name}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                  Effet : {activeApproved.effective_date ? format(new Date(activeApproved.effective_date), 'dd MMMM yyyy', { locale: fr }) : 'Non datée'}
                </p>
                <p className="text-xs text-text-secondary">
                  Approuvé par : <span className="font-semibold text-text-primary">{activeApproved.approver?.full_name || 'Chef de projet'}</span>
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Aucune baseline approuvée. Les calculs EVM dérivent temporairement des données courantes du Gantt/PTBA.</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border/60 flex justify-between items-center text-xs">
            <span className="text-text-secondary">BAC Contractuel :</span>
            <span className="font-bold text-text-primary">
              {activeApproved ? formatCurrency(activeApproved.total_bac, currency, true) : 'Non figé'}
            </span>
          </div>
        </div>

        {/* Card 2: Budget de Référence Analytique */}
        <div className="p-4 rounded-xl border border-border bg-surface-dim flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Budget Analytique Approuvé</span>
              <span className="text-xs font-mono font-medium text-text-secondary">{budgetLines.length} ligne{budgetLines.length > 1 ? 's' : ''}</span>
            </div>
            <div className="text-lg font-bold text-text-primary whitespace-nowrap">
              {formatCurrency(referenceBudget, currency, true)}
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Plafond cible obligatoire pour l'approbation de toute baseline.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-border flex justify-between items-center text-xs">
            <span className="text-text-secondary">Source de vérité :</span>
            <span className="font-semibold text-primary">budget_lines</span>
          </div>
        </div>

        {/* Card 3: Brouillon en cours ou Historique */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Révisions / Historique</span>
              <span className="text-xs text-text-secondary">{baselines.length} version{baselines.length > 1 ? 's' : ''}</span>
            </div>
            {currentDraft ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                  <Edit3 className="w-3.5 h-3.5" />
                  Brouillon V{currentDraft.version_number} en préparation
                </div>
                <p className="text-xs text-text-secondary">BAC configuré : <span className="font-semibold text-text-primary">{formatCurrency(currentDraft.total_bac, currency, true)}</span></p>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">
                {baselines.filter(b => b.status === 'SUPERSEDED').length > 0
                  ? `${baselines.filter(b => b.status === 'SUPERSEDED').length} ancienne(s) version(s) archivée(s) pour audit.`
                  : "Aucune révision antérieure."}
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border flex justify-end gap-2">
            {currentDraft && (
              <button
                onClick={() => handleOpenDraftEditor(currentDraft)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Gérer le brouillon <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal / Editor Drawer for Draft Baseline */}
      {isDraftModalOpen && activeDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-5xl rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-dim">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Brouillon V{activeDraft.version_number}
                  </span>
                  <h3 className="text-lg font-bold text-text-primary">Configuration de la Baseline EVM</h3>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Définissez les dates de référence et allouez le budget contractuel (BAC) sur chaque tâche feuille du WBS.
                </p>
              </div>
              <button onClick={() => setIsDraftModalOpen(false)} className="p-2 text-text-secondary hover:text-text-primary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* General Draft Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-background p-4 rounded-xl border border-border">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Nom de la version</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={e => setDraftName(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Date d'effet contractuelle <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Description / Motif de révision</label>
                  <input
                    type="text"
                    placeholder="Ex: Avenant N°1 suite à validation bailleur"
                    value={draftDescription}
                    onChange={e => setDraftDescription(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Budget Balance Reconciliation Bar */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                Math.abs(budgetDifference) < 0.01
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {Math.abs(budgetDifference) < 0.01 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-text-primary">
                      {Math.abs(budgetDifference) < 0.01 
                        ? "Budget de la Baseline parfaitement équilibré" 
                        : "Écart de ventilation budgétaire"}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Total Baseline : <span className="font-semibold text-text-primary">{formatCurrency(draftTotalBac, currency)}</span> / Budget Analytique : <span className="font-semibold text-text-primary">{formatCurrency(referenceBudget, currency)}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-sm font-bold ${Math.abs(budgetDifference) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {budgetDifference > 0 
                      ? `+${formatCurrency(budgetDifference, currency)} (Excédent)` 
                      : (budgetDifference < 0 ? `-${formatCurrency(Math.abs(budgetDifference), currency)} (À répartir)` : 'Équilibré (0.00)')}
                  </span>
                </div>
              </div>

              {/* Tasks Items Table */}
              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-surface-dim px-4 py-2.5 border-b border-border flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">
                    Ventilation des tâches de référence ({draftItems.length} activités)
                  </span>
                </div>

                {isLoadingItems ? (
                  <div className="p-8 text-center text-sm text-text-secondary">Chargement des éléments...</div>
                ) : (
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-background sticky top-0 border-b border-border text-text-secondary font-semibold uppercase">
                        <tr>
                          <th className="p-3 w-16">Code</th>
                          <th className="p-3">Activité Snapshot</th>
                          <th className="p-3 w-36">Début Référence</th>
                          <th className="p-3 w-36">Fin Référence</th>
                          <th className="p-3 w-48 text-right">BAC Alloué ({currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {draftItems.map(item => (
                          <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                            <td className="p-3 font-mono font-bold text-text-primary">{item.wbs_code_snapshot}</td>
                            <td className="p-3 font-medium text-text-primary">{item.wbs_name_snapshot}</td>
                            <td className="p-2">
                              <input
                                type="date"
                                required
                                value={item.planned_start}
                                onChange={e => handleItemChange(item.id, 'planned_start', e.target.value)}
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                required
                                value={item.planned_end}
                                onChange={e => handleItemChange(item.id, 'planned_end', e.target.value)}
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.planned_bac || ''}
                                onChange={e => handleItemChange(item.id, 'planned_bac', e.target.value)}
                                placeholder="0"
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-xs font-mono font-semibold text-right focus:outline-none focus:border-primary"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface-dim flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => handleDeleteDraft(activeDraft.id)}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer le brouillon
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-text-primary bg-surface border border-border rounded-lg hover:bg-surface-dim transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer le brouillon'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting || Math.abs(budgetDifference) > 0.01 || !effectiveDate}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approuver & Activer la Baseline
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
