'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BriefcaseBusiness, Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'

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

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [userForm, setUserForm] = useState<UserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
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

  const handleStep1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    if (formData.get('password') !== formData.get('confirmPassword')) {
      setError('Les mots de passe ne correspondent pas')
      setIsPending(false)
      return
    }

    try {
      userSchema.parse(userForm)

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
          throw new Error('Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.')
        }
        if (signUpError.message.toLowerCase().includes('disabled') || signUpError.message.toLowerCase().includes('désactivées') || signUpError.message.toLowerCase().includes('not allowed')) {
          throw new Error('SIGNUPS_DISABLED')
        }
        if (signUpError.message.toLowerCase().includes('6 characters')) {
          throw new Error('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.')
        }
        throw signUpError
      }

      if (data.session) {
        // Create profile since they are instantly logged in
        await supabase.from('profiles').upsert({
          id: data.user!.id,
          full_name: `${userForm.firstName} ${userForm.lastName}`,
          email: userForm.email
        })
        router.push('/onboarding')
        router.refresh()
      } else {
        // Email confirmation is required
        setStep(2)
      }

    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Erreur de validation')
      } else if (err instanceof Error) {
        setError(err.message || 'Une erreur est survenue.')
      } else {
        setError('Une erreur est survenue.')
      }
      setIsPending(false)
    }
  }

  return (
    <div className="bg-white w-full rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center">
      
      {/* Form Content Wrapper */}
      <div className="w-full px-8 py-10 sm:px-12 pt-12 flex flex-col items-center relative min-h-[400px]">
        
        {/* Header */}
        <div className="text-center mb-8 w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30 text-white">
            <BriefcaseBusiness className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Créer un compte
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Rejoignez Smart-Project-Manager
          </p>
          <div className="h-1 w-12 bg-orange-500 rounded-full mt-4"></div>
        </div>

        {/* Error Message */}
        {error === 'SIGNUPS_DISABLED' ? (
          <div className="mb-6 w-full bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl flex flex-col gap-3">
            <p className="font-semibold text-red-700">Les inscriptions sont temporairement suspendues.</p>
            <p className="text-red-600/90">Contactez l&apos;administrateur pour créer votre accès.</p>
          </div>
        ) : error ? (
          <div className="mb-6 w-full bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl font-medium flex items-center justify-between">
            <span>{error}</span>
            {error.includes('Connectez-vous') && (
              <a href="/login" className="font-bold underline ml-2 shrink-0 hover:text-red-700">Connexion</a>
            )}
          </div>
        ) : null}

        {/* Step 1: User Account */}
        <div className={`w-full transition-all duration-500 ease-in-out ${step === 1 ? 'opacity-100 translate-x-0 relative' : 'opacity-0 -translate-x-full absolute invisible'}`}>
          
          <form onSubmit={handleStep1Submit} className="w-full space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Prénom</label>
                <input
                  type="text"
                  name="firstName"
                  value={userForm.firstName}
                  onChange={handleUserChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                  placeholder="Jean"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Nom</label>
                <input
                  type="text"
                  name="lastName"
                  value={userForm.lastName}
                  onChange={handleUserChange}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                Email professionnel
              </label>
              <input
                type="email"
                name="email"
                value={userForm.email}
                onChange={handleUserChange}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm"
                placeholder="jean.dupont@entreprise.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={userForm.password}
                  onChange={handleUserChange}
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm tracking-widest"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-transparent text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength bar */}
              {userForm.password && (
                <div className="mt-2 flex gap-1 h-1.5 w-full">
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordScore >= 25 ? 'bg-red-500' : 'bg-slate-200'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordScore >= 50 ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordScore >= 75 ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                  <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordScore >= 100 ? 'bg-green-600' : 'bg-slate-200'}`}></div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={userForm.confirmPassword}
                  onChange={handleUserChange}
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm tracking-widest"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-transparent text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-[#e86915] hover:bg-[#d55e10] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                {isPending ? 'Création...' : 'Continuer'}
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Email Confirmation (Fallback) */}
        <div className={`w-full transition-all duration-500 ease-in-out ${step === 2 ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-full absolute invisible'}`}>
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Vérifiez votre email</h2>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4 mb-8 text-left max-w-sm w-full">
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Un email de confirmation a été envoyé à <strong className="text-slate-900">{userForm.email}</strong>.
              </p>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Cliquez sur le lien pour activer votre compte.
              </p>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Une fois confirmé, revenez ici et connectez-vous pour finaliser la création.
              </p>
            </div>
            
            <button
              onClick={() => router.push('/login')}
              className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>

      </div>

      {/* Footer Block */}
      <div className="w-full bg-slate-50 border-t border-slate-100 p-6 flex justify-center mt-2">
        <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-bold text-orange-600 hover:text-orange-700">
            Se connecter
          </Link>
        </p>
      </div>

    </div>
  )
}
