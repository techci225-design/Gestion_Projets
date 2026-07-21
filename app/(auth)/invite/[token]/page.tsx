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
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Lien d'invitation invalide</h1>
        <p className="text-white/70 mb-6">Ce lien n'existe pas ou est mal formaté.</p>
        <a href="/" className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 inline-block">
          Retour à l'accueil
        </a>
      </div>
    )
  }

  if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invitation expirée</h1>
        <p className="text-white/70 mb-4 font-medium">Cette invitation a expiré ou a déjà été utilisée.</p>
        <p className="text-sm text-white/50 mb-8">Demandez un nouveau lien à l'administrateur de l'organisation.</p>
        <a href="/" className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 inline-block">
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
