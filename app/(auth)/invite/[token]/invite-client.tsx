'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { acceptInvitation } from '@/lib/actions/invitations.actions'
import { createClient } from '@/lib/supabase/client'

export default function InviteClient({ 
  token, 
  email, 
  orgName, 
  isExistingUser,
  existingFirstName,
  existingLastName
}: { 
  token: string, 
  email: string, 
  orgName: string,
  isExistingUser: boolean,
  existingFirstName?: string,
  existingLastName?: string
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

    if (!isExistingUser) {
      const confirmPassword = formData.get('confirmPassword') as string
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
    }

    startTransition(async () => {
      // Pour gérer le cas de l'utilisateur créé via "inviteUserByEmail" de Supabase :
      // On s'assure qu'on envoie le nouveau mot de passe à la server action qui l'assignera 
      // ou on utilise l'API signInWithPassword classique si c'est un vieil utilisateur
      
      // We pass the data to server action
      const res = await acceptInvitation(token, {
        password: password,
        first_name: isExistingUser ? existingFirstName : formData.get('firstName') as string,
        last_name: isExistingUser ? existingLastName : formData.get('lastName') as string
      })

      if (res.error) {
        setError(res.error)
      } else {
        // Force refresh session
        const supabase = createClient()
        await supabase.auth.refreshSession()
        router.push('/projects')
        router.refresh()
      }
    })
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Vous avez été invité à rejoindre {orgName}
        </h1>
        <p className="text-text-secondary mt-2">
          {isExistingUser 
            ? `Connectez-vous avec ${email} pour accepter`
            : "Créez votre compte pour accepter l'invitation"
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface-dim text-text-secondary cursor-not-allowed"
          />
        </div>

        {!isExistingUser && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Prénom</label>
              <input
                type="text"
                name="firstName"
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Nom</label>
              <input
                type="text"
                name="lastName"
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              placeholder="Min. 8 caractères"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isExistingUser && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-text-tertiary hover:text-text-primary"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 disabled:opacity-70"
        >
          {isPending 
            ? 'Veuillez patienter...' 
            : (isExistingUser ? 'Se connecter et accepter →' : 'Accepter et rejoindre →')
          }
        </button>
      </form>
    </div>
  )
}
