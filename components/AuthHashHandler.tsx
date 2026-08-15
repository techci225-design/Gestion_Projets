'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthHashHandler() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  
  useEffect(() => {
    // Check if the URL has a Supabase auth token fragment (usually after clicking an email link)
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
      setIsProcessing(true)
      const supabase = createClient()
      
      // The Supabase client automatically processes the hash.
      // We listen for the session to be established.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          const isInvite = window.location.hash.includes('type=invite')
          // Force a router refresh and push to appropriate page so the server picks up the new session cookie
          if (isInvite) {
            router.push('/setup-profile')
          } else {
            router.push('/projects')
          }
          router.refresh()
        }
      })

      // Fallback: Check explicitly in case the event already fired or if it fails
      const checkSession = async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          const isInvite = window.location.hash.includes('type=invite')
          if (isInvite) {
            router.push('/setup-profile')
          } else {
            router.push('/projects')
          }
          router.refresh()
        }
      }
      checkSession()

      // Give it 5 seconds. If nothing happens, redirect to login with error
      const timeoutId = setTimeout(() => {
        router.push('/login?error=Lien invalide ou expiré')
      }, 5000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeoutId)
      }
    }
  }, [router])

  if (!isProcessing) return null

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-slate-800">Authentification en cours...</h2>
      <p className="text-slate-500">Veuillez patienter quelques instants.</p>
    </div>
  )
}
