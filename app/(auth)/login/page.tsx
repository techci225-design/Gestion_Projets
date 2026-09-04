'use client'

import { Suspense, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CircleAlert, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { login } from './actions'
import styles from '../auth.module.css'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.formLoading}><Loader2 size={24} /></div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dismissCallbackError, setDismissCallbackError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attemptedEmail, setAttemptedEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const callbackError = (() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (!errorParam || errorParam === 'EMAIL_NOT_CONFIRMED') return null
    if (errorParam === 'auth-callback') {
      return `Erreur d'authentification. Si vous avez cliqué sur un lien depuis un email, ouvrez-le dans le même navigateur. ${messageParam || ''}`
    }
    return messageParam || errorParam
  })()
  const displayedError = error ?? (dismissCallbackError ? null : callbackError)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setDismissCallbackError(true)
    setResendStatus('idle')
    const formData = new FormData(event.currentTarget)
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
        return
      }
      router.push('/projects')
    })
  }

  const handleResend = async () => {
    if (!attemptedEmail) return
    setResendStatus('loading')
    const supabase = createClient()
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: attemptedEmail })
    setResendStatus(resendError ? 'error' : 'success')
  }

  return (
    <div className={styles.loginCard}>
      <div className={styles.loginIcon} aria-hidden="true"><BriefcaseBusiness size={24} /></div>
      <div className={styles.loginHeading}>
        <span>ESPACE SÉCURISÉ</span>
        <h1>Heureux de vous revoir</h1>
        <p>Connectez-vous pour retrouver vos projets et vos indicateurs.</p>
      </div>

      {displayedError === 'EMAIL_NOT_CONFIRMED' ? (
        <div className={styles.warningBox} role="alert">
          <CircleAlert size={19} />
          <div>
            <strong>Compte en attente de confirmation</strong>
            <p>Vérifiez vos emails ou contactez votre administrateur.</p>
            {resendStatus === 'success' ? (
              <span className={styles.successMessage}>L’email de confirmation a été renvoyé.</span>
            ) : (
              <button type="button" onClick={handleResend} disabled={resendStatus === 'loading'}>
                {resendStatus === 'loading' ? 'Envoi en cours…' : 'Renvoyer l’email'}
              </button>
            )}
            {resendStatus === 'error' && <span className={styles.errorMessage}>L’envoi a échoué. Réessayez.</span>}
          </div>
        </div>
      ) : displayedError ? (
        <div className={styles.errorBox} role="alert"><CircleAlert size={18} /><span>{displayedError}</span></div>
      ) : null}

      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <div className={styles.fieldGroup}>
          <label htmlFor="email">Adresse email professionnelle</label>
          <div className={styles.inputShell}>
            <Mail size={18} aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="nom@organisation.com"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="password">Mot de passe</label>
            <Link href="/forgot-password">Mot de passe oublié ?</Link>
          </div>
          <div className={styles.inputShell}>
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Votre mot de passe"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className={styles.rememberRow}>
          <input type="checkbox" name="remember" />
          <span>Rester connecté sur cet appareil</span>
        </label>

        <button type="submit" className={styles.submitButton} disabled={isPending}>
          {isPending ? <><Loader2 className={styles.spinner} size={19} /> Connexion en cours…</> : <>Se connecter <ArrowRight size={19} /></>}
        </button>
      </form>

      <div className={styles.signupPrompt}>
        <span>Vous découvrez la plateforme ?</span>
        <Link href="/register">Créer un compte <ArrowRight size={14} /></Link>
      </div>
    </div>
  )
}
