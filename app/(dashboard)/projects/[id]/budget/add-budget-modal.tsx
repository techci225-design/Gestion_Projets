'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createBudgetLine } from '@/lib/actions/budget.actions'
import { useRouter } from 'next/navigation'

export function AddBudgetModal({ 
  projectId, 
  onClose
}: { 
  projectId: string
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
    
    const result = await createBudgetLine({
      project_id: projectId,
      code: formData.get('code') as string,
      label: formData.get('label') as string,
      initial_allocated_amount: Number(formData.get('initial_allocated_amount')) || 0,
      unit: formData.get('unit') as string || undefined,
      quantity: formData.get('quantity') ? Number(formData.get('quantity')) : undefined,
      unit_cost: formData.get('unit_cost') ? Number(formData.get('unit_cost')) : undefined,
      counterpart_amount: 0
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h2 className="font-semibold text-lg text-text-primary">Nouvelle ligne budgétaire</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Code</label>
              <input required type="text" name="code" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="ex: 1.1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Budget Initial Alloué (FCFA)</label>
              <input required type="number" min="0" step="1" name="initial_allocated_amount" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Libellé</label>
            <input required type="text" name="label" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Description de la dépense" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Unité</label>
              <input type="text" name="unit" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="ex: mois, forfait" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Quantité</label>
              <input type="number" min="0" step="any" name="quantity" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Coût unitaire (FCFA)</label>
              <input type="number" min="0" step="1" name="unit_cost" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
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
