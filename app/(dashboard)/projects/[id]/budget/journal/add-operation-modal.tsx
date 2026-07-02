'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createOperation } from '@/lib/actions/budget.actions'
import { useRouter } from 'next/navigation'

export function AddOperationModal({ 
  projectId,
  budgetLines,
  onClose
}: { 
  projectId: string
  budgetLines: any[]
  onClose: () => void 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const result = await createOperation({
      project_id: projectId,
      budget_line_id: formData.get('budget_line_id') as string,
      task_code: formData.get('task_code') as string,
      status: formData.get('status') as any,
      planned_cost: Number(formData.get('planned_cost')) || 0,
      actual_cost: formData.get('actual_cost') ? Number(formData.get('actual_cost')) : undefined,
    })

    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      onClose()
      router.refresh()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h2 className="font-semibold text-lg text-text-primary">Nouvelle opération</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Tâche</label>
            <input required type="text" name="task_code" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ex: T-1063 - Description..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Ligne budgétaire</label>
            <select required name="budget_line_id" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
              <option value="">Sélectionner une ligne...</option>
              {budgetLines.map(bl => (
                <option key={bl.id} value={bl.id}>{bl.code} {bl.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Statut</label>
            <select required name="status" defaultValue="planifie" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface">
              <option value="planifie">Planifié</option>
              <option value="engage">Engagé</option>
              <option value="decaisse">Décaissé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Coût prévu</label>
              <div className="relative">
                <input required type="number" min="0" step="1" name="planned_cost" className="w-full border border-border rounded-lg px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Coût réel</label>
              <div className="relative">
                <input type="number" min="0" step="1" name="actual_cost" className="w-full border border-border rounded-lg px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-right" placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">FCFA</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-dim rounded-lg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
