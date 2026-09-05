import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Optionnel : vérifier si l'utilisateur a déjà une organisation.
  // Si c'est le cas, on pourrait le rediriger vers /projects pour l'empêcher de refaire l'onboarding.
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    
  if (orgMembers && orgMembers.length > 0) {
    redirect('/projects')
  }

  const adminClient = await import('@/lib/supabase/admin').then(m => m.createAdminClient())
  const { data: pendingInvs } = await adminClient
    .from('invitations')
    .select('token')
    .ilike('invited_email', user.email || '')
    .eq('status', 'pending')
    .limit(1)

  if (pendingInvs && pendingInvs.length > 0) {
    redirect(`/invite/${pendingInvs[0].token}`)
  }

  // Une inscription classique n'est pas une invitation : créer le profil depuis
  // les métadonnées d'inscription, puis poursuivre vers la création d'organisation.
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!profile) {
    const fullName = String(user.user_metadata?.full_name || '').trim()
    if (!fullName || !user.email) {
      redirect('/setup-profile')
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
    })

    if (profileError) {
      console.error('Onboarding profile creation error:', profileError)
      redirect('/setup-profile')
    }
  }

  return <>{children}</>
}
