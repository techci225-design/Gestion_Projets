'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeAccountProfile } from './actions'
import styles from '../auth.module.css'

export default function SetupProfilePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        router.replace('/login')
        return
      }

      setUserEmail(user.email)
      setIsLoadingUser(false)
    }

    void fetchUser()
  }, [router])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')
    const firstName = String(formData.get('firstName') || '').trim()
    const lastName = String(formData.get('lastName') || '').trim()

    if (!firstName || !lastName) {
      setError('Renseignez votre prénom et votre nom.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    startTransition(async () => {
      const result = await completeAccountProfile({ firstName, lastName, password })
      if (result.error) {
        setError(result.error)
        return
      }

      router.push('/onboarding')
      router.refresh()
    })
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileHeader}>
        <div className={styles.profileSuccessIcon} aria-hidden="true"><CheckCircle2 size={22} /></div>
        <div>
          <span>COMPTE CONFIRMÉ</span>
          <h1>Finalisez votre profil</h1>
          <p>Complétez votre identité avant de configurer votre espace.</p>
        </div>
      </div>

      <div className={styles.profileProgress} aria-label="Étape 2 sur 2">
        <span className={styles.profileStepDone}><b><Check size={11} /></b> Compte créé</span>
        <span className={styles.profileProgressLine} />
        <span className={styles.profileStepActive}><b>2</b> Votre profil</span>
      </div>

      {error && (
        <div className={styles.profileError} role="alert">
          <CircleAlert size={17} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.profileForm}>
        <div className={styles.profileField}>
          <label htmlFor="profileEmail">Email professionnel</label>
          <div className={`${styles.profileInput} ${styles.profileInputDisabled}`}>
            {isLoadingUser ? <Loader2 className={styles.spinner} size={16} /> : <Mail size={16} />}
            <input id="profileEmail" type="email" value={userEmail} disabled aria-label="Adresse email du compte" placeholder="Chargement de votre email…" />
            <span>Vérifié</span>
          </div>
        </div>

        <div className={styles.profileNameGrid}>
          <div className={styles.profileField}>
            <label htmlFor="profileFirstName">Prénom</label>
            <div className={styles.profileInput}>
              <UserRound size={16} />
              <input id="profileFirstName" type="text" name="firstName" required autoComplete="given-name" placeholder="Votre prénom" />
            </div>
          </div>
          <div className={styles.profileField}>
            <label htmlFor="profileLastName">Nom</label>
            <div className={styles.profileInput}>
              <UserRound size={16} />
              <input id="profileLastName" type="text" name="lastName" required autoComplete="family-name" placeholder="Votre nom" />
            </div>
          </div>
        </div>

        <div className={styles.profileField}>
          <div className={styles.profileLabelRow}><label htmlFor="profilePassword">Créez votre mot de passe</label><span>8 caractères minimum</span></div>
          <div className={styles.profileInput}>
            <LockKeyhole size={16} />
            <input id="profilePassword" type={showPassword ? 'text' : 'password'} name="password" required minLength={8} autoComplete="new-password" placeholder="Votre mot de passe" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className={styles.profileField}>
          <label htmlFor="profileConfirmPassword">Confirmez le mot de passe</label>
          <div className={styles.profileInput}>
            <LockKeyhole size={16} />
            <input id="profileConfirmPassword" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" required minLength={8} autoComplete="new-password" placeholder="Saisissez-le à nouveau" />
            <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'} aria-pressed={showConfirmPassword}>
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.profileSubmit} disabled={isPending || isLoadingUser}>
          {isPending ? <><Loader2 className={styles.spinner} size={18} /> Enregistrement…</> : <>Continuer vers mon espace <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className={styles.profileSecurity}><LockKeyhole size={12} /> Votre accès sera protégé par un mot de passe chiffré.</p>
    </div>
  )
}
