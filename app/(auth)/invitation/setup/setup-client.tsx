'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { acceptInvitationFlow } from '@/lib/actions/invitations.actions'

export default function SetupClient({ 
  invitationId,
  email, 
  orgName, 
  role
}: { 
  invitationId: string,
  email: string, 
  orgName: string,
  role: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    startTransition(async () => {
      const res = await acceptInvitationFlow(invitationId, password)

      if (res.error) {
        setError(res.error)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl w-full">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-white leading-tight">
          Rejoindre l'organisation
        </h1>
        <p className="text-white/70 mt-2 text-sm">
          Vous avez été invité à rejoindre : <br/>
          <span className="font-semibold text-white">{orgName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm bg-red-500/20 border border-red-500/50 text-red-100 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Adresse email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-white/5 border border-white/10 text-white/50 rounded-xl px-4 py-2.5 outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Votre rôle</label>
          <input
            type="text"
            value={role === 'OWNER' ? 'Propriétaire' : role === 'admin' ? 'Administrateur' : role === 'PROJECT_MANAGER' ? 'Chef de projet' : role === 'ACCOUNTANT' ? 'Comptable' : role === 'CONSULTANT' ? 'Consultant' : role === 'FUNDER_READONLY' ? 'Bailleur (Lecture)' : 'Membre'}
            disabled
            className="w-full bg-white/5 border border-white/10 text-white/50 rounded-xl px-4 py-2.5 outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Créer votre mot de passe</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Confirmer votre mot de passe</label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4"
        >
          {isPending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          <span>{isPending ? 'Création en cours...' : 'Rejoindre l\'organisation'}</span>
        </button>
        <p className="text-xs text-white/50 text-center mt-4">
          En acceptant cette invitation, vous rejoignez l'organisation avec le rôle indiqué.
        </p>
      </form>
    </div>
  )
}
