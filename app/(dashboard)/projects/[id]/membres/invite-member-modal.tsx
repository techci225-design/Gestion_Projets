'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { sendInvitation } from '@/lib/actions/invitations.actions'

export function InviteMemberModal({ 
  isOpen, 
  onClose, 
  projectId,
  allProfiles
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  projectId: string,
  organizationId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await sendInvitation({
        project_id: projectId,
        organization_id: organizationId,
        email: formData.get('email') as string,
        role: formData.get('role') as string
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
      <div className="w-full max-w-md bg-surface shadow-2xl flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <h2 className="text-xl font-semibold text-primary">Inviter un membre</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-dim rounded-full transition-colors text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-surface">
          {error && (
            <div className="p-3 bg-error-container border border-error/20 text-on-error-container rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email de l'invité</label>
              <input
                type="email"
                name="email"
                required
                placeholder="ex: collaborateur@tsbc.com"
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Rôle</label>
              <select
                name="role"
                required
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white"
              >
                <option value="owner">Propriétaire</option>
                <option value="chef_projet">Chef de Projet</option>
                <option value="comptable">Comptable</option>
                <option value="bailleur_lecture">Bailleur (Lecture)</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>
          </div>

          <div className="pt-6 mt-4 flex justify-end gap-3">
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
              {isPending ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
