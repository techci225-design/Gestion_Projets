'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users } from 'lucide-react'
import { createOrganizationOnboarding } from '@/lib/actions/onboarding.actions'

const COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Cameroun",
  "Bénin",
  "Togo",
  "Niger",
  "Guinée",
  "Autre"
]

const TEAM_SIZES = [
  "1 - 5 personnes",
  "6 - 20 personnes",
  "21 - 50 personnes",
  "Plus de 50"
]

export default function OnboardingPage() {
  const router = useRouter()
  
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  
  const [orgForm, setOrgForm] = useState({
    name: '',
    country: "Côte d'Ivoire",
    teamSize: "1 - 5 personnes"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      if (!orgForm.name.trim()) {
        throw new Error("Le nom de l'organisation est obligatoire.")
      }

      const formData = new FormData()
      formData.append('name', orgForm.name)
      formData.append('country', orgForm.country)
      formData.append('team_size', orgForm.teamSize)

      const result = await createOrganizationOnboarding(formData)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Success, redirect to projects
      router.push('/projects')
      router.refresh()

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
      setIsPending(false) // Only stop pending if error, otherwise keep loading state during redirect
    }
  }

  return (
    <div className="bg-surface w-full rounded-lg shadow-sm sm:shadow-lg p-8 max-w-md mx-auto my-auto relative overflow-hidden">
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Configurez votre espace</h2>
            <p className="text-sm text-text-secondary">Dernière étape pour accéder à l'application.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nom de l'organisation</label>
            <input
              type="text"
              value={orgForm.name}
              onChange={(e) => setOrgForm({...orgForm, name: e.target.value})}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: Cabinet ALPHA Consulting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Pays d'opération</label>
            <select
              value={orgForm.country}
              onChange={(e) => setOrgForm({...orgForm, country: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Taille de l'équipe</label>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_SIZES.map(size => (
                <label 
                  key={size}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${orgForm.teamSize === size ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-secondary hover:border-primary/50'}`}
                >
                  <input
                    type="radio"
                    name="teamSize"
                    value={size}
                    checked={orgForm.teamSize === size}
                    onChange={(e) => setOrgForm({...orgForm, teamSize: e.target.value})}
                    className="sr-only"
                  />
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium text-center">{size}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-success text-white font-medium py-3 rounded-lg hover:bg-success/90 transition-colors mt-4 text-base flex items-center justify-center gap-2"
          >
            {isPending ? 'Configuration...' : 'Accéder à ProjetPilote ✓'}
          </button>
        </form>
      </div>

    </div>
  )
}
