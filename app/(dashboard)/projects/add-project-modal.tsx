'use client'

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createProject } from '@/lib/actions/projects.actions'
import { useRouter } from 'next/navigation'

export function AddProjectModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await createProject(formData)
      if (res.error) {
        setError(res.error)
      } else if (res.success && res.projectId) {
        setIsOpen(false)
        router.push(`/projects/${res.projectId}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Nouveau Projet
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-dim">
              <h3 className="font-semibold text-on-surface">Nouveau Projet</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nom du projet *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Ex: Projet Routier National"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Code du projet</label>
                  <input
                    type="text"
                    name="code"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Ex: PRN-2026"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Date de début</label>
                    <input
                      type="date"
                      name="start_date"
                      className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Date de fin</label>
                    <input
                      type="date"
                      name="end_date"
                      className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
