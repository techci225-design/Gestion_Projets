import React from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import InviteClient from './invite-client'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const adminClient = createAdminClient()
  const { data: invitation, error } = await adminClient
    .from('invitations')
    .select('*, organization:organizations(name)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Lien d'invitation invalide</h1>
        <p className="text-text-secondary mb-6">Ce lien n'existe pas ou est mal formaté.</p>
        <a href="/" className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Retour à l'accueil
        </a>
      </div>
    )
  }

  if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Invitation expirée</h1>
        <p className="text-text-secondary mb-6">Cette invitation a expiré ou a déjà été utilisée.</p>
        <p className="text-sm text-text-tertiary">Demandez un nouveau lien à l'administrateur de l'organisation.</p>
        <a href="/" className="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Retour à l'accueil
        </a>
      </div>
    )
  }

  // Check if the user is already registered in 'profiles' by their email
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name, full_name')
    .eq('email', invitation.invited_email)
    .single()

  const orgName = invitation.organization?.name || 'une organisation'

  return (
    <InviteClient 
      token={token} 
      email={invitation.invited_email} 
      orgName={orgName}
      isExistingUser={!!profile}
      existingFirstName={profile?.first_name}
      existingLastName={profile?.last_name}
    />
  )
}
