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

  // Vérifier s'il a un profil. S'il n'en a pas, c'est un utilisateur invité qui n'a pas encore de mot de passe.
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
  if (!profile) {
    redirect('/setup-profile')
  }

  // Check if there are any pending invitations for this email
  // Instead of auto-accepting silently, FORCE the user to the invite page to confirm and enter password.
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

  // If no pending invitations, and they have no org, they must create one
  return <>{children}</>
}
