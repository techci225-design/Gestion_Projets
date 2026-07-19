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

  return <>{children}</>
}
