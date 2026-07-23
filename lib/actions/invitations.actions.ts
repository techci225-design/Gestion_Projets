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

  // Initialize adminClient early to bypass RLS for inserting the invitation
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: 'Erreur configuration adminClient pour l\'insertion.' };
  }

  // Permission check: To invite a project member, the user must be a chef_projet or owner.
  // To invite an organization owner, the user must be an organization owner.
  if (payload.role === 'Propriétaire' || payload.role === 'owner') {
     const { data: orgMember } = await supabase.from('organization_members').select('role').eq('organization_id', payload.organization_id).eq('user_id', user.id).single();
     if (!orgMember || orgMember.role !== 'owner') {
        return { error: 'Seul un propriétaire d\'organisation peut inviter un autre propriétaire.' };
     }
  } else if (payload.project_id) {
     const { data: projMember } = await supabase.from('project_members').select('role').eq('project_id', payload.project_id).eq('user_id', user.id).single();
     if (!projMember || (projMember.role !== 'chef_projet' && projMember.role !== 'owner')) {
        return { error: 'Vous devez être chef de projet ou propriétaire pour inviter des membres.' };
     }
  }

  // Insert invitation via adminClient to bypass restrictive RLS policies
  const { data: invitation, error: insertError } = await adminClient
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
    return { error: 'Impossible de créer l\'invitation. Vérifiez si une invitation est déjà en cours.' }
  }

  // adminClient is already initialized above

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
    
    // If the user already exists, Supabase throws an error for inviteUserByEmail.
    // In this case, we send them a Magic Link which will redirect them to the invite page.
    if (inviteError.message.toLowerCase().includes('already') || inviteError.status === 422 || inviteError.status === 400) {
      const { error: magicLinkError } = await adminClient.auth.signInWithOtp({
        email: payload.email,
        options: {
          emailRedirectTo: `https://gestion-projets-e3uj.vercel.app/invite/${token}`,
        }
      })
      
      if (magicLinkError) {
        console.error('Magic link fallback error:', magicLinkError)
        return { error: 'L\'utilisateur existe déjà, mais impossible d\'envoyer l\'email de notification.' }
      }
    } else {
      return { error: `Erreur lors de l'envoi de l'email: ${inviteError.message}` }
    }
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

  // 6. Mark all pending invitations for this email in this org/project as accepted
  let updateQuery = adminClient.from('invitations')
    .update({ status: 'accepted' })
    .eq('invited_email', invitation.invited_email)
    .eq('organization_id', invitation.organization_id)
    .eq('status', 'pending')

  if (invitation.project_id) {
    updateQuery = updateQuery.eq('project_id', invitation.project_id)
  }

  await updateQuery

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

export async function autoAcceptPendingInvitations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) return 0

  const adminClient = createAdminClient()
  const { data: pendingInvs, error } = await adminClient
    .from('invitations')
    .select('*')
    .eq('invited_email', user.email)
    .eq('status', 'pending')

  if (error || !pendingInvs || pendingInvs.length === 0) return 0

  let acceptedCount = 0

  for (const inv of pendingInvs) {
    // 1. Add to organization
    await adminClient.from('organization_members').upsert({
      organization_id: inv.organization_id,
      user_id: user.id,
      org_role: 'member'
    }, { onConflict: 'organization_id, user_id' })

    // 2. Add to project if exists
    if (inv.project_id) {
      await adminClient.from('project_members').upsert({
        project_id: inv.project_id,
        user_id: user.id,
        role: inv.invited_role
      }, { onConflict: 'project_id, user_id' })
    }

    // 3. Mark as accepted
    await adminClient.from('invitations')
      .update({ status: 'accepted' })
      .eq('id', inv.id)

    acceptedCount++
  }

  return acceptedCount
}
