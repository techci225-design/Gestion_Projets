import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/onboarding'
  const invitation_id = searchParams.get('invitation_id')

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error && data.user) {
      if (type === 'invite') {
         // Puisque le template email par défaut ne permet pas d'ajouter des paramètres,
         // on extrait l'ID depuis les métadonnées de l'utilisateur (injectées lors de l'invitation)
         const metadataInvitationId = data.user.user_metadata?.invitation_id
         
         const setupUrl = new URL(`${origin}/invitation/setup`)
         if (metadataInvitationId) {
           setupUrl.searchParams.set('invitation_id', metadataInvitationId)
         } else if (invitation_id) {
           // Fallback if somehow it was in the URL
           setupUrl.searchParams.set('invitation_id', invitation_id)
         }
         return NextResponse.redirect(setupUrl)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    
    console.error('Verify OTP error:', error)
    return NextResponse.redirect(`${origin}/login?error=Lien invalide ou expiré&message=${encodeURIComponent(error?.message || 'Erreur inconnue')}`)
  }

  // Si pas de token_hash, on redirige vers le login avec erreur
  return NextResponse.redirect(`${origin}/login?error=Lien invalide`)
}
