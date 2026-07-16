'use client'

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { addLogframeItem } from '@/lib/actions/logframe.actions'
import { LogframeItem } from './logframe-client'
import { useRouter } from 'next/navigation'

export function AddLogframeModal({ 
  projectId, 
  parentId,
  defaultLevel,
  onClose
}: { 
  projectId: string
  parentId?: string
  defaultLevel?: LogframeItem['level']
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
    
    try {
      await addLogframeItem(projectId, {
        parent_id: parentId || null,
        level: formData.get('level') as any,
        intervention_label: formData.get('intervention_label') as string,
        indicator: formData.get('indicator') as string || null,
        baseline: formData.get('baseline') as string || null,
        target: formData.get('target') as string || null,
        verification_source: formData.get('verification_source') as string || null,
        risks_assumptions: formData.get('risks_assumptions') as string || null,
      })

      setLoading(false)
      onClose()
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Une erreur est survenue')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-dim">
          <h2 className="font-semibold text-lg text-text-primary">Ajouter un élément</h2>
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
            <label className="block text-sm font-medium text-text-primary mb-1">Niveau</label>
            <select name="level" defaultValue={defaultLevel || 'objectif_global'} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="objectif_global">Objectif Global (Impact)</option>
              <option value="objectif_specifique">Objectif Spécifique (Effet)</option>
              <option value="resultat">Résultat (Extrant)</option>
              <option value="activite">Activité</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description (Intervention)</label>
            <textarea required name="intervention_label" rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Description de l'objectif ou de l'activité..."></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Indicateur (IOV)</label>
              <input type="text" name="indicator" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Ligne de base</label>
              <input type="text" name="baseline" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Cible visée</label>
              <input type="text" name="target" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Source de vérification</label>
              <input type="text" name="verification_source" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Hypothèses & Risques</label>
            <textarea name="risks_assumptions" rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"></textarea>
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
