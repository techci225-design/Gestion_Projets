'use client'

import React, { useState } from 'react'
import { User, Bell, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { updateProfile, updateNotificationPrefs } from '@/lib/actions/profile.actions'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface SettingsProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  notification_prefs: {
    budget_alerts?: boolean
    market_deadlines?: boolean
    critical_risks?: boolean
  } | null
}

export function SettingsClient({ profile }: { profile: SettingsProfile }) {
  const router = useRouter()
  const supabase = createClient()
  
  const defaultPrefs = {
    budget_alerts: true,
    market_deadlines: true,
    critical_risks: true,
    ...profile.notification_prefs
  }

  // State for Profile Form
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // State for Security
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // State for Notifications
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [prefsLoading, setPrefsLoading] = useState(false)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileSuccess(false)
    setProfileError(null)

    const res = await updateProfile({ full_name: fullName, phone })
    if (res.error) {
      setProfileError(res.error)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setProfileLoading(false)
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    setResetSuccess(false)
    setResetError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(profile.email)
    
    if (error) {
      setResetError(error.message)
    } else {
      setResetSuccess(true)
    }
    setResetLoading(false)
  }

  const handlePrefToggle = async (key: keyof typeof defaultPrefs) => {
    setPrefsLoading(true)
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    
    await updateNotificationPrefs(newPrefs)
    setPrefsLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="grid gap-6">
      {/* SECTION 1: MON PROFIL */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-dim flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-text-primary">Mon profil</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
            {profileError && (
              <div className="p-3 bg-danger/10 text-danger text-sm rounded border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {profileError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Nom complet</label>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Adresse email</label>
              <input 
                type="email" 
                value={profile.email}
                disabled
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface-dim text-text-secondary cursor-not-allowed" 
              />
              <p className="text-xs text-text-tertiary mt-1">L'adresse email ne peut pas être modifiée ici.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Téléphone (Optionnel)</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>

            <div className="pt-2 flex items-center gap-4">
              <button 
                type="submit" 
                disabled={profileLoading}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {profileLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
              {profileSuccess && (
                <span className="text-success text-sm font-medium flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" /> Enregistré
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* SECTION 2: SÉCURITÉ */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-dim flex items-center gap-2">
          <Shield className="w-5 h-5 text-warning" />
          <h3 className="font-bold text-text-primary">Sécurité</h3>
        </div>
        <div className="p-6">
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-text-secondary">
              Vous pouvez réinitialiser votre mot de passe en recevant un lien sécurisé sur votre adresse email ({profile.email}).
            </p>

            {resetError && (
              <div className="p-3 bg-danger/10 text-danger text-sm rounded border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {resetError}
              </div>
            )}

            {resetSuccess ? (
              <div className="p-4 bg-success/10 text-success-dark text-sm rounded border border-success/20 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                Un email de réinitialisation a été envoyé à {profile.email}.
              </div>
            ) : (
              <button 
                type="button" 
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="bg-surface border border-border hover:bg-surface-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Envoi en cours...' : 'Changer mon mot de passe'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: PRÉFÉRENCES DE NOTIFICATIONS */}
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-dim flex items-center gap-2">
          <Bell className="w-5 h-5 text-success" />
          <h3 className="font-bold text-text-primary">Notifications</h3>
        </div>
        <div className="p-6">
          <div className="max-w-xl space-y-6">
            <p className="text-sm text-text-secondary border-b border-border pb-4">
              Choisissez les alertes que vous souhaitez recevoir sur votre tableau de bord.
            </p>

            {[
              { id: 'budget_alerts', label: 'Alertes budgétaires', desc: 'Seuils 80% et 100%' },
              { id: 'market_deadlines', label: 'Échéances marchés', desc: '< 15 jours' },
              { id: 'critical_risks', label: 'Risques critiques', desc: 'Criticité = 9' }
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">{item.label}</h4>
                  <p className="text-xs text-text-secondary">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={prefs[item.id as keyof typeof defaultPrefs]}
                    onChange={() => handlePrefToggle(item.id as keyof typeof defaultPrefs)}
                    disabled={prefsLoading}
                  />
                  <div className="w-11 h-6 bg-surface-dim peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-90 disabled:opacity-50"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: DANGER ZONE */}
      <div className="bg-surface rounded-xl shadow-sm border border-danger/30 overflow-hidden">
        <div className="p-4 border-b border-danger/20 bg-danger/5 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <h3 className="font-bold text-danger">Zone de danger</h3>
        </div>
        <div className="p-6">
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-text-secondary">
              Une fois déconnecté, vous devrez vous reconnecter avec votre email et votre mot de passe pour accéder à vos projets.
            </p>
            <button 
              type="button" 
              onClick={handleSignOut}
              className="bg-danger hover:bg-danger/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
