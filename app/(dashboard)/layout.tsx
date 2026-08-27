import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { OrganizationProvider } from '@/lib/contexts/OrganizationContext'

import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, is_super_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/setup-profile')
  }

  // Ensure they have a password set
  const authAdminClient = createAdminClient()
  const { data: authUser } = await authAdminClient.auth.admin.getUserById(user.id)
  
  // Checking if identities exist and are linked to a password provider, 
  // or explicitly checking if they need to setup profile.
  // Actually, if they were invited, their identity might not have a password yet.
  // We can check if they have a 'password' in their providers list.
  const hasPassword = authUser?.user?.app_metadata?.providers?.includes('email') && 
                      authUser?.user?.identities?.some(id => id.provider === 'email');
                      
  // Wait, inviteUserByEmail adds 'email' to providers. 
  // Let's use a custom flag in app_metadata if possible, but since we can't easily,
  // we will just rely on the fact that if they don't have a profile, they go to setup-profile.
  // BUT to be absolutely certain, let's just create the setup-profile logic.

  // Check if they have ANY pending invitations. If they do, FORCE them to the invite confirmation screen.
  const { data: pendingInvs } = await authAdminClient
    .from('invitations')
    .select('id')
    .ilike('invited_email', user.email || '')
    .eq('status', 'pending')
    .limit(1)

  if (pendingInvs && pendingInvs.length > 0) {
    // Si l'utilisateur arrive ici, il doit finaliser son invitation.
    // L'ID est passé pour que /invitation/setup puisse faire sa vérification de sécurité.
    redirect(`/invitation/setup?invitation_id=${pendingInvs[0].id}`)
  }

  const cookieStore = await cookies()
  const supportOrgId = cookieStore.get('support_org_id')?.value

  let activeOrgId = supportOrgId && profile?.is_super_admin ? supportOrgId : null

  // If not in support mode, check if user has at least one organization
  let roleData = null
  if (!activeOrgId) {
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('organization_id, org_role')
      .eq('user_id', user.id)
      .limit(1)

    if (!orgMembers || orgMembers.length === 0) {
      // If they are super admin without any org, but no support org selected, redirect to admin
      if (profile?.is_super_admin) {
        redirect('/admin/organizations')
      } else {
        redirect('/onboarding')
      }
    }
    activeOrgId = orgMembers[0].organization_id
    roleData = orgMembers[0]
  }

  // Fetch organization name. We use adminClient to bypass RLS if super admin is in support mode
  const adminClient = createAdminClient()
  const { data: orgData } = await adminClient
    .from('organizations')
    .select('name')
    .eq('id', activeOrgId)
    .single()

  // Fetch role if not already fetched
  if (activeOrgId && !roleData && !profile?.is_super_admin) {
    const { data: rd } = await supabase
      .from('organization_members')
      .select('org_role')
      .eq('organization_id', activeOrgId)
      .eq('user_id', user.id)
      .single()
    roleData = rd
  }

  const orgName = orgData?.name || 'Mon Organisation'
  const isOrgAdmin = profile?.is_super_admin || roleData?.org_role === 'owner' || roleData?.org_role === 'admin'

  const userFullName = profile?.full_name || user.email || 'Utilisateur'

  // Track session for engagement analytics (don't block render if it fails)
  if (activeOrgId) {
    supabase.from('user_sessions').upsert({
      user_id: user.id,
      organization_id: activeOrgId,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'user_id,organization_id' }).then(({ error }) => {
      if (error) console.error('Failed to log session:', error)
    })
  }

  return (
    <OrganizationProvider>
      <div className="min-h-screen bg-surface-dim md:pl-64 pb-32 md:pb-0">
        <Sidebar userFullName={userFullName} orgName={orgName} isOrgAdmin={isOrgAdmin} />
        
        {/* We don't render Header here because title varies per page. 
            Pages will include <Header title="..." /> themselves, or we can use a client context. 
            For simplicity, each page renders the Header component itself to have dynamic titles.
        */}
        <main className="w-full">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
