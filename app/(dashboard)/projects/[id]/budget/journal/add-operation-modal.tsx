'use client'

import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, Sparkles, AlertTriangle, AlertOctagon } from 'lucide-react'
import { createOperation } from '@/lib/actions/budget.actions'
import { useRouter } from 'next/navigation'

export function AddOperationModal({ 
  projectId,
  budgetLines,
  fundingSources,
  onClose
}: { 
  projectId: string
  budgetLines: any[]
  fundingSources: any[]
  onClose: () => void 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [status, setStatus] = useState('planifie')
  const [taskDesc, setTaskDesc] = useState('')
  const [selectedBudgetLine, setSelectedBudgetLine] = useState('')
  
  // AI Suggestion State
  const [suggesting, setSuggesting] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{code: string, label: string, id: string} | null>(null)
  const [showAiBtn, setShowAiBtn] = useState(false)
  
  // Anomaly State
  const [anomalyLevel, setAnomalyLevel] = useState<0 | 1 | 2>(0) // 0: none, 1: >1.2, 2: >2.0
  const [confirmText, setConfirmText] = useState('')
  const [anomalyMessage, setAnomalyMessage] = useState('')
  const [plannedCostVal, setPlannedCostVal] = useState(0)
  const [actualCostVal, setActualCostVal] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (taskDesc.length > 5 && !selectedBudgetLine) {
        setShowAiBtn(true)
      } else {
        setShowAiBtn(false)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [taskDesc, selectedBudgetLine])

  const handleAiSuggest = async () => {
    setSuggesting(true)
    setAiSuggestion(null)
    try {
      const res = await fetch('/api/ai/suggest-budget-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, taskDescription: taskDesc })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.code) {
          const found = budgetLines.find(b => b.code === data.code)
          if (found) {
            setAiSuggestion({ ...data, id: found.id })
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSuggesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Anomaly Detection
    const formPlanned = plannedCostVal || 0
    const formActual = (status === 'decaisse') ? (actualCostVal || 0) : 0
    
    if (formActual > formPlanned * 2 && formPlanned > 0) {
      if (anomalyLevel < 2) {
        setAnomalyLevel(2)
        setAnomalyMessage(`🔴 Le Coût Réel (${formActual.toLocaleString()}) est plus de 2x supérieur au Coût Prévu (${formPlanned.toLocaleString()}). Veuillez vérifier cette valeur avant de continuer. Tapez OUI pour confirmer.`)
        return
      }
      if (confirmText !== 'OUI') {
        setError('Veuillez taper OUI pour confirmer cette anomalie majeure.')
        return
      }
    } else if (formActual > formPlanned * 1.2 && formPlanned > 0) {
      if (anomalyLevel < 1) {
        setAnomalyLevel(1)
        setAnomalyMessage(`⚠️ Le Coût Réel (${formActual.toLocaleString()}) dépasse de ${Math.round((formActual/formPlanned - 1)*100)}% le Coût Prévu (${formPlanned.toLocaleString()}). Êtes-vous sûr ?`)
        return
      }
    }

    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const result = await createOperation({
      project_id: projectId,
      budget_line_id: selectedBudgetLine,
      task_code: taskDesc,
      phase_wbs: (formData.get('phase_wbs') as string) || undefined,
      status: status as any,
      planned_cost: formPlanned,
      actual_cost: formActual > 0 ? formActual : undefined,
      funding_source_id: (formData.get('funding_source_id') as string) || undefined,
    })

    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 1000)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h2 className="font-semibold text-lg text-text-primary">Nouvelle opération</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 bg-danger/10 text-danger text-sm rounded border border-danger/20">{error}</div>}
          
          {success && (
            <div className="p-3 bg-success/10 text-success-dark text-sm font-medium rounded border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Opération enregistrée avec succès.
            </div>
          )}

          {anomalyLevel === 1 && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-2 text-orange-700">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{anomalyMessage}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setAnomalyLevel(0)} className="px-3 py-1.5 text-sm font-medium bg-white border border-border rounded shadow-sm text-text-secondary hover:bg-surface-dim">Annuler</button>
                <button type="submit" className="px-3 py-1.5 text-sm font-medium bg-orange-600 text-white rounded shadow-sm hover:bg-orange-700">Confirmer</button>
              </div>
            </div>
          )}

          {anomalyLevel === 2 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-2 text-red-700">
                <AlertOctagon className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{anomalyMessage}</p>
              </div>
              <input 
                type="text" 
                value={confirmText} 
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Tapez OUI"
                className="w-full border border-red-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
              />
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => { setAnomalyLevel(0); setConfirmText('') }} className="px-3 py-1.5 text-sm font-medium bg-white border border-border rounded shadow-sm text-text-secondary hover:bg-surface-dim">Annuler</button>
                <button type="submit" disabled={confirmText !== 'OUI'} className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded shadow-sm hover:bg-red-700 disabled:opacity-50">Confirmer</button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Code / Description Tâche *</label>
            <input 
              required 
              type="text" 
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="Ex: T-001 Formation des agents" 
            />
            {showAiBtn && (
              <button 
                type="button" 
                onClick={handleAiSuggest}
                disabled={suggesting}
                className="mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {suggesting ? 'Analyse...' : '✨ Suggestion IA'}
              </button>
            )}
            {aiSuggestion && (
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between animate-in fade-in zoom-in-95">
                <p className="text-sm text-indigo-900">💡 Ligne suggérée : <span className="font-semibold">{aiSuggestion.code} {aiSuggestion.label}</span></p>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedBudgetLine(aiSuggestion.id)
                    setAiSuggestion(null)
                    setShowAiBtn(false)
                  }}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 font-medium shadow-sm transition-colors"
                >
                  Utiliser
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phase / WBS (Optionnel)</label>
            <input type="text" name="phase_wbs" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: 1. Diagnostic" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Ligne budgétaire *</label>
            <select 
              required 
              value={selectedBudgetLine}
              onChange={e => { setSelectedBudgetLine(e.target.value); setAiSuggestion(null); setShowAiBtn(false) }}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
            >
              <option value="">Sélectionner une ligne...</option>
              {budgetLines.map(bl => (
                <option key={bl.id} value={bl.id}>{bl.code} {bl.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Source de financement (Optionnel)</label>
            <select name="funding_source_id" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
              <option value="">Liée à la ligne budgétaire</option>
              {fundingSources.map(fs => (
                <option key={fs.id} value={fs.id}>{fs.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Statut *</label>
            <select 
              required 
              name="status" 
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setAnomalyLevel(0)
              }}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface"
            >
              <option value="planifie">Planifié</option>
              <option value="engage">Engagé</option>
              <option value="decaisse">Décaissé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Coût Prévu (FCFA) *</label>
            <div className="relative">
              <input required type="number" min="0" step="1" value={plannedCostVal || ''} onChange={e => { setPlannedCostVal(Number(e.target.value)); setAnomalyLevel(0) }} className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
            </div>
          </div>

          {status === 'decaisse' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Coût Réel (FCFA)</label>
              <div className="relative">
                <input type="number" min="0" step="1" value={actualCostVal || ''} onChange={e => { setActualCostVal(Number(e.target.value)); setAnomalyLevel(0) }} className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-dim border border-border rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
