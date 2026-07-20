'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_super_admin === true
}

export async function updateOrganizationPlan(orgId: string, plan: 'trial' | 'pro' | 'institutionnel', maxProjects: number) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ plan, max_projects: maxProjects })
    .eq('id', orgId)

  if (error) return { error: 'Erreur lors de la mise à jour du plan' }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function toggleOrganizationStatus(orgId: string, isActive: boolean) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update({ is_active: isActive })
    .eq('id', orgId)

  if (error) return { error: 'Erreur lors du changement de statut' }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function deleteOrganization(orgId: string) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (error) {
    console.error('Erreur lors de la suppression de l\'organisation:', error)
    // Sometimes cascading constraints might block deletion if we didn't setup ON DELETE CASCADE
    return { error: 'Erreur lors de la suppression. Assurez-vous de vider les projets de cette organisation d\'abord.' }
  }
  revalidatePath('/admin/organizations')
  return { success: true }
}

export async function getAdminUsers() {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) throw new Error('Accès non autorisé')

  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      organization_members (
        org_role,
        organizations (
          name,
          plan
        )
      ),
      project_members ( count )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Erreur Supabase (getAdminUsers) :', error)
    throw new Error('Impossible de charger les utilisateurs')
  }
  
  // Format the data to match the expected flat structure
  const formattedData = data.map((p: any) => {
    const orgMember = p.organization_members && p.organization_members.length > 0 ? p.organization_members[0] : null
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      created_at: p.created_at,
      organization_name: orgMember?.organizations?.name || null,
      organization_plan: orgMember?.organizations?.plan || null,
      org_role: orgMember?.org_role || null,
      nb_projects: p.project_members && p.project_members.length > 0 ? p.project_members[0].count : 0
    }
  })
  
  return formattedData || []
}

export async function generatePasswordResetLink(email: string) {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) return { error: 'Accès non autorisé' }

  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  
  if (error) {
    console.error('generatePasswordResetLink error:', error)
    return { error: 'Erreur lors de la génération du lien' }
  }
  
  return { link: data.properties.action_link }
}

export async function getAdminStatistics() {
  const isSuperAdmin = await checkSuperAdmin()
  if (!isSuperAdmin) throw new Error('Accès non autorisé')

  const adminClient = createAdminClient()
  
  // 1. Total Organizations
  const { count: totalOrgsCount } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    
  // 2. Active Organizations
  const { count: activeOrgsCount } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    
  // 3. Pro and Trial Organizations for conversion rate
  const { count: proOrgsCount } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'pro')
    
  const { count: trialOrgsCount } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'trial')
    
  const { count: instOrgsCount } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'institutionnel')

  // 4. Active Projects
  const { count: activeProjectsCount } = await adminClient
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'actif')
    
  // 5. Total Budget (from budget_lines)
  const { data: budgetData } = await adminClient
    .from('budget_lines')
    .select('initial_allocated_amount')
    
  const totalBudget = (budgetData || []).reduce((sum, line) => sum + (line.initial_allocated_amount || 0), 0)
  
  // 6. Recent Activity (audit_log)
  const { data: recentActivity } = await adminClient
    .from('audit_log')
    .select(`
      id, created_at, action, module, project_id,
      profiles (full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
    
  // 7. Top 5 Organizations
  const { data: topOrgsQuery } = await adminClient
    .from('organizations')
    .select(`
      id, name, plan,
      projects ( id, budget_lines ( initial_allocated_amount ) ),
      organization_members ( user_id )
    `)
    
  let topOrgs = (topOrgsQuery || []).map(org => {
    let budgetTotal = 0
    let nbProjets = org.projects?.length || 0
    
    org.projects?.forEach(p => {
      p.budget_lines?.forEach((bl: any) => {
        budgetTotal += (bl.initial_allocated_amount || 0)
      })
    })
    
    // nb members (unique user_ids in organization_members)
    const uniqueMembers = new Set(org.organization_members?.map((om: any) => om.user_id))
    
    return {
      id: org.id,
      name: org.name,
      plan: org.plan,
      nb_projets: nbProjets,
      nb_membres: uniqueMembers.size,
      budget_total: budgetTotal
    }
  })
  
  // Sort by projects DESC, then budget DESC
  topOrgs.sort((a, b) => {
    if (b.nb_projets !== a.nb_projets) return b.nb_projets - a.nb_projets
    return b.budget_total - a.budget_total
  })
  
  topOrgs = topOrgs.slice(0, 5)
    
  return {
    kpis: {
      totalOrgs: totalOrgsCount || 0,
      activeOrgs: activeOrgsCount || 0,
      activeProjects: activeProjectsCount || 0,
      totalBudget: totalBudget,
      proOrgs: proOrgsCount || 0,
      trialOrgs: trialOrgsCount || 0,
      instOrgs: instOrgsCount || 0
    },
    recentActivity: recentActivity || [],
    topOrgs
  }
}
