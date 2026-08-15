'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthHashHandler() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  
  useEffect(() => {
    // If there is no hash, but the user has a session, redirect them to /projects
    if (typeof window !== 'undefined' && (!window.location.hash || !window.location.hash.includes('access_token='))) {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          router.push('/projects')
        }
      })
      return
    }

    // Check if the URL has a Supabase auth token fragment (usually after clicking an email link)
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
      setIsProcessing(true)
      const supabase = createClient()
      
      // Manually parse the hash to ensure the session is set
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      const establishSession = async () => {
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (!error && data.session) {
            router.push('/projects')
            router.refresh()
            return true
          }
        }
        
        // If manual parsing fails, check if the client already established it automatically
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          router.push('/projects')
          router.refresh()
          return true
        }
        
        return false
      }

      establishSession().then((success) => {
        if (!success) {
          // If we couldn't establish the session, wait for onAuthStateChange
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          router.push('/projects')
          router.refresh()
        }
      })

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
