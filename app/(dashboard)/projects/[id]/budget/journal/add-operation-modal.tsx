'use client'

import React, { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    // Only send actual_cost if status is decaisse
    const actualCostStr = formData.get('actual_cost') as string
    const actualCost = status === 'decaisse' && actualCostStr ? Number(actualCostStr) : undefined

    const result = await createOperation({
      project_id: projectId,
      budget_line_id: formData.get('budget_line_id') as string,
      task_code: formData.get('task_code') as string,
      phase_wbs: (formData.get('phase_wbs') as string) || undefined,
      status: status as any,
      planned_cost: Number(formData.get('planned_cost')) || 0,
      actual_cost: actualCost,
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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h2 className="font-semibold text-lg text-text-primary">Nouvelle opération</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-danger/10 text-danger text-sm rounded border border-danger/20">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-success/10 text-success-dark text-sm font-medium rounded border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Opération enregistrée avec succès.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Code / ID Tâche *</label>
            <input required type="text" name="task_code" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: T-001" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phase / WBS (Optionnel)</label>
            <input type="text" name="phase_wbs" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: 1. Diagnostic" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Ligne budgétaire *</label>
            <select required name="budget_line_id" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
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
              onChange={(e) => setStatus(e.target.value)}
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
              <input required type="number" min="0" step="1" name="planned_cost" className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
            </div>
          </div>

          {status === 'decaisse' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-text-primary mb-1">Coût Réel (FCFA)</label>
              <div className="relative">
                <input type="number" min="0" step="1" name="actual_cost" className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
              </div>
            </div>
          )}

        </form>

        <div className="p-4 border-t border-border bg-surface-dim flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-lg transition-colors">
            Annuler
          </button>
          <button type="button" onClick={(e) => {
            const form = e.currentTarget.closest('.fixed')?.querySelector('form')
            if (form) form.requestSubmit()
          }} disabled={loading || success} className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm flex items-center justify-center min-w-[120px]">
            {loading ? 'Enregistrement...' : success ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </>
  )
}
