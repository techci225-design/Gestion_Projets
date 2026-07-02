'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createProcurement } from '@/lib/actions/procurement.actions'

export function AddMarcheModal({ 
  isOpen, 
  onClose, 
  projectId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  projectId: string 
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await createProcurement({
        project_id: projectId,
        description: formData.get('description') as string,
        market_type: formData.get('market_type') as string || undefined,
        method: formData.get('method') as string || undefined,
        review_type: (formData.get('review_type') as any) || undefined,
        planned_notice_date: formData.get('planned_notice_date') as string || undefined,
        contract_signature_date: formData.get('contract_signature_date') as string || undefined,
        estimated_amount: Number(formData.get('estimated_amount')) || 0,
        status: formData.get('status') as string || 'planifie'
      })

      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all">
      <div className="w-full max-w-lg bg-surface shadow-2xl flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <h2 className="text-xl font-semibold text-primary">Nouveau Marché</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-dim rounded-full transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface">
          {error && (
            <div className="p-3 bg-error-container border border-error/20 text-on-error-container rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Description du marché</label>
              <textarea
                name="description"
                required
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Type de marché</label>
                <select
                  name="market_type"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="">Sélectionner</option>
                  <option value="Fournitures">Fournitures</option>
                  <option value="Travaux">Travaux</option>
                  <option value="Services de consultants">Services de consultants</option>
                  <option value="Services autres que les consultants">Services autres que les consultants</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Méthode</label>
                <input
                  name="method"
                  type="text"
                  placeholder="Ex: Appel d'offres"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Type de revue</label>
                <select
                  name="review_type"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="">Aucune</option>
                  <option value="a_priori">A priori</option>
                  <option value="a_posteriori">A posteriori</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Statut</label>
                <select
                  name="status"
                  defaultValue="planifie"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="planifie">Planifié</option>
                  <option value="lance">Lancé</option>
                  <option value="en_evaluation">En évaluation</option>
                  <option value="attribue">Attribué</option>
                  <option value="signe">Signé</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Date prévue d'avis</label>
                <input
                  name="planned_notice_date"
                  type="date"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Date signature</label>
                <input
                  name="contract_signature_date"
                  type="date"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Montant Estimé (FCFA)</label>
              <input
                name="estimated_amount"
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-6 mt-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-dim rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {isPending ? 'Création...' : 'Créer le marché'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
