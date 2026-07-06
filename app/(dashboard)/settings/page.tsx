import React from 'react'
import { Header } from '@/components/dashboard/Header'
import { Settings, User, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <>
      <Header title="Paramètres" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Paramètres du compte</h2>
        
        <div className="grid gap-6">
          <div className="bg-surface rounded-lg shadow-sm border border-border p-6 flex items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">Profil</h3>
              <p className="text-sm text-text-secondary mb-4">
                Gérez vos informations personnelles et votre avatar. (Bientôt disponible)
              </p>
              <button disabled className="px-4 py-2 bg-surface-dim text-text-secondary rounded-lg text-sm font-medium cursor-not-allowed">
                Modifier le profil
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow-sm border border-border p-6 flex items-start gap-4">
            <div className="p-3 bg-success/10 text-success rounded-lg">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">Préférences de notification</h3>
              <p className="text-sm text-text-secondary mb-4">
                Choisissez comment vous souhaitez être alerté (email, in-app). (Bientôt disponible)
              </p>
              <button disabled className="px-4 py-2 bg-surface-dim text-text-secondary rounded-lg text-sm font-medium cursor-not-allowed">
                Gérer les alertes
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow-sm border border-border p-6 flex items-start gap-4">
            <div className="p-3 bg-warning/10 text-warning rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">Sécurité</h3>
              <p className="text-sm text-text-secondary mb-4">
                Mettez à jour votre mot de passe et vos paramètres de sécurité. (Bientôt disponible)
              </p>
              <button disabled className="px-4 py-2 bg-surface-dim text-text-secondary rounded-lg text-sm font-medium cursor-not-allowed">
                Sécurité du compte
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
