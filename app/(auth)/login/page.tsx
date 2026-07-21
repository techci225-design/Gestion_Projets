'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, BriefcaseBusiness, Mail } from 'lucide-react'
import { login } from './actions'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  
  // Read URL search params to display errors from callbacks
  useEffect(() => {
    const url = new URL(window.location.href)
    const errParam = url.searchParams.get('error')
    const msgParam = url.searchParams.get('message')
    if (errParam && errParam !== 'EMAIL_NOT_CONFIRMED') {
      if (errParam === 'auth-callback') {
        setError(`Erreur d'authentification. Si vous avez cliqué sur un lien depuis un email, assurez-vous de l'ouvrir dans le même navigateur. Détail: ${msgParam || ''}`)
      } else {
        setError(msgParam || errParam)
      }
    }
  }, [])

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
    <div className="bg-white/10 backdrop-blur-md border border-white/20 w-full rounded-2xl shadow-2xl p-4 sm:p-6 relative overflow-hidden mx-auto max-w-md">
      
      {/* Decorative gradient blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      {/* Header */}
      <div className="text-center mb-4 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-1 text-white">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 shadow-inner">
            <BriefcaseBusiness className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
            Smart-Project-Manager
          </h1>
        </div>
        <p className="text-white/70 text-xs font-medium tracking-wide">
          Pilotage de vos projets bailleurs
        </p>
      </div>

      {/* Error Message */}
      {error === 'EMAIL_NOT_CONFIRMED' ? (
        <div className="mb-4 bg-warning/10 border border-warning/20 text-warning-dark text-xs p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Votre compte est en attente de confirmation.</p>
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
              className="bg-warning text-white py-1.5 px-3 rounded-md hover:bg-warning/90 font-medium transition-colors disabled:opacity-50 text-xs"
            >
              {resendStatus === 'loading' ? 'Envoi en cours...' : "Renvoyer l'email"}
            </button>
          )}
        </div>
      ) : error ? (
        <div className="mb-4 bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg">
          {error}
        </div>
      ) : null}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-white/90 mb-1">
            Adresse email professionnelle
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="nom@institution.org"
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-white/90 mb-1">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••••••"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-between items-center text-sm">
            <Link href="/forgot-password" className="text-xs font-medium text-white/70 hover:text-white">Mot de passe oublié ?</Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]"
        >
          {isPending ? 'Connexion...' : <><Lock className="w-4 h-4" /> Se connecter</>}
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-white/70">
            Pas encore de compte ?{' '}
            <Link href="/register" className="font-semibold text-white hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
