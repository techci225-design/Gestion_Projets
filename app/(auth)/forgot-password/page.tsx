'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    })

    if (error) {
      setMessage({ text: 'Erreur: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: 'Un email de réinitialisation vous a été envoyé.', type: 'success' })
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden p-4">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Mot de passe oublié</h1>
            <p className="text-white/70 text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className={`p-3 text-sm rounded-lg ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-green-500/20 text-green-200 border border-green-500/50'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Adresse email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@entreprise.com"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 disabled:opacity-70"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
            
            <div className="text-center mt-6">
              <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
