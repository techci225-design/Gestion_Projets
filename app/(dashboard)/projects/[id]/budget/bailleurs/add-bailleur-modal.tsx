'use client'

import React, { useState } from 'react'
import { X, Save } from 'lucide-react'
import { createFundingSource, updateFundingSource } from '@/lib/actions/budget.actions'

export function AddBailleurModal({
  projectId,
  isOpen,
  onClose,
  initialData
}: {
  projectId: string
  isOpen: boolean
  onClose: () => void
  initialData?: any
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('subvention')
  const [amountCommitted, setAmountCommitted] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || initialData.bailleur_name || '')
        setType(initialData.type || 'subvention')
        setAmountCommitted(initialData.amount_committed?.toString() || initialData.total_engage?.toString() || '')
      } else {
        setName('')
        setType('subvention')
        setAmountCommitted('')
      }
      setError(null)
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const payload = {
      project_id: projectId,
      name,
      type: type as any,
      amount_committed: parseFloat(amountCommitted)
    }

    let res;
    if (initialData?.id || initialData?.funding_source_id) {
      res = await updateFundingSource(initialData.id || initialData.funding_source_id, payload)
    } else {
      res = await createFundingSource(payload)
    }

    if (res.error) {
      setError(res.error)
      setIsSubmitting(false)
    } else {
      setIsSubmitting(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/20 backdrop-blur-sm">
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-md border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {initialData ? 'Modifier la Source' : 'Nouvelle Source de Financement'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-text-secondary hover:bg-surface-dim hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-danger/10 text-danger rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nom du prêteur / bailleur</label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Banque Mondiale"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Type de financement</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface transition-all"
            >
              <option value="bailleur">Bailleur</option>
              <option value="donateur">Donateur</option>
              <option value="etat">Etat</option>
              <option value="subvention">Subvention</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Montant engagé</label>
            <input
              required
              type="number"
              min="0"
              value={amountCommitted}
              onChange={e => setAmountCommitted(e.target.value)}
              placeholder="Ex: 50000000"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface transition-all"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-dim rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
