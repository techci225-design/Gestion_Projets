import React from 'react'
import { Header } from '@/components/dashboard/Header'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrganizationSettingsClient } from './OrganizationSettingsClient'

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's orgs where they are admin
  const { data: orgMembers, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'admin')

  if (error || !orgMembers || orgMembers.length === 0) {
    return (
      <div className="p-6">
        <Header title="Paramètres de l'organisation" />
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          Accès refusé. Vous devez être administrateur d'une organisation pour accéder à cette page.
        </div>
      </div>
    )
  }

  const adminOrgs = orgMembers.map((om: any) => ({
    id: om.organizations.id,
    name: om.organizations.name,
    role: om.role
  }))

  return (
    <>
      <Header title="Paramètres de l'organisation" />
      <div className="p-6 max-w-4xl mx-auto">
        <OrganizationSettingsClient adminOrgs={adminOrgs} />
      </div>
    </>
  )
}
