'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createOrganization } from '@/lib/actions/auth.actions'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    startTransition(async () => {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
      } else {
        setStep(2)
      }
    })
  }

  const handleOrgSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await createOrganization(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/projects')
      }
    })
  }

  return (
    <div className="bg-surface w-full rounded-lg shadow-sm sm:shadow-lg p-8 max-w-md w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2 text-primary">
          <BriefcaseBusiness className="w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tight">ProjetPilote</h1>
        </div>
        <p className="text-text-secondary text-sm">
          {step === 1 ? 'Créez votre compte gratuitement' : 'Configurez votre espace de travail'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 1 ? 'bg-primary text-white' : 'bg-surface-dim text-text-secondary'}`}>
          1
        </div>
        <div className={`h-1 w-12 rounded-full ${step === 2 ? 'bg-primary' : 'bg-surface-dim'}`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step === 2 ? 'bg-primary text-white' : 'bg-surface-dim text-text-secondary'}`}>
          2
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form Step 1: User Account */}
      {step === 1 && (
        <form onSubmit={handleUserSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-text-primary mb-1">Prénom</label>
              <input id="first_name" name="first_name" type="text" required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-text-primary mb-1">Nom</label>
              <input id="last_name" name="last_name" type="text" required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email professionnel</label>
            <input id="email" name="email" type="email" required placeholder="nom@institution.org"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">Mot de passe</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-text-primary mb-1">Confirmer le mot de passe</label>
            <input id="confirm_password" name="confirm_password" type="password" required minLength={8}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button type="submit" disabled={isPending}
            className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {isPending ? 'Création en cours...' : 'Créer mon compte →'}
          </button>
          
          <div className="mt-4 text-center">
            <a href="/login" className="text-sm font-medium text-text-secondary hover:text-primary">
              Déjà un compte ? Se connecter
            </a>
          </div>
        </form>
      )}

      {/* Form Step 2: Organization */}
      {step === 2 && (
        <form onSubmit={handleOrgSubmit} className="space-y-5">
          <div className="flex items-center justify-center gap-2 mb-6 text-success bg-success/10 p-3 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Compte créé avec succès !</span>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">Nom de l'organisation</label>
            <input id="name" name="name" type="text" required placeholder="Cabinet ALPHA Consulting"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-text-primary mb-1">Pays</label>
            <select id="country" name="country" required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
            >
              <option value="CI">Côte d'Ivoire</option>
              <option value="SN">Sénégal</option>
              <option value="BF">Burkina Faso</option>
              <option value="ML">Mali</option>
              <option value="CM">Cameroun</option>
              <option value="TG">Togo</option>
              <option value="BJ">Bénin</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-text-primary mb-1">Taille de l'organisation</label>
            <select id="size" name="size" required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
            >
              <option value="1-5">1 - 5 personnes</option>
              <option value="6-20">6 - 20 personnes</option>
              <option value="21-50">21 - 50 personnes</option>
              <option value="+50">+50 personnes</option>
            </select>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 mt-4"
          >
            {isPending ? 'Configuration en cours...' : 'Accéder à ProjetPilote ✓'}
          </button>
        </form>
      )}
    </div>
  )
}
