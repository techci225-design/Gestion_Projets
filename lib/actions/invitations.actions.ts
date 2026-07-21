'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function sendInvitation(payload: {
  project_id: string,
  organization_id: string,
  email: string,
  role: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Non authentifié' }
  }

  // Basic validation
  if (!payload.email || !payload.email.includes('@')) {
    return { error: 'Email invalide.' }
  }
  if (!payload.organization_id) {
    return { error: "Organisation manquante." }
  }

  // Check if the user is already a member of this project
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', payload.email)
    .single()

  if (profile && payload.project_id) {
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', payload.project_id)
      .eq('user_id', profile.id)
      .single()

    if (existingMember) {
      return { error: 'Cet utilisateur est déjà membre de ce projet.' }
    }
  }

  // Insert invitation
  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({
      organization_id: payload.organization_id,
      project_id: payload.project_id || null,
      invited_email: payload.email.toLowerCase(),
      invited_role: payload.role,
      invited_by: user.id
    })
    .select()
    .single()

  if (insertError) {
    console.error('Insert invitation error:', insertError)
    // Could be a duplicate pending invite, RLS, etc.
    return { error: 'Impossible de créer l\'invitation. Vérifiez vos droits ou si une invitation est déjà en cours.' }
  }

  // Admin client for sending the email via Supabase Auth
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur configuration adminClient pour l\'envoi email.' }
  }

  const token = invitation.token

  // Send via Supabase native invite system
  const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    payload.email,
    {
      redirectTo: `https://gestion-projets-e3uj.vercel.app/invite/${token}`,
      data: { invitation_token: token }
    }
  )

  if (inviteError) {
    console.error('Invite email error:', inviteError)
    return { error: 'Erreur lors de l\'envoi de l\'email.' }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${payload.project_id}/membres`)

  return { success: true }
}

export async function acceptInvitation(token: string, formData?: { password?: string, first_name?: string, last_name?: string }) {
  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur configuration admin.' }
  }

  // 1. Validate Token
  const { data: invitation, error: invError } = await adminClient
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return { error: 'Lien d\'invitation invalide.' }
  }

  if (invitation.status !== 'pending') {
    return { error: 'Cette invitation a expiré ou a déjà été utilisée.' }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Should be caught by the edge function, but just in case
    await adminClient.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return { error: 'Cette invitation a expiré ou a déjà été utilisée.' }
  }

  // 2. Identify User
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userId = null

  // We should NEVER update a user password if they are logged in as someone else!
  if (user && user.email?.toLowerCase() === invitation.invited_email.toLowerCase()) {
    userId = user.id
  } else if (user) {
    return { error: `Vous êtes connecté en tant que ${user.email}. Veuillez vous déconnecter pour accepter cette invitation destinée à ${invitation.invited_email}.` }
  } else {
    // User is not logged in. Find them by email in auth.users using adminClient
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers()
    if (!usersError && usersData?.users) {
      const existingUser = usersData.users.find(u => u.email?.toLowerCase() === invitation.invited_email.toLowerCase())
      if (existingUser) {
        userId = existingUser.id
      }
    }
  }

  if (!userId) {
    return { error: 'Utilisateur introuvable. Veuillez créer un compte.' }
  }

  // Update password using adminClient so we don't rely on the current session
  if (formData?.password) {
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
      password: formData.password
    })
    if (updateAuthError) {
      return { error: 'Erreur lors de la configuration du mot de passe.' }
    }
  }

  // 3. Update Profile if needed
  if (formData?.first_name || formData?.last_name) {
    // If new user, create their profile
    const { data: profile } = await adminClient.from('profiles').select('id').eq('id', userId).single()
    if (!profile) {
       await adminClient.from('profiles').insert({
         id: userId,
         email: invitation.invited_email,
         first_name: formData.first_name,
         last_name: formData.last_name,
         full_name: `${formData.first_name} ${formData.last_name}`.trim(),
         role: 'client'
       })
    }
  }

  // 4. Add to organization
  const { error: orgError } = await adminClient.from('organization_members').upsert({
    organization_id: invitation.organization_id,
    user_id: userId,
    org_role: 'member'
  }, { onConflict: 'organization_id, user_id' })

  if (orgError) {
    console.error('Org member insert error', orgError)
  }

  // 5. Add to project if exists
  if (invitation.project_id) {
    const { error: projError } = await adminClient.from('project_members').upsert({
      project_id: invitation.project_id,
      user_id: userId,
      role: invitation.invited_role
    }, { onConflict: 'project_id, user_id' })
    if (projError) {
      console.error('Proj member insert error', projError)
    }
  }

  // 6. Mark invitation as accepted
  await adminClient.from('invitations').update({ status: 'accepted' }).eq('id', invitation.id)

  return { success: true }
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId)

  if (error) {
    return { error: 'Erreur lors de l\'annulation de l\'invitation.' }
  }
  
  revalidatePath('/projects')
  return { success: true }
}
