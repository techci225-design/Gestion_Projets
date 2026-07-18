'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Users, Save, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useOrganization } from '@/lib/contexts/OrganizationContext'
import { useRouter } from 'next/navigation'

export function OrganizationSettingsClient({ adminOrgs }: { adminOrgs: any[] }) {
  const { activeOrganization, setActiveOrganization } = useOrganization()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (activeOrganization) {
      setName(activeOrganization.name)
    }
  }, [activeOrganization])

  // If the currently active organization is not one where the user is admin, show a message
  const isCurrentOrgAdmin = activeOrganization && adminOrgs.some(org => org.id === activeOrganization.id)

  if (!isCurrentOrgAdmin) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        Vous n'êtes pas administrateur de l'organisation actuellement sélectionnée. 
        Veuillez changer d'organisation via le menu du haut.
      </div>
    )
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrganization) return

    setLoading(true)
    setSuccess(false)
    const { error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', activeOrganization.id)

    if (!error) {
      setSuccess(true)
      setActiveOrganization({ ...activeOrganization, name })
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-dim flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-text-primary">Profil de l'organisation</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleUpdateName} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Nom de l'organisation
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>

            {success && (
              <div className="text-sm text-green-600 font-medium">
                Modifications enregistrées avec succès !
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-dim flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-text-primary">Membres de l'organisation</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-secondary mb-4">
            Gérez les collaborateurs de votre espace de travail. Les administrateurs peuvent créer de nouveaux projets.
          </p>
          <div className="bg-surface-dim rounded-lg border border-border p-8 text-center text-text-secondary">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Le module d'invitation par email sera bientôt disponible.</p>
            <p className="text-xs mt-2">Pour l'instant, seul le Super-Admin peut ajouter de nouveaux membres via la base de données.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
