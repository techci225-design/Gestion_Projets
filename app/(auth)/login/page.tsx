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
    <div className="bg-white/10 backdrop-blur-md border border-white/20 w-full rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
      
      {/* Decorative gradient blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-3 text-white">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-inner">
            <BriefcaseBusiness className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
            Smart-Project-Manager
          </h1>
        </div>
        <p className="text-white/70 text-sm font-medium tracking-wide">
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
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-semibold text-white/90 mb-2"
          >
            Adresse email professionnelle
          </label>
          <div className="relative group">
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nom@institution.org"
              className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all backdrop-blur-sm group-hover:bg-white/10"
            />
          </div>
        </div>

        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-semibold text-white/90 mb-2"
          >
            Mot de passe
          </label>
          <div className="relative group">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••••••"
              className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all backdrop-blur-sm pr-12 group-hover:bg-white/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="flex justify-end mt-3">
            <a href="#" className="text-sm font-medium text-white/70 hover:text-white hover:underline transition-colors">
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connexion en cours...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Se connecter
            </>
          )}
        </button>

        <div className="text-center mt-8">
          <p className="text-sm text-white/70">
            Pas encore de compte ?{' '}
            <a href="#" className="font-semibold text-white hover:underline transition-all">
              Créer un compte
            </a>
          </p>
        </div>
      </form>
    </div>
  )
}
