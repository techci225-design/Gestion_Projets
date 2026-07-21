'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const checkSession = async () => {
      // Handle PKCE flow: if there's a code in the URL, exchange it for a session
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setMessage({ text: `Erreur (Code): ${error.message}. Demandez un nouveau lien.`, type: 'error' })
          return
        }
        // Remove code from URL so it's not reused
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      // Fallback for implicit flow (hash fragment) or if already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Wait a bit to let the hash fragment be parsed if present
        setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabase.auth.getSession()
          if (!delayedSession) {
            // Log hash to see if it's an implicit flow that failed
            console.log("Hash:", window.location.hash, "Search:", window.location.search)
            setMessage({ text: 'Lien invalide ou expiré (Session non trouvée). Demandez un nouveau lien.', type: 'error' })
          }
        }, 2000)
      }
    }
    checkSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ text: 'Erreur: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: 'Mot de passe mis à jour avec succès.', type: 'success' })
      setTimeout(() => {
        router.push('/login')
      }, 2000)
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
            <h1 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h1>
            <p className="text-white/70 text-sm">Entrez votre nouveau mot de passe ci-dessous.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className={`p-3 text-sm rounded-lg ${message.type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-green-500/20 text-green-200 border border-green-500/50'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (message?.type === 'error')}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 disabled:opacity-70"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
