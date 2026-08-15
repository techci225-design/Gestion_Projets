import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SetupClient from './setup-client'

export default async function InvitationSetupPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const invitationIdFromUrl = params.invitation_id as string

  if (!user || !user.email) {
    redirect('/login?error=Session expirée ou invalide. Veuillez recliquer sur le lien.')
  }

  const invitationIdFromMetadata = user.user_metadata?.invitation_id

  if (!invitationIdFromUrl || invitationIdFromUrl !== invitationIdFromMetadata) {
    redirect('/login?error=Lien d\'invitation invalide ou corrompu (Sécurité).')
  }

  const adminClient = createAdminClient()
  
  // Find the specific pending invitation for this user
  const { data: invitation, error } = await adminClient
    .from('invitations')
    .select('*, organization:organizations(name)')
    .eq('id', invitationIdFromUrl)
    .eq('invited_email', user.email)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invitation introuvable</h1>
        <p className="text-white/70 mb-6">Cette invitation a expiré, a déjà été utilisée, ou est destinée à une autre adresse email.</p>
        <a href="/" className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 inline-block">
          Retour à l'accueil
        </a>
      </div>
    )
  }

  // Redundant const removed

  if (new Date(invitation.expires_at) < new Date()) {
    await adminClient.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Invitation expirée</h1>
        <p className="text-white/70 mb-4 font-medium">Cette invitation a expiré.</p>
        <a href="/" className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 inline-block">
          Retour à l'accueil
        </a>
      </div>
    )
  }

  const orgName = invitation.organization?.name || 'une organisation'

  return (
    <SetupClient 
      invitationId={invitation.id}
      email={user.email} 
      orgName={orgName}
      role={invitation.invited_role}
    />
  )
}
