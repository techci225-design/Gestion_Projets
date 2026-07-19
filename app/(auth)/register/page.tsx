'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BriefcaseBusiness, Lock, Eye, EyeOff, Building2, Users } from 'lucide-react'
import { z } from 'zod'
import { createOrganizationOnboarding } from '@/lib/actions/onboarding.actions'

const userSchema = z.object({
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
})

type UserForm = z.infer<typeof userSchema>

const COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Cameroun",
  "Bénin",
  "Togo",
  "Niger",
  "Guinée",
  "Autre"
]

const TEAM_SIZES = [
  "1 - 5 personnes",
  "6 - 20 personnes",
  "21 - 50 personnes",
  "Plus de 50"
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 1 State
  const [userForm, setUserForm] = useState<UserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  // Step 2 State
  const [orgForm, setOrgForm] = useState({
    name: '',
    country: "Côte d'Ivoire",
    teamSize: "1 - 5 personnes"
  })

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score += 25
    if (pass.match(/[a-z]+/)) score += 25
    if (pass.match(/[A-Z]+/)) score += 25
    if (pass.match(/[0-9]+/)) score += 25
    return score
  }
  const passwordScore = getPasswordStrength(userForm.password)

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value })
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      // Local validation
      userSchema.parse(userForm)

      // Supabase signup
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: `${userForm.firstName} ${userForm.lastName}`,
            first_name: userForm.firstName,
            last_name: userForm.lastName
          }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Un compte existe déjà avec cet email. Connectez-vous →')
        }
        throw signUpError
      }

      // Automatically advance to step 2 without full page reload
      setStep(2)

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else {
        setError(err.message || 'Une erreur est survenue.')
      }
    } finally {
      setIsPending(false)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      if (!orgForm.name.trim()) {
        throw new Error("Le nom de l'organisation est obligatoire.")
      }

      const formData = new FormData()
      formData.append('name', orgForm.name)
      formData.append('country', orgForm.country)
      formData.append('team_size', orgForm.teamSize)

      const result = await createOrganizationOnboarding(formData)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Success, redirect to projects
      router.push('/projects')
      router.refresh()

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.')
      setIsPending(false) // Only stop pending if error, otherwise keep loading state during redirect
    }
  }

  return (
    <div className="bg-surface w-full rounded-lg shadow-sm sm:shadow-lg p-8 max-w-md mx-auto my-auto relative overflow-hidden">
      
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
      {error && (
        <div className="mb-6 bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          {error.includes('Connectez-vous') && (
            <a href="/login" className="font-bold underline ml-2 shrink-0">Connexion</a>
          )}
        </div>
      )}

      {/* Step 1: User Account */}
      <div className={`transition-all duration-500 ease-in-out ${step === 1 ? 'opacity-100 translate-x-0 relative block' : 'opacity-0 -translate-x-full absolute invisible'}`}>
        <h2 className="text-xl font-bold text-text-primary mb-6">Créer votre espace ProjetPilote</h2>
        
        <form onSubmit={handleStep1Submit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-1">Prénom</label>
              <input
                type="text"
                name="firstName"
                value={userForm.firstName}
                onChange={handleUserChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                placeholder="Jean"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-1">Nom</label>
              <input
                type="text"
                name="lastName"
                value={userForm.lastName}
                onChange={handleUserChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email professionnel</label>
            <input
              type="email"
              name="email"
              value={userForm.email}
              onChange={handleUserChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
              placeholder="jean.dupont@entreprise.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={userForm.password}
                onChange={handleUserChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password strength bar */}
            {userForm.password && (
              <div className="mt-2 flex gap-1 h-1">
                <div className={`flex-1 rounded-full ${passwordScore >= 25 ? 'bg-danger' : 'bg-border'}`}></div>
                <div className={`flex-1 rounded-full ${passwordScore >= 50 ? 'bg-warning' : 'bg-border'}`}></div>
                <div className={`flex-1 rounded-full ${passwordScore >= 75 ? 'bg-success' : 'bg-border'}`}></div>
                <div className={`flex-1 rounded-full ${passwordScore >= 100 ? 'bg-primary' : 'bg-border'}`}></div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={userForm.confirmPassword}
                onChange={handleUserChange}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-secondary"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors mt-2"
          >
            {isPending ? 'Création en cours...' : 'Continuer →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Déjà un compte ? Se connecter
          </a>
        </div>
      </div>

      {/* Step 2: Organization */}
      <div className={`transition-all duration-500 ease-in-out ${step === 2 ? 'opacity-100 translate-x-0 relative block' : 'opacity-0 translate-x-full absolute invisible'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Configurez votre espace</h2>
            <p className="text-sm text-text-secondary">Dernière étape pour accéder à l'application.</p>
          </div>
        </div>
        
        <form onSubmit={handleStep2Submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Nom de l'organisation</label>
            <input
              type="text"
              value={orgForm.name}
              onChange={(e) => setOrgForm({...orgForm, name: e.target.value})}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ex: Cabinet ALPHA Consulting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Pays d'opération</label>
            <select
              value={orgForm.country}
              onChange={(e) => setOrgForm({...orgForm, country: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Taille de l'équipe</label>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_SIZES.map(size => (
                <label 
                  key={size}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${orgForm.teamSize === size ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-secondary hover:border-primary/50'}`}
                >
                  <input
                    type="radio"
                    name="teamSize"
                    value={size}
                    checked={orgForm.teamSize === size}
                    onChange={(e) => setOrgForm({...orgForm, teamSize: e.target.value})}
                    className="sr-only"
                  />
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium text-center">{size}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-success text-white font-medium py-3 rounded-lg hover:bg-success/90 transition-colors mt-4 text-base flex items-center justify-center gap-2"
          >
            {isPending ? 'Configuration...' : 'Accéder à ProjetPilote ✓'}
          </button>
        </form>
      </div>

    </div>
  )
}
