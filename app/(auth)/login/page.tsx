'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, BriefcaseBusiness, Mail } from 'lucide-react'
import { login } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [attemptedEmail, setAttemptedEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setResendStatus('idle')
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    setAttemptedEmail(email)
    
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        if (result.error.toLowerCase().includes('not confirmed') || result.error.toLowerCase().includes('non confirmé')) {
          setError('EMAIL_NOT_CONFIRMED')
        } else {
          setError(result.error)
        }
      } else {
        router.push('/projects')
      }
    })
  }

  const handleResend = async () => {
    if (!attemptedEmail) return
    setResendStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: attemptedEmail
    })
    
    if (error) {
      setResendStatus('error')
    } else {
      setResendStatus('success')
    }
  }

  return (
    <div className="bg-surface w-full rounded-lg shadow-sm sm:shadow-lg p-8">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2 text-primary">
          <BriefcaseBusiness className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">ProjetPilote</h1>
        </div>
        <p className="text-text-secondary text-sm">
          Pilotage de vos projets bailleurs
        </p>
      </div>

      {/* Error Message */}
      {error === 'EMAIL_NOT_CONFIRMED' ? (
        <div className="mb-6 bg-warning/10 border border-warning/20 text-warning-dark text-sm p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Votre compte est en attente de confirmation.</p>
              <p>Vérifiez vos emails ou contactez TSBC.</p>
            </div>
          </div>
          {resendStatus === 'success' ? (
            <p className="text-success font-medium">L'email a été renvoyé avec succès.</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === 'loading'}
              className="bg-warning text-white py-2 rounded-md hover:bg-warning/90 font-medium transition-colors disabled:opacity-50"
            >
              {resendStatus === 'loading' ? 'Envoi en cours...' : "Renvoyer l'email de confirmation"}
            </button>
          )}
          {resendStatus === 'error' && (
            <p className="text-danger text-xs">Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard.</p>
          )}
        </div>
      ) : error ? (
        <div className="mb-6 bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg">
          {error}
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Adresse email professionnel
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="nom@institution.org"
            className="w-full px-4 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-text-primary mb-1"
          >
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full px-4 py-2 border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-8 text-center text-sm">
        <span className="text-text-secondary">Pas encore de compte ? </span>
        <a href="/register" className="font-medium text-primary hover:underline">
          Créer un compte
        </a>
      </div>
    </div>
  )
}
