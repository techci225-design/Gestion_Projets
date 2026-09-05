'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

const userSchema = z.object({
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type UserForm = z.infer<typeof userSchema>

const initialForm: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userForm, setUserForm] = useState<UserForm>(initialForm)

  const passwordChecks = [
    userForm.password.length >= 8,
    /[a-z]/.test(userForm.password),
    /[A-Z]/.test(userForm.password),
    /[0-9]/.test(userForm.password),
  ]
  const passwordScore = passwordChecks.filter(Boolean).length
  const strengthLabel = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'][passwordScore]

  const handleUserChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    if (error) setError(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      userSchema.parse(userForm)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
          data: {
            full_name: `${userForm.firstName} ${userForm.lastName}`,
            first_name: userForm.firstName,
            last_name: userForm.lastName,
          },
        },
      })

      if (signUpError) {
        const message = signUpError.message.toLowerCase()
        if (message.includes('already registered')) {
          throw new Error('Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.')
        }
        if (message.includes('disabled') || message.includes('désactivées') || message.includes('not allowed')) {
          throw new Error('SIGNUPS_DISABLED')
        }
        if (message.includes('6 characters')) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.')
        }
        throw signUpError
      }

      if (data.session && data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: `${userForm.firstName} ${userForm.lastName}`,
          email: userForm.email,
        })
        router.push('/onboarding')
        router.refresh()
        return
      }

      setStep(2)
      setIsPending(false)
    } catch (caughtError: unknown) {
      if (caughtError instanceof z.ZodError) {
        setError(caughtError.issues[0]?.message || 'Erreur de validation')
      } else if (caughtError instanceof Error) {
        setError(caughtError.message || 'Une erreur est survenue.')
      } else {
        setError('Une erreur est survenue.')
      }
      setIsPending(false)
    }
  }

  if (step === 2) {
    return (
      <div className={`${styles.registerCard} ${styles.confirmationCard}`}>
        <div className={styles.confirmationIcon}><Mail size={26} /></div>
        <span className={styles.confirmationKicker}>DERNIÈRE ÉTAPE</span>
        <h1>Vérifiez votre boîte mail</h1>
        <p>Nous avons envoyé un lien d’activation à :</p>
        <strong className={styles.confirmationEmail}>{userForm.email}</strong>
        <div className={styles.confirmationSteps}>
          <span><Check size={15} /> Ouvrez l’email de Smart-Project-Manager</span>
          <span><Check size={15} /> Cliquez sur le lien de confirmation</span>
          <span><Check size={15} /> Connectez-vous à votre nouvel espace</span>
        </div>
        <button type="button" className={styles.backToLogin} onClick={() => router.push('/login')}>
          <ArrowLeft size={16} /> Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className={styles.registerCard}>
      <div className={styles.registerHeader}>
        <div className={styles.registerIcon} aria-hidden="true"><BriefcaseBusiness size={20} /></div>
        <div>
          <span>CRÉATION DE VOTRE ESPACE</span>
          <h1>Créer un compte</h1>
          <p>Configurez votre accès en quelques instants.</p>
        </div>
      </div>

      <div className={styles.registerProgress} aria-label="Étape 1 sur 2">
        <span className={styles.progressActive}><b>1</b> Vos informations</span>
        <span className={styles.progressLine} />
        <span><b>2</b> Confirmation</span>
      </div>

      {error === 'SIGNUPS_DISABLED' ? (
        <div className={styles.registerError} role="alert">
          <CircleAlert size={18} />
          <span><strong>Inscriptions temporairement suspendues</strong><small>Contactez l’administrateur pour créer votre accès.</small></span>
        </div>
      ) : error ? (
        <div className={styles.registerError} role="alert">
          <CircleAlert size={18} />
          <span>{error}</span>
          {error.includes('Connectez-vous') && <Link href="/login">Connexion</Link>}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={styles.registerForm}>
        <div className={styles.nameGrid}>
          <div className={styles.compactField}>
            <label htmlFor="firstName">Prénom</label>
            <div className={styles.compactInput}>
              <UserRound size={16} />
              <input id="firstName" type="text" name="firstName" value={userForm.firstName} onChange={handleUserChange} required autoComplete="given-name" placeholder="Jean" />
            </div>
          </div>
          <div className={styles.compactField}>
            <label htmlFor="lastName">Nom</label>
            <div className={styles.compactInput}>
              <UserRound size={16} />
              <input id="lastName" type="text" name="lastName" value={userForm.lastName} onChange={handleUserChange} required autoComplete="family-name" placeholder="Dupont" />
            </div>
          </div>
        </div>

        <div className={styles.compactField}>
          <label htmlFor="registerEmail">Email professionnel</label>
          <div className={styles.compactInput}>
            <Mail size={16} />
            <input id="registerEmail" type="email" name="email" value={userForm.email} onChange={handleUserChange} required autoComplete="email" inputMode="email" placeholder="nom@organisation.com" />
          </div>
        </div>

        <div className={styles.compactField}>
          <div className={styles.passwordLabel}><label htmlFor="registerPassword">Mot de passe</label>{userForm.password && <span data-score={passwordScore}>{strengthLabel}</span>}</div>
          <div className={styles.compactInput}>
            <LockKeyhole size={16} />
            <input id="registerPassword" type={showPassword ? 'text' : 'password'} name="password" value={userForm.password} onChange={handleUserChange} required autoComplete="new-password" placeholder="8 caractères minimum" />
            <button type="button" className={styles.compactToggle} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {userForm.password && (
            <div className={styles.strengthMeter} aria-label={`Solidité du mot de passe : ${strengthLabel}`}>
              {[1, 2, 3, 4].map((level) => <span key={level} className={passwordScore >= level ? styles.strengthFilled : undefined} />)}
            </div>
          )}
        </div>

        <div className={styles.compactField}>
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <div className={styles.compactInput}>
            <LockKeyhole size={16} />
            <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={userForm.confirmPassword} onChange={handleUserChange} required autoComplete="new-password" placeholder="Saisissez-le à nouveau" />
            <button type="button" className={styles.compactToggle} onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'} aria-pressed={showConfirmPassword}>
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <p className={styles.legalText}>En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité.</p>

        <button type="submit" className={styles.registerSubmit} disabled={isPending}>
          {isPending ? <><Loader2 className={styles.spinner} size={18} /> Création en cours…</> : <>Créer mon espace <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className={styles.registerLogin}>Déjà un compte ? <Link href="/login">Se connecter <ArrowRight size={13} /></Link></div>
    </div>
  )
}
