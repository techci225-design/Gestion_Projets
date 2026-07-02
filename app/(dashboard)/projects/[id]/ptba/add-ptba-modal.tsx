'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { createPtbaActivity } from '@/lib/actions/ptba.actions'
import { useRouter } from 'next/navigation'

export function AddPtbaModal({ 
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
    
    const result = await createPtbaActivity({
      project_id: projectId,
      code: formData.get('code') as string,
      title: formData.get('title') as string,
      responsible: formData.get('responsible') as string || undefined,
      fiscal_year: formData.get('fiscal_year') ? Number(formData.get('fiscal_year')) : undefined,
      q1: formData.get('q1') === 'on',
      q2: formData.get('q2') === 'on',
      q3: formData.get('q3') === 'on',
      q4: formData.get('q4') === 'on',
      planned_budget: Number(formData.get('planned_budget')) || 0,
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
          <h2 className="font-semibold text-lg text-text-primary">Nouvelle activité PTBA</h2>
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
              <input required type="text" name="code" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="ex: 1.1.1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Année Fiscale</label>
              <input type="number" name="fiscal_year" defaultValue={new Date().getFullYear()} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Titre de l'activité</label>
            <textarea required name="title" rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Responsable</label>
              <input type="text" name="responsible" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Budget Prévu (FCFA)</label>
              <input type="number" min="0" step="1" name="planned_budget" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Trimestres d'exécution</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="q1" className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Q1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="q2" className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Q2</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="q3" className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Q3</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="q4" className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm">Q4</span>
              </label>
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
