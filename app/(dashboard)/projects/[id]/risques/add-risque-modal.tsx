'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createRisk } from '@/lib/actions/risks.actions'

export function AddRisqueModal({ 
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
      const result = await createRisk({
        project_id: projectId,
        category: formData.get('category') as string,
        description: formData.get('description') as string,
        probability: Number(formData.get('probability')),
        impact: Number(formData.get('impact')),
        mitigation_strategy: formData.get('mitigation_strategy') as string || undefined,
        responsible: formData.get('responsible') as string || undefined,
        status: (formData.get('status') as any) || 'ouvert'
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
          <h2 className="text-xl font-semibold text-primary">Nouveau Risque</h2>
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
              <label className="block text-sm font-medium text-text-primary mb-1">Catégorie</label>
              <select
                name="category"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
              >
                <option value="">Sélectionner</option>
                <option value="Technique">Technique</option>
                <option value="Financier">Financier</option>
                <option value="Opérationnel">Opérationnel</option>
                <option value="Stratégique">Stratégique</option>
                <option value="Externe">Externe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
              <textarea
                name="description"
                required
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Probabilité (1 à 3)</label>
                <select
                  name="probability"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="1">1 - Faible</option>
                  <option value="2">2 - Moyenne</option>
                  <option value="3">3 - Forte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Impact (1 à 3)</label>
                <select
                  name="impact"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="1">1 - Faible</option>
                  <option value="2">2 - Moyen</option>
                  <option value="3">3 - Majeur</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Stratégie d'atténuation</label>
              <textarea
                name="mitigation_strategy"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Responsable</label>
                <input
                  name="responsible"
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Statut</label>
                <select
                  name="status"
                  defaultValue="ouvert"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
                >
                  <option value="ouvert">Ouvert</option>
                  <option value="en_cours">En cours</option>
                  <option value="clos">Clos</option>
                </select>
              </div>
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
              {isPending ? 'Création...' : 'Créer le risque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
