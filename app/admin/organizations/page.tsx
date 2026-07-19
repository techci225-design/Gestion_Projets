import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { OrganizationsClient } from './OrganizationsClient'

export default async function AdminOrganizationsPage() {
  const supabase = await createClient()

  // Fetch organizations with some basic stats
  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      plan,
      max_projects,
      is_active,
      created_at,
      projects:projects(count),
      organization_members:organization_members(count)
    `)
    .order('created_at', { ascending: false })

  // Calculate KPIs
  const totalOrgs = orgs?.length || 0
  const activeOrgs = orgs?.filter(o => o.is_active).length || 0
  const trialOrgs = orgs?.filter(o => o.plan === 'trial').length || 0
  const totalProjects = orgs?.reduce((sum, o) => sum + (o.projects?.[0]?.count || 0), 0) || 0
  const totalUsers = orgs?.reduce((sum, o) => sum + (o.organization_members?.[0]?.count || 0), 0) || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisations Clientes</h1>
        <p className="text-gray-500 mt-1">Gérez vos locataires et surveillez l'activité globale.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Organisations actives</div>
          <div className="text-3xl font-bold text-gray-900">{activeOrgs} <span className="text-sm font-normal text-gray-400">/ {totalOrgs}</span></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">En période d'essai</div>
          <div className="text-3xl font-bold text-warning">{trialOrgs}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Projets</div>
          <div className="text-3xl font-bold text-gray-900">{totalProjects}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Utilisateurs</div>
          <div className="text-3xl font-bold text-primary">{totalUsers}</div>
        </div>
      </div>

      {/* Table Client Component */}
      <OrganizationsClient orgs={orgs || []} />
    </div>
  )
}
