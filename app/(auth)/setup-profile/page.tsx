'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function SetupProfilePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        setUserEmail(user.email)
      } else {
        router.push('/login')
      }
    }
    fetchUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      
      // Update password
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateAuthError) {
        setError("Erreur lors de la mise à jour du mot de passe.")
        return
      }

      // Update profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: `${firstName} ${lastName}`
        })
      }

      // Redirect to onboarding (which will auto-accept invitations and redirect to projects)
      router.push('/onboarding')
      router.refresh()
    })
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-green-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight">
          Bienvenue sur Smart-Project-Manager
        </h1>
        <p className="text-white/70 mt-2 text-sm font-medium">
          Créez votre profil pour rejoindre votre organisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 text-red-200 text-sm rounded-xl border border-red-500/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white/90 mb-1.5">Email</label>
          <input
            type="email"
            value={userEmail}
            disabled
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1.5">Prénom</label>
            <input
              type="text"
              name="firstName"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1.5">Nom</label>
            <input
              type="text"
              name="lastName"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-1.5">Confirmer le mot de passe</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : 'Valider et rejoindre'}
        </button>
      </form>
    </div>
  )
}
