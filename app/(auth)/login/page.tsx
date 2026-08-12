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
    <div className="bg-white w-full rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center">
      
      {/* Form Content Wrapper */}
      <div className="w-full px-8 py-8 sm:px-12 pt-8 lg:pt-10 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-8 w-full flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30 text-white">
            <BriefcaseBusiness className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Smart-Project-Manager
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Plateforme de gestion de projets
          </p>
          <div className="h-1 w-12 bg-orange-500 rounded-full mt-3"></div>
        </div>

        {/* Error Message */}
        {error === 'EMAIL_NOT_CONFIRMED' ? (
          <div className="mb-6 w-full bg-orange-50 border border-orange-200 text-orange-800 text-sm p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 shrink-0 mt-0.5 text-orange-600" />
              <div>
                <p className="font-semibold">Votre compte est en attente de confirmation.</p>
                <p className="text-orange-700/80">Vérifiez vos emails ou contactez l'administrateur.</p>
              </div>
            </div>
            {resendStatus === 'success' ? (
              <p className="text-green-600 font-medium text-sm">L'email a été renvoyé avec succès.</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'loading'}
                className="bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 font-medium transition-colors disabled:opacity-50 text-sm self-start"
              >
                {resendStatus === 'loading' ? 'Envoi en cours...' : "Renvoyer l'email"}
              </button>
            )}
          </div>
        ) : error ? (
          <div className="mb-6 w-full bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl font-medium">
            {error}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 lg:space-y-5">
          
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-700" /> Adresse email professionnelle
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="utilisateur@projet-ci.ci"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" /> Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm tracking-widest"
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-transparent text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
              <span className="text-sm font-medium text-slate-600">Se souvenir de moi</span>
            </label>
            <Link href="/forgot-password" className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#e86915] hover:bg-[#d55e10] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              {isPending ? 'Connexion...' : <><BriefcaseBusiness className="w-5 h-5" /> Se connecter</>}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Block */}
      <div className="w-full bg-slate-50 border-t border-slate-100 p-5 flex justify-center mt-0 lg:mt-2">
        <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <BriefcaseBusiness className="w-4 h-4 text-slate-400" /> Pas encore de compte ?{' '}
          <Link href="/register" className="font-bold text-orange-600 hover:text-orange-700">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
