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
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_super_admin')
    .eq('id', user.id)
    .single()

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

  return (
    <OrganizationProvider>
      <div className="min-h-screen bg-surface-dim md:pl-60 pb-16 md:pb-0">
        <Sidebar userFullName={userFullName} orgName={orgName} isOrgAdmin={isOrgAdmin} />
        
        {/* We don't render Header here because title varies per page. 
            Pages will include <Header title="..." /> themselves, or we can use a client context. 
            For simplicity, each page renders the Header component itself to have dynamic titles.
        */}
        <main className="w-full h-full min-h-screen">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
